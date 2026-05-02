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

const RESTAURANT_IMAGE_MAP: Record<string, keyof typeof FOOD_IMAGES> = {
  r1: "thali",
  r2: "dosa",
  r3: "tiffin",
};

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const restaurant = RESTAURANTS.find((r) => r.id === id);
  if (!restaurant) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, padding: 20 }}>
          Restaurant not found
        </Text>
      </View>
    );
  }

  const meals = MEALS.filter((m) => restaurant.mealIds.includes(m.id));
  const imgKey = RESTAURANT_IMAGE_MAP[restaurant.id];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Hero */}
        <View style={styles.hero}>
          {imgKey ? (
            <Image
              source={FOOD_IMAGES[imgKey]}
              style={styles.heroImage}
              contentFit="cover"
            />
          ) : (
            <View
              style={[
                styles.heroPlaceholder,
                { backgroundColor: restaurant.accentColor + "22" },
              ]}
            >
              <Feather name="coffee" size={48} color={restaurant.accentColor} />
            </View>
          )}
          {restaurant.isVeg && (
            <View style={styles.vegBadge}>
              <View style={styles.vegDot} />
              <Text style={styles.vegText}>Pure Veg</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Restaurant info */}
          <View
            style={[
              styles.infoCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.infoTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.foreground }]}>
                  {restaurant.name}
                </Text>
                <Text
                  style={[
                    styles.tagline,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {restaurant.tagline}
                </Text>
              </View>
              <View style={styles.ratingBadge}>
                <Feather name="star" size={14} color="#F59E0B" />
                <Text style={styles.rating}>{restaurant.rating}</Text>
                <Text style={styles.reviews}>
                  ({restaurant.reviewCount})
                </Text>
              </View>
            </View>

            <Text
              style={[styles.description, { color: colors.mutedForeground }]}
            >
              {restaurant.description}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Feather
                  name="map-pin"
                  size={13}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[styles.metaText, { color: colors.mutedForeground }]}
                >
                  {restaurant.distance}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Feather
                  name="clock"
                  size={13}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[styles.metaText, { color: colors.mutedForeground }]}
                >
                  {restaurant.deliveryTime}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Feather
                  name="calendar"
                  size={13}
                  color={colors.mutedForeground}
                />
                <Text
                  style={[styles.metaText, { color: colors.mutedForeground }]}
                >
                  {restaurant.days.slice(0, 3).join(", ")}
                  {restaurant.days.length > 3 ? "…" : ""}
                </Text>
              </View>
            </View>
          </View>

          {/* Cancellation policy */}
          <View
            style={[
              styles.policyRow,
              { backgroundColor: "#FFF3E8", borderColor: "#FDBA74" },
            ]}
          >
            <Feather name="info" size={14} color="#F97316" />
            <Text style={styles.policyText}>
              Free cancellation: {restaurant.cancelCutoff}
            </Text>
          </View>

          {/* Menu */}
          <Text style={[styles.menuTitle, { color: colors.foreground }]}>
            Menu
          </Text>

          {meals.map((meal) => (
            <Pressable
              key={meal.id}
              onPress={() => {
                Haptics.selectionAsync();
                router.push(`/meal/${meal.id}`);
              }}
              style={({ pressed }) => [
                styles.mealRow,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
                pressed && { opacity: 0.9 },
              ]}
            >
              <View style={styles.mealLeft}>
                <View style={styles.mealVegRow}>
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
                        styles.vegIndicatorDot,
                        {
                          backgroundColor:
                            meal.vegType === "veg" || meal.vegType === "egg"
                              ? "#16A34A"
                              : "#EF4444",
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[styles.mealName, { color: colors.foreground }]}
                  >
                    {meal.name}
                  </Text>
                </View>
                <Text
                  style={[styles.mealDesc, { color: colors.mutedForeground }]}
                  numberOfLines={2}
                >
                  {meal.description}
                </Text>
                <View style={styles.mealMeta}>
                  <Text
                    style={[
                      styles.mealMetaText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {meal.calories} cal · {meal.protein} protein
                  </Text>
                </View>
              </View>
              <View style={styles.mealRight}>
                {meal.passEligible ? (
                  <View style={styles.includedBadge}>
                    <Text style={styles.includedText}>1 credit</Text>
                  </View>
                ) : (
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumText}>
                      1 credit + ₹{meal.premiumExtra}
                    </Text>
                  </View>
                )}
                <Pressable
                  onPress={() => {
                    Haptics.selectionAsync();
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
                  style={styles.scheduleBtn}
                >
                  <Text style={styles.scheduleBtnText}>Schedule</Text>
                </Pressable>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: {
    height: 220,
    position: "relative",
  },
  heroImage: { width: "100%", height: "100%" },
  heroPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  vegBadge: {
    position: "absolute",
    bottom: 12,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  vegDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16A34A",
  },
  vegText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#16A34A",
  },
  content: { padding: 16, gap: 12 },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  infoTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  name: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  tagline: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rating: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#F59E0B",
  },
  reviews: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#A16207",
  },
  description: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  policyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  policyText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#92400E",
  },
  menuTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
    marginBottom: 4,
  },
  mealRow: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 12,
  },
  mealLeft: { flex: 1 },
  mealVegRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  vegIndicatorDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  mealName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  mealDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
    marginBottom: 6,
  },
  mealMeta: { flexDirection: "row", gap: 8 },
  mealMetaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  mealRight: {
    alignItems: "flex-end",
    gap: 8,
    justifyContent: "space-between",
  },
  includedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#DCFCE7",
    borderRadius: 100,
  },
  includedText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#166534",
  },
  premiumBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#FEF9C3",
    borderRadius: 100,
  },
  premiumText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#713F12",
  },
  scheduleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#F97316",
    borderRadius: 10,
  },
  scheduleBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
