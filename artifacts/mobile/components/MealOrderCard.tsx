import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import StatusBadge from "@/components/StatusBadge";
import { MealOrder, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useRatedOrders } from "@/hooks/useRatedOrders";

interface MealOrderCardProps {
  order: MealOrder;
  onCancel?: (order: MealOrder) => void;
  showActions?: boolean;
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate + "T12:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (isoDate === today.toISOString().split("T")[0]) return "Today";
  if (isoDate === tomorrow.toISOString().split("T")[0]) return "Tomorrow";
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatCancelTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── Inline star rating ────────────────────────────────────────────────────────

type RatingState = "idle" | "submitting" | "done";

function InlineRating({
  order,
  onDone,
}: {
  order: MealOrder;
  onDone: () => void;
}) {
  const colors = useColors();
  const { rateRestaurant } = useApp();
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [state, setState] = useState<RatingState>("idle");
  const thankAnim = useRef(new Animated.Value(0)).current;
  const starAnims = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;

  async function handleTap(star: number) {
    if (state !== "idle") return;
    setSelected(star);
    setState("submitting");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Animate the tapped star
    Animated.sequence([
      Animated.timing(starAnims[star - 1]!, { toValue: 1.35, duration: 120, useNativeDriver: true }),
      Animated.spring(starAnims[star - 1]!, { toValue: 1, useNativeDriver: true, damping: 8 }),
    ]).start();

    try {
      await rateRestaurant({
        restaurantId: order.restaurantId,
        restaurantName: order.restaurantName,
        ratings: {
          foodQuality: star,
          packaging: star,
          delivery: star,
          valueForMoney: star,
          hygiene: star,
          communication: star,
          overall: star,
          note: "",
        },
      });
    } catch {
      // Still mark done — don't pester the user again
    }

    setState("done");
    Animated.timing(thankAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    setTimeout(onDone, 1800);
  }

  return (
    <View style={[ir.wrap, { borderTopColor: colors.border }]}>
      {state === "done" ? (
        <Animated.View style={[ir.thankRow, { opacity: thankAnim }]}>
          <Text style={ir.thankText}>Thanks for rating!</Text>
          <Text style={ir.thankStars}>{"★".repeat(selected)}</Text>
        </Animated.View>
      ) : (
        <>
          <Text style={[ir.prompt, { color: colors.mutedForeground }]}>How was your meal?</Text>
          <View style={ir.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => {
              const filled = star <= (hovered || selected);
              return (
                <Animated.View key={star} style={{ transform: [{ scale: starAnims[star - 1]! }] }}>
                  <Pressable
                    onPress={() => handleTap(star)}
                    onPressIn={() => setHovered(star)}
                    onPressOut={() => setHovered(0)}
                    hitSlop={6}
                    style={ir.starBtn}
                  >
                    <Feather
                      name="star"
                      size={22}
                      color={filled ? "#F59E0B" : "#D4D4D8"}
                    />
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const ir = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  prompt: { fontSize: 12, fontFamily: "Inter_500Medium" },
  starsRow: { flexDirection: "row", gap: 2 },
  starBtn: { padding: 3 },
  thankRow: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  thankText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#16A34A" },
  thankStars: { fontSize: 14, color: "#F59E0B", letterSpacing: 1 },
});

// ─── Main component ────────────────────────────────────────────────────────────

export default function MealOrderCard({
  order,
  onCancel,
  showActions = true,
}: MealOrderCardProps) {
  const colors = useColors();
  const { getOrderCancelStatus } = useApp();
  const router = useRouter();
  const { isRated, markRated } = useRatedOrders();
  const [ratingDismissed, setRatingDismissed] = useState(false);

  const cancelStatus = getOrderCancelStatus(order);
  const isActive = !["delivered", "cancelled_free", "cancelled_late", "cancelled_full"].includes(order.status);
  const isCancelled = ["cancelled_free", "cancelled_late", "cancelled_full"].includes(order.status);
  const isDelivered = order.status === "delivered";

  const accentColor = order.slot === "lunch" ? "#F59E0B" : "#8B5CF6";

  const showRating =
    isDelivered &&
    !ratingDismissed &&
    !isRated(order.id);

  function getBadgeVariant() {
    if (order.status === "delivered") return "delivered";
    if (isCancelled) return "cancelled";
    if (order.status === "preparing") return "preparing";
    if (cancelStatus === "free") return "free";
    if (cancelStatus === "late") return "late";
    if (cancelStatus === "full") return "locked";
    return "free";
  }

  function getBadgeLabel() {
    if (order.status === "delivered") return "Delivered";
    if (order.status === "cancelled_free") return "Cancelled free";
    if (order.status === "cancelled_late") return "Late cancel";
    if (order.status === "cancelled_full") return "Full charge";
    if (order.status === "preparing") return "Preparing";
    if (cancelStatus === "free") return `Free cancel by ${formatCancelTime(order.freeCancelUntil)}`;
    if (cancelStatus === "late") return "Late fee applies";
    if (cancelStatus === "full") return "Locked in";
    return "Scheduled";
  }

  const cardBg = order.slot === "lunch" ? "#FFFBEB" : "#F5F3FF";

  return (
    <Pressable
      onPress={() => router.push(`/order-tracking/${order.id}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: cardBg, borderColor: order.slot === "lunch" ? "#FDE68A" : "#DDD6FE" },
        pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] },
        isCancelled && { opacity: 0.5 },
      ]}
    >
      <View style={styles.cardInner}>
        <View style={styles.topRow}>
          <View style={styles.dateSlot}>
            <Text style={[styles.date, { color: colors.foreground }]}>{formatDate(order.scheduledDate)}</Text>
            <View
              style={[
                styles.slotPill,
                { backgroundColor: order.slot === "lunch" ? "#FEF3C7" : "#EDE9FE" },
              ]}
            >
              <Text style={[styles.slotText, { color: order.slot === "lunch" ? "#92400E" : "#5B21B6" }]}>
                {order.slot === "lunch" ? "☀️ Lunch" : "🌙 Dinner"}
              </Text>
            </View>
          </View>
          <StatusBadge variant={getBadgeVariant()} label={getBadgeLabel()} small />
        </View>

        <View style={styles.mealRow}>
          <View style={[styles.mealIcon, { backgroundColor: accentColor + "18" }]}>
            <Feather name="coffee" size={16} color={accentColor} />
          </View>
          <View style={styles.mealInfo}>
            <Text style={[styles.mealName, { color: colors.foreground }]}>{order.mealName}</Text>
            <Text style={[styles.restaurantName, { color: colors.mutedForeground }]}>{order.restaurantName}</Text>
          </View>
          <View style={styles.priceWrap}>
            <Text style={[styles.price, { color: colors.foreground }]}>₹{order.pricePerDay}</Text>
            <Text style={[styles.priceSub, { color: colors.mutedForeground }]}>/day</Text>
          </View>
        </View>

        {showActions && isActive && onCancel && (
          <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onCancel(order);
              }}
              style={({ pressed }) => [
                styles.cancelBtn,
                { borderColor: colors.border, backgroundColor: colors.muted },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Feather name="x" size={13} color={colors.mutedForeground} />
              <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel this day</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/order-tracking/${order.id}`)}
              style={({ pressed }) => [
                styles.trackBtn,
                { backgroundColor: "#EFF6FF", borderColor: colors.border },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Feather name="map-pin" size={13} color="#3B82F6" />
              <Text style={[styles.trackBtnText, { color: "#3B82F6" }]}>Track</Text>
            </Pressable>
          </View>
        )}

        {showRating && (
          <InlineRating
            order={order}
            onDone={() => {
              markRated(order.id);
              setRatingDismissed(true);
            }}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  cardInner: { flex: 1 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  dateSlot: { flexDirection: "row", alignItems: "center", gap: 8 },
  date: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  slotPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  slotText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  mealRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 12, gap: 10 },
  mealIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  restaurantName: { fontSize: 12, fontFamily: "Inter_400Regular" },
  priceWrap: { alignItems: "flex-end" },
  price: { fontSize: 15, fontFamily: "Inter_700Bold" },
  priceSub: { fontSize: 10, fontFamily: "Inter_400Regular" },
  actionsRow: {
    borderTopWidth: 1,
    padding: 10,
    flexDirection: "row",
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  trackBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
  },
  trackBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
