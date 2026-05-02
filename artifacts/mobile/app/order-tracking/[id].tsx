import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  notifyOrderDelivered,
  notifyOrderOutForDelivery,
  notifyOrderPreparing,
  requestNotificationPermissions,
} from "@/utils/notifications";

type DeliveryStep = {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  desc: string;
  eta?: string;
};

const DELIVERY_STEPS: DeliveryStep[] = [
  {
    key: "scheduled",
    label: "Scheduled",
    icon: "calendar",
    desc: "Meal confirmed in your schedule",
    eta: "Day before",
  },
  {
    key: "accepted",
    label: "Restaurant confirmed",
    icon: "check-circle",
    desc: "The restaurant has accepted your order",
    eta: "Morning of delivery",
  },
  {
    key: "preparing",
    label: "Being prepared",
    icon: "clock",
    desc: "Chef is cooking your meal fresh",
    eta: "~40 mins before delivery",
  },
  {
    key: "out",
    label: "Out for delivery",
    icon: "truck",
    desc: "Rider picked up your meal and is on the way",
    eta: "15–20 mins away",
  },
  {
    key: "delivered",
    label: "Delivered",
    icon: "check-circle",
    desc: "Meal delivered. Enjoy! 😊",
    eta: "",
  },
];

const DEMO_AGENT = {
  name: "Rajesh Kumar",
  vehicle: "DL-01 KA-2384",
  type: "Bike",
  phone: "+91 98765-43210",
  rating: "4.8",
};

