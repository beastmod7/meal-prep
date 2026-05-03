import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
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
import { getRestaurants, ApiRestaurant } from "@/services/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultSlot(): "lunch" | "dinner" {
  const h = new Date().getHours();
  return h < 14 ? "lunch" : "dinner";
}

function slotLabel(slot: "lunch" | "dinner") {
  return slot === "lunch" ? "Lunch" : "Dinner";
}

function slotEmoji(slot: "lunch" | "dinner") {
  return slot === "lunch" ? "☀️" : "🌙";
}

function slotTime(slot: "lunch" | "dinner") {
  return slot === "lunch" ? "12:30 PM – 2:00 PM" : "7:00 PM – 9:00 PM";
}

function todayLabel() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "pick" | "summary" | "success";

// ─── Step dots ────────────────────────────────────────────────────────────────

function StepDots({ current }: { current: Step }) {
  const steps: Step[] = ["pick", "summary", "success"];
  const idx = steps.indexOf(current);
  return (
    <View style={dot.row}>
      {steps.map((_, i) => (
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
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.35)" },
  active: { width: 18, backgroundColor: "#FFFFFF" },
  done: { backgroundColor: "rgba(255,255,255,0.7)" },
});

// ─── Restaurant row ───────────────────────────────────────────────────────────

function RestaurantRow({
  r,
  selected,
  onPress,
}: {
  r: ApiRestaurant;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[
        rr.row,
        {
          borderColor: selected ? "#F59E0B" : colors.border,
          backgroundColor: selected ? "#FFFBEB" : colors.card,
        },
      ]}
    >
      <View style={[rr.dot, { backgroundColor: r.accentColor ?? "#F59E0B" }]} />
      <View style={{ flex: 1 }}>
        <Text style={[rr.name, { color: colors.foreground }]}>{r.name}</Text>
        <Text style={[rr.tagline, { color: colors.mutedForeground }]} numberOfLines={1}>
          {r.cuisineType ?? r.tagline ?? "Restaurant"}
          {r.rating ? ` · ★ ${r.rating.toFixed(1)}` : ""}
        </Text>
      </View>
      {selected ? (
        <View style={rr.checkCircle}>
          <Feather name="check" size={13} color="#FFFFFF" />
        </View>
      ) : (
        <Feather name="circle" size={20} color={colors.border} />
      )}
    </Pressable>
  );
}

const rr = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1.5, padding: 14 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 2 },
  tagline: { fontSize: 12, fontFamily: "Inter_400Regular" },
  checkCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center" },
});

// ─── Step 1: Pick ─────────────────────────────────────────────────────────────

