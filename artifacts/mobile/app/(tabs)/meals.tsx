import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import RestaurantCard from "@/components/RestaurantCard";
import { getRestaurants, ApiRestaurant } from "@/services/api";
import { toCardRestaurant } from "@/utils/restaurants";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "veg", label: "Veg" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "top-rated", label: "Top rated" },
];

export default function MealsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useApp();
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [restaurants, setRestaurants] = useState<ApiRestaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRestaurants(user?.campusId ? { campusId: user.campusId } : undefined)
      .then(setRestaurants)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.campusId]);

  const filtered = restaurants
    .map(toCardRestaurant)
    .filter((r) => {
      if (
        search &&
        !r.name.toLowerCase().includes(search.toLowerCase()) &&
        !r.cuisine.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (activeFilter === "veg" && !r.isVeg) return false;
      if (activeFilter === "lunch" && !r.lunchAvailable) return false;
      if (activeFilter === "dinner" && !r.dinnerAvailable) return false;
      if (activeFilter === "top-rated" && r.rating < 4.3) return false;
      return true;
    });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["#3B82F6", "#2563EB"]}
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 20 },
        ]}
      >
        <Text style={styles.title}>Restaurants</Text>
        <Text style={styles.subtitle}>
          Subscribe for daily meals — lunch or dinner
        </Text>

        <View style={styles.searchBar}>
          <Feather name="search" size={16} color="rgba(255,255,255,0.7)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search restaurants or cuisine..."
            placeholderTextColor="rgba(255,255,255,0.55)"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color="rgba(255,255,255,0.7)" />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setActiveFilter(f.key)}
            style={[
              styles.filterChip,
              {
                backgroundColor: activeFilter === f.key ? colors.primary : colors.card,
                borderColor: activeFilter === f.key ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                { color: activeFilter === f.key ? colors.primaryForeground : colors.mutedForeground },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.howItWorks, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
          <Feather name="info" size={14} color="#2563EB" />
          <Text style={styles.howItWorksText}>
            Subscribe to a restaurant for{" "}
            <Text style={{ fontFamily: "Inter_700Bold" }}>10, 20, or 30 days</Text>
            {" "}— choose lunch or dinner. Every meal is auto-scheduled for you daily.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#3B82F6" style={{ marginTop: 40 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="search" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No restaurants match your filters
            </Text>
          </View>
        ) : (
          filtered.map((r) => <RestaurantCard key={r.id} restaurant={r} showSubscribeCta />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 2 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)", marginBottom: 14 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, height: 44, paddingHorizontal: 14, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)" },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: "#FFFFFF" },
  filtersScroll: { flexGrow: 0, marginVertical: 10 },
  filtersContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, borderWidth: 1 },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 4 },
  howItWorks: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  howItWorksText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#1E3A8A", lineHeight: 17 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
