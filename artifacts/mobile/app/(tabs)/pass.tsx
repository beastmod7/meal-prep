import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

import PassCard from "@/components/PassCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PassScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activePass, ledger } = useApp();

  const ACTIONS = [
    {
      icon: "plus-circle" as const,
      label: "Buy more meals",
      color: "#16A34A",
      bg: "#DCFCE7",
      onPress: () => router.push("/buy-pass"),
    },
    {
      icon: "pause-circle" as const,
      label: "Pause pass",
      color: "#8B5CF6",
      bg: "#EDE9FE",
      onPress: () => router.push("/pause-meals"),
    },
    {
      icon: "rotate-ccw" as const,
      label: "Request refund",
      color: "#EF4444",
      bg: "#FEE2E2",
      onPress: () => router.push("/refund-request"),
    },
    {
      icon: "file-text" as const,
      label: "View ledger",
      color: "#3B82F6",
      bg: "#DBEAFE",
      onPress: () => router.push("/ledger"),
    },
  ];

  const recentLedger = ledger.slice(0, 5);

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
        <View
          style={[
            styles.header,
            {
              paddingTop:
                insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>
            Your Pass
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Credits, refunds, and pass controls
          </Text>
        </View>

        <View style={styles.content}>
          {activePass ? (
            <>
              <PassCard pass={activePass} />

              {/* Policy reminder */}
              <View
                style={[
                  styles.policyBox,
                  { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
              >
                <Feather name="info" size={14} color="#92400E" />
                <Text style={styles.policyText}>
                  Cancel by 10 PM the previous night for free. Your meal credit stays safe. Unused paid meals carry forward or can be refunded.
                </Text>
              </View>

              {/* Actions */}
              <View style={styles.actionsGrid}>
                {ACTIONS.map((action) => (
                  <Pressable
                    key={action.label}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      action.onPress();
                    }}
                    style={({ pressed }) => [
                      styles.actionCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <View
                      style={[
                        styles.actionIcon,
                        { backgroundColor: action.bg },
                      ]}
                    >
                      <Feather
                        name={action.icon}
                        size={20}
                        color={action.color}
                      />
                    </View>
                    <Text
                      style={[
                        styles.actionLabel,
                        { color: colors.foreground },
                      ]}
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Pass details */}
              <View
                style={[
                  styles.detailsCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[styles.detailsTitle, { color: colors.foreground }]}
                >
                  Pass details
                </Text>
                {[
                  { label: "Plan", value: activePass.planName },
                  { label: "Total credits", value: `${activePass.totalCredits} meals` },
                  { label: "Used", value: `${activePass.totalCredits - activePass.remainingCredits} meals` },
                  { label: "Remaining", value: `${activePass.remainingCredits} meals` },
                  { label: "Credit value", value: `₹${activePass.effectiveCreditValue}/meal` },
                  { label: "Paid amount", value: `₹${activePass.paidAmount.toLocaleString("en-IN")}` },
                  { label: "Late cancel fees", value: `₹${activePass.lateCancellationFees}` },
                  { label: "Refundable value", value: `₹${Math.max(0, activePass.remainingCredits * activePass.effectiveCreditValue - activePass.lateCancellationFees).toLocaleString("en-IN")}` },
                  { label: "Valid from", value: formatDate(activePass.validFrom) },
                  { label: "Valid till", value: formatDate(activePass.validUntil) },
                ].map((row, i) => (
                  <View
                    key={row.label}
                    style={[
                      styles.detailRow,
                      i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {row.label}
                    </Text>
                    <Text
                      style={[
                        styles.detailValue,
                        { color: colors.foreground },
                      ]}
                    >
                      {row.value}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Recent ledger */}
              {recentLedger.length > 0 && (
                <View
                  style={[
                    styles.ledgerCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.ledgerHeader}>
                    <Text
                      style={[
                        styles.detailsTitle,
                        { color: colors.foreground },
                      ]}
                    >
                      Recent activity
                    </Text>
                    <Pressable onPress={() => router.push("/ledger")}>
                      <Text
                        style={[styles.viewAll, { color: colors.primary }]}
                      >
                        View all
                      </Text>
                    </Pressable>
                  </View>
                  {recentLedger.map((entry, i) => (
                    <View
                      key={entry.id}
                      style={[
                        styles.ledgerRow,
                        i > 0 && {
                          borderTopWidth: 1,
                          borderTopColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.ledgerLeft}>
                        <Text
                          style={[
                            styles.ledgerDesc,
                            { color: colors.foreground },
                          ]}
                        >
                          {entry.description}
                        </Text>
                        <Text
                          style={[
                            styles.ledgerDate,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          {new Date(entry.createdAt).toLocaleDateString(
                            "en-IN",
                            { day: "numeric", month: "short" }
                          )}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.ledgerDelta,
                          {
                            color:
                              entry.creditDelta >= 0
                                ? colors.success
                                : "#EF4444",
                          },
                        ]}
                      >
                        {entry.creditDelta >= 0 ? "+" : ""}
                        {entry.creditDelta} cr
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.noPass}>
              <Feather
                name="credit-card"
                size={40}
                color={colors.mutedForeground}
              />
              <Text style={[styles.noPassTitle, { color: colors.foreground }]}>
                No active pass
              </Text>
              <Text
                style={[styles.noPassBody, { color: colors.mutedForeground }]}
              >
                Buy a meal pass to schedule meals from partner restaurants
              </Text>
              <Pressable
                onPress={() => router.push("/buy-pass")}
                style={styles.buyBtn}
              >
                <Text style={styles.buyBtnText}>Buy a Meal Pass</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  content: {
    padding: 16,
    gap: 14,
  },
  policyBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  policyText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#92400E",
    lineHeight: 18,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionCard: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  detailsCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  detailsTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    padding: 14,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  detailValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  ledgerCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  ledgerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
  },
  viewAll: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  ledgerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ledgerLeft: { flex: 1, marginRight: 8 },
  ledgerDesc: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  ledgerDate: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  ledgerDelta: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  noPass: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  noPassTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginTop: 8,
  },
  noPassBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },
  buyBtn: {
    marginTop: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: "#F97316",
    borderRadius: 14,
  },
  buyBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
});
