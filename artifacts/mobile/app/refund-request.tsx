import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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

export default function RefundRequestScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activePass, requestRefund } = useApp();
  const [loading, setLoading] = useState(false);

  if (!activePass) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.empty, { color: colors.mutedForeground }]}>
          No active pass to refund.
        </Text>
      </View>
    );
  }

  const usedCredits = activePass.totalCredits - activePass.remainingCredits;
  const usedAmount = usedCredits * activePass.effectiveCreditValue;
  const lateFees = activePass.lateCancellationFees;
  const refundableAmount = Math.max(
    0,
    activePass.paidAmount - usedAmount - lateFees
  );
  const bonusCredits = activePass.bonusCredits;

  async function handleRequest() {
    Alert.alert(
      "Confirm refund",
      `You'll receive ₹${refundableAmount.toLocaleString("en-IN")} back to your original payment method in 3–7 working days.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request refund",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning
            );
            await requestRefund();
            setLoading(false);
            router.back();
          },
        },
      ]
    );
  }

  const rows = [
    { label: "Pass purchased", value: `₹${activePass.paidAmount.toLocaleString("en-IN")}` },
    { label: "Meals included", value: `${activePass.totalCredits}` },
    { label: "Meals used", value: `${usedCredits}`, negative: true },
    { label: "Used amount", value: `−₹${usedAmount.toLocaleString("en-IN")}`, negative: true },
    { label: "Late cancel charges", value: lateFees > 0 ? `−₹${lateFees}` : "₹0", negative: lateFees > 0 },
    { label: "Bonus credits", value: bonusCredits > 0 ? `${bonusCredits} (non-refundable)` : "None" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Refund amount highlight */}
        <View style={[styles.refundHighlight, { backgroundColor: "#F0FDF4", borderColor: "#86EFAC" }]}>
          <Text style={styles.refundAmountLabel}>Refund available</Text>
          <Text style={styles.refundAmount}>
            ₹{refundableAmount.toLocaleString("en-IN")}
          </Text>
          <Text style={styles.refundSub}>
            Goes back to your original payment method in 3–7 working days
          </Text>
        </View>

        {/* Breakdown */}
        <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.breakdownTitle, { color: colors.foreground }]}>
            Breakdown
          </Text>
          {rows.map((row, i) => (
            <View
              key={row.label}
              style={[
                styles.row,
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
              ]}
            >
              <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>
                {row.label}
              </Text>
              <Text
                style={[
                  styles.rowValue,
                  { color: row.negative ? "#EF4444" : colors.foreground },
                ]}
              >
                {row.value}
              </Text>
            </View>
          ))}
          <View
            style={[
              styles.totalRow,
              { borderTopWidth: 2, borderTopColor: colors.border },
            ]}
          >
            <Text style={[styles.totalLabel, { color: colors.foreground }]}>
              Refundable amount
            </Text>
            <Text style={styles.totalValue}>
              ₹{refundableAmount.toLocaleString("en-IN")}
            </Text>
          </View>
        </View>

        {/* Info boxes */}
        <View style={[styles.infoBox, { backgroundColor: "#FFF3E8", borderColor: "#FDBA74" }]}>
          <Feather name="info" size={14} color="#F97316" />
          <Text style={styles.infoText}>
            Refund only applies to unused paid meal credits. Bonus credits and
            late cancellation fees are non-refundable.
          </Text>
        </View>

        {activePass.status === "refund_requested" && (
          <View style={[styles.infoBox, { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" }]}>
            <Feather name="clock" size={14} color="#F59E0B" />
            <Text style={[styles.infoText, { color: "#92400E" }]}>
              A refund request is already pending for this pass.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* CTA */}
      <View
        style={[
          styles.ctaBar,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={handleRequest}
          disabled={
            loading ||
            refundableAmount === 0 ||
            activePass.status === "refund_requested"
          }
          style={({ pressed }) => [
            styles.ctaBtn,
            (loading || refundableAmount === 0 || activePass.status === "refund_requested") &&
              styles.btnDisabled,
            pressed && { opacity: 0.85 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.ctaBtnText}>
              {activePass.status === "refund_requested"
                ? "Refund requested"
                : "Request refund"}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    padding: 40,
  },
  refundHighlight: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 6,
  },
  refundAmountLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#166534",
  },
  refundAmount: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#166534",
  },
  refundSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#4ADE80",
    textAlign: "center",
  },
  breakdownCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  breakdownTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    padding: 14,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  rowValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  totalLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  totalValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#16A34A",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#92400E",
    lineHeight: 18,
  },
  ctaBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  ctaBtn: {
    height: 54,
    backgroundColor: "#EF4444",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { backgroundColor: "#D4D4D8" },
  ctaBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
});
