import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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
  const [cancelResult, setCancelResult] = useState<{ type: string; fee: number } | null>(null);

  const upcoming = orders
    .filter((o) =>
      !["delivered", "cancelled_free", "cancelled_late", "cancelled_full"].includes(o.status)
    )
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));

  const past = orders
    .filter((o) => o.status === "delivered")
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));

  const cancelled = orders
    .filter((o) =>
      ["cancelled_free", "cancelled_late", "cancelled_full"].includes(o.status)
    )
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));

  const tabData: Record<Tab, MealOrder[]> = { upcoming, past, cancelled };
  const current = tabData[activeTab];

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#3B82F6", "#2563EB"]}
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 20 },
        ]}
      >
        <Text style={styles.title}>Orders</Text>
        <Text style={styles.subtitle}>Daily meals from your subscriptions</Text>

        <View style={styles.tabs}>
          {(["upcoming", "past", "cancelled"] as Tab[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === "upcoming" && upcoming.length > 0 ? ` · ${upcoming.length}` : ""}
              </Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {current.length === 0 ? (
          <View style={styles.empty}>
            <Feather
              name={activeTab === "upcoming" ? "calendar" : activeTab === "past" ? "check-circle" : "x-circle"}
              size={32}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No {activeTab} meals
            </Text>
            {activeTab === "upcoming" && (
              <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
                Subscribe to a restaurant to get daily meals auto-scheduled
              </Text>
            )}
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
                    ? "Day cancelled"
                    : cancelResult.type === "late"
                      ? "Late cancellation"
                      : "Meal charged"}
                </Text>
                <Text style={styles.sheetBody}>
                  {cancelResult.type === "free"
                    ? "This meal day has been cancelled at no charge."
                    : cancelResult.type === "late"
                      ? `Late cancellation fee: ₹${cancelResult.fee} (50% of day rate).`
                      : `Full day charge: ₹${cancelResult.fee}. Meal preparation had started.`}
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
                      Free cancellation — no charge for this day.
                    </Text>
                  </View>
                )}
                {cancelStatus === "late" && (
                  <View style={[styles.infoBox, { backgroundColor: "#FFFBEB" }]}>
                    <Feather name="alert-triangle" size={16} color="#F59E0B" />
                    <Text style={[styles.infoText, { color: "#1E3A8A" }]}>
                      Late cancel fee: ₹{cancelTarget ? Math.round(cancelTarget.pricePerDay * 0.5) : 0} (50% of ₹{cancelTarget?.pricePerDay}/day).
                    </Text>
                  </View>
                )}
                {cancelStatus === "full" && (
                  <View style={[styles.infoBox, { backgroundColor: "#FEF2F2" }]}>
                    <Feather name="alert-circle" size={16} color="#EF4444" />
                    <Text style={[styles.infoText, { color: "#991B1B" }]}>
                      Full charge ₹{cancelTarget?.pricePerDay} — meal preparation has started.
                    </Text>
                  </View>
                )}

                <View style={styles.actions}>
                  <Pressable
                    style={[styles.keepBtn, { borderColor: colors.border }]}
                    onPress={closeCancelSheet}
                  >
                    <Text style={[styles.keepText, { color: colors.foreground }]}>Keep meal</Text>
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
                      {cancelStatus === "free" ? "Cancel day" : cancelStatus === "late" ? "Cancel (50% fee)" : "Cancel anyway"}
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
    paddingBottom: 16,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 2 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginBottom: 14 },
  tabs: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, padding: 3, gap: 2 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: "center" },
  tabActive: { backgroundColor: "#FFFFFF" },
  tabText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },
  tabTextActive: { fontFamily: "Inter_600SemiBold", color: "#2563EB" },
  listContent: { padding: 16 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  emptyHint: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 240, lineHeight: 18 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: "#E4E4E7", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#1A1A1A", marginBottom: 4 },
  sheetMeal: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#71717A", marginBottom: 16 },
  sheetBody: { fontSize: 15, fontFamily: "Inter_400Regular", color: "#71717A", lineHeight: 22, marginBottom: 24 },
  infoBox: { flexDirection: "row", gap: 10, borderRadius: 12, padding: 14, marginBottom: 20, alignItems: "flex-start" },
  infoText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  actions: { flexDirection: "row", gap: 10 },
  keepBtn: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  keepText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cancelBtn: { flex: 1, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  doneBtn: { height: 52, backgroundColor: "#3B82F6", borderRadius: 14, alignItems: "center", justifyContent: "center" },
  doneBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
});
