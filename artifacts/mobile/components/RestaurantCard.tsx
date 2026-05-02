import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Restaurant {
  id: string;
  name: string;
  tagline: string;
  cuisine: string;
  rating: number;
  reviewCount: number;
  distance: string;
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

export default function RestaurantCard({ restaurant, showSubscribeCta = true }: RestaurantCardProps) {
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
        pressed && { opacity: 0.95 },
      ]}
    >
      <View style={styles.imageContainer}>
        {imgKey ? (
          <Image source={FOOD_IMAGES[imgKey]} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: restaurant.accentColor + "22" }]}>
            <Feather name="coffee" size={28} color={restaurant.accentColor} />
          </View>
        )}
        {restaurant.isVeg && (
          <View style={styles.vegBadge}>
            <View style={styles.vegDot} />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {restaurant.name}
          </Text>
          <View style={styles.ratingRow}>
            <Feather name="star" size={12} color="#F59E0B" />
            <Text style={styles.rating}>{restaurant.rating}</Text>
          </View>
        </View>

        <Text style={[styles.tagline, { color: colors.mutedForeground }]} numberOfLines={1}>
          {restaurant.tagline}
        </Text>

        <View style={styles.pricingRow}>
          {restaurant.lunchAvailable && (
            <View style={styles.priceChip}>
              <Text style={styles.priceSlot}>☀️ Lunch</Text>
              <Text style={[styles.priceFrom, { color: colors.primary }]}>
                from ₹{restaurant.lunchStartPrice}/day
              </Text>
            </View>
          )}
          {restaurant.dinnerAvailable && (
            <View style={[styles.priceChip, styles.dinnerChip]}>
              <Text style={styles.priceSlot}>🌙 Dinner</Text>
              <Text style={[styles.priceFrom, { color: "#7C3AED" }]}>
                from ₹{restaurant.dinnerStartPrice}/day
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
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.subscribeBtnText}>Subscribe</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
    flexDirection: "row",
  },
  imageContainer: {
    width: 100,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
  },
  vegBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 16,
    height: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
  },
  content: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
    marginRight: 8,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  rating: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "#F59E0B",
  },
  tagline: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  pricingRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  priceChip: {
    backgroundColor: "#FFF3E8",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  dinnerChip: {
    backgroundColor: "#F5F3FF",
  },
  priceSlot: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "#71717A",
  },
  priceFrom: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  subscribeBtn: {
    marginTop: 6,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
  },
  subscribeBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
});
