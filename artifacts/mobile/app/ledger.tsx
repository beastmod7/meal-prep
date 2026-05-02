import { Feather } from "@expo/vector-icons";
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

import { LedgerEntry, useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const TYPE_CONFIG: Record<
  LedgerEntry["type"],
  { icon: any; color: string; bg: string; label: string }
> = {
  subscription_purchase: {
    icon: "credit-card",
    color: "#3B82F6",
    bg: "#DBEAFE",
    label: "Subscribed",
  },
  meal_used: {
    icon: "coffee",
    color: "#71717A",
    bg: "#F4F4F5",
    label: "Meal used",
  },
  free_cancel: {
    icon: "check-circle",
    color: "#16A34A",
    bg: "#DCFCE7",
    label: "Free cancel",
  },
  late_cancel: {
    icon: "alert-triangle",
    color: "#F59E0B",
    bg: "#FEF9C3",
    label: "Late cancel",
  },
  full_charge: {
    icon: "alert-circle",
    color: "#EF4444",
    bg: "#FEE2E2",
    label: "Full charge",
  },
  refund: {
    icon: "rotate-ccw",
    color: "#16A34A",
    bg: "#DCFCE7",
    label: "Refund",
  },
};

const FILTERS = ["all", "purchases", "refunds", "cancels"] as const;
type Filter = (typeof FILTERS)[number];

function filterEntries(entries: LedgerEntry[], f: Filter): LedgerEntry[] {
  if (f === "all") return entries;
  if (f === "purchases") return entries.filter((e) => e.type === "subscription_purchase");
  if (f === "refunds") return entries.filter((e) => e.type === "refund");
  if (f === "cancels") return entries.filter((e) => ["free_cancel", "late_cancel", "full_charge"].includes(e.type));
  return entries;
}

function groupByDate(entries: LedgerEntry[]): { date: string; items: LedgerEntry[] }[] {
  const map = new Map<string, LedgerEntry[]>();
  for (const entry of entries) {
    const d = entry.createdAt.split("T")[0];
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(entry);
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => ({ date, items }));
}

function formatGroupDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export default function LedgerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { ledger } = useApp();
  const [activeFilter, setActiveFilter] = useState<Filter>("all");

  const filtered = filterEntries(ledger, activeFilter);
  const groups = groupByDate(filtered);

  const totalSpent = ledger
    .filter((e) => e.amountDelta < 0)
    .reduce((sum, e) => sum + Math.abs(e.amountDelta), 0);
  const totalRefunded = ledger
    .filter((e) => e.amountDelta > 0)
    .reduce((sum, e) => sum + e.amountDelta, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 20,
        }}
      >
        {/* Summary */}
        <View
          style={[
            styles.summary,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: "#EF4444" }]}>
              ₹{totalSpent.toLocaleString("en-IN")}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              Total spent
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: "#16A34A" }]}>
              ₹{totalRefunded.toLocaleString("en-IN")}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              Total refunded
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {ledger.length}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
              Transactions
            </Text>
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
              key={f}
              onPress={() => setActiveFilter(f)}
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    activeFilter === f ? colors.primary : colors.card,
                  borderColor:
                    activeFilter === f ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color:
                      activeFilter === f
                        ? "#FFFFFF"
                        : colors.mutedForeground,
                  },
                ]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Groups */}
        <View style={styles.entries}>
          {groups.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="inbox" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No transactions
              </Text>
            </View>
          ) : (
            groups.map((group) => (
              <View key={group.date}>
                <Text style={[styles.groupDate, { color: colors.mutedForeground }]}>
                  {formatGroupDate(group.date)}
                </Text>
                <View
                  style={[
                    styles.groupCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  {group.items.map((entry, i) => {
                    const cfg = TYPE_CONFIG[entry.type];
                    return (
                      <View
                        key={entry.id}
                        style={[
                          styles.entryRow,
                          i > 0 && {
                            borderTopWidth: 1,
                            borderTopColor: colors.border,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.entryIcon,
                            { backgroundColor: cfg.bg },
                          ]}
                        >
                          <Feather name={cfg.icon} size={14} color={cfg.color} />
                        </View>
                        <View style={styles.entryInfo}>
                          <Text
                            style={[
                              styles.entryDesc,
                              { color: colors.foreground },
                            ]}
                            numberOfLines={1}
                          >
                            {entry.description}
                          </Text>
                          <Text
                            style={[
                              styles.entryType,
                              { color: colors.mutedForeground },
                            ]}
                          >
                            {cfg.label}
                            {entry.restaurantName
                              ? ` · ${entry.restaurantName}`
                              : ""}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.entryAmount,
                            {
                              color:
                                entry.amountDelta > 0 ? "#16A34A" : "#EF4444",
                            },
                          ]}
                        >
                          {entry.amountDelta > 0 ? "+" : ""}₹
                          {Math.abs(entry.amountDelta).toLocaleString("en-IN")}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summary: {
    flexDirection: "row",
    margin: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 2 },
  summaryLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  summaryDivider: { width: 1, marginVertical: 4 },
  filtersScroll: { flexGrow: 0, marginBottom: 8 },
  filtersContent: { paddingHorizontal: 16, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  entries: { paddingHorizontal: 16, gap: 4 },
  groupDate: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 6,
    marginTop: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  groupCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  entryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  entryInfo: { flex: 1 },
  entryDesc: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 2 },
  entryType: { fontSize: 11, fontFamily: "Inter_400Regular" },
  entryAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
