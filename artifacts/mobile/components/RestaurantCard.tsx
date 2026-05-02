import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Restaurant {
  id: string;
  name: string;
  tagline: string;
  cuisine: string;
  rating: number;
  reviewCount: number;
  distance: string;
  deliveryTime: string;
  isVeg: boolean;
  accentColor: string;
  lunchAvailable: boolean;
  dinnerAvailable: boolean;
  lunchStartPrice: number;
  dinnerStartPrice: number;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  showSubscribeCta?: boolean;
}

const FOOD_IMAGES: Record<string, any> = {
  thali: require("@/assets/images/meal_thali.png"),
  dosa: require("@/assets/images/meal_dosa.png"),
  tiffin: require("@/assets/images/meal_tiffin.png"),
};

const IMAGE_MAP: Record<string, keyof typeof FOOD_IMAGES> = {
  r1: "thali",
  r2: "dosa",
  r3: "tiffin",
};

export default function RestaurantCard({
  restaurant,
  showSubscribeCta = true,
}: RestaurantCardProps) {
  const colors = useColors();
  const router = useRouter();
  const imgKey = IMAGE_MAP[restaurant.id];

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        router.push(`/restaurant/${restaurant.id}`);
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.96, transform: [{ scale: 0.99 }] },
      ]}
    >
      {/* Hero image */}
      <View style={styles.imageWrap}>
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
            <Feather name="coffee" size={32} color={restaurant.accentColor} />
          </View>
        )}
        {/* Veg indicator */}
        {restaurant.isVeg && (
          <View style={styles.vegBadge}>
            <View style={styles.vegDot} />
          </View>
        )}
        {/* Cuisine tag */}
        <View style={styles.cuisineTag}>
          <Text style={styles.cuisineText}>{restaurant.cuisine}</Text>
        </View>
      </View>

      {/* Card content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            style={[styles.name, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {restaurant.name}
          </Text>
          <View style={styles.ratingPill}>
            <Feather name="star" size={11} color="#F59E0B" />
            <Text style={styles.ratingText}>{restaurant.rating}</Text>
          </View>
        </View>

        <Text
          style={[styles.tagline, { color: colors.mutedForeground }]}
          numberOfLines={1}
        >
          {restaurant.tagline}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Feather name="map-pin" size={11} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {restaurant.distance}
            </Text>
          </View>
          <View style={styles.metaDot} />
          <View style={styles.metaItem}>
            <Feather name="clock" size={11} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
              {restaurant.deliveryTime}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.bottomRow}>
          <View style={styles.priceRow}>
            {restaurant.lunchAvailable && (
              <View style={styles.priceBlock}>
                <Text style={styles.priceSlotLabel}>☀️ Lunch</Text>
                <Text style={[styles.priceValue, { color: "#2563EB" }]}>
                  ₹{restaurant.lunchStartPrice}/day
                </Text>
              </View>
            )}
            {restaurant.lunchAvailable && restaurant.dinnerAvailable && (
              <View style={[styles.priceSep, { backgroundColor: colors.border }]} />
            )}
            {restaurant.dinnerAvailable && (
              <View style={styles.priceBlock}>
                <Text style={styles.priceSlotLabel}>🌙 Dinner</Text>
                <Text style={[styles.priceValue, { color: "#7C3AED" }]}>
                  ₹{restaurant.dinnerStartPrice}/day
                </Text>
              </View>
            )}
          </View>

          {showSubscribeCta && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: "/buy-pass",
                  params: { restaurantId: restaurant.id },
                });
              }}
              style={({ pressed }) => [
                styles.subscribeBtn,
                { backgroundColor: "#3B82F6" },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Feather name="plus" size={13} color="#FFF" />
              <Text style={styles.subscribeBtnText}>Subscribe</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    overflow: "hidden",
  },
  imageWrap: {
    height: 130,
    position: "relative",
  },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  vegBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 18,
    height: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  vegDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: "#16A34A" },
  cuisineTag: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  cuisineText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "#FFFFFF",
  },
  content: { padding: 12, gap: 5 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { fontSize: 16, fontFamily: "Inter_700Bold", flex: 1, marginRight: 8 },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFFBEB",
    borderRadius: 100,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  ratingText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#F59E0B" },
  tagline: { fontSize: 12, fontFamily: "Inter_400Regular" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#D4D4D8" },
  divider: { height: 1, marginVertical: 4 },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  priceBlock: { gap: 1 },
  priceSlotLabel: { fontSize: 10, fontFamily: "Inter_500Medium", color: "#71717A" },
  priceValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  priceSep: { width: 1, height: 28, marginHorizontal: 4 },
  subscribeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  subscribeBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
});
