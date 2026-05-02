import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MEALS, RESTAURANTS } from "@/constants/mockData";
import { useColors } from "@/hooks/useColors";

const FOOD_IMAGES: Record<string, any> = {
  thali: require("@/assets/images/meal_thali.png"),
  dosa: require("@/assets/images/meal_dosa.png"),
  tiffin: require("@/assets/images/meal_tiffin.png"),
};

const SPICE_LABELS: Record<string, { label: string; color: string }> = {
  mild: { label: "Mild", color: "#22C55E" },
  medium: { label: "Medium", color: "#F59E0B" },
  hot: { label: "Hot", color: "#EF4444" },
};

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const meal = MEALS.find((m) => m.id === id);
  const restaurant = meal
    ? RESTAURANTS.find((r) => r.id === meal.restaurantId)
    : null;

  if (!meal || !restaurant) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, padding: 20 }}>
          Meal not found
        </Text>
      </View>
    );
  }

  const spice = SPICE_LABELS[meal.spice] ?? SPICE_LABELS.mild;
  const imgKey = meal.image as keyof typeof FOOD_IMAGES | null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
        }}
      >
        {/* Image */}
        <View style={styles.imageContainer}>
          {imgKey ? (
            <Image
              source={FOOD_IMAGES[imgKey]}
              style={styles.image}
              contentFit="cover"
            />
          ) : (
            <View
              style={[
                styles.imagePlaceholder,
                { backgroundColor: restaurant.accentColor + "22" },
              ]}
            >
              <Feather
                name="coffee"
                size={52}
                color={restaurant.accentColor}
              />
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Title */}
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.vegRow}>
                <View
                  style={[
                    styles.vegIndicator,
                    {
                      borderColor:
                        meal.vegType === "veg" || meal.vegType === "egg"
                          ? "#16A34A"
                          : "#EF4444",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.vegDot,
                      {
                        backgroundColor:
                          meal.vegType === "veg" || meal.vegType === "egg"
                            ? "#16A34A"
                            : "#EF4444",
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.typeLabel, { color: colors.mutedForeground }]}>
                  {meal.vegType === "veg"
                    ? "Vegetarian"
                    : meal.vegType === "egg"
                      ? "Contains egg"
                      : "Non-vegetarian"}
                </Text>
              </View>
              <Text style={[styles.mealName, { color: colors.foreground }]}>
                {meal.name}
              </Text>
              <Pressable
                onPress={() => router.push(`/restaurant/${restaurant.id}`)}
              >
                <Text style={[styles.restaurantName, { color: colors.primary }]}>
                  {restaurant.name} ·{" "}
                  <Text
                    style={[
                      styles.restaurantMeta,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {restaurant.distance}
                  </Text>
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Description */}
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {meal.description}
          </Text>

          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { label: "Calories", value: `${meal.calories} kcal` },
              { label: "Protein", value: meal.protein },
              {
                label: "Spice",
                value: spice.label,
                color: spice.color,
              },
              {
                label: "Serves",
                value:
                  meal.type === "lunch"
                    ? "Lunch"
                    : meal.type === "dinner"
                      ? "Dinner"
                      : "Lunch & Dinner",
              },
            ].map((s) => (
              <View
                key={s.label}
                style={[
                  styles.statCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.statValue,
                    { color: s.color ?? colors.foreground },
                  ]}
                >
                  {s.value}
                </Text>
                <Text
                  style={[
                    styles.statLabel,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {s.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Pass cost */}
          <View
            style={[
              styles.costCard,
              {
                backgroundColor: meal.passEligible ? "#F0FDF4" : "#FFFBEB",
                borderColor: meal.passEligible ? "#86EFAC" : "#FCD34D",
              },
            ]}
          >
            <Feather
              name="credit-card"
              size={16}
              color={meal.passEligible ? "#16A34A" : "#F59E0B"}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.costTitle,
                  { color: meal.passEligible ? "#166534" : "#92400E" },
                ]}
              >
                {meal.passEligible
                  ? "Included in pass"
                  : `1 meal credit + ₹${meal.premiumExtra}`}
              </Text>
              <Text
                style={[
                  styles.costSub,
                  { color: meal.passEligible ? "#4ADE80" : "#F59E0B" },
                ]}
              >
                {meal.passEligible
                  ? "Uses 1 meal credit from your pass"
                  : `Premium meal — 1 credit + ₹${meal.premiumExtra} extra`}
              </Text>
            </View>
          </View>

          {/* Policy */}
          <View
            style={[
              styles.policyBox,
              { backgroundColor: "#FFF3E8", borderColor: "#FDBA74" },
            ]}
          >
            <Feather name="shield" size={14} color="#F97316" />
            <Text style={styles.policyText}>
              Free cancellation until 10 PM the previous day. Your meal credit stays safe.
            </Text>
          </View>
        </View>
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
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push({
              pathname: "/schedule-meal",
              params: {
                restaurantId: restaurant.id,
                restaurantName: restaurant.name,
                mealId: meal.id,
                mealName: meal.name,
                premiumExtra: meal.premiumExtra,
              },
            });
          }}
          style={({ pressed }) => [
            styles.ctaBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.ctaBtnText}>Add to schedule</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  imageContainer: { height: 240 },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 16, gap: 14 },
  titleRow: { flexDirection: "row", gap: 12 },
  vegRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  vegIndicator: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  vegDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  typeLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  mealName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  restaurantName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  restaurantMeta: {
    fontFamily: "Inter_400Regular",
  },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  costCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  costTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  costSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  policyBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  policyText: {
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
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  ctaBtn: {
    height: 54,
    backgroundColor: "#F97316",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
});
