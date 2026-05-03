import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "confirm" | "refund-method" | "success" | "feedback";

type RefundMethod = {
  id: "wallet" | "upi" | "bank";
  icon: "pocket" | "smartphone" | "credit-card";
  label: string;
  tagline: string;
  timeLabel: string;
  timeColor: string;
};

const REFUND_METHODS: RefundMethod[] = [
  {
    id: "wallet",
    icon: "pocket",
    label: "Meal Pass Wallet",
    tagline: "Instant credit — use on any subscription",
    timeLabel: "Instant",
    timeColor: "#16A34A",
  },
  {
    id: "upi",
    icon: "smartphone",
    label: "UPI",
    tagline: "Credited to your UPI-linked account",
    timeLabel: "3–5 hours",
    timeColor: "#2563EB",
  },
  {
    id: "bank",
    icon: "credit-card",
    label: "Bank Account",
    tagline: "Original payment mode refund",
    timeLabel: "5–7 business days",
    timeColor: "#D97706",
  },
];

const FEEDBACK_OPTIONS = [
  { id: "delivery", label: "Delivery was unreliable", icon: "truck" },
  { id: "food_quality", label: "Didn't enjoy the food quality", icon: "coffee" },
  { id: "selection", label: "Not enough restaurant choices", icon: "grid" },
  { id: "price", label: "Too expensive for what I got", icon: "tag" },
  { id: "portion", label: "Portion sizes were too small", icon: "package" },
  { id: "schedule", label: "My schedule changed", icon: "calendar" },
  { id: "timing", label: "Delivery timing didn't suit me", icon: "clock" },
  { id: "other", label: "Other reason", icon: "more-horizontal" },
] as const;

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepDots({ current }: { current: Step }) {
  const steps: Step[] = ["confirm", "refund-method", "success", "feedback"];
  const idx = steps.indexOf(current);
  return (
    <View style={dot.row}>
      {steps.map((_, i) => (
        <View
          key={i}
          style={[
            dot.dot,
            i === idx && dot.active,
            i < idx && dot.done,
          ]}
        />
      ))}
    </View>
  );
}

const dot = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#E4E4E7" },
  active: { width: 18, backgroundColor: "#3B82F6" },
  done: { backgroundColor: "#93C5FD" },
});

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={sh.title}>{title}</Text>
      {subtitle ? <Text style={sh.sub}>{subtitle}</Text> : null}
    </View>
  );
}

const sh = StyleSheet.create({
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#1A1A1A", marginBottom: 4 },
  sub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#71717A", lineHeight: 20 },
});

// ─── Confirm Step ─────────────────────────────────────────────────────────────

function ConfirmStep({
  sub,
  refundAmount,
  onKeep,
  onNext,
}: {
  sub: NonNullable<ReturnType<typeof useApp>["subscriptions"][0]>;
  refundAmount: number;
  onKeep: () => void;
  onNext: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 120,
        }}
      >
        <SectionHeader
          title="Cancel subscription?"
          subtitle="Review your refund before proceeding."
        />

        {/* Subscription card */}
        <View style={[cs.subCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={cs.emoji}>{sub.slot === "lunch" ? "☀️" : "🌙"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[cs.name, { color: colors.foreground }]}>{sub.restaurantName}</Text>
            <Text style={[cs.detail, { color: colors.mutedForeground }]}>
              {sub.slot === "lunch" ? "Lunch" : "Dinner"} · {sub.totalDays}-day pack · ends {formatDate(sub.endDate)}
            </Text>
          </View>
        </View>

        {/* Refund breakdown */}
        <View style={[cs.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[cs.cardTitle, { color: colors.foreground }]}>Refund breakdown</Text>

          <View style={[cs.row, { borderBottomColor: colors.border }]}>
            <Text style={[cs.rowLabel, { color: colors.mutedForeground }]}>Unused days</Text>
            <Text style={[cs.rowValue, { color: colors.foreground }]}>
              {sub.remainingDays} × ₹{sub.pricePerDay} = ₹{(sub.remainingDays * sub.pricePerDay).toLocaleString("en-IN")}
            </Text>
          </View>

          {sub.lateCancellationFees > 0 && (
            <View style={[cs.row, { borderBottomColor: colors.border }]}>
              <Text style={[cs.rowLabel, { color: colors.mutedForeground }]}>Late cancellation fees</Text>
              <Text style={[cs.rowValue, { color: "#EF4444" }]}>
                −₹{sub.lateCancellationFees.toLocaleString("en-IN")}
              </Text>
            </View>
          )}

          <View style={cs.totalRow}>
            <Text style={[cs.totalLabel, { color: colors.foreground }]}>You'll receive</Text>
            <Text style={cs.totalValue}>₹{refundAmount.toLocaleString("en-IN")}</Text>
          </View>
        </View>

        {/* Warning */}
        <View style={cs.warning}>
          <Feather name="alert-triangle" size={15} color="#EF4444" />
          <View style={{ flex: 1 }}>
            <Text style={cs.warnTitle}>This action is irreversible</Text>
            <Text style={cs.warnBody}>
              All {sub.remainingDays} upcoming meals will be cancelled. You can re-subscribe anytime.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          cs.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 0) + 8,
          },
        ]}
      >
        <Pressable
          onPress={onNext}
          style={({ pressed }) => [cs.primaryBtn, pressed && { opacity: 0.9 }]}
        >
          <Text style={cs.primaryBtnText}>
            Cancel & Get ₹{refundAmount.toLocaleString("en-IN")} Refund
          </Text>
        </Pressable>
        <Pressable onPress={onKeep} style={cs.secondaryBtn}>
          <Text style={[cs.secondaryBtnText, { color: colors.mutedForeground }]}>
            Keep subscription
          </Text>
        </Pressable>
      </View>
    </>
  );
}

const cs = StyleSheet.create({
  subCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16,
  },
  emoji: { fontSize: 26 },
  name: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 2 },
  detail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  cardTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1 },
  rowLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  rowValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10 },
  totalLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  totalValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#16A34A" },
  warning: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 14,
    backgroundColor: "#FEF2F2", borderColor: "#FEE2E2",
  },
  warnTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#991B1B", marginBottom: 3 },
  warnBody: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#991B1B", lineHeight: 17 },
  footer: { borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 12, gap: 8 },
  primaryBtn: { height: 54, backgroundColor: "#EF4444", borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  secondaryBtn: { height: 44, alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});

// ─── Refund Method Step ───────────────────────────────────────────────────────