function getStepIndex(status: string): number {
  switch (status) {
    case "scheduled": return 0;
    case "locked":
    case "accepted": return 1;
    case "preparing": return 2;
    case "out": return 3;
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
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { orders } = useApp();

  const order = orders.find((o) => o.id === id);
  const [demoStatus, setDemoStatus] = useState<string | null>(null);

  if (!order) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, padding: 20 }}>Order not found</Text>
      </View>
    );
  }

  const effectiveStatus = demoStatus ?? order.status;
  const isCancelled = ["cancelled_free", "cancelled_late", "cancelled_full"].includes(effectiveStatus);
  const currentStep = isCancelled ? -1 : getStepIndex(effectiveStatus);

  const isToday = order.scheduledDate === new Date().toISOString().split("T")[0];
  const isScheduled = effectiveStatus === "scheduled";
  const isActive = ["accepted", "preparing", "out"].includes(effectiveStatus);

  async function simulateNextStep() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const steps = ["scheduled", "accepted", "preparing", "out", "delivered"];
    const current = steps.indexOf(demoStatus ?? order!.status);
    if (current >= steps.length - 1) return;
    const next = steps[current + 1];
    setDemoStatus(next);

    const hasPermission = await requestNotificationPermissions();
    if (hasPermission) {
      if (next === "preparing") await notifyOrderPreparing(order!.restaurantName);
      if (next === "out") await notifyOrderOutForDelivery(order!.restaurantName);
      if (next === "delivered") await notifyOrderDelivered(order!.restaurantName);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Order summary card */}
        <View style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.orderHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.mealName, { color: colors.foreground }]}>
                {order.mealName}
              </Text>
              <Text style={[styles.restName, { color: colors.mutedForeground }]}>
                {order.restaurantName}
              </Text>
            </View>
            <View style={[
              styles.slotBadge,
              { backgroundColor: order.slot === "lunch" ? "#EFF6FF" : "#EDE9FE" },
            ]}>
              <Text style={[
                styles.slotText,
                { color: order.slot === "lunch" ? "#1E3A8A" : "#4C1D95" },
              ]}>
                {order.slot === "lunch" ? "☀️ Lunch" : "🌙 Dinner"}
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
              <Feather name="clock" size={13} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {order.slot === "lunch" ? "12–2 PM" : "7–9 PM"}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="credit-card" size={13} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                ₹{order.pricePerDay}
              </Text>
            </View>
          </View>
        </View>

        {/* Cancelled state */}
        {isCancelled ? (
          <View style={[styles.cancelledCard, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
            <Feather name="x-circle" size={24} color="#EF4444" />
            <View style={{ flex: 1 }}>
              <Text style={styles.cancelledTitle}>
                {effectiveStatus === "cancelled_free" ? "Cancelled for free" :
                  effectiveStatus === "cancelled_late" ? "Late cancellation" :
                    "Cancelled (full charge)"}
              </Text>
              <Text style={styles.cancelledDesc}>
                {effectiveStatus === "cancelled_free"
                  ? "Your meal credit has been restored."
                  : effectiveStatus === "cancelled_late"
                    ? "50% credit was deducted (late cancel fee)."
                    : "Full credit was deducted (prep had started)."}
              </Text>
            </View>
          </View>
        ) : (
          <>
            {/* Status timeline */}
            <View style={[styles.timelineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.timelineHeader}>
                <Text style={[styles.timelineTitle, { color: colors.foreground }]}>
                  Order status
                </Text>
                {effectiveStatus === "delivered" ? (
                  <View style={[styles.liveChip, { backgroundColor: "#DCFCE7" }]}>
                    <Text style={[styles.liveChipText, { color: "#15803D" }]}>✓ Done</Text>
                  </View>
                ) : (
                  <View style={[styles.liveChip, { backgroundColor: "#EFF6FF" }]}>
                    <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.liveChipText, { color: colors.primary }]}>Live</Text>
                  </View>
                )}
              </View>

              {DELIVERY_STEPS.map((step, i) => {
                const isComplete = i < currentStep;
                const isCurrent = i === currentStep;
                const isPending = i > currentStep;
                return (
                  <View key={step.key} style={styles.stepRow}>
                    <View style={styles.stepLeft}>
                      <View style={[
                        styles.stepDot,
                        isComplete && { backgroundColor: "#16A34A", borderColor: "#16A34A" },
                        isCurrent && { backgroundColor: colors.primary, borderColor: colors.primary },
                        isPending && { backgroundColor: colors.background, borderColor: colors.border },
                      ]}>
                        {isComplete ? (
                          <Feather name="check" size={10} color="#FFFFFF" />
                        ) : isCurrent ? (
                          <Feather name={step.icon} size={10} color="#FFFFFF" />
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
                      <View style={styles.stepLabelRow}>
                        <Text style={[
                          styles.stepLabel,
                          {
                            color: isCurrent ? colors.primary : isComplete ? "#16A34A" : colors.mutedForeground,
                            fontFamily: isCurrent ? "Inter_700Bold" : "Inter_500Medium",
                          },
                        ]}>
                          {step.label}
                        </Text>
                        {step.eta && isCurrent && (
                          <View style={[styles.etaChip, { backgroundColor: colors.muted }]}>
                            <Text style={[styles.etaText, { color: colors.mutedForeground }]}>
                              {step.eta}
                            </Text>
                          </View>
                        )}
                      </View>
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

            {/* Delivery agent card — shown when out for delivery */}
            {(effectiveStatus === "out" || effectiveStatus === "preparing") && (
              <View style={[styles.agentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.agentAvatar, { backgroundColor: "#EFF6FF" }]}>
                  <Feather name="user" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.agentName, { color: colors.foreground }]}>
                    {DEMO_AGENT.name}
                  </Text>
                  <Text style={[styles.agentMeta, { color: colors.mutedForeground }]}>
                    {DEMO_AGENT.type} · {DEMO_AGENT.vehicle}
                  </Text>
                  <View style={styles.agentRating}>
                    <Feather name="star" size={11} color="#F59E0B" />
                    <Text style={[styles.agentRatingText, { color: colors.mutedForeground }]}>
                      {DEMO_AGENT.rating} rating
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() =>
                    Alert.alert("Call Rider", `${DEMO_AGENT.phone}\n\n(Demo — no real call)`)
                  }
                  style={[styles.callBtn, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}
                >
                  <Feather name="phone" size={16} color={colors.primary} />
                </Pressable>
              </View>
            )}

            {/* Logistics info — no maps, text-based */}
            {isActive && (
              <View style={[styles.logisticsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.logisticsTitle, { color: colors.foreground }]}>
                  Delivery info
                </Text>
                {[
                  { icon: "map-pin" as const, label: "Pickup", value: `${order.restaurantName} kitchen` },
                  { icon: "navigation" as const, label: "Drop-off", value: "Your hostel / registered address" },
                  { icon: "clock" as const, label: "ETA", value: effectiveStatus === "out" ? "15–20 mins" : "~40 mins" },
                  { icon: "package" as const, label: "Packaging", value: "Eco-friendly sealed container" },
                ].map((item, i) => (
                  <View key={i} style={[styles.logisticsRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                    <Feather name={item.icon} size={13} color={colors.mutedForeground} />
                    <Text style={[styles.logisticsLabel, { color: colors.mutedForeground }]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.logisticsValue, { color: colors.foreground }]}>
                      {item.value}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Demo controls */}
            {isToday && effectiveStatus !== "delivered" && (
              <View style={[styles.demoBox, { backgroundColor: "#FEFCE8", borderColor: "#FDE68A" }]}>
                <View style={styles.demoHeader}>
                  <Feather name="zap" size={13} color="#D97706" />
                  <Text style={[styles.demoTitle, { color: "#92400E" }]}>
                    Demo mode — simulate delivery
                  </Text>
                </View>
                <Text style={[styles.demoDesc, { color: "#92400E" }]}>
                  Tap to advance the order status and trigger a local notification.
                </Text>
                <Pressable
                  onPress={simulateNextStep}
                  style={({ pressed }) => [
                    styles.demoBtn,
                    { backgroundColor: "#D97706" },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={styles.demoBtnText}>Advance to next step →</Text>
                </Pressable>
              </View>
            )}

            {/* Cancellation window info */}
            {isScheduled && (
              <View style={[styles.policyBox, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                <Feather name="info" size={14} color={colors.primary} />
                <Text style={styles.policyText}>
                  Free cancellation until{" "}
                  <Text style={{ fontFamily: "Inter_600SemiBold" }}>
                    {new Date(order.freeCancelUntil).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </Text>
                  {" "}on{" "}
                  {new Date(order.freeCancelUntil).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  orderCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14 },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  mealName: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 2 },
  restName: { fontSize: 13, fontFamily: "Inter_400Regular" },
  slotBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  slotText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  divider: { height: 1, marginBottom: 12 },
  orderMeta: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cancelledCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14 },
  cancelledTitle: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#991B1B", marginBottom: 3 },
  cancelledDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#EF4444" },
  timelineCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14 },
  timelineHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  timelineTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  liveChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveChipText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  stepRow: { flexDirection: "row", gap: 14 },
  stepLeft: { alignItems: "center", width: 24 },
  stepDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: "#16A34A", alignItems: "center", justifyContent: "center" },
  stepLine: { width: 2, flex: 1, minHeight: 20, marginVertical: 4 },
  stepContent: { flex: 1, paddingBottom: 16 },
  stepLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepLabel: { fontSize: 14 },
  etaChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100 },
  etaText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  stepDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 3, lineHeight: 17 },
  agentCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
  agentAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  agentName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  agentMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 2 },
  agentRating: { flexDirection: "row", alignItems: "center", gap: 4 },
  agentRatingText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  callBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  logisticsCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
  logisticsTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 10 },
  logisticsRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  logisticsLabel: { fontSize: 12, fontFamily: "Inter_400Regular", width: 60 },
  logisticsValue: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  demoBox: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 14 },
  demoHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  demoTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  demoDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, marginBottom: 10 },
  demoBtn: { borderRadius: 10, paddingVertical: 9, alignItems: "center" },
  demoBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFF" },
  policyBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  policyText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#1E3A8A", lineHeight: 18 },
});
