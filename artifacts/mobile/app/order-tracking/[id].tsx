import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type Step = {
  key: string;
  label: string;
  icon: string;
  desc: string;
};

const DELIVERY_STEPS: Step[] = [
  { key: "scheduled", label: "Scheduled", icon: "calendar", desc: "Your meal is in the schedule" },
  { key: "accepted", label: "Accepted", icon: "check-circle", desc: "Restaurant confirmed your order" },
  { key: "preparing", label: "Preparing", icon: "clock", desc: "Chef is preparing your meal" },
  { key: "out", label: "Out for delivery", icon: "truck", desc: "Rider is on the way" },
  { key: "delivered", label: "Delivered", icon: "check-circle", desc: "Enjoy your meal!" },
];

function getStepIndex(status: string): number {
  switch (status) {
    case "scheduled": return 0;
    case "locked":
    case "accepted": return 1;
    case "preparing": return 2;
    case "delivered": return 4;
    default: return 0;
  }
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (isoDate === today.toISOString().split("T")[0]) return "Today";
  if (isoDate === tomorrow.toISOString().split("T")[0]) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
}

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { orders } = useApp();

  const order = orders.find((o) => o.id === id);

  if (!order) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, padding: 20 }}>Order not found</Text>
      </View>
    );
  }

  const isCancelled = ["cancelled_free", "cancelled_late", "cancelled_full"].includes(order.status);
  const currentStep = isCancelled ? -1 : getStepIndex(order.status);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Order summary */}
        <View style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.orderHeader}>
            <View>
              <Text style={[styles.mealName, { color: colors.foreground }]}>
                {order.mealName}
              </Text>
              <Text style={[styles.restName, { color: colors.mutedForeground }]}>
                {order.restaurantName}
              </Text>
            </View>
            <View style={[
              styles.slotBadge,
              { backgroundColor: order.slot === "lunch" ? "#FFF3E8" : "#EDE9FE" },
            ]}>
              <Text style={[
                styles.slotText,
                { color: order.slot === "lunch" ? "#92400E" : "#4C1D95" },
              ]}>
                {order.slot === "lunch" ? "Lunch" : "Dinner"}
              </Text>
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.orderMeta}>
            <View style={styles.metaItem}>
              <Feather name="calendar" size={13} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {formatDate(order.scheduledDate)}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="credit-card" size={13} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {order.creditValue > 0 ? `1 credit` : "Free"}{order.premiumExtra > 0 ? ` + ₹${order.premiumExtra}` : ""}
              </Text>
            </View>
          </View>
        </View>

        {/* Status */}
        {isCancelled ? (
          <View style={[styles.cancelledCard, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
            <Feather name="x-circle" size={24} color="#EF4444" />
            <View>
              <Text style={styles.cancelledTitle}>
                {order.status === "cancelled_free" ? "Cancelled for free" :
                 order.status === "cancelled_late" ? "Late cancellation" :
                 "Cancelled (full charge)"}
              </Text>
              <Text style={styles.cancelledDesc}>
                {order.status === "cancelled_free"
                  ? "Your meal credit has been restored."
                  : order.status === "cancelled_late"
                    ? "50% credit was deducted."
                    : "Full credit was deducted."}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.timelineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.timelineTitle, { color: colors.foreground }]}>
              Order status
            </Text>
            {DELIVERY_STEPS.map((step, i) => {
              const isComplete = i < currentStep;
              const isCurrent = i === currentStep;
              const isPending = i > currentStep;
              return (
                <View key={step.key} style={styles.stepRow}>
                  <View style={styles.stepLeft}>
                    <View style={[
                      styles.stepDot,
                      isComplete && { backgroundColor: "#16A34A" },
                      isCurrent && { backgroundColor: "#F97316", borderColor: "#F97316" },
                      isPending && { backgroundColor: colors.background, borderColor: colors.border },
                    ]}>
                      {isComplete ? (
                        <Feather name="check" size={10} color="#FFFFFF" />
                      ) : isCurrent ? (
                        <Feather name={step.icon as any} size={10} color="#FFFFFF" />
                      ) : null}
                    </View>
                    {i < DELIVERY_STEPS.length - 1 && (
                      <View style={[
                        styles.stepLine,
                        { backgroundColor: isComplete ? "#16A34A" : colors.border },
                      ]} />
                    )}
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={[
                      styles.stepLabel,
                      {
                        color: isCurrent ? colors.primary : isComplete ? "#16A34A" : colors.mutedForeground,
                        fontFamily: isCurrent ? "Inter_700Bold" : "Inter_500Medium",
                      },
                    ]}>
                      {step.label}
                    </Text>
                    {isCurrent && (
                      <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
                        {step.desc}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Cancellation info */}
        {!isCancelled && order.status === "scheduled" && (
          <View style={[styles.policyBox, { backgroundColor: "#FFF3E8", borderColor: "#FDBA74" }]}>
            <Feather name="info" size={14} color="#F97316" />
            <Text style={styles.policyText}>
              Free cancellation until{" "}
              {new Date(order.freeCancelUntil).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}{" "}
              on{" "}
              {new Date(order.freeCancelUntil).toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  orderCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  mealName: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 2 },
  restName: { fontSize: 13, fontFamily: "Inter_400Regular" },
  slotBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  slotText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  divider: { height: 1, marginBottom: 12 },
  orderMeta: { flexDirection: "row", gap: 20 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  cancelledCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  cancelledTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#991B1B",
    marginBottom: 3,
  },
  cancelledDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#EF4444",
  },
  timelineCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  timelineTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: "row",
    gap: 14,
  },
  stepLeft: {
    alignItems: "center",
    width: 24,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    marginVertical: 4,
  },
  stepContent: {
    flex: 1,
    paddingBottom: 16,
  },
  stepLabel: {
    fontSize: 14,
  },
  stepDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  policyBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  policyText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#92400E",
    lineHeight: 18,
  },
});
