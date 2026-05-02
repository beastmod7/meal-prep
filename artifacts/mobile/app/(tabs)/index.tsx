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

function formatDate(isoDate: string): string {
  return new Date(isoDate + "T12:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, subscriptions, orders, cancelOrder, getOrderCancelStatus } = useApp();

  const [cancelTarget, setCancelTarget] = useState<MealOrder | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelResult, setCancelResult] = useState<{ type: string; fee: number } | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const activeSubs = subscriptions.filter((s) => s.status === "active" || s.status === "paused");

  const todaysMeals = orders
    .filter((o) => o.scheduledDate === today && o.status === "scheduled")
    .sort((a, b) => (a.slot === "lunch" ? -1 : 1));

  const upcomingOrders = orders
    .filter(
      (o) =>
        o.scheduledDate > today &&
        !["delivered", "cancelled_free", "cancelled_late", "cancelled_full"].includes(o.status)
    )
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    .slice(0, 3);

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const cancelStatus = cancelTarget ? getOrderCancelStatus(cancelTarget) : null;

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
      icon: "plus-circle" as const,
      label: "Subscribe",
      color: "#F97316",
      bg: "#FFF3E8",
      onPress: () => router.push("/(tabs)/meals"),
    },
    {
      icon: "credit-card" as const,
      label: "My Plans",
      color: "#8B5CF6",
      bg: "#EDE9FE",
      onPress: () => router.push("/(tabs)/pass"),
    },
    {
      icon: "list" as const,
      label: "Orders",
      color: "#16A34A",
      bg: "#DCFCE7",
      onPress: () => router.push("/(tabs)/orders"),
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
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90,
        }}
      >
        {/* Header */}
        <LinearGradient
          colors={["#F97316", "#EA580C"]}
          style={[
            styles.header,
            { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16 },
          ]}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>
                {getGreeting()}, {firstName}
              </Text>
              <Text style={styles.subLine}>
                {activeSubs.length === 0
                  ? "No active subscriptions"
                  : `${activeSubs.length} active subscription${activeSubs.length > 1 ? "s" : ""}`}
              </Text>
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

          {/* Active subscriptions summary pills */}
          {activeSubs.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.subPillsScroll}
              contentContainerStyle={styles.subPillsContent}
            >
              {activeSubs.map((sub) => (
                <Pressable
                  key={sub.id}
                  onPress={() => router.push("/(tabs)/pass")}
                  style={styles.subPill}
                >
                  <Text style={styles.subPillName}>{sub.restaurantName}</Text>
                  <Text style={styles.subPillDetail}>
                    {sub.slot === "lunch" ? "☀️" : "🌙"} {sub.remainingDays} days left
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </LinearGradient>

        <View style={styles.content}>
          {/* Today's meals */}
          {todaysMeals.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Today's meals
              </Text>
              {todaysMeals.map((order) => (
                <MealOrderCard
                  key={order.id}
                  order={order}
                  onCancel={setCancelTarget}
                />
              ))}
            </View>
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
                <View style={[styles.quickActionIcon, { backgroundColor: action.bg }]}>
                  <Feather name={action.icon} size={20} color={action.color} />
                </View>
                <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Upcoming meals */}
          {upcomingOrders.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                  Coming up
                </Text>
                <Pressable onPress={() => router.push("/(tabs)/orders")}>
                  <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
                </Pressable>
              </View>
              {upcomingOrders.map((order) => (
                <MealOrderCard key={order.id} order={order} onCancel={setCancelTarget} />
              ))}
            </View>
          )}

          {/* No subscriptions empty state */}
          {activeSubs.length === 0 && (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="coffee" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                Subscribe to a restaurant
              </Text>
              <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
                Pick a restaurant, choose lunch or dinner, pick a 10, 20, or 30-day pack — and every meal is auto-scheduled.
              </Text>
              <Pressable
                onPress={() => router.push("/(tabs)/meals")}
                style={styles.discoverBtn}
              >
                <Text style={styles.discoverBtnText}>Discover restaurants</Text>
              </Pressable>
            </View>
          )}

          {/* Explore restaurants */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Partner restaurants
              </Text>
              <Pressable onPress={() => router.push("/(tabs)/meals")}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
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
                  {cancelResult.type === "free" ? "Day cancelled" : cancelResult.type === "late" ? "Late cancellation" : "Meal charged"}
                </Text>
                <Text style={styles.sheetBody}>
                  {cancelResult.type === "free"
                    ? "This day has been cancelled. No charge applied."
                    : cancelResult.type === "late"
                      ? `Late cancellation fee: ₹${cancelResult.fee} (50% of day rate).`
                      : `Full charge: ₹${cancelResult.fee}. Preparation had already started.`}
                </Text>
                <Pressable style={styles.doneBtn} onPress={closeCancelSheet}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>
                  Cancel {cancelTarget?.slot} on {cancelTarget ? formatDate(cancelTarget.scheduledDate) : ""}?
                </Text>
                <Text style={styles.sheetMealName}>
                  {cancelTarget?.restaurantName} · {cancelTarget?.mealName}
                </Text>
                {cancelStatus === "free" && (
                  <View style={styles.freeInfo}>
                    <Feather name="check-circle" size={16} color="#16A34A" />
                    <Text style={styles.freeInfoText}>
                      Free cancellation available.{"\n"}No charge for this day.
                    </Text>
                  </View>
                )}
                {cancelStatus === "late" && (
                  <View style={styles.lateInfo}>
                    <Feather name="alert-triangle" size={16} color="#F59E0B" />
                    <Text style={styles.lateInfoText}>
                      Late cancellation fee applies.{"\n"}₹{cancelTarget ? Math.round(cancelTarget.pricePerDay * 0.5) : 0} (50% of day rate) will be charged.
                    </Text>
                  </View>
                )}
                {cancelStatus === "full" && (
                  <View style={styles.fullInfo}>
                    <Feather name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.fullInfoText}>
                      Preparation has started.{"\n"}Full day charge ₹{cancelTarget?.pricePerDay} applies.
                    </Text>
                  </View>
                )}
                <View style={styles.sheetActions}>
                  <Pressable style={[styles.keepBtn, { borderColor: colors.border }]} onPress={closeCancelSheet}>
                    <Text style={[styles.keepBtnText, { color: colors.foreground }]}>Keep</Text>
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
                      {cancelStatus === "free" ? "Cancel day" : cancelStatus === "late" ? "Cancel with fee" : "Cancel anyway"}
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
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greeting: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.85)",
    marginBottom: 2,
  },
  subLine: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
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
  subPillsScroll: {
    marginTop: 14,
  },
  subPillsContent: {
    gap: 8,
    paddingRight: 4,
  },
  subPill: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  subPillName: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 1,
  },
  subPillDetail: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  section: {},
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 10,
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
    textAlign: "center",
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
    lineHeight: 19,
  },
  discoverBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#F97316",
    borderRadius: 10,
  },
  discoverBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
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
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E4E4E7",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 19,
    fontFamily: "Inter_700Bold",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  sheetMealName: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#71717A",
    marginBottom: 18,
  },
  sheetBody: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#71717A",
    lineHeight: 22,
    marginBottom: 24,
  },
  freeInfo: { flexDirection: "row", gap: 10, backgroundColor: "#F0FDF4", borderRadius: 12, padding: 14, marginBottom: 20, alignItems: "flex-start" },
  freeInfoText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#166534", lineHeight: 20 },
  lateInfo: { flexDirection: "row", gap: 10, backgroundColor: "#FFFBEB", borderRadius: 12, padding: 14, marginBottom: 20, alignItems: "flex-start" },
  lateInfoText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#92400E", lineHeight: 20 },
  fullInfo: { flexDirection: "row", gap: 10, backgroundColor: "#FEF2F2", borderRadius: 12, padding: 14, marginBottom: 20, alignItems: "flex-start" },
  fullInfoText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#991B1B", lineHeight: 20 },
  sheetActions: { flexDirection: "row", gap: 10 },
  keepBtn: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  keepBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cancelConfirmBtn: { flex: 1, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cancelConfirmText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  doneBtn: { height: 52, backgroundColor: "#F97316", borderRadius: 14, alignItems: "center", justifyContent: "center" },
  doneBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
});
