import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const OPTIONS = [
  { days: 3, label: "3 days", sub: "Quick pause, back soon" },
  { days: 5, label: "5 days", sub: "Going home for a bit" },
  { days: 7, label: "7 days", sub: "Full week away" },
  { days: 14, label: "2 weeks", sub: "Extended break" },
];

export default function PauseMealsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activePass, pauseMeals, orders, getOrderCancelStatus } = useApp();
  const [selected, setSelected] = useState(3);
  const [loading, setLoading] = useState(false);

  const upcomingOrders = orders.filter(
    (o) =>
      !["delivered", "cancelled_free", "cancelled_late", "cancelled_full"].includes(
        o.status
      )
  );

  const lockedOrders = upcomingOrders.filter((o) => {
    const cs = getOrderCancelStatus(o);
    return cs === "full";
  });

  const freePausable = upcomingOrders.filter((o) => {
    const cs = getOrderCancelStatus(o);
    return cs === "free" || cs === "late";
  });

  const resumeDate = new Date();
  resumeDate.setDate(resumeDate.getDate() + selected);
  const resumeLabel = resumeDate.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  async function handlePause() {
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await pauseMeals(selected);
    setLoading(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Duration options */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Pause duration
        </Text>
        <View style={styles.optionsGrid}>
          {OPTIONS.map((opt) => (
            <Pressable
              key={opt.days}
              onPress={() => {
                Haptics.selectionAsync();
                setSelected(opt.days);
              }}
              style={[
                styles.optionCard,
                {
                  backgroundColor:
                    selected === opt.days ? "#FFF3E8" : colors.card,
                  borderColor:
                    selected === opt.days ? "#F97316" : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.optionLabel,
                  {
                    color:
                      selected === opt.days ? "#F97316" : colors.foreground,
                  },
                ]}
              >
                {opt.label}
              </Text>
              <Text
                style={[styles.optionSub, { color: colors.mutedForeground }]}
              >
                {opt.sub}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Summary */}
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.summaryRow}>
            <Feather name="pause-circle" size={16} color="#8B5CF6" />
            <Text style={[styles.summaryText, { color: colors.foreground }]}>
              Meals paused from tomorrow to{" "}
              <Text style={{ fontFamily: "Inter_700Bold" }}>{resumeLabel}</Text>
            </Text>
          </View>
          {freePausable.length > 0 && (
            <View style={styles.summaryRow}>
              <Feather name="check-circle" size={16} color="#16A34A" />
              <Text
                style={[styles.summaryText, { color: colors.foreground }]}
              >
                {freePausable.length} upcoming meal
                {freePausable.length > 1 ? "s" : ""} will be cancelled for free
              </Text>
            </View>
          )}
          {lockedOrders.length > 0 && (
            <View style={styles.summaryRow}>
              <Feather name="alert-circle" size={16} color="#F59E0B" />
              <Text
                style={[styles.summaryText, { color: colors.foreground }]}
              >
                {lockedOrders.length} locked meal
                {lockedOrders.length > 1 ? "s" : ""} may still be charged
              </Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View
          style={[
            styles.infoBox,
            { backgroundColor: "#FFF3E8", borderColor: "#FDBA74" },
          ]}
        >
          <Feather name="info" size={14} color="#F97316" />
          <Text style={styles.infoText}>
            Meals already past the free cancellation window may still be
            charged. Your meal pass validity is not extended during a pause.
          </Text>
        </View>

        {!activePass && (
          <View
            style={[
              styles.infoBox,
              { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
            ]}
          >
            <Feather name="alert-circle" size={16} color="#EF4444" />
            <Text style={[styles.infoText, { color: "#991B1B" }]}>
              You don't have an active pass to pause.
            </Text>
          </View>
        )}
      </View>

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
          onPress={handlePause}
          disabled={loading || !activePass || activePass.status === "paused"}
          style={({ pressed }) => [
            styles.ctaBtn,
            (!activePass || loading || activePass.status === "paused") &&
              styles.btnDisabled,
            pressed && activePass && !loading && { opacity: 0.85 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.ctaBtnText}>
              {activePass?.status === "paused"
                ? "Already paused"
                : `Pause for ${OPTIONS.find((o) => o.days === selected)?.label}`}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 20, gap: 16 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionCard: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 4,
  },
  optionLabel: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  optionSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
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
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  ctaBtn: {
    height: 54,
    backgroundColor: "#8B5CF6",
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
