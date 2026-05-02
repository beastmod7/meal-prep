import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import StatusBadge from "@/components/StatusBadge";
import { MealOrder, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface MealOrderCardProps {
  order: MealOrder;
  onCancel?: (order: MealOrder) => void;
  showActions?: boolean;
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate + "T12:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (isoDate === today.toISOString().split("T")[0]) return "Today";
  if (isoDate === tomorrow.toISOString().split("T")[0]) return "Tomorrow";

  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

function formatCancelTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function MealOrderCard({
  order,
  onCancel,
  showActions = true,
}: MealOrderCardProps) {
  const colors = useColors();
  const { getOrderCancelStatus } = useApp();
  const router = useRouter();

  const cancelStatus = getOrderCancelStatus(order);
  const isActive = !["delivered", "cancelled_free", "cancelled_late", "cancelled_full"].includes(order.status);
  const isCancelled = ["cancelled_free", "cancelled_late", "cancelled_full"].includes(order.status);

  function getBadgeVariant() {
    if (order.status === "delivered") return "delivered";
    if (isCancelled) return "cancelled";
    if (order.status === "preparing") return "preparing";
    if (cancelStatus === "free") return "free";
    if (cancelStatus === "late") return "late";
    if (cancelStatus === "full") return "locked";
    return "free";
  }

  function getBadgeLabel() {
    if (order.status === "delivered") return "Delivered";
    if (order.status === "cancelled_free") return "Cancelled free";
    if (order.status === "cancelled_late") return "Late cancel";
    if (order.status === "cancelled_full") return "Full charge";
    if (order.status === "preparing") return "Preparing";
    if (cancelStatus === "free") {
      const time = formatCancelTime(order.freeCancelUntil);
      return `Free cancel by ${time}`;
    }
    if (cancelStatus === "late") return "Late fee applies";
    if (cancelStatus === "full") return "Locked";
    return "Scheduled";
  }

  return (
    <Pressable
      onPress={() => router.push(`/order-tracking/${order.id}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.95 },
        isCancelled && { opacity: 0.6 },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.dateSlot}>
          <Text style={[styles.date, { color: colors.foreground }]}>
            {formatDate(order.scheduledDate)}
          </Text>
          <View
            style={[
              styles.slotPill,
              { backgroundColor: order.slot === "lunch" ? "#FFF3E8" : "#EDE9FE" },
            ]}
          >
            <Text
              style={[
                styles.slotText,
                { color: order.slot === "lunch" ? "#92400E" : "#4C1D95" },
              ]}
            >
              {order.slot === "lunch" ? "Lunch" : "Dinner"}
            </Text>
          </View>
        </View>
        <StatusBadge
          variant={getBadgeVariant()}
          label={getBadgeLabel()}
          small
        />
      </View>

      <View style={styles.mealRow}>
        <View style={styles.mealIcon}>
          <Feather name="coffee" size={16} color={colors.primary} />
        </View>
        <View style={styles.mealInfo}>
          <Text style={[styles.mealName, { color: colors.foreground }]}>
            {order.mealName}
          </Text>
          <Text style={[styles.restaurantName, { color: colors.mutedForeground }]}>
            {order.restaurantName}
          </Text>
        </View>
        <View style={styles.creditInfo}>
          <Text style={[styles.credit, { color: colors.foreground }]}>
            1 credit
          </Text>
          {order.premiumExtra > 0 && (
            <Text style={[styles.extra, { color: colors.warning }]}>
              +₹{order.premiumExtra}
            </Text>
          )}
        </View>
      </View>

      {showActions && isActive && onCancel && (
        <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onCancel(order);
            }}
            style={({ pressed }) => [
              styles.cancelBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.cancelBtnText}>Cancel meal</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/schedule-meal",
                params: { editOrderId: order.id },
              })
            }
            style={({ pressed }) => [
              styles.changeBtn,
              { backgroundColor: colors.secondary },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.changeBtnText, { color: colors.primary }]}>
              Change
            </Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  dateSlot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  date: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  slotPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  slotText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 10,
  },
  mealIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFF3E8",
    alignItems: "center",
    justifyContent: "center",
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  restaurantName: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  creditInfo: {
    alignItems: "flex-end",
  },
  credit: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  extra: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  actionsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    padding: 12,
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E4E4E7",
  },
  cancelBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#71717A",
  },
  changeBtn: {
    flex: 1,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  changeBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
