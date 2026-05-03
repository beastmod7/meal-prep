import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
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

/**
 * Derives the same 4-digit OTP as the portal (deriveVerificationCode).
 * This is intentionally duplicated (no shared lib between Expo and API) to keep
 * the algorithm auditable side-by-side.
 */
function deriveVerificationCode(subscriptionId: string, date: string): string {
  const input = subscriptionId.replace(/-/g, "") + date.replace(/-/g, "");
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash = hash & 0x7fffffff;
  }
  return String(hash % 10000).padStart(4, "0");
}

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

        {/* Show My Code — primary action for active subs */}
        {isActive && (() => {
          const today = new Date().toISOString().split("T")[0]!;
          const code = deriveVerificationCode(sub.id, today);
          const isLunch = sub.slot !== "dinner";
          return (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({
                  pathname: "/show-pass" as never,
                  params: {
                    subscriptionId: sub.id,
                    slot: sub.slot,
                    restaurantName: sub.restaurantName,
                  },
                });
              }}
              style={({ pressed }) => [
                cardStyles.showCodeBtn,
                {
                  backgroundColor: isLunch ? "#FEF3C7" : "#EDE9FE",
                  borderColor: isLunch ? "#FCD34D" : "#C4B5FD",
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <View style={cardStyles.showCodeLeft}>
                <Feather
                  name="shield"
                  size={15}
                  color={isLunch ? "#92400E" : "#4C1D95"}
                />
                <View>
                  <Text
                    style={[
                      cardStyles.showCodeLabel,
                      { color: isLunch ? "#78350F" : "#3B0764" },
                    ]}
                  >
                    Show My Code
                  </Text>
                  <Text
                    style={[
                      cardStyles.showCodeHint,
                      { color: isLunch ? "#92400E" : "#4C1D95" },
                    ]}
                  >
                    Today's pickup code
                  </Text>
                </View>
              </View>
              <View style={cardStyles.showCodeRight}>
                <Text
                  style={[
                    cardStyles.showCodeDigits,
                    { color: isLunch ? "#92400E" : "#4C1D95" },
                  ]}
                >
                  {code}
                </Text>
                <Feather
                  name="chevron-right"
                  size={14}
                  color={isLunch ? "#92400E" : "#4C1D95"}
                />
              </View>
            </Pressable>
          );
        })()}

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
              Refund of ₹{Math.max(0, sub.remainingDays * sub.pricePerDay - sub.lateCancellationFees).toLocaleString("en-IN")} for unused meals is being processed to your original payment method.
            </Text>
          </View>
        )}

        {isCancelled && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({
                pathname: "/buy-pass" as never,
                params: {
                  restaurantId: sub.restaurantId,
                  defaultSlot: sub.slot,
                  defaultDays: String(sub.totalDays),
                },
              });
            }}
            style={({ pressed }) => [
              cardStyles.resubBtn,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Feather name="refresh-cw" size={13} color="#3B82F6" />
            <Text style={cardStyles.resubBtnText}>Subscribe again</Text>
            <Feather name="arrow-right" size={13} color="#3B82F6" style={{ marginLeft: "auto" }} />
          </Pressable>
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
  resubBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 2,
  },
  resubBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#3B82F6", flex: 1 },
  showCodeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  showCodeLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  showCodeLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  showCodeHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  showCodeRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  showCodeDigits: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: 4 },
});

export default function PlansScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { subscriptions, ledger } = useApp();

  const activeSubs = subscriptions.filter((s) => s.status === "active" || s.status === "paused");
  const pastSubs = subscriptions.filter(
    (s) => s.status === "cancelled" || s.status === "completed" || s.status === "refund_requested"
  );

  const recentLedger = ledger.slice(0, 6);

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
          {/* Meal pass balance card */}
          {activeSubs.length > 0 && (() => {
            const totalMeals = activeSubs.reduce(
              (sum, sub) => sum + sub.remainingDays * (sub.slot === "both" ? 2 : 1),
              0,
            );
            return (
              <View style={[styles.balanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* Header row */}
                <View style={styles.balanceHeader}>
                  <Text style={styles.balanceEmoji}>🍔</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.balanceTitle, { color: colors.foreground }]}>Meal Pass Balance</Text>
                    <Text style={[styles.balanceSubtitle, { color: colors.mutedForeground }]}>Across all active plans</Text>
                  </View>
                  <View style={styles.balanceTotalWrap}>
                    <Text style={styles.balanceTotalNum}>{totalMeals}</Text>
                    <Text style={[styles.balanceTotalLabel, { color: colors.mutedForeground }]}>meals</Text>
                  </View>
                </View>

                {/* Per-restaurant rows */}
                <View style={[styles.balanceRows, { borderTopColor: colors.border }]}>
                  {activeSubs.map((sub, i) => {
                    const meals = sub.remainingDays * (sub.slot === "both" ? 2 : 1);
                    const slotEmoji = sub.slot === "lunch" ? "☀️" : sub.slot === "dinner" ? "🌙" : "🍽️";
                    const slotLabel = sub.slot === "lunch" ? "Lunch" : sub.slot === "dinner" ? "Dinner" : "Lunch + Dinner";
                    const validUntil = new Date(sub.endDate + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                    return (
                      <View
                        key={sub.id}
                        style={[
                          styles.balanceRow,
                          i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                        ]}
                      >
                        <View style={styles.balanceRowLeft}>
                          <Text style={[styles.balanceRestName, { color: colors.foreground }]}>
                            {slotEmoji} {sub.restaurantName}
                          </Text>
                          <Text style={[styles.balanceRowMeta, { color: colors.mutedForeground }]}>
                            {slotLabel} · Valid until {validUntil}
                          </Text>
                        </View>
                        <View style={styles.balanceMealPill}>
                          <Text style={styles.balanceMealPillText}>{meals} meals</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Disclaimer strip */}
                <View style={[styles.balanceDisclaimer, { borderTopColor: colors.border, backgroundColor: colors.muted }]}>
                  {[
                    { icon: "x-circle" as const, text: "Non-transferable" },
                    { icon: "slash" as const, text: "No cash value or withdrawal" },
                    { icon: "check-square" as const, text: "Redeemable only within this meal plan" },
                  ].map((item) => (
                    <View key={item.text} style={styles.disclaimerRow}>
                      <Feather name={item.icon} size={12} color={colors.mutedForeground} />
                      <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>{item.text}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}

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
                    router.push({ pathname: "/refund-request", params: { subscriptionId: sub.id } });
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
  balanceCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  balanceHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  balanceEmoji: { fontSize: 32 },
  balanceTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 1 },
  balanceSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular" },
  balanceTotalWrap: { alignItems: "flex-end" },
  balanceTotalNum: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#3B82F6", lineHeight: 34 },
  balanceTotalLabel: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right" },
  balanceRows: { borderTopWidth: 1 },
  balanceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 11 },
  balanceRowLeft: { flex: 1, marginRight: 10 },
  balanceRestName: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  balanceRowMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  balanceMealPill: { backgroundColor: "#EFF6FF", borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  balanceMealPillText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#2563EB" },
  balanceDisclaimer: { borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 12, gap: 6 },
  disclaimerRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  disclaimerText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  ledgerCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  ledgerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4 },
  ledgerTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  viewAll: { fontSize: 13, fontFamily: "Inter_500Medium" },
  ledgerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10 },
  ledgerLeft: { flex: 1, marginRight: 8 },
  ledgerDesc: { fontSize: 13, fontFamily: "Inter_500Medium" },
  ledgerDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  ledgerAmount: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
