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

import { MEALS, RESTAURANTS, SUBSCRIPTION_PACKAGES } from "@/constants/mockData";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

export default function BuyPassScreen() {
  const { restaurantId } = useLocalSearchParams<{ restaurantId?: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { subscribe } = useApp();

  const restaurant = RESTAURANTS.find((r) => r.id === restaurantId) ?? RESTAURANTS[0];
  const packages = SUBSCRIPTION_PACKAGES[restaurant.id] ?? [];

  const availableSlots: ("lunch" | "dinner")[] = [];
  if (restaurant.lunchAvailable) availableSlots.push("lunch");
  if (restaurant.dinnerAvailable) availableSlots.push("dinner");

  const [selectedSlot, setSelectedSlot] = useState<"lunch" | "dinner">(availableSlots[0]);
  const [selectedDays, setSelectedDays] = useState<10 | 20 | 30>(20);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const slotPackages = packages.filter((p) => p.slot === selectedSlot);
  const chosenPkg = slotPackages.find((p) => p.days === selectedDays) ?? slotPackages[0];

  const defaultMeal =
    MEALS.find(
      (m) =>
        m.restaurantId === restaurant.id &&
        (m.type === selectedSlot || m.type === "both")
    ) ?? MEALS.find((m) => m.restaurantId === restaurant.id);

  async function handleSubscribe() {
    if (!chosenPkg || !defaultMeal) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);
    try {
      await subscribe({
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        slot: selectedSlot,
        days: chosenPkg.days,
        pricePerDay: chosenPkg.pricePerDay,
        defaultMealId: defaultMeal.id,
        defaultMealName: defaultMeal.name,
      });
      router.replace({
        pathname: "/payment-success",
        params: {
          restaurantName: restaurant.name,
          slot: selectedSlot,
          days: String(chosenPkg.days),
          totalPaid: String(chosenPkg.totalPrice),
        },
      });
    } catch {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 120,
          paddingTop: 16,
        }}
      >
        {/* Restaurant header */}
        <View
          style={[
            styles.restaurantHeader,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.restIconBg,
              { backgroundColor: restaurant.accentColor + "22" },
            ]}
          >
            <Feather name="coffee" size={22} color={restaurant.accentColor} />
          </View>
          <View style={styles.restInfo}>
            <Text style={[styles.restName, { color: colors.foreground }]}>
              {restaurant.name}
            </Text>
            <Text style={[styles.restTagline, { color: colors.mutedForeground }]}>
              {restaurant.tagline}
            </Text>
          </View>
          <View style={styles.ratingPill}>
            <Feather name="star" size={12} color="#F59E0B" />
            <Text style={styles.ratingText}>{restaurant.rating}</Text>
          </View>
        </View>

        <View style={styles.sections}>
          {/* Step 1: Slot */}
          <View>
            <Text style={[styles.stepLabel, { color: colors.foreground }]}>
              1. Choose slot
            </Text>
            <View style={styles.slotRow}>
              {availableSlots.map((slot) => (
                <Pressable
                  key={slot}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedSlot(slot);
                    const newPkgs = packages.filter((p) => p.slot === slot);
                    const hasDays = newPkgs.find((p) => p.days === selectedDays);
                    if (!hasDays && newPkgs.length > 0)
                      setSelectedDays(newPkgs[0].days as 10 | 20 | 30);
                  }}
                  style={[
                    styles.slotCard,
                    { borderColor: colors.border, backgroundColor: colors.card },
                    selectedSlot === slot && slot === "lunch" && {
                      borderColor: "#F97316",
                      backgroundColor: "#FFF3E8",
                    },
                    selectedSlot === slot && slot === "dinner" && {
                      borderColor: "#7C3AED",
                      backgroundColor: "#F5F3FF",
                    },
                  ]}
                >
                  <Text style={styles.slotEmoji}>
                    {slot === "lunch" ? "☀️" : "🌙"}
                  </Text>
                  <Text
                    style={[
                      styles.slotName,
                      {
                        color:
                          selectedSlot === slot
                            ? slot === "lunch"
                              ? "#92400E"
                              : "#4C1D95"
                            : colors.foreground,
                      },
                    ]}
                  >
                    {slot === "lunch" ? "Lunch" : "Dinner"}
                  </Text>
                  <Text
                    style={[
                      styles.slotTime,
                      {
                        color:
                          selectedSlot === slot
                            ? slot === "lunch"
                              ? "#92400E"
                              : "#4C1D95"
                            : colors.mutedForeground,
                      },
                    ]}
                  >
                    {slot === "lunch" ? "12–2 PM" : "7–9 PM"}
                  </Text>
                  {selectedSlot === slot && (
                    <View
                      style={[
                        styles.slotCheck,
                        {
                          backgroundColor:
                            slot === "lunch" ? "#F97316" : "#7C3AED",
                        },
                      ]}
                    >
                      <Feather name="check" size={10} color="#FFF" />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* Step 2: Duration */}
          <View>
            <Text style={[styles.stepLabel, { color: colors.foreground }]}>
              2. Choose duration
            </Text>
            {slotPackages.map((pkg) => {
              const isSelected = selectedDays === pkg.days;
              return (
                <Pressable
                  key={pkg.days}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedDays(pkg.days as 10 | 20 | 30);
                  }}
                  style={[
                    styles.packageCard,
                    { borderColor: colors.border, backgroundColor: colors.card },
                    isSelected && {
                      borderColor: colors.primary,
                      backgroundColor: "#FFF3E8",
                    },
                  ]}
                >
                  <View style={styles.packageLeft}>
                    <View style={styles.packageDaysRow}>
                      <Text
                        style={[styles.packageDays, { color: colors.foreground }]}
                      >
                        {pkg.days} days
                      </Text>
                      {pkg.popular && (
                        <View style={styles.popularBadge}>
                          <Text style={styles.popularText}>Popular</Text>
                        </View>
                      )}
                      {pkg.discountPct && (
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountText}>
                            {pkg.discountPct}% off
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.packagePricePer,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      ₹{pkg.pricePerDay}/day · {pkg.days} meals auto-scheduled
                    </Text>
                  </View>
                  <View style={styles.packageRight}>
                    <Text
                      style={[styles.packageTotal, { color: colors.foreground }]}
                    >
                      ₹{pkg.totalPrice.toLocaleString("en-IN")}
                    </Text>
                    {isSelected && (
                      <Feather
                        name="check-circle"
                        size={20}
                        color={colors.primary}
                      />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* How it works */}
          <View
            style={[
              styles.howItWorks,
              { backgroundColor: colors.muted, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.howTitle, { color: colors.foreground }]}>
              How it works
            </Text>
            {[
              {
                icon: "calendar" as const,
                text: "One meal per day is auto-scheduled for your full subscription period",
              },
              {
                icon: "bell" as const,
                text: "Cancel any individual day for free before 10 PM the previous night",
              },
              {
                icon: "rotate-ccw" as const,
                text: "Cancel your whole subscription anytime — get a refund on unused days",
              },
            ].map((item, i) => (
              <View key={i} style={styles.howRow}>
                <View style={[styles.howIcon, { backgroundColor: "#FFF3E8" }]}>
                  <Feather name={item.icon} size={14} color="#F97316" />
                </View>
                <Text
                  style={[styles.howText, { color: colors.mutedForeground }]}
                >
                  {item.text}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Sticky payment footer */}
      {chosenPkg && (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              paddingBottom:
                insets.bottom + (Platform.OS === "web" ? 24 : 0) + 8,
            },
          ]}
        >
          <View style={styles.footerInfo}>
            <View>
              <Text style={[styles.footerLabel, { color: colors.mutedForeground }]}>
                {restaurant.name} · {selectedSlot === "lunch" ? "Lunch" : "Dinner"} · {selectedDays} days
              </Text>
              <Text style={[styles.footerPer, { color: colors.mutedForeground }]}>
                ₹{chosenPkg.pricePerDay}/day
              </Text>
            </View>
            <Text style={[styles.footerTotal, { color: colors.foreground }]}>
              ₹{chosenPkg.totalPrice.toLocaleString("en-IN")}
            </Text>
          </View>
          <Pressable
            onPress={handleSubscribe}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.payBtn,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.9 },
              isSubmitting && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.payBtnText}>
              {isSubmitting
                ? "Processing…"
                : `Pay ₹${chosenPkg.totalPrice.toLocaleString("en-IN")}`}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  restaurantHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  restIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  restInfo: { flex: 1 },
  restName: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 1 },
  restTagline: { fontSize: 12, fontFamily: "Inter_400Regular" },
  ratingPill: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#F59E0B" },
  sections: { padding: 16, gap: 24 },
  stepLabel: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
  slotRow: { flexDirection: "row", gap: 10 },
  slotCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    alignItems: "center",
    gap: 4,
    position: "relative",
  },
  slotEmoji: { fontSize: 24, marginBottom: 2 },
  slotName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  slotTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  slotCheck: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  packageCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 10,
  },
  packageLeft: { flex: 1 },
  packageDaysRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  packageDays: { fontSize: 15, fontFamily: "Inter_700Bold" },
  popularBadge: {
    backgroundColor: "#FFF3E8",
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  popularText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#EA580C" },
  discountBadge: {
    backgroundColor: "#DCFCE7",
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  discountText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#16A34A" },
  packagePricePer: { fontSize: 12, fontFamily: "Inter_400Regular" },
  packageRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  packageTotal: { fontSize: 17, fontFamily: "Inter_700Bold" },
  howItWorks: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  howTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 2 },
  howRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  howIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  howText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  footerInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  footerPer: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  footerTotal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  payBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  payBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
});
