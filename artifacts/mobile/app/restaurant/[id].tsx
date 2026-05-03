import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  MEALS,
  RESTAURANTS,
  SUBSCRIPTION_PACKAGES,
  SubscriptionPackage,
} from "@/constants/mockData";
import { useApp } from "@/context/AppContext";
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

function PackageCard({ pkg, selected, onSelect }: { pkg: SubscriptionPackage; selected: boolean; onSelect: () => void; }) {
  const colors = useColors();
  const baseTotal = Math.round(pkg.pricePerDay * pkg.days);
  return (
    <Pressable
      onPress={() => { Haptics.selectionAsync(); onSelect(); }}
      style={[styles.pkgCard, { borderColor: colors.border, backgroundColor: colors.card }, selected && { borderColor: colors.primary, backgroundColor: "#EFF6FF" }]}
    >
      <View style={styles.pkgLeft}>
        <View style={styles.pkgTopRow}>
          <Text style={[styles.pkgDays, { color: colors.foreground }]}>{pkg.days} days</Text>
          {pkg.popular && <View style={styles.pkgBadge}><Text style={styles.pkgBadgeText}>Popular</Text></View>}
          {pkg.discountPct && <View style={styles.discountBadge}><Text style={styles.discountText}>{pkg.discountPct}% off</Text></View>}
        </View>
        <Text style={[styles.pkgPerDay, { color: colors.mutedForeground }]}>₹{pkg.pricePerDay}/day · {pkg.days} meals included</Text>
      </View>
      <View style={styles.pkgRight}>
        {pkg.discountPct ? <Text style={[styles.pkgOldPrice, { color: colors.mutedForeground }]}>₹{baseTotal.toLocaleString("en-IN")}</Text> : null}
        <Text style={[styles.pkgTotal, { color: colors.foreground }]}>₹{pkg.totalPrice.toLocaleString("en-IN")}</Text>
        {selected && <Feather name="check-circle" size={18} color={colors.primary} />}
      </View>
    </Pressable>
  );
}