function PickStep({
  restaurants,
  selectedId,
  onSelectId,
  slot,
  onSlotChange,
  onNext,
  onClose,
}: {
  restaurants: ApiRestaurant[];
  selectedId: string | null;
  onSelectId: (id: string) => void;
  slot: "lunch" | "dinner";
  onSlotChange: (s: "lunch" | "dinner") => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [showAll, setShowAll] = useState(false);

  const featured = restaurants[0];
  const rest = restaurants.slice(1);
  const visible = showAll ? rest : rest.slice(0, 2);

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 120,
          gap: 20,
        }}
      >
        {/* Header */}
        <View style={{ alignItems: "center", gap: 6 }}>
          <View style={pk.giftBadge}>
            <Text style={pk.giftEmoji}>🎁</Text>
          </View>
          <Text style={pk.heroTitle}>Your first meal is on us</Text>
          <Text style={[pk.heroSub, { color: colors.mutedForeground }]}>
            Experience Meal Pass completely free — today.
          </Text>
        </View>

        {/* Slot toggle */}
        <View>
          <Text style={[pk.label, { color: colors.foreground }]}>Choose a slot</Text>
          <View style={[pk.slotRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            {(["lunch", "dinner"] as const).map((s) => (
              <Pressable
                key={s}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSlotChange(s);
                }}
                style={[pk.slotBtn, slot === s && pk.slotBtnActive]}
              >
                <Text style={[pk.slotText, slot === s && pk.slotTextActive]}>
                  {slotEmoji(s)} {slotLabel(s)}
                </Text>
                <Text style={[pk.slotTime, slot === s && pk.slotTimeActive]}>
                  {slotTime(s)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Restaurant selection */}
        <View>
          <Text style={[pk.label, { color: colors.foreground }]}>Pick a restaurant</Text>
          <View style={{ gap: 10 }}>
            {featured && (
              <View>
                <View style={pk.recommendedBadge}>
                  <Feather name="star" size={11} color="#D97706" />
                  <Text style={pk.recommendedText}>Recommended for you</Text>
                </View>
                <RestaurantRow
                  r={featured}
                  selected={selectedId === featured.id}
                  onPress={() => onSelectId(featured.id)}
                />
              </View>
            )}
            {visible.map((r) => (
              <RestaurantRow
                key={r.id}
                r={r}
                selected={selectedId === r.id}
                onPress={() => onSelectId(r.id)}
              />
            ))}
            {rest.length > 2 && !showAll && (
              <Pressable onPress={() => setShowAll(true)} style={pk.showMoreBtn}>
                <Text style={[pk.showMoreText, { color: colors.primary }]}>
                  Show {rest.length - 2} more restaurants
                </Text>
                <Feather name="chevron-down" size={15} color={colors.primary} />
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          pk.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 0) + 8,
          },
        ]}
      >
        <Pressable
          onPress={onNext}
          disabled={!selectedId}
          style={({ pressed }) => [
            pk.nextBtn,
            !selectedId && { opacity: 0.45 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={pk.nextBtnText}>See meal summary</Text>
          <Feather name="arrow-right" size={18} color="#FFFFFF" />
        </Pressable>
        <Pressable onPress={onClose} style={pk.skipBtn}>
          <Text style={[pk.skipText, { color: colors.mutedForeground }]}>Maybe later</Text>
        </Pressable>
      </View>
    </>
  );
}

const pk = StyleSheet.create({
  giftBadge: { width: 64, height: 64, borderRadius: 20, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" },
  giftEmoji: { fontSize: 32 },
  heroTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#1A1A1A", textAlign: "center" },
  heroSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  label: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.4 },
  slotRow: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 4, gap: 4 },
  slotBtn: { flex: 1, borderRadius: 10, padding: 12, alignItems: "center", gap: 2 },
  slotBtnActive: { backgroundColor: "#F59E0B" },
  slotText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#71717A" },
  slotTextActive: { color: "#FFFFFF" },
  slotTime: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#A1A1AA" },
  slotTimeActive: { color: "rgba(255,255,255,0.85)" },
  recommendedBadge: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  recommendedText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#D97706" },
  showMoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10 },
  showMoreText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  footer: { borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 12, gap: 8 },
  nextBtn: { height: 54, backgroundColor: "#F59E0B", borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  nextBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  skipBtn: { height: 44, alignItems: "center", justifyContent: "center" },
  skipText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});

// ─── Step 2: Summary ──────────────────────────────────────────────────────────

function SummaryStep({
  restaurant,
  slot,
  isLoading,
  onClaim,
  onBack,
}: {
  restaurant: ApiRestaurant;
  slot: "lunch" | "dinner";
  isLoading: boolean;
  onClaim: () => void;
  onBack: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const regularPrice =
    slot === "lunch"
      ? (restaurant.lunchStartPrice ?? 120)
      : (restaurant.dinnerStartPrice ?? 140);

  return (
    <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 120,
          gap: 16,
        }}
      >
        {/* Restaurant hero */}
        <LinearGradient
          colors={[restaurant.accentColor ?? "#F59E0B", "#D97706"]}
          style={sm.restaurantCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={sm.onUsBadge}>
            <Feather name="gift" size={13} color="#D97706" />
            <Text style={sm.onUsBadgeText}>ON US</Text>
          </View>
          <Text style={sm.restaurantName}>{restaurant.name}</Text>
          <Text style={sm.restaurantTagline}>{restaurant.tagline ?? restaurant.cuisineType ?? "Great food awaits"}</Text>
          <View style={sm.slotPill}>
            <Text style={sm.slotPillText}>{slotEmoji(slot)} {slotLabel(slot)} · {slotTime(slot)}</Text>
          </View>
        </LinearGradient>

        {/* Date */}
        <View style={[sm.infoRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="calendar" size={16} color={colors.mutedForeground} />
          <View style={{ flex: 1 }}>
            <Text style={[sm.infoLabel, { color: colors.mutedForeground }]}>Scheduled for</Text>
            <Text style={[sm.infoValue, { color: colors.foreground }]}>{todayLabel()}</Text>
          </View>
        </View>

        {/* What you get */}
        <View style={[sm.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[sm.cardTitle, { color: colors.foreground }]}>What you'll get</Text>
          <View style={sm.benefitRow}>
            <Feather name="check-circle" size={16} color="#16A34A" />
            <Text style={[sm.benefitText, { color: colors.foreground }]}>1 full {slotLabel(slot).toLowerCase()} meal delivered</Text>
          </View>
          <View style={sm.benefitRow}>
            <Feather name="check-circle" size={16} color="#16A34A" />
            <Text style={[sm.benefitText, { color: colors.foreground }]}>From {restaurant.name}'s daily menu</Text>
          </View>
          <View style={sm.benefitRow}>
            <Feather name="check-circle" size={16} color="#16A34A" />
            <Text style={[sm.benefitText, { color: colors.foreground }]}>Full order tracking in the app</Text>
          </View>
          <View style={sm.benefitRow}>
            <Feather name="check-circle" size={16} color="#16A34A" />
            <Text style={[sm.benefitText, { color: colors.foreground }]}>No payment, no card required</Text>
          </View>
        </View>

        {/* Price breakdown */}
        <View style={[sm.priceCard, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
          <Text style={sm.priceTitle}>Price breakdown</Text>
          <View style={sm.priceRow}>
            <Text style={sm.priceLabel}>Regular meal price</Text>
            <Text style={sm.priceStrike}>₹{regularPrice}</Text>
          </View>
          <View style={sm.priceRow}>
            <Text style={sm.discountLabel}>First meal discount</Text>
            <Text style={sm.discountValue}>−₹{regularPrice}</Text>
          </View>
          <View style={[sm.totalRow, { borderTopColor: "#FDE68A" }]}>
            <View>
              <Text style={sm.totalLabel}>You pay today</Text>
              <Text style={sm.onUsCaption}>On Us — completely free</Text>
            </View>
            <Text style={sm.totalPrice}>₹0</Text>
          </View>
        </View>

        {/* No commitment note */}
        <View style={[sm.noteBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="info" size={13} color={colors.mutedForeground} />
          <Text style={[sm.noteText, { color: colors.mutedForeground }]}>
            This is a one-time taste test. No subscription, no commitment, no payment needed. Enjoy!
          </Text>
        </View>
      </ScrollView>

      <View
        style={[
          sm.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 0) + 8,
          },
        ]}
      >
        <Pressable
          onPress={onClaim}
          disabled={isLoading}
          style={({ pressed }) => [sm.claimBtn, isLoading && { opacity: 0.6 }, pressed && { opacity: 0.88 }]}
        >
          {isLoading ? (
            <Text style={sm.claimBtnText}>Booking your free meal…</Text>
          ) : (
            <>
              <Text style={sm.claimBtnText}>Claim My Free Meal 🎉</Text>
            </>
          )}
        </Pressable>
        <Pressable onPress={onBack} style={pk.skipBtn}>
          <Text style={[pk.skipText, { color: colors.mutedForeground }]}>Go back</Text>
        </Pressable>
      </View>
    </>
  );
}

const sm = StyleSheet.create({
  restaurantCard: { borderRadius: 20, padding: 20, gap: 8 },
  onUsBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FFFFFF", alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  onUsBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#D97706", letterSpacing: 0.5 },
  restaurantName: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  restaurantTagline: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)" },
  slotPill: { backgroundColor: "rgba(0,0,0,0.2)", alignSelf: "flex-start", borderRadius: 100, paddingHorizontal: 12, paddingVertical: 6, marginTop: 4 },
  slotPillText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  infoLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  infoValue: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  cardTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 12 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5 },
  benefitText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  priceCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  priceTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#78350F", marginBottom: 4 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  priceLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#78350F" },
  priceStrike: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#A16207", textDecorationLine: "line-through" },
  discountLabel: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#16A34A" },
  discountValue: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#16A34A" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, paddingTop: 10, marginTop: 2 },
  totalLabel: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#78350F" },
  onUsCaption: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#D97706", marginTop: 2 },
  totalPrice: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#16A34A" },
  noteBox: { flexDirection: "row", gap: 8, alignItems: "flex-start", borderRadius: 12, borderWidth: 1, padding: 12 },
  noteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  footer: { borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 12, gap: 8 },
  claimBtn: { height: 56, backgroundColor: "#F59E0B", borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  claimBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
});

// ─── Step 3: Success ──────────────────────────────────────────────────────────

function SuccessStep({
  restaurant,
  slot,
  onTrackOrder,
  onExplore,
}: {
  restaurant: ApiRestaurant;
  slot: "lunch" | "dinner";
  onTrackOrder: () => void;
  onExplore: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 10,
        stiffness: 120,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const STEPS = [
    { icon: "check-circle", color: "#16A34A", text: "Order confirmed & sent to restaurant" },
    { icon: "clock", color: "#F59E0B", text: `Being prepared for ${slotTime(slot)}` },
    { icon: "package", color: "#3B82F6", text: "Out for delivery at meal time" },
    { icon: "home", color: "#8B5CF6", text: `Delivered — enjoy your free ${slotLabel(slot).toLowerCase()}!` },
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
      {/* Hero */}
      <View style={su.heroArea}>
        <Animated.View style={[su.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
          <Feather name="check" size={40} color="#FFFFFF" />
        </Animated.View>
        <Text style={su.heroTitle}>Your free meal is booked!</Text>
        <Text style={[su.heroSub, { color: colors.mutedForeground }]}>
          Sit back and let us handle the rest.
        </Text>
      </View>

      {/* Booking card */}
      <Animated.View style={[su.bookingCard, { opacity: fadeAnim }]}>
        <View style={su.bookingHeader}>
          <View style={[su.accentDot, { backgroundColor: restaurant.accentColor ?? "#F59E0B" }]} />
          <Text style={su.bookingRestaurant}>{restaurant.name}</Text>
          <View style={su.freeBadge}>
            <Text style={su.freeBadgeText}>FREE</Text>
          </View>
        </View>
        <View style={su.bookingDetails}>
          <View style={su.bookingRow}>
            <Feather name="calendar" size={14} color="#71717A" />
            <Text style={su.bookingText}>{todayLabel()}</Text>
          </View>
          <View style={su.bookingRow}>
            <Feather name="clock" size={14} color="#71717A" />
            <Text style={su.bookingText}>{slotEmoji(slot)} {slotLabel(slot)} · {slotTime(slot)}</Text>
          </View>
          <View style={su.bookingRow}>
            <Feather name="tag" size={14} color="#16A34A" />
            <Text style={[su.bookingText, { color: "#16A34A", fontFamily: "Inter_700Bold" }]}>₹0 — On Us</Text>
          </View>
        </View>
      </Animated.View>

      {/* Journey */}
      <Animated.View style={[su.journeyBox, { opacity: fadeAnim, borderColor: colors.border }]}>
        <Text style={[su.journeyTitle, { color: colors.foreground }]}>Your meal journey</Text>
        {STEPS.map((step, i) => (
          <View key={i} style={su.journeyRow}>
            <View style={[su.journeyIcon, { backgroundColor: `${step.color}20` }]}>
              <Feather name={step.icon as any} size={14} color={step.color} />
            </View>
            <Text style={[su.journeyText, { color: i === 0 ? colors.foreground : colors.mutedForeground }]}>
              {step.text}
            </Text>
          </View>
        ))}
      </Animated.View>

      {/* Upsell */}
      <Animated.View style={[su.upsell, { opacity: fadeAnim, backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
        <Feather name="trending-up" size={16} color="#2563EB" />
        <Text style={su.upsellText}>
          Loved it? Subscribe to {restaurant.name} from just ₹{restaurant.lunchStartPrice ?? 120}/day and never worry about lunch again.
        </Text>
      </Animated.View>

      {/* CTAs */}
      <Animated.View style={[su.ctaArea, { opacity: fadeAnim }]}>
        <Pressable
          onPress={onTrackOrder}
          style={({ pressed }) => [su.primaryCta, pressed && { opacity: 0.88 }]}
        >
          <Feather name="map-pin" size={16} color="#FFFFFF" />
          <Text style={su.primaryCtaText}>Track My Order</Text>
        </Pressable>
        <Pressable
          onPress={onExplore}
          style={({ pressed }) => [su.secondaryCta, { borderColor: colors.border }, pressed && { opacity: 0.75 }]}
        >
          <Text style={[su.secondaryCtaText, { color: colors.foreground }]}>Explore meal plans</Text>
          <Feather name="arrow-right" size={15} color={colors.foreground} />
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

const su = StyleSheet.create({
  heroArea: { alignItems: "center", paddingVertical: 28, gap: 10 },
  checkCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: "#16A34A", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  heroTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: "#1A1A1A", textAlign: "center" },
  heroSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  bookingCard: { borderRadius: 16, borderWidth: 1.5, borderColor: "#FDE68A", backgroundColor: "#FFFBEB", padding: 16, marginBottom: 16 },
  bookingHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  accentDot: { width: 10, height: 10, borderRadius: 5 },
  bookingRestaurant: { flex: 1, fontSize: 16, fontFamily: "Inter_700Bold", color: "#1A1A1A" },
  freeBadge: { backgroundColor: "#16A34A", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  freeBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#FFFFFF", letterSpacing: 0.5 },
  bookingDetails: { gap: 8 },
  bookingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bookingText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#52525B" },
  journeyBox: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10, marginBottom: 14, backgroundColor: "#FAFAFA" },
  journeyTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 4 },
  journeyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  journeyIcon: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  journeyText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  upsell: { flexDirection: "row", gap: 10, alignItems: "flex-start", borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 20 },
  upsellText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#1D4ED8", lineHeight: 19 },
  ctaArea: { gap: 10 },
  primaryCta: { height: 54, backgroundColor: "#16A34A", borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryCtaText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  secondaryCta: { height: 50, borderRadius: 14, borderWidth: 1.5, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  secondaryCtaText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FreeMealScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { bookFreeMeal } = useApp();

  const [step, setStep] = useState<Step>("pick");
  const [restaurants, setRestaurants] = useState<ApiRestaurant[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [slot, setSlot] = useState<"lunch" | "dinner">(defaultSlot());
  const [isLoading, setIsLoading] = useState(false);
  const [bookedOrderId, setBookedOrderId] = useState<string | null>(null);

  React.useEffect(() => {
    getRestaurants()
      .then((list) => {
        const sorted = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        setRestaurants(sorted);
        if (sorted[0]) setSelectedId(sorted[0].id);
      })
      .catch(() => {});
  }, []);

  const selectedRestaurant = restaurants.find((r) => r.id === selectedId) ?? null;

  async function handleClaim() {
    if (!selectedId) return;
    setIsLoading(true);
    try {
      const result = await bookFreeMeal(selectedId, slot);
      setBookedOrderId(result.orderId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("success");
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }

  const stepTitle: Record<Step, string> = {
    pick: "First Meal Free",
    summary: "Meal Summary",
    success: "Booked!",
  };

  function goBack() {
    if (step === "pick") router.back();
    else if (step === "summary") setStep("pick");
  }

  const canGoBack = step === "pick" || step === "summary";
  const isSuccess = step === "success";

  return (
    <View style={{ flex: 1, backgroundColor: isSuccess ? colors.background : colors.background }}>
      {/* Header */}
      <LinearGradient
        colors={isSuccess ? ["#16A34A", "#15803D"] : ["#F59E0B", "#D97706"]}
        style={[
          hdr.bar,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 10,
          },
        ]}
      >
        <Pressable onPress={canGoBack ? goBack : undefined} style={hdr.backBtn}>
          {canGoBack ? (
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          ) : (
            <View style={{ width: 22 }} />
          )}
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={hdr.title}>{stepTitle[step]}</Text>
          <StepDots current={step} />
        </View>
        <View style={{ width: 44 }} />
      </LinearGradient>

      {step === "pick" && (
        <PickStep
          restaurants={restaurants}
          selectedId={selectedId}
          onSelectId={setSelectedId}
          slot={slot}
          onSlotChange={setSlot}
          onNext={() => setStep("summary")}
          onClose={() => router.back()}
        />
      )}

      {step === "summary" && selectedRestaurant && (
        <SummaryStep
          restaurant={selectedRestaurant}
          slot={slot}
          isLoading={isLoading}
          onClaim={handleClaim}
          onBack={() => setStep("pick")}
        />
      )}

      {step === "success" && selectedRestaurant && (
        <SuccessStep
          restaurant={selectedRestaurant}
          slot={slot}
          onTrackOrder={() => router.replace("/(tabs)/orders")}
          onExplore={() => router.replace("/(tabs)/meals")}
        />
      )}
    </View>
  );
}

const hdr = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 14 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  title: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 4 },
});
