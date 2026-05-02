import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
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

export default function RefundRequestScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { subscriptionId } = useLocalSearchParams<{ subscriptionId?: string }>();
  const { subscriptions, cancelSubscription } = useApp();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refundResult, setRefundResult] = useState<{ refundAmount: number } | null>(null);

  const sub = subscriptions.find((s) => s.id === subscriptionId);

  if (!sub) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.notFound}>
          <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
          <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>
            Subscription not found.
          </Text>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: colors.border }]}>
            <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium" }}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const refundAmount = Math.max(
    0,
    sub.remainingDays * sub.pricePerDay - sub.lateCancellationFees
  );

  async function handleCancel() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);
    const result = await cancelSubscription(sub!.id);
    setIsSubmitting(false);
    setRefundResult(result);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  if (refundResult) {
    return (
      <View
        style={[
          styles.container,
          styles.successContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <View style={[styles.successIcon, { backgroundColor: "#DCFCE7" }]}>
          <Feather name="check-circle" size={32} color="#16A34A" />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>
          Subscription cancelled
        </Text>
        {refundResult.refundAmount > 0 ? (
          <Text style={[styles.successBody, { color: colors.mutedForeground }]}>
            A refund of{" "}
            <Text style={{ fontFamily: "Inter_700Bold", color: colors.foreground }}>
              ₹{refundResult.refundAmount.toLocaleString("en-IN")}
            </Text>{" "}
            for {sub.remainingDays} unused days has been initiated. It will appear in your account within 5–7 business days.
          </Text>
        ) : (
          <Text style={[styles.successBody, { color: colors.mutedForeground }]}>
            Your subscription has been cancelled. No refund is applicable after late cancellation fees.
          </Text>
        )}
        <Pressable
          onPress={() => router.replace("/(tabs)/pass")}
          style={[styles.doneBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.doneBtnText}>Go to My Plans</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100,
        }}
      >
        {/* Subscription summary */}
        <View
          style={[
            styles.subCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={styles.subEmoji}>
            {sub.slot === "lunch" ? "☀️" : "🌙"}
          </Text>
          <View style={styles.subCardInfo}>
            <Text style={[styles.subCardName, { color: colors.foreground }]}>
              {sub.restaurantName}
            </Text>
            <Text style={[styles.subCardDetail, { color: colors.mutedForeground }]}>
              {sub.slot === "lunch" ? "Lunch" : "Dinner"} · {sub.totalDays}-day pack
            </Text>
          </View>
          <View style={[styles.subStatusBadge, { backgroundColor: "#DCFCE7" }]}>
            <Text style={styles.subStatusText}>Active</Text>
          </View>
        </View>

        {/* Refund breakdown */}
        <View
          style={[
            styles.refundCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.refundTitle, { color: colors.foreground }]}>
            Refund breakdown
          </Text>

          <View style={[styles.refundRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.refundLabel, { color: colors.mutedForeground }]}>
              Unused days
            </Text>
            <Text style={[styles.refundValue, { color: colors.foreground }]}>
              {sub.remainingDays} × ₹{sub.pricePerDay} = ₹{(sub.remainingDays * sub.pricePerDay).toLocaleString("en-IN")}
            </Text>
          </View>

          {sub.lateCancellationFees > 0 && (
            <View style={[styles.refundRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.refundLabel, { color: colors.mutedForeground }]}>
                Late cancellation fees
              </Text>
              <Text style={[styles.refundValue, { color: "#EF4444" }]}>
                −₹{sub.lateCancellationFees.toLocaleString("en-IN")}
              </Text>
            </View>
          )}

          <View style={styles.refundTotalRow}>
            <Text style={[styles.refundTotalLabel, { color: colors.foreground }]}>
              You'll receive
            </Text>
            <Text style={[styles.refundTotalValue, { color: "#16A34A" }]}>
              ₹{refundAmount.toLocaleString("en-IN")}
            </Text>
          </View>
        </View>

        {/* Warning */}
        <View style={[styles.warningBox, { backgroundColor: "#FEF2F2", borderColor: "#FEE2E2" }]}>
          <Feather name="alert-triangle" size={16} color="#EF4444" />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>This action is irreversible</Text>
            <Text style={styles.warningBody}>
              All {sub.remainingDays} upcoming scheduled meals will be cancelled. You can subscribe to this restaurant again anytime.
            </Text>
          </View>
        </View>

        {/* Timeline */}
        <View style={[styles.timelineBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[styles.timelineTitle, { color: colors.foreground }]}>
            What happens next
          </Text>
          {[
            "Subscription is cancelled immediately",
            "All upcoming meals are cancelled",
            `Refund of ₹${refundAmount.toLocaleString("en-IN")} is initiated`,
            "Refund appears in your account in 5–7 days",
          ].map((step, i) => (
            <View key={i} style={styles.timelineRow}>
              <View style={[styles.timelineNum, { backgroundColor: colors.primary }]}>
                <Text style={styles.timelineNumText}>{i + 1}</Text>
              </View>
              <Text style={[styles.timelineStep, { color: colors.mutedForeground }]}>
                {step}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 0) + 8,
          },
        ]}
      >
        <Pressable
          onPress={handleCancel}
          disabled={isSubmitting}
          style={({ pressed }) => [
            styles.cancelBtn,
            pressed && { opacity: 0.9 },
            isSubmitting && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.cancelBtnText}>
            {isSubmitting ? "Processing…" : `Cancel & Get ₹${refundAmount.toLocaleString("en-IN")} Refund`}
          </Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.keepBtn}>
          <Text style={[styles.keepBtnText, { color: colors.mutedForeground }]}>
            Keep subscription
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFoundText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  successIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  successTitle: { fontSize: 24, fontFamily: "Inter_700Bold", textAlign: "center" },
  successBody: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, maxWidth: 280 },
  doneBtn: { marginTop: 12, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 14 },
  doneBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  subCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  subEmoji: { fontSize: 24 },
  subCardInfo: { flex: 1 },
  subCardName: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 1 },
  subCardDetail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  subStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  subStatusText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#16A34A" },
  refundCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16, gap: 0 },
  refundTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 12 },
  refundRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1 },
  refundLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  refundValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  refundTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10 },
  refundTotalLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  refundTotalValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  warningBox: { flexDirection: "row", gap: 10, alignItems: "flex-start", borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 14 },
  warningContent: { flex: 1, gap: 4 },
  warningTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#991B1B" },
  warningBody: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#991B1B", lineHeight: 17 },
  timelineBox: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  timelineTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 4 },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  timelineNum: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  timelineNumText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#FFF" },
  timelineStep: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  footer: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  cancelBtn: { height: 54, backgroundColor: "#EF4444", borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cancelBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  keepBtn: { height: 44, alignItems: "center", justifyContent: "center" },
  keepBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
