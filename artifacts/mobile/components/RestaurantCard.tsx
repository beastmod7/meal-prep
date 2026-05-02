import { Feather } from "@expo/vector-icons";
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
  deliveryTime: string;
  isVeg: boolean;
  accentColor: string;
  days: string[];
  lunchAvailable: boolean;
  dinnerAvailable: boolean;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
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

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const colors = useColors();
  const router = useRouter();
  const imgKey = IMAGE_MAP[restaurant.id];

  return (
    <Pressable
      onPress={() => router.push(`/restaurant/${restaurant.id}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.95 },
      ]}
    >
      <View style={styles.imageContainer}>
        {imgKey ? (
          <Image
            source={FOOD_IMAGES[imgKey]}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.imagePlaceholder,
              { backgroundColor: restaurant.accentColor + "22" },
            ]}
          >
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
          <Text style={[styles.name, { color: colors.foreground }]}>
            {restaurant.name}
          </Text>
          <View style={styles.ratingRow}>
            <Feather name="star" size={12} color="#F59E0B" />
            <Text style={styles.rating}>{restaurant.rating}</Text>
          </View>
        </View>

        <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
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
          <View style={styles.metaDot} />
          <Text style={[styles.cuisine, { color: colors.mutedForeground }]}>
            {restaurant.cuisine}
          </Text>
        </View>

        <View style={styles.slotsRow}>
          {restaurant.lunchAvailable && (
            <View style={styles.slotTag}>
              <Text style={styles.slotTagText}>Lunch</Text>
            </View>
          )}
          {restaurant.dinnerAvailable && (
            <View style={[styles.slotTag, styles.dinnerTag]}>
              <Text style={[styles.slotTagText, styles.dinnerTagText]}>
                Dinner
              </Text>
            </View>
          )}
        </View>
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
    width: 96,
    height: 96,
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
    justifyContent: "space-between",
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
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#D4D4D8",
  },
  cuisine: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  slotsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  slotTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
    backgroundColor: "#FFF3E8",
  },
  slotTagText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#92400E",
  },
  dinnerTag: {
    backgroundColor: "#EDE9FE",
  },
  dinnerTagText: {
    color: "#4C1D95",
  },
});
