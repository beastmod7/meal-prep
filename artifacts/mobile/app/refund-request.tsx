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

type Step = "confirm" | "refund-method" | "feedback" | "success";

type RefundMethod = {
  id: "upi" | "bank";
  icon: "smartphone" | "credit-card";
  label: string;
  tagline: string;
  timeLabel: string;
  timeColor: string;
};

const REFUND_METHODS: RefundMethod[] = [
  {
    id: "upi",
    icon: "smartphone",
    label: "UPI",
    tagline: "Refund to your UPI-linked account",
    timeLabel: "3–5 hours",
    timeColor: "#2563EB",
  },
  {
    id: "bank",
    icon: "credit-card",
    label: "Bank / Card",
    tagline: "Refund to your original payment source",
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

// ─── Step dots ────────────────────────────────────────────────────────────────

const STEP_ORDER: Step[] = ["confirm", "refund-method", "feedback", "success"];

function StepDots({ current }: { current: Step }) {
  const idx = STEP_ORDER.indexOf(current);
  return (
    <View style={dot.row}>
      {STEP_ORDER.map((_, i) => (
        <View
          key={i}
          style={[dot.dot, i === idx && dot.active, i < idx && dot.done]}
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

// ─── Step 1: Confirm ──────────────────────────────────────────────────────────

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

        <View style={[cs.subCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={cs.emoji}>{sub.slot === "lunch" ? "☀️" : "🌙"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[cs.name, { color: colors.foreground }]}>{sub.restaurantName}</Text>
            <Text style={[cs.detail, { color: colors.mutedForeground }]}>
              {sub.slot === "lunch" ? "Lunch" : "Dinner"} · {sub.totalDays}-day pack · ends {formatDate(sub.endDate)}
            </Text>
          </View>
        </View>

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
  subCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
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
  warning: { flexDirection: "row", gap: 10, alignItems: "flex-start", borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 14, backgroundColor: "#FEF2F2", borderColor: "#FEE2E2" },
  warnTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#991B1B", marginBottom: 3 },
  warnBody: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#991B1B", lineHeight: 17 },
  footer: { borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 12, gap: 8 },
  primaryBtn: { height: 54, backgroundColor: "#EF4444", borderRadius: 14, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  secondaryBtn: { height: 44, alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});

// ─── Step 2: Refund Method ────────────────────────────────────────────────────

function RefundMethodStep({
  selectedMethod,
  onSelect,
  onNext,
}: {
  selectedMethod: RefundMethod["id"] | null;
  onSelect: (id: RefundMethod["id"]) => void;
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
          title="How would you like your refund?"
          subtitle="Choose your preferred refund method. You'll confirm everything on the next step."
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
            Refunds are returned only to your original payment method. This is not a wallet — no credit is stored in the app.
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
          disabled={!selectedMethod}
          style={({ pressed }) => [
            rm.nextBtn,
            !selectedMethod && { opacity: 0.45 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={cs.primaryBtnText}>Continue</Text>
          <Feather name="arrow-right" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </>
  );
}

const rm = StyleSheet.create({
  option: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 16, borderWidth: 1.5, padding: 16 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  methodLabel: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 2 },
  methodTagline: { fontSize: 12, fontFamily: "Inter_400Regular" },
  timeLabel: { fontSize: 12, fontFamily: "Inter_700Bold" },
  checkCircle: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#3B82F6", alignItems: "center", justifyContent: "center" },
  noteBox: { flexDirection: "row", gap: 8, alignItems: "flex-start", borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 16 },
  noteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  nextBtn: { height: 54, backgroundColor: "#3B82F6", borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});

// ─── Step 3: Feedback ─────────────────────────────────────────────────────────

function FeedbackStep({
  restaurantName,
  isLoading,
  onSubmit,
}: {
  restaurantName: string;
  isLoading: boolean;
  onSubmit: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");

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
    onSubmit();
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
                  { borderColor: active ? "#3B82F6" : colors.border, backgroundColor: active ? "#EFF6FF" : colors.card },
                ]}
              >
                <Feather
                  name={opt.icon as any}
                  size={14}
                  color={active ? "#2563EB" : colors.mutedForeground}
                />
                <Text style={[fb.chipText, { color: active ? "#1D4ED8" : colors.foreground }]}>
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
          disabled={selected.size === 0 || isLoading}
          style={({ pressed }) => [
            fb.submitBtn,
            (selected.size === 0 || isLoading) && { opacity: 0.45 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={cs.primaryBtnText}>
            {isLoading ? "Processing refund…" : "Submit Feedback & Confirm Refund"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const fb = StyleSheet.create({
  chipGroupLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 12 },
  chipGrid: { gap: 10 },
  chip: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 14 },
  chipText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  chipCheck: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#3B82F6", alignItems: "center", justifyContent: "center" },
  noteLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  noteInput: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, minHeight: 100 },
  submitBtn: { height: 54, backgroundColor: "#EF4444", borderRadius: 14, alignItems: "center", justifyContent: "center" },
});

// ─── Step 4: Success ──────────────────────────────────────────────────────────

function SuccessStep({
  refundAmount,
  remainingDays,
  selectedMethod,
  onDone,
}: {
  refundAmount: number;
  remainingDays: number;
  selectedMethod: RefundMethod["id"] | null;
  onDone: () => void;
}) {
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
    method.id === "upi"
      ? [
          "Subscription cancelled immediately",
          "All upcoming meals cancelled",
          `Refund of ₹${refundAmount.toLocaleString("en-IN")} initiated to your UPI account`,
          "Credited to your original payment source within 3–5 hours",
        ]
      : [
          "Subscription cancelled immediately",
          "All upcoming meals cancelled",
          `Refund of ₹${refundAmount.toLocaleString("en-IN")} initiated`,
          "Credited to your original payment source in 5–7 business days",
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
      <View style={ss.heroArea}>
        <Animated.View style={[ss.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
          <Feather name="check" size={36} color="#FFFFFF" />
        </Animated.View>
        <Text style={ss.heroTitle}>Subscription cancelled</Text>
        <Text style={ss.heroSub}>Your refund has been initiated</Text>
      </View>

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

      <View style={[ss.noteBox, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
        <Feather name="info" size={13} color="#2563EB" />
        <Text style={ss.noteText}>
          {remainingDays} unused meal days have been freed up. You can subscribe to any restaurant again anytime.
        </Text>
      </View>

      <Pressable
        onPress={onDone}
        style={({ pressed }) => [ss.doneBtn, pressed && { opacity: 0.9 }]}
      >
        <Text style={ss.doneBtnText}>Go to My Plans</Text>
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
  noteBox: { flexDirection: "row", gap: 8, alignItems: "flex-start", borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 24 },
  noteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#1D4ED8", lineHeight: 17 },
  doneBtn: { height: 54, backgroundColor: "#3B82F6", borderRadius: 14, alignItems: "center", justifyContent: "center" },
  doneBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
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
      <View style={{ flex: 1, backgroundColor: colors.background }}>
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

  const estimatedRefund = Math.max(0, sub.remainingDays * sub.pricePerDay - sub.lateCancellationFees);
  const actualRefund = refundResult?.refundAmount ?? estimatedRefund;

  async function handleFeedbackSubmit() {
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

  function goBack() {
    if (step === "confirm") router.back();
    else if (step === "refund-method") setStep("confirm");
    else if (step === "feedback") setStep("refund-method");
  }

  const stepTitle: Record<Step, string> = {
    "confirm": "Cancel & Refund",
    "refund-method": "Refund Method",
    "feedback": "Quick Feedback",
    "success": "All Done",
  };

  const canGoBack = step === "confirm" || step === "refund-method" || step === "feedback";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={[
          hdr.bar,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={canGoBack ? goBack : undefined} style={hdr.backBtn}>
          {canGoBack ? (
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          ) : (
            <View style={{ width: 22 }} />
          )}
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[hdr.title, { color: colors.foreground }]}>{stepTitle[step]}</Text>
          <StepDots current={step} />
        </View>
        <View style={{ width: 44 }} />
      </View>

      {step === "confirm" && (
        <ConfirmStep
          sub={sub}
          refundAmount={estimatedRefund}
          onKeep={() => router.back()}
          onNext={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setStep("refund-method");
          }}
        />
      )}

      {step === "refund-method" && (
        <RefundMethodStep
          selectedMethod={selectedMethod}
          onSelect={setSelectedMethod}
          onNext={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setStep("feedback");
          }}
        />
      )}

      {step === "feedback" && (
        <FeedbackStep
          restaurantName={sub.restaurantName}
          isLoading={isLoading}
          onSubmit={handleFeedbackSubmit}
        />
      )}

      {step === "success" && (
        <SuccessStep
          refundAmount={actualRefund}
          remainingDays={sub.remainingDays}
          selectedMethod={selectedMethod}
          onDone={() => router.replace("/(tabs)/pass")}
        />
      )}
    </View>
  );
}

const hdr = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 10, borderBottomWidth: 1 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
});