function RefundMethodStep({
  refundAmount,
  selectedMethod,
  onSelect,
  onNext,
  isLoading,
}: {
  refundAmount: number;
  selectedMethod: RefundMethod["id"] | null;
  onSelect: (id: RefundMethod["id"]) => void;
  onNext: () => void;
  isLoading: boolean;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 120,
        }}
      >
        <SectionHeader
          title="How would you like your refund?"
          subtitle={`₹${refundAmount.toLocaleString("en-IN")} will be refunded to your chosen method.`}
        />

        <View style={{ gap: 12 }}>
          {REFUND_METHODS.map((method) => {
            const selected = selectedMethod === method.id;
            return (
              <Pressable
                key={method.id}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelect(method.id);
                }}
                style={[
                  rm.option,
                  { borderColor: selected ? "#3B82F6" : colors.border, backgroundColor: selected ? "#EFF6FF" : colors.card },
                ]}
              >
                <View style={[rm.iconWrap, { backgroundColor: selected ? "#DBEAFE" : colors.secondary }]}>
                  <Feather name={method.icon} size={20} color={selected ? "#2563EB" : colors.mutedForeground} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[rm.methodLabel, { color: colors.foreground }]}>{method.label}</Text>
                  <Text style={[rm.methodTagline, { color: colors.mutedForeground }]}>{method.tagline}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={[rm.timeLabel, { color: method.timeColor }]}>{method.timeLabel}</Text>
                  {selected && (
                    <View style={rm.checkCircle}>
                      <Feather name="check" size={11} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={[rm.noteBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="info" size={13} color={colors.mutedForeground} />
          <Text style={[rm.noteText, { color: colors.mutedForeground }]}>
            Wallet refunds are instant and can be used for any future subscription. Bank refunds follow your payment provider's timeline.
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          cs.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 0) + 8,
          },
        ]}
      >
        <Pressable
          onPress={onNext}
          disabled={!selectedMethod || isLoading}
          style={({ pressed }) => [
            rm.confirmBtn,
            (!selectedMethod || isLoading) && { opacity: 0.5 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={cs.primaryBtnText}>
            {isLoading ? "Processing cancellation…" : "Confirm Cancellation"}
          </Text>
        </Pressable>
      </View>
    </>
  );
}

const rm = StyleSheet.create({
  option: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 16, borderWidth: 1.5, padding: 16,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  methodLabel: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 2 },
  methodTagline: { fontSize: 12, fontFamily: "Inter_400Regular" },
  timeLabel: { fontSize: 12, fontFamily: "Inter_700Bold" },
  checkCircle: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#3B82F6", alignItems: "center", justifyContent: "center" },
  noteBox: { flexDirection: "row", gap: 8, alignItems: "flex-start", borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 16 },
  noteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  confirmBtn: { height: 54, backgroundColor: "#EF4444", borderRadius: 14, alignItems: "center", justifyContent: "center" },
});

// ─── Success Step ─────────────────────────────────────────────────────────────

function SuccessStep({
  refundAmount,
  remainingDays,
  selectedMethod,
  onNext,
}: {
  refundAmount: number;
  remainingDays: number;
  selectedMethod: RefundMethod["id"] | null;
  onNext: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 12,
      stiffness: 150,
    }).start();
  }, []);

  const method = REFUND_METHODS.find((m) => m.id === selectedMethod) ?? REFUND_METHODS[0]!;

  const timeline =
    method.id === "wallet"
      ? [
          "Subscription cancelled immediately",
          "All upcoming meals cancelled",
          `₹${refundAmount.toLocaleString("en-IN")} added to your Meal Pass wallet instantly`,
          "Use wallet balance on your next subscription",
        ]
      : method.id === "upi"
        ? [
            "Subscription cancelled immediately",
            "All upcoming meals cancelled",
            `Refund of ₹${refundAmount.toLocaleString("en-IN")} initiated to UPI`,
            "Credited within 3–5 business hours",
          ]
        : [
            "Subscription cancelled immediately",
            "All upcoming meals cancelled",
            `Refund of ₹${refundAmount.toLocaleString("en-IN")} initiated`,
            "Credited to your bank in 5–7 business days",
          ];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        padding: 20,
        paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 40,
        flexGrow: 1,
      }}
    >
      {/* Animated check */}
      <View style={ss.heroArea}>
        <Animated.View style={[ss.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
          <Feather name="check" size={36} color="#FFFFFF" />
        </Animated.View>
        <Text style={ss.heroTitle}>Subscription cancelled</Text>
        <Text style={ss.heroSub}>Your refund has been initiated</Text>
      </View>

      {/* Refund card */}
      <View style={[ss.refundCard, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}>
        <Text style={ss.refundLabel}>Refund amount</Text>
        <Text style={ss.refundAmount}>₹{refundAmount.toLocaleString("en-IN")}</Text>
        <View style={ss.methodRow}>
          <View style={ss.methodBadge}>
            <Feather name={method.icon} size={13} color="#2563EB" />
            <Text style={ss.methodName}>{method.label}</Text>
          </View>
          <Text style={[ss.timeTag, { color: method.timeColor }]}>{method.timeLabel}</Text>
        </View>
      </View>

      {/* Timeline */}
      <View style={[ss.timelineBox, { borderColor: "#E4E4E7" }]}>
        <Text style={ss.timelineTitle}>What happens next</Text>
        {timeline.map((step, i) => (
          <View key={i} style={ss.timelineRow}>
            <View style={[ss.timelineNum, { backgroundColor: i === 2 ? "#16A34A" : "#3B82F6" }]}>
              <Text style={ss.timelineNumText}>{i + 1}</Text>
            </View>
            <Text style={ss.timelineStep}>{step}</Text>
          </View>
        ))}
      </View>

      {/* Unused days note */}
      <View style={[ss.noteBox, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
        <Feather name="info" size={13} color="#2563EB" />
        <Text style={ss.noteText}>
          {remainingDays} unused meal days have been freed up. You can subscribe to any restaurant again anytime.
        </Text>
      </View>

      {/* CTA */}
      <Pressable
        onPress={onNext}
        style={({ pressed }) => [ss.feedbackBtn, pressed && { opacity: 0.9 }]}
      >
        <Text style={ss.feedbackBtnText}>Share feedback (1 min)</Text>
        <Feather name="arrow-right" size={16} color="#FFFFFF" />
      </Pressable>

      <Pressable onPress={onNext} style={ss.skipBtn}>
        <Text style={ss.skipText}>Skip feedback</Text>
      </Pressable>
    </ScrollView>
  );
}

const ss = StyleSheet.create({
  heroArea: { alignItems: "center", paddingVertical: 28, gap: 10 },
  checkCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#16A34A", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  heroTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#1A1A1A" },
  heroSub: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#71717A" },
  refundCard: { borderRadius: 16, borderWidth: 1, padding: 18, marginBottom: 16, alignItems: "center", gap: 6 },
  refundLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#16A34A", textTransform: "uppercase", letterSpacing: 0.5 },
  refundAmount: { fontSize: 36, fontFamily: "Inter_700Bold", color: "#16A34A" },
  methodRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  methodBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#DBEAFE", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  methodName: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#1D4ED8" },
  timeTag: { fontSize: 12, fontFamily: "Inter_700Bold" },
  timelineBox: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10, marginBottom: 14, backgroundColor: "#FAFAFA" },
  timelineTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#1A1A1A", marginBottom: 4 },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  timelineNum: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  timelineNumText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  timelineStep: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#52525B" },
  noteBox: { flexDirection: "row", gap: 8, alignItems: "flex-start", borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 20 },
  noteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#1D4ED8", lineHeight: 17 },
  feedbackBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 52, backgroundColor: "#3B82F6", borderRadius: 14, marginBottom: 10 },
  feedbackBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  skipBtn: { height: 44, alignItems: "center", justifyContent: "center" },
  skipText: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#A1A1AA" },
});

// ─── Feedback Step ────────────────────────────────────────────────────────────

function FeedbackStep({
  restaurantName,
  onDone,
}: {
  restaurantName: string;
  onDone: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const checkAnim = useRef(new Animated.Value(0)).current;

  function toggleOption(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitted(true);
    Animated.sequence([
      Animated.timing(checkAnim, { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.back(1.5)) }),
    ]).start();
    setTimeout(onDone, 1600);
  }

  if (submitted) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 }}>
        <Animated.View
          style={[
            fb.thankCircle,
            { transform: [{ scale: checkAnim }] },
          ]}
        >
          <Feather name="heart" size={28} color="#FFFFFF" />
        </Animated.View>
        <Text style={[fb.thankTitle, { color: colors.foreground }]}>Thanks for the feedback!</Text>
        <Text style={[fb.thankSub, { color: colors.mutedForeground }]}>
          It helps us bring better restaurants and experiences to you.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 120,
        }}
      >
        <SectionHeader
          title="What went wrong?"
          subtitle={`Help us improve your experience with ${restaurantName} and the Meal Pass platform.`}
        />

        <Text style={[fb.chipGroupLabel, { color: colors.mutedForeground }]}>
          Select all that apply
        </Text>

        <View style={fb.chipGrid}>
          {FEEDBACK_OPTIONS.map((opt) => {
            const active = selected.has(opt.id);
            return (
              <Pressable
                key={opt.id}
                onPress={() => toggleOption(opt.id)}
                style={[
                  fb.chip,
                  {
                    borderColor: active ? "#3B82F6" : colors.border,
                    backgroundColor: active ? "#EFF6FF" : colors.card,
                  },
                ]}
              >
                <Feather
                  name={opt.icon as any}
                  size={14}
                  color={active ? "#2563EB" : colors.mutedForeground}
                />
                <Text
                  style={[
                    fb.chipText,
                    { color: active ? "#1D4ED8" : colors.foreground },
                  ]}
                >
                  {opt.label}
                </Text>
                {active && (
                  <View style={fb.chipCheck}>
                    <Feather name="check" size={10} color="#FFFFFF" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Additional note */}
        <View style={{ marginTop: 20 }}>
          <Text style={[fb.noteLabel, { color: colors.foreground }]}>
            Anything else? (optional)
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            placeholder="Tell us more about your experience…"
            placeholderTextColor={colors.mutedForeground}
            style={[
              fb.noteInput,
              { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
            ]}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View
        style={[
          cs.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 0) + 8,
          },
        ]}
      >
        <Pressable
          onPress={handleSubmit}
          disabled={selected.size === 0}
          style={({ pressed }) => [
            fb.submitBtn,
            selected.size === 0 && { opacity: 0.45 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={cs.primaryBtnText}>Submit feedback</Text>
        </Pressable>
        <Pressable onPress={onDone} style={cs.secondaryBtn}>
          <Text style={[cs.secondaryBtnText, { color: colors.mutedForeground }]}>Skip</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const fb = StyleSheet.create({
  chipGroupLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 12 },
  chipGrid: { gap: 10 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 12, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 14,
  },
  chipText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  chipCheck: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#3B82F6", alignItems: "center", justifyContent: "center" },
  noteLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  noteInput: {
    borderRadius: 12, borderWidth: 1, padding: 12,
    fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20,
    minHeight: 100,
  },
  submitBtn: { height: 54, backgroundColor: "#3B82F6", borderRadius: 14, alignItems: "center", justifyContent: "center" },
  thankCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#3B82F6", alignItems: "center", justifyContent: "center" },
  thankTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  thankSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, maxWidth: 260 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RefundRequestScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { subscriptionId } = useLocalSearchParams<{ subscriptionId?: string }>();
  const { subscriptions, cancelSubscription } = useApp();

  const [step, setStep] = useState<Step>("confirm");
  const [selectedMethod, setSelectedMethod] = useState<RefundMethod["id"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refundResult, setRefundResult] = useState<{ refundAmount: number } | null>(null);

  const sub = subscriptions.find((s) => s.id === subscriptionId);

  if (!sub) {
    return (
      <View style={[{ flex: 1, backgroundColor: colors.background }]}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
          <Text style={{ fontSize: 15, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>
            Subscription not found.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{ paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}
          >
            <Text style={{ color: colors.foreground, fontFamily: "Inter_500Medium" }}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const refundAmount = refundResult?.refundAmount ??
    Math.max(0, sub.remainingDays * sub.pricePerDay - sub.lateCancellationFees);

  async function handleConfirmCancellation() {
    if (!selectedMethod) return;
    setIsLoading(true);
    try {
      const result = await cancelSubscription(sub!.id);
      setRefundResult(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("success");
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleDone() {
    router.replace("/(tabs)/pass");
  }

  const stepTitle: Record<Step, string> = {
    "confirm": "Cancel & Refund",
    "refund-method": "Refund Method",
    "success": "Cancelled",
    "feedback": "Feedback",
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={[
          header.bar,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            if (step === "confirm") router.back();
            else if (step === "refund-method") setStep("confirm");
          }}
          style={header.backBtn}
        >
          {step !== "success" && step !== "feedback" ? (
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          ) : (
            <View style={{ width: 22 }} />
          )}
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[header.title, { color: colors.foreground }]}>{stepTitle[step]}</Text>
          <StepDots current={step} />
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Step content */}
      {step === "confirm" && (
        <ConfirmStep
          sub={sub}
          refundAmount={refundAmount}
          onKeep={() => router.back()}
          onNext={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setStep("refund-method");
          }}
        />
      )}

      {step === "refund-method" && (
        <RefundMethodStep
          refundAmount={refundAmount}
          selectedMethod={selectedMethod}
          onSelect={setSelectedMethod}
          onNext={handleConfirmCancellation}
          isLoading={isLoading}
        />
      )}

      {step === "success" && (
        <SuccessStep
          refundAmount={refundResult?.refundAmount ?? refundAmount}
          remainingDays={sub.remainingDays}
          selectedMethod={selectedMethod}
          onNext={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setStep("feedback");
          }}
        />
      )}

      {step === "feedback" && (
        <FeedbackStep
          restaurantName={sub.restaurantName}
          onDone={handleDone}
        />
      )}
    </View>
  );
}

const header = StyleSheet.create({
  bar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingBottom: 10, borderBottomWidth: 1,
  },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
});
