import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
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

import MealOrderCard from "@/components/MealOrderCard";
import PassCard from "@/components/PassCard";
import RestaurantCard from "@/components/RestaurantCard";
import { MealOrder, useApp } from "@/context/AppContext";
import { RESTAURANTS } from "@/constants/mockData";
import { useColors } from "@/hooks/useColors";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, activePass, orders, cancelOrder, getOrderCancelStatus } =
    useApp();

  const [cancelTarget, setCancelTarget] = useState<MealOrder | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelResult, setCancelResult] = useState<{
    type: string;
    fee: number;
  } | null>(null);

  const upcomingOrders = orders
    .filter(
      (o) =>
        !["delivered", "cancelled_free", "cancelled_late", "cancelled_full"].includes(
          o.status
        )
    )
    .sort(
      (a, b) =>
        new Date(a.scheduledDate).getTime() -
        new Date(b.scheduledDate).getTime()
    )
    .slice(0, 3);

  const firstName = user?.name?.split(" ")[0] ?? "there";

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

  const QUICK_ACTIONS = [
    {
      icon: "calendar" as const,
      label: "Schedule",
      color: "#F97316",
      bg: "#FFF3E8",
      onPress: () => router.push("/schedule-meal"),
    },
    {
      icon: "pause-circle" as const,
      label: "Pause",
      color: "#8B5CF6",
      bg: "#EDE9FE",
      onPress: () => router.push("/pause-meals"),
    },
    {
      icon: "plus-circle" as const,
      label: "Buy More",
      color: "#16A34A",
      bg: "#DCFCE7",
      onPress: () => router.push("/buy-pass"),
    },
    {
      icon: "help-circle" as const,
      label: "Support",
      color: "#3B82F6",
      bg: "#DBEAFE",
      onPress: () => router.push("/support"),
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom:
            insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90,
        }}
      >
        {/* Header */}
        <LinearGradient
          colors={["#F97316", "#EA580C"]}
          style={[
            styles.header,
            {
              paddingTop:
                insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
            },
          ]}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>
                {getGreeting()}, {firstName}
              </Text>
              {activePass ? (
                <Text style={styles.passCount}>
                  You're covered for{" "}
                  <Text style={styles.passCountBold}>
                    {activePass.remainingCredits} more meals
                  </Text>
                </Text>
              ) : (
                <Text style={styles.passCount}>No active pass</Text>
              )}
            </View>
            <Pressable
              onPress={() => router.push("/(tabs)/profile")}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {firstName.charAt(0).toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Pass Card */}
          {activePass ? (
            <PassCard pass={activePass} compact />
          ) : (
            <Pressable
              onPress={() => router.push("/buy-pass")}
              style={[styles.noPassCard, { borderColor: colors.border }]}
            >
              <Feather name="credit-card" size={20} color={colors.primary} />
              <Text style={[styles.noPassText, { color: colors.foreground }]}>
                Buy a Meal Pass to get started
              </Text>
              <Feather name="chevron-right" size={18} color={colors.primary} />
            </Pressable>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActions}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.label}
                onPress={action.onPress}
                style={({ pressed }) => [
                  styles.quickAction,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View
                  style={[
                    styles.quickActionIcon,
                    { backgroundColor: action.bg },
                  ]}
                >
                  <Feather name={action.icon} size={20} color={action.color} />
                </View>
                <Text
                  style={[
                    styles.quickActionLabel,
                    { color: colors.foreground },
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Upcoming meals */}
          {upcomingOrders.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text
                  style={[styles.sectionTitle, { color: colors.foreground }]}
                >
                  Upcoming meals
                </Text>
                <Pressable onPress={() => router.push("/(tabs)/orders")}>
                  <Text style={[styles.seeAll, { color: colors.primary }]}>
                    See all
                  </Text>
                </Pressable>
              </View>
              {upcomingOrders.map((order) => (
                <MealOrderCard
                  key={order.id}
                  order={order}
                  onCancel={setCancelTarget}
                />
              ))}
            </View>
          )}

          {upcomingOrders.length === 0 && (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="calendar" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No upcoming meals
              </Text>
              <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
                Schedule your first meal from restaurants nearby
              </Text>
              <Pressable
                onPress={() => router.push("/(tabs)/meals")}
                style={styles.scheduleBtn}
              >
                <Text style={styles.scheduleBtnText}>Browse restaurants</Text>
              </Pressable>
            </View>
          )}

          {/* Explore restaurants */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text
                style={[styles.sectionTitle, { color: colors.foreground }]}
              >
                Restaurants near you
              </Text>
              <Pressable onPress={() => router.push("/(tabs)/meals")}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>
                  See all
                </Text>
              </Pressable>
            </View>
            {RESTAURANTS.slice(0, 3).map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Cancel Sheet Modal */}
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
                <View style={styles.sheetHandle} />
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
                      ? `50% credit deducted (₹${cancelResult.fee}). The restaurant had started planning.`
                      : `Full credit used (₹${cancelResult.fee}). Preparation had already started.`}
                </Text>
                <Pressable style={styles.doneBtn} onPress={closeCancelSheet}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>
                  Cancel {cancelTarget?.slot} meal?
                </Text>
                <Text style={styles.sheetMealName}>
                  {cancelTarget?.restaurantName} · {cancelTarget?.mealName}
                </Text>

                {cancelStatus === "free" && (
                  <View style={styles.freeInfo}>
                    <Feather name="check-circle" size={16} color="#16A34A" />
                    <Text style={styles.freeInfoText}>
                      Free cancellation available.{"\n"}
                      Your meal credit will stay in your pass.
                    </Text>
                  </View>
                )}
                {cancelStatus === "late" && (
                  <View style={styles.lateInfo}>
                    <Feather name="alert-triangle" size={16} color="#F59E0B" />
                    <Text style={styles.lateInfoText}>
                      Late cancellation fee applies.{"\n"}
                      Cancelling will deduct 50% of your meal credit.
                    </Text>
                  </View>
                )}
                {cancelStatus === "full" && (
                  <View style={styles.fullInfo}>
                    <Feather name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.fullInfoText}>
                      Meal preparation has started.{"\n"}
                      Cancelling now will use the full meal credit.
                    </Text>
                  </View>
                )}

                <View style={styles.sheetActions}>
                  <Pressable
                    style={[styles.keepBtn, { borderColor: colors.border }]}
                    onPress={closeCancelSheet}
                  >
                    <Text style={[styles.keepBtnText, { color: colors.foreground }]}>
                      Keep meal
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.cancelConfirmBtn,
                      cancelStatus === "free" && { backgroundColor: "#16A34A" },
                      cancelStatus === "late" && { backgroundColor: "#F59E0B" },
                      cancelStatus === "full" && { backgroundColor: "#EF4444" },
                    ]}
                    onPress={confirmCancel}
                    disabled={cancelLoading}
                  >
                    <Text style={styles.cancelConfirmText}>
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
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greeting: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    marginBottom: 2,
  },
  passCount: {
    fontSize: 18,
    fontFamily: "Inter_400Regular",
    color: "#FFFFFF",
  },
  passCountBold: {
    fontFamily: "Inter_700Bold",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  noPassCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    backgroundColor: "#FFFFFF",
  },
  noPassText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  quickActions: {
    flexDirection: "row",
    gap: 8,
  },
  quickAction: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  section: {},
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
  },
  emptyBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  scheduleBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#F97316",
    borderRadius: 10,
  },
  scheduleBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  // Modal / Sheet styles
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
  sheetHandle: {
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
  sheetMealName: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#71717A",
    marginBottom: 20,
  },
  sheetBody: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#71717A",
    lineHeight: 22,
    marginBottom: 24,
  },
  freeInfo: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    alignItems: "flex-start",
  },
  freeInfoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#166534",
    lineHeight: 20,
  },
  lateInfo: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    alignItems: "flex-start",
  },
  lateInfoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#92400E",
    lineHeight: 20,
  },
  fullInfo: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    alignItems: "flex-start",
  },
  fullInfoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#991B1B",
    lineHeight: 20,
  },
  sheetActions: {
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
  keepBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  cancelConfirmBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelConfirmText: {
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