function RatingStars({ value, onChange }: { value: number; onChange: (value: number) => void; }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => { Haptics.selectionAsync(); onChange(n); }}>
          <Feather name={n <= value ? "star" : "star"} size={18} color={n <= value ? "#F59E0B" : "#D4D4D8"} />
        </Pressable>
      ))}
    </View>
  );
}

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { restaurantRatings, rateRestaurant } = useApp();

  const restaurant = RESTAURANTS.find((r) => r.id === id);
  const packages = SUBSCRIPTION_PACKAGES[id ?? ""] ?? [];

  type Slot = "lunch" | "dinner" | "both";
  const availableSlots: Slot[] = [];
  if (restaurant?.lunchAvailable) availableSlots.push("lunch");
  if (restaurant?.dinnerAvailable) availableSlots.push("dinner");
  if (restaurant?.lunchAvailable && restaurant?.dinnerAvailable) availableSlots.push("both");

  const [activeSlot, setActiveSlot] = useState<Slot>(availableSlots[0] ?? "lunch");
  const [selectedDays, setSelectedDays] = useState<number>(20);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [foodQuality, setFoodQuality] = useState(5);
  const [packaging, setPackaging] = useState(5);
  const [delivery, setDelivery] = useState(5);
  const [valueForMoney, setValueForMoney] = useState(5);
  const [hygiene, setHygiene] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [note, setNote] = useState("");

  const existingRatings = restaurantRatings.filter((r) => r.restaurantId === restaurant?.id);
  const avgRating = useMemo(() => {
    if (existingRatings.length === 0) return restaurant?.rating ?? 0;
    return existingRatings.reduce((sum, r) => sum + r.overall, 0) / existingRatings.length;
  }, [existingRatings, restaurant?.rating]);

  if (!restaurant) return <View style={[styles.container, { backgroundColor: colors.background }]}><Text style={{ color: colors.foreground, padding: 20 }}>Restaurant not found</Text></View>;

  const meals = MEALS.filter((m) => restaurant.mealIds.includes(m.id));
  const imgKey = RESTAURANT_IMAGE_MAP[restaurant.id];
  const slotPackages = packages.filter((p) => p.slot === activeSlot);
  const chosenPkg = slotPackages.find((p) => p.days === selectedDays) ?? slotPackages[0];

  async function submitRating() {
    await rateRestaurant({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      ratings: {
        foodQuality,
        packaging,
        delivery,
        valueForMoney,
        hygiene,
        communication,
        overall: Number(((foodQuality + packaging + delivery + valueForMoney + hygiene + communication) / 6).toFixed(1)),
        note,
      },
    });
    setRatingOpen(false);
    setNote("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}>
        <View style={styles.hero}>
          {imgKey ? <Image source={FOOD_IMAGES[imgKey]} style={styles.heroImage} contentFit="cover" /> : <View style={[styles.heroPlaceholder, { backgroundColor: restaurant.accentColor + "22" }]}><Feather name="coffee" size={40} color={restaurant.accentColor} /></View>}
          <View style={[styles.heroOverlay, StyleSheet.absoluteFill]} />
          <View style={[styles.heroContent, { paddingTop: insets.top + 60 }]}>
            <Text style={styles.heroName}>{restaurant.name}</Text>
            <Text style={styles.heroTagline}>{restaurant.tagline}</Text>
            <View style={styles.heroMeta}>
              <View style={styles.metaChip}><Feather name="star" size={12} color="#F59E0B" /><Text style={styles.metaChipText}>{avgRating.toFixed(1)} ({restaurant.reviewCount + existingRatings.length})</Text></View>
              <View style={styles.metaChip}><Feather name="map-pin" size={12} color="#FFFFFF" /><Text style={styles.metaChipText}>{restaurant.distance}</Text></View>
              <View style={styles.metaChip}><Feather name="clock" size={12} color="#FFFFFF" /><Text style={styles.metaChipText}>{restaurant.deliveryTime}</Text></View>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>{restaurant.description}</Text>
            <View style={styles.infoRow}>
              {[{ icon: "map-pin" as const, text: restaurant.address }, { icon: "clock" as const, text: `Cancel by ${restaurant.cancelCutoff}` }, { icon: "calendar" as const, text: restaurant.days.join(", ") }].map((item, i) => <View key={i} style={styles.infoItem}><Feather name={item.icon} size={13} color={colors.mutedForeground} /><Text style={[styles.infoText, { color: colors.mutedForeground }]}>{item.text}</Text></View>)}
            </View>
          </View>

          <View style={styles.ratingsCard}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.plansTitle, { color: colors.foreground }]}>Ratings</Text>
              <Pressable onPress={() => setRatingOpen(true)} style={styles.rateBtn}><Feather name="edit-3" size={14} color="#FFFFFF" /><Text style={styles.rateBtnText}>Rate now</Text></Pressable>
            </View>
            <Text style={[styles.plansSubtitle, { color: colors.mutedForeground }]}>Food quality, packaging, delivery, value, hygiene, and communication.</Text>
          </View>

          <View>
            <Text style={[styles.plansTitle, { color: colors.foreground }]}>Subscription plans</Text>
            <Text style={[styles.plansSubtitle, { color: colors.mutedForeground }]}>Minimum 10 days. Each plan auto-schedules one meal per day.</Text>
            {availableSlots.length > 1 && <View style={[styles.slotTabs, { backgroundColor: colors.muted }]}>{availableSlots.map((slot) => <Pressable key={slot} onPress={() => { Haptics.selectionAsync(); setActiveSlot(slot); const pkgs = packages.filter((p) => p.slot === slot); if (!pkgs.find((p) => p.days === selectedDays)) setSelectedDays(pkgs[0]?.days ?? 20); }} style={[styles.slotTab, activeSlot === slot && { backgroundColor: colors.card, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }]}><Text style={[styles.slotTabText, { color: activeSlot === slot ? colors.foreground : colors.mutedForeground, fontFamily: activeSlot === slot ? "Inter_600SemiBold" : "Inter_400Regular" }]}>{slot === "lunch" ? "☀️ Lunch" : slot === "dinner" ? "🌙 Dinner" : "🍽️ Both"}</Text>{slot === "both" && <View style={styles.comboChip}><Text style={styles.comboChipText}>15% off</Text></View>}</Pressable>)}</View>}
            {slotPackages.map((pkg) => <PackageCard key={`${pkg.slot}-${pkg.days}`} pkg={pkg} selected={selectedDays === pkg.days} onSelect={() => setSelectedDays(pkg.days)} />)}
          </View>

          {meals.length > 0 && <View><Text style={[styles.plansTitle, { color: colors.foreground }]}>What you'll eat</Text><Text style={[styles.plansSubtitle, { color: colors.mutedForeground }]}>Meals rotate daily — these are example options</Text>{meals.map((meal) => <View key={meal.id} style={[styles.mealCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.mealHeader}><View style={styles.mealHeaderLeft}><Text style={[styles.mealName, { color: colors.foreground }]}>{meal.name}</Text><View style={styles.mealMeta}><View style={[styles.vegDot, { backgroundColor: meal.vegType === "veg" ? "#16A34A" : meal.vegType === "egg" ? "#D97706" : "#EF4444" }]} /><Text style={[styles.mealType, { color: colors.mutedForeground }]}>{meal.vegType}</Text><Text style={[styles.metaDot, { color: colors.mutedForeground }]}>·</Text><Text style={[styles.mealType, { color: colors.mutedForeground }]}>{meal.calories} cal</Text><Text style={[styles.metaDot, { color: colors.mutedForeground }]}>·</Text><Text style={[styles.mealType, { color: colors.mutedForeground }]}>{meal.protein} protein</Text></View></View><View style={[styles.spiceBadge, { backgroundColor: meal.spice === "hot" ? "#FEE2E2" : meal.spice === "medium" ? "#FEF9C3" : "#DCFCE7" }]}><Text style={[styles.spiceText, { color: meal.spice === "hot" ? "#991B1B" : meal.spice === "medium" ? "#854D0E" : "#166534" }]}>{meal.spice}</Text></View></View><Text style={[styles.mealDesc, { color: colors.mutedForeground }]}>{meal.description}</Text></View>)}</View>}
        </View>
      </ScrollView>

      {chosenPkg && <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}><View style={styles.footerInfo}><View><Text style={[styles.footerLabel, { color: colors.mutedForeground }]}>{activeSlot === "lunch" ? "Lunch" : activeSlot === "dinner" ? "Dinner" : "Lunch + Dinner"} · {chosenPkg.days} days</Text><Text style={[styles.footerPer, { color: colors.mutedForeground }]}>₹{chosenPkg.pricePerDay}/day</Text></View><Text style={[styles.footerTotal, { color: colors.foreground }]}>₹{chosenPkg.totalPrice.toLocaleString("en-IN")}</Text></View><Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: "/buy-pass", params: { restaurantId: restaurant.id } }); }} style={({ pressed }) => [styles.subscribeBtn, { backgroundColor: colors.primary }, pressed && { opacity: 0.9 }]}><Text style={styles.subscribeBtnText}>Subscribe now</Text></Pressable></View>}

      <Modal visible={ratingOpen} transparent animationType="slide" onRequestClose={() => setRatingOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setRatingOpen(false)}>
          <Pressable style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Rate {restaurant.name}</Text>
            <Text style={styles.sheetMeal}>Aspect-based ratings</Text>
            <View style={styles.ratingBlock}><Text style={styles.ratingLabel}>Food quality</Text><RatingStars value={foodQuality} onChange={setFoodQuality} /></View>
            <View style={styles.ratingBlock}><Text style={styles.ratingLabel}>Packaging</Text><RatingStars value={packaging} onChange={setPackaging} /></View>
            <View style={styles.ratingBlock}><Text style={styles.ratingLabel}>Delivery</Text><RatingStars value={delivery} onChange={setDelivery} /></View>
            <View style={styles.ratingBlock}><Text style={styles.ratingLabel}>Value for money</Text><RatingStars value={valueForMoney} onChange={setValueForMoney} /></View>
            <View style={styles.ratingBlock}><Text style={styles.ratingLabel}>Hygiene</Text><RatingStars value={hygiene} onChange={setHygiene} /></View>
            <View style={styles.ratingBlock}><Text style={styles.ratingLabel}>Communication</Text><RatingStars value={communication} onChange={setCommunication} /></View>
            <TextInput value={note} onChangeText={setNote} placeholder="Add a note" placeholderTextColor="#A1A1AA" style={[styles.noteInput, { borderColor: colors.border, color: colors.foreground }]} multiline />
            <View style={styles.sheetActions}><Pressable style={[styles.keepBtn, { borderColor: colors.border }]} onPress={() => setRatingOpen(false)}><Text style={[styles.keepBtnText, { color: colors.foreground }]}>Cancel</Text></Pressable><Pressable style={styles.saveBtn} onPress={submitRating}><Text style={styles.saveBtnText}>Save rating</Text></Pressable></View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { height: 240, position: "relative" },
  heroImage: { width: "100%", height: "100%" },
  heroPlaceholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  heroOverlay: { backgroundColor: "rgba(0,0,0,0.35)", zIndex: 1 },
  heroContent: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, zIndex: 2 },
  heroName: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 2 },
  heroTagline: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)", marginBottom: 8 },
  heroMeta: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  metaChipText: { fontSize: 11, fontFamily: "Inter_500Medium", color: "#FFFFFF" },
  content: { padding: 16, gap: 20 },
  section: { borderRadius: 14, borderWidth: 1, padding: 14 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 8 },
  description: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, marginBottom: 12 },
  infoRow: { gap: 8 },
  infoItem: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  ratingsCard: { gap: 6 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rateBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#3B82F6", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  rateBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  plansTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 4 },
  plansSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 12 },
  slotTabs: { flexDirection: "row", borderRadius: 12, padding: 3, marginBottom: 12 },
  slotTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center", gap: 3 },
  slotTabText: { fontSize: 13 },
  comboChip: { backgroundColor: "#DCFCE7", borderRadius: 100, paddingHorizontal: 6, paddingVertical: 1 },
  comboChipText: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#15803D" },
  pkgCard: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1.5, padding: 12, marginBottom: 8 },
  pkgLeft: { flex: 1 },
  pkgTopRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" },
  pkgDays: { fontSize: 14, fontFamily: "Inter_700Bold" },
  pkgBadge: { backgroundColor: "#EFF6FF", borderRadius: 100, paddingHorizontal: 7, paddingVertical: 2 },
  pkgBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#2563EB" },
  discountBadge: { backgroundColor: "#DCFCE7", borderRadius: 100, paddingHorizontal: 7, paddingVertical: 2 },
  discountText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#16A34A" },
  pkgPerDay: { fontSize: 11, fontFamily: "Inter_400Regular" },
  pkgRight: { alignItems: "flex-end", gap: 2 },
  pkgOldPrice: { fontSize: 11, fontFamily: "Inter_400Regular", textDecorationLine: "line-through" },
  pkgTotal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  mealCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  mealHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  mealHeaderLeft: { flex: 1, marginRight: 8 },
  mealName: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  mealMeta: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  vegDot: { width: 8, height: 8, borderRadius: 4 },
  mealType: { fontSize: 11, fontFamily: "Inter_400Regular" },
  metaDot: { fontSize: 11 },
  spiceBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 100 },
  spiceText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  mealDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  footer: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  footerInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  footerPer: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  footerTotal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subscribeBtn: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  subscribeBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, backgroundColor: "#E4E4E7", borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 19, fontFamily: "Inter_700Bold", color: "#1A1A1A", marginBottom: 4 },
  sheetMeal: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#71717A", marginBottom: 16 },
  ratingBlock: { marginBottom: 12 },
  ratingLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1A1A1A", marginBottom: 6 },
  starsRow: { flexDirection: "row", gap: 8 },
  noteInput: { minHeight: 80, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, fontFamily: "Inter_400Regular", marginBottom: 16, textAlignVertical: "top" },
  sheetActions: { flexDirection: "row", gap: 10 },
  keepBtn: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  keepBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  saveBtn: { flex: 1, height: 52, backgroundColor: "#3B82F6", borderRadius: 14, alignItems: "center", justifyContent: "center" },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
});