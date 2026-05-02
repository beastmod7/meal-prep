import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import MealOrderCard from "@/components/MealOrderCard";
import { MealOrder, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type Tab = "upcoming" | "past" | "cancelled";

export default function OrdersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { orders, cancelOrder, getOrderCancelStatus } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");
  const [cancelTarget, setCancelTarget] = useState<MealOrder | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelResult, setCancelResult] = useState<{
    type: string;
    fee: number;
  } | null>(null);

  const upcoming = orders.filter(
    (o) =>
      !["delivered", "cancelled_free", "cancelled_late", "cancelled_full"].includes(
        o.status
      )
  ).sort(
    (a, b) =>
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  );

  const past = orders.filter((o) => o.status === "delivered").sort(
    (a, b) =>
      new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
  );

  const cancelled = orders.filter((o) =>
    ["cancelled_free", "cancelled_late", "cancelled_full"].includes(o.status)
  ).sort(
    (a, b) =>
      new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
  );

  const tabData = { upcoming, past, cancelled };
  const current = tabData[activeTab];

  const cancelStatus = cancelTarget
    ? getOrderCancelStatus(cancelTarget)
    : null;

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelLoading(true);
    const result = await cancelOrder(cancelTarget.id);
    setCancelLoading(false);
    setCancelResult(result);
    Haptics.notificationAsync(
      result.type === "free"
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    );
  }

  function closeCancelSheet() {
    setCancelTarget(null);
    setCancelResult(null);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          Orders
        </Text>

        <View style={[styles.tabs, { backgroundColor: colors.muted }]}>
          {(["upcoming", "past", "cancelled"] as Tab[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                activeTab === tab && {
                  backgroundColor: colors.card,
                  shadowColor: "#000",
                  shadowOpacity: 0.06,
                  shadowRadius: 4,
                  elevation: 2,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === tab
                        ? colors.foreground
                        : colors.mutedForeground,
                    fontFamily:
                      activeTab === tab
                        ? "Inter_600SemiBold"
                        : "Inter_400Regular",
                  },
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === "upcoming" && upcoming.length > 0
                  ? ` (${upcoming.length})`
                  : ""}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom:
              insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {current.length === 0 ? (
          <View style={styles.empty}>
            <Feather
              name={
                activeTab === "upcoming"
                  ? "calendar"
                  : activeTab === "past"
                    ? "check-circle"
                    : "x-circle"
              }
              size={32}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No {activeTab} orders
            </Text>
          </View>
        ) : (
          current.map((order) => (
            <MealOrderCard
              key={order.id}
              order={order}
              onCancel={setCancelTarget}
              showActions={activeTab === "upcoming"}
            />
          ))
        )}
      </ScrollView>

      {/* Cancel Sheet */}
      <Modal
        visible={!!cancelTarget}
        transparent
        animationType="slide"
        onRequestClose={closeCancelSheet}
      >
        <Pressable style={styles.overlay} onPress={closeCancelSheet}>
          <Pressable style={styles.sheet}>
            {cancelResult ? (
              <>
                <View style={styles.handle} />
                <Text style={styles.sheetTitle}>
                  {cancelResult.type === "free"
                    ? "Meal cancelled"
                    : cancelResult.type === "late"
                      ? "Late cancellation"
                      : "Meal charged"}
                </Text>
                <Text style={styles.sheetBody}>
                  {cancelResult.type === "free"
                    ? "Your meal credit has been restored to your pass."
                    : cancelResult.type === "late"
                      ? `50% credit deducted (₹${cancelResult.fee}). Restaurant was planning.`
                      : `Full credit used (₹${cancelResult.fee}). Preparation had started.`}
                </Text>
                <Pressable style={styles.doneBtn} onPress={closeCancelSheet}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.handle} />
                <Text style={styles.sheetTitle}>
                  Cancel {cancelTarget?.slot} meal?
                </Text>
                <Text style={styles.sheetMeal}>
                  {cancelTarget?.restaurantName} · {cancelTarget?.mealName}
                </Text>

                {cancelStatus === "free" && (
                  <View style={[styles.infoBox, { backgroundColor: "#F0FDF4" }]}>
                    <Feather name="check-circle" size={16} color="#16A34A" />
                    <Text style={[styles.infoText, { color: "#166534" }]}>
                      Free cancellation available.{"\n"}Your meal credit stays in your pass.
                    </Text>
                  </View>
                )}
                {cancelStatus === "late" && (
                  <View style={[styles.infoBox, { backgroundColor: "#FFFBEB" }]}>
                    <Feather name="alert-triangle" size={16} color="#F59E0B" />
                    <Text style={[styles.infoText, { color: "#92400E" }]}>
                      Late cancellation fee applies.{"\n"}50% of your meal credit will be deducted.
                    </Text>
                  </View>
                )}
                {cancelStatus === "full" && (
                  <View style={[styles.infoBox, { backgroundColor: "#FEF2F2" }]}>
                    <Feather name="alert-circle" size={16} color="#EF4444" />
                    <Text style={[styles.infoText, { color: "#991B1B" }]}>
                      Meal preparation has started.{"\n"}Cancelling will use the full meal credit.
                    </Text>
                  </View>
                )}

                <View style={styles.actions}>
                  <Pressable
                    style={[styles.keepBtn, { borderColor: colors.border }]}
                    onPress={closeCancelSheet}
                  >
                    <Text style={[styles.keepText, { color: colors.foreground }]}>
                      Keep meal
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={confirmCancel}
                    disabled={cancelLoading}
                    style={[
                      styles.cancelBtn,
                      cancelStatus === "free" && { backgroundColor: "#16A34A" },
                      cancelStatus === "late" && { backgroundColor: "#F59E0B" },
                      cancelStatus === "full" && { backgroundColor: "#EF4444" },
                    ]}
                  >
                    <Text style={styles.cancelText}>
                      {cancelStatus === "free"
                        ? "Cancel meal"
                        : cancelStatus === "late"
                          ? "Cancel with fee"
                          : "Cancel anyway"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginBottom: 14,
  },
  tabs: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  tabText: {
    fontSize: 13,
  },
  listContent: {
    padding: 16,
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E4E4E7",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  sheetMeal: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#71717A",
    marginBottom: 16,
  },
  sheetBody: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#71717A",
    lineHeight: 22,
    marginBottom: 24,
  },
  infoBox: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  keepBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  keepText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  doneBtn: {
    height: 52,
    backgroundColor: "#F97316",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
});
