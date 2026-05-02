import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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
import { RESTAURANTS } from "@/constants/mockData";
import { useColors } from "@/hooks/useColors";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "veg", label: "Veg" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "nearby", label: "Nearby" },
  { key: "top-rated", label: "Top rated" },
];

export default function MealsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = RESTAURANTS.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.cuisine.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (activeFilter === "veg" && !r.isVeg) return false;
    if (activeFilter === "lunch" && !r.lunchAvailable) return false;
    if (activeFilter === "dinner" && !r.dinnerAvailable) return false;
    if (activeFilter === "top-rated" && r.rating < 4.3) return false;
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop:
              insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          Restaurants
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          All partner restaurants near your campus
        </Text>

        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search restaurants or cuisine..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filters */}
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
                backgroundColor:
                  activeFilter === f.key ? colors.primary : colors.card,
                borderColor:
                  activeFilter === f.key ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color:
                    activeFilter === f.key
                      ? colors.primaryForeground
                      : colors.mutedForeground,
                },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Restaurant list */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom:
              insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="search" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No restaurants match your filters
            </Text>
          </View>
        ) : (
          filtered.map((r) => <RestaurantCard key={r.id} restaurant={r} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 14,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  filtersScroll: {
    flexGrow: 0,
    marginVertical: 10,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
