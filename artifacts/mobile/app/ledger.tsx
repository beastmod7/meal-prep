import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
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
  { icon: string; color: string; bg: string }
> = {
  pass_purchase: { icon: "credit-card", color: "#3B82F6", bg: "#DBEAFE" },
  meal_used: { icon: "coffee", color: "#F97316", bg: "#FFF3E8" },
  free_cancel: { icon: "rotate-ccw", color: "#16A34A", bg: "#DCFCE7" },
  late_cancel: { icon: "alert-triangle", color: "#F59E0B", bg: "#FEF3C7" },
  full_charge: { icon: "x-circle", color: "#EF4444", bg: "#FEE2E2" },
  refund: { icon: "arrow-left", color: "#8B5CF6", bg: "#EDE9FE" },
  bonus: { icon: "gift", color: "#EC4899", bg: "#FCE7F3" },
};

function groupByDate(
  entries: LedgerEntry[]
): Array<{ date: string; items: LedgerEntry[] }> {
  const groups: Record<string, LedgerEntry[]> = {};
  for (const entry of entries) {
    const dateKey = new Date(entry.createdAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(entry);
  }
  return Object.entries(groups).map(([date, items]) => ({ date, items }));
}

export default function LedgerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { ledger, activePass } = useApp();

  const groups = groupByDate(ledger);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {activePass && (
        <View
          style={[
            styles.balanceBar,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          <View style={styles.balanceStat}>
            <Text style={[styles.balanceValue, { color: colors.foreground }]}>
              {activePass.remainingCredits}
            </Text>
            <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>
              credits left
            </Text>
          </View>
          <View style={[styles.balanceDivider, { backgroundColor: colors.border }]} />
          <View style={styles.balanceStat}>
            <Text style={[styles.balanceValue, { color: colors.foreground }]}>
              ₹{(activePass.remainingCredits * activePass.effectiveCreditValue).toLocaleString("en-IN")}
            </Text>
            <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>
              unused value
            </Text>
          </View>
          <View style={[styles.balanceDivider, { backgroundColor: colors.border }]} />
          <View style={styles.balanceStat}>
            <Text style={[styles.balanceValue, { color: "#EF4444" }]}>
              ₹{activePass.lateCancellationFees}
            </Text>
            <Text style={[styles.balanceLabel, { color: colors.mutedForeground }]}>
              fees deducted
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {ledger.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="file-text" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No transactions yet
            </Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.date} style={styles.group}>
              <Text style={[styles.groupDate, { color: colors.mutedForeground }]}>
                {group.date}
              </Text>
              <View
                style={[
                  styles.groupCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                {group.items.map((entry, i) => {
                  const config = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.meal_used;
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
                          { backgroundColor: config.bg },
                        ]}
                      >
                        <Feather
                          name={config.icon as any}
                          size={16}
                          color={config.color}
                        />
                      </View>
                      <View style={styles.entryContent}>
                        <Text
                          style={[
                            styles.entryDesc,
                            { color: colors.foreground },
                          ]}
                          numberOfLines={2}
                        >
                          {entry.description}
                        </Text>
                        <Text
                          style={[
                            styles.entryTime,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          {new Date(entry.createdAt).toLocaleTimeString(
                            "en-IN",
                            { hour: "2-digit", minute: "2-digit", hour12: true }
                          )}
                        </Text>
                      </View>
                      <View style={styles.entryRight}>
                        {entry.creditDelta !== 0 && (
                          <Text
                            style={[
                              styles.creditDelta,
                              {
                                color:
                                  entry.creditDelta > 0
                                    ? "#16A34A"
                                    : "#EF4444",
                              },
                            ]}
                          >
                            {entry.creditDelta > 0 ? "+" : ""}
                            {entry.creditDelta} cr
                          </Text>
                        )}
                        {entry.amountDelta !== 0 && (
                          <Text
                            style={[
                              styles.amountDelta,
                              { color: colors.mutedForeground },
                            ]}
                          >
                            {entry.amountDelta > 0 ? "+" : ""}₹
                            {Math.abs(entry.amountDelta).toLocaleString("en-IN")}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  balanceBar: {
    flexDirection: "row",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  balanceStat: { flex: 1, alignItems: "center" },
  balanceValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  balanceLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  balanceDivider: { width: 1 },
  group: { paddingHorizontal: 16, paddingTop: 16 },
  groupDate: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  groupCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  entryContent: { flex: 1 },
  entryDesc: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  entryTime: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  entryRight: { alignItems: "flex-end", gap: 2 },
  creditDelta: { fontSize: 13, fontFamily: "Inter_700Bold" },
  amountDelta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
