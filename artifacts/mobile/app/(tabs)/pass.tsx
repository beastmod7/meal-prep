import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { RestaurantSubscription, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  return (
    <View style={progressStyles.track}>
      <View style={[progressStyles.fill, { width: `${pct * 100}%` as any }]} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    height: 6,
    backgroundColor: "#E4E4E7",
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 3,
  },
});

function SubscriptionCard({
  sub,
  onPause,
  onCancel,
}: {
  sub: RestaurantSubscription;
  onPause: () => void;
  onCancel: () => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const isActive = sub.status === "active";
  const isPaused = sub.status === "paused";
  const isCancelled = sub.status === "cancelled" || sub.status === "refund_requested";

  const statusColor = isActive ? "#16A34A" : isPaused ? "#F59E0B" : "#71717A";
  const statusLabel = isActive ? "Active" : isPaused ? "Paused" : sub.status === "refund_requested" ? "Refund pending" : "Cancelled";

  return (
    <View
      style={[
        cardStyles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        isCancelled && { opacity: 0.6 },
      ]}
    >
      <LinearGradient
        colors={sub.slot === "lunch" ? ["#EFF6FF", "#F0F4FF"] : ["#F5F3FF", "#F0F4FF"]}
        style={cardStyles.cardHeader}
      >
        <View style={cardStyles.headerLeft}>
          <View style={cardStyles.slotIcon}>
            <Text style={cardStyles.slotEmoji}>{sub.slot === "lunch" ? "☀️" : "🌙"}</Text>
          </View>
          <View>
            <Text style={[cardStyles.restName, { color: colors.foreground }]}>
              {sub.restaurantName}
            </Text>
            <Text style={[cardStyles.slotLabel, { color: colors.mutedForeground }]}>
              {sub.slot === "lunch" ? "Lunch" : "Dinner"} · {sub.totalDays}-day pack
            </Text>
          </View>
        </View>
        <View style={[cardStyles.statusBadge, { backgroundColor: statusColor + "18" }]}>
          <View style={[cardStyles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[cardStyles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </LinearGradient>

      <View style={cardStyles.cardBody}>
        <View style={cardStyles.statsRow}>
          <View style={cardStyles.stat}>
            <Text style={[cardStyles.statValue, { color: colors.foreground }]}>
              {sub.remainingDays}
            </Text>
            <Text style={[cardStyles.statLabel, { color: colors.mutedForeground }]}>days left</Text>
          </View>
          <View style={cardStyles.stat}>
            <Text style={[cardStyles.statValue, { color: colors.foreground }]}>
              ₹{sub.pricePerDay}
            </Text>
            <Text style={[cardStyles.statLabel, { color: colors.mutedForeground }]}>per day</Text>
          </View>
          <View style={cardStyles.stat}>
            <Text style={[cardStyles.statValue, { color: colors.foreground }]}>
              {formatDate(sub.endDate)}
            </Text>
            <Text style={[cardStyles.statLabel, { color: colors.mutedForeground }]}>ends</Text>
          </View>
        </View>

        <ProgressBar value={sub.usedDays} total={sub.totalDays} />
        <Text style={[cardStyles.progressText, { color: colors.mutedForeground }]}>
          {sub.usedDays} of {sub.totalDays} days used
        </Text>

        {!isCancelled && (
          <View style={cardStyles.actions}>
            {isActive && (
              <Pressable
                onPress={onPause}
                style={({ pressed }) => [
                  cardStyles.actionBtn,
                  { borderColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Feather name="pause-circle" size={14} color={colors.mutedForeground} />
                <Text style={[cardStyles.actionBtnText, { color: colors.foreground }]}>Pause</Text>
              </Pressable>
            )}
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                cardStyles.actionBtn,
                { borderColor: "#FEE2E2", backgroundColor: "#FEF2F2" },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Feather name="x-circle" size={14} color="#EF4444" />
              <Text style={[cardStyles.actionBtnText, { color: "#EF4444" }]}>Cancel & Refund</Text>
            </Pressable>
          </View>
        )}

        {isCancelled && sub.status === "refund_requested" && (
          <View style={[cardStyles.refundNote, { backgroundColor: "#EFF6FF" }]}>
            <Feather name="info" size={13} color="#3B82F6" />
            <Text style={cardStyles.refundNoteText}>
              Refund of ₹{Math.max(0, sub.remainingDays * sub.pricePerDay - sub.lateCancellationFees).toLocaleString("en-IN")} is being processed.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 14 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  slotIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center" },
  slotEmoji: { fontSize: 20 },
  restName: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 1 },
  slotLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  cardBody: { padding: 14, gap: 10 },
  statsRow: { flexDirection: "row", gap: 0 },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 1 },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  progressText: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: -4 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  actionBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  refundNote: { flexDirection: "row", gap: 8, alignItems: "flex-start", padding: 10, borderRadius: 10 },
  refundNoteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#1D4ED8", lineHeight: 17 },
});

export default function PlansScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { subscriptions, ledger, cancelSubscription } = useApp();

  const [cancelTarget, setCancelTarget] = useState<RestaurantSubscription | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelResult, setCancelResult] = useState<{ refundAmount: number } | null>(null);

  const activeSubs = subscriptions.filter((s) => s.status === "active" || s.status === "paused");
  const pastSubs = subscriptions.filter(
    (s) => s.status === "cancelled" || s.status === "completed" || s.status === "refund_requested"
  );

  const recentLedger = ledger.slice(0, 6);

  async function confirmCancel() {
    if (!cancelTarget) return;
    setCancelLoading(true);
    const result = await cancelSubscription(cancelTarget.id);
    setCancelLoading(false);
    setCancelResult(result);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function closeCancelModal() {
    setCancelTarget(null);
    setCancelResult(null);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90,
        }}
      >
        <LinearGradient
          colors={["#3B82F6", "#2563EB"]}
          style={[
            styles.header,
            { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 20 },
          ]}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>My Plans</Text>
              <Text style={styles.headerSubtitle}>Your restaurant subscriptions</Text>
            </View>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{activeSubs.length} active</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Policy reminder */}
          <View style={[styles.policyBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <Feather name="info" size={14} color="#1E3A8A" />
            <Text style={styles.policyText}>
              Cancel by 10 PM the previous night for free. Late cancels incur 50% day charge. Prep started = full day charge.
            </Text>
          </View>

          {/* Active subscriptions */}
          {activeSubs.length > 0 ? (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Active</Text>
              {activeSubs.map((sub) => (
                <SubscriptionCard
                  key={sub.id}
                  sub={sub}
                  onPause={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({ pathname: "/pause-meals", params: { subscriptionId: sub.id } });
                  }}
                  onCancel={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setCancelTarget(sub);
                  }}
                />
              ))}
            </View>
          ) : (
            <View style={[styles.noSubs, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="coffee" size={36} color={colors.mutedForeground} />
              <Text style={[styles.noSubsTitle, { color: colors.foreground }]}>No active plans</Text>
              <Text style={[styles.noSubsBody, { color: colors.mutedForeground }]}>
                Subscribe to a restaurant for 10, 20, or 30 days of daily meals — lunch or dinner.
              </Text>
              <Pressable onPress={() => router.push("/(tabs)/meals")} style={styles.newSubBtn}>
                <Text style={styles.newSubBtnText}>Browse restaurants</Text>
              </Pressable>
            </View>
          )}

          {/* Add another subscription */}
          {activeSubs.length > 0 && (
            <Pressable
              onPress={() => router.push("/(tabs)/meals")}
              style={({ pressed }) => [
                styles.addSubBtn,
                { borderColor: colors.primary },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Feather name="plus-circle" size={16} color={colors.primary} />
              <Text style={[styles.addSubText, { color: colors.primary }]}>
                Add another subscription
              </Text>
            </Pressable>
          )}

          {/* Past subscriptions */}
          {pastSubs.length > 0 && (
            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Past</Text>
              {pastSubs.map((sub) => (
                <SubscriptionCard
                  key={sub.id}
                  sub={sub}
                  onPause={() => {}}
                  onCancel={() => {}}
                />
              ))}
            </View>
          )}

          {/* Recent activity */}
          {recentLedger.length > 0 && (
            <View style={[styles.ledgerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.ledgerHeader}>
                <Text style={[styles.ledgerTitle, { color: colors.foreground }]}>
                  Recent activity
                </Text>
                <Pressable onPress={() => router.push("/ledger")}>
                  <Text style={[styles.viewAll, { color: colors.primary }]}>View all</Text>
                </Pressable>
              </View>
              {recentLedger.map((entry, i) => (
                <View
                  key={entry.id}
                  style={[
                    styles.ledgerRow,
                    i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                  ]}
                >
                  <View style={styles.ledgerLeft}>
                    <Text style={[styles.ledgerDesc, { color: colors.foreground }]} numberOfLines={1}>
                      {entry.description}
                    </Text>
                    <Text style={[styles.ledgerDate, { color: colors.mutedForeground }]}>
                      {new Date(entry.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.ledgerAmount,
                      { color: entry.amountDelta >= 0 ? "#16A34A" : "#EF4444" },
                    ]}
                  >
                    {entry.amountDelta >= 0 ? "+" : ""}₹{Math.abs(entry.amountDelta).toLocaleString("en-IN")}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Cancel confirmation modal */}
      <Modal visible={!!cancelTarget} transparent animationType="slide" onRequestClose={closeCancelModal}>
        <Pressable style={styles.overlay} onPress={cancelResult ? closeCancelModal : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            {cancelResult ? (
              <>
                <Text style={styles.sheetTitle}>Subscription cancelled</Text>
                <Text style={styles.sheetBody}>
                  {cancelResult.refundAmount > 0
                    ? `₹${cancelResult.refundAmount.toLocaleString("en-IN")} will be refunded for your unused days.`
                    : "Subscription has been cancelled. No refund is applicable after late cancellation fees."}
                </Text>
                <Pressable style={styles.doneBtn} onPress={closeCancelModal}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.sheetTitle}>Cancel subscription?</Text>
                <Text style={styles.sheetMeal}>
                  {cancelTarget?.restaurantName} · {cancelTarget?.slot} · {cancelTarget?.totalDays}-day pack
                </Text>
                <View style={[styles.refundInfo, { backgroundColor: "#F0FDF4" }]}>
                  <Feather name="rotate-ccw" size={16} color="#16A34A" />
                  <Text style={styles.refundInfoText}>
                    You'll receive a refund of{" "}
                    <Text style={{ fontFamily: "Inter_700Bold" }}>
                      ₹{cancelTarget ? Math.max(0, cancelTarget.remainingDays * cancelTarget.pricePerDay - cancelTarget.lateCancellationFees).toLocaleString("en-IN") : 0}
                    </Text>
                    {" "}for {cancelTarget?.remainingDays} unused days.
                  </Text>
                </View>
                <Text style={styles.sheetWarning}>
                  All upcoming meals for this subscription will be cancelled. You can subscribe again anytime.
                </Text>
                <View style={styles.sheetActions}>
                  <Pressable style={[styles.keepBtn, { borderColor: colors.border }]} onPress={closeCancelModal}>
                    <Text style={[styles.keepBtnText, { color: colors.foreground }]}>Keep it</Text>
                  </Pressable>
                  <Pressable
                    onPress={confirmCancel}
                    disabled={cancelLoading}
                    style={({ pressed }) => [
                      styles.confirmCancelBtn,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={styles.confirmCancelText}>
                      {cancelLoading ? "Cancelling…" : "Cancel & Refund"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 2 },
  headerSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },
  headerBadge: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5 },
  headerBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  content: { padding: 16, gap: 16 },
  policyBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  policyText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#1E3A8A", lineHeight: 17 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 10 },
  noSubs: { borderRadius: 16, borderWidth: 1, padding: 28, alignItems: "center", gap: 8 },
  noSubsTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 4 },
  noSubsBody: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19, maxWidth: 260 },
  newSubBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: "#3B82F6", borderRadius: 12 },
  newSubBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  addSubBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed" },
  addSubText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  ledgerCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  ledgerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4 },
  ledgerTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  viewAll: { fontSize: 13, fontFamily: "Inter_500Medium" },
  ledgerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10 },
  ledgerLeft: { flex: 1, marginRight: 8 },
  ledgerDesc: { fontSize: 13, fontFamily: "Inter_500Medium" },
  ledgerDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  ledgerAmount: { fontSize: 13, fontFamily: "Inter_700Bold" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, backgroundColor: "#E4E4E7", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#1A1A1A", marginBottom: 4 },
  sheetMeal: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#71717A", marginBottom: 16 },
  sheetBody: { fontSize: 15, fontFamily: "Inter_400Regular", color: "#71717A", lineHeight: 22, marginBottom: 24 },
  refundInfo: { flexDirection: "row", gap: 10, borderRadius: 12, padding: 14, marginBottom: 12, alignItems: "flex-start" },
  refundInfoText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#166534", lineHeight: 20 },
  sheetWarning: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#71717A", lineHeight: 18, marginBottom: 20 },
  sheetActions: { flexDirection: "row", gap: 10 },
  keepBtn: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  keepBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  confirmCancelBtn: { flex: 1, height: 52, backgroundColor: "#EF4444", borderRadius: 14, alignItems: "center", justifyContent: "center" },
  confirmCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  doneBtn: { height: 52, backgroundColor: "#3B82F6", borderRadius: 14, alignItems: "center", justifyContent: "center" },
  doneBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
});
