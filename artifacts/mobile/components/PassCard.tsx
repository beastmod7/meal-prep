import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RestaurantSubscription } from "@/context/AppContext";

interface PassCardProps {
  subscription: RestaurantSubscription;
  compact?: boolean;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function PassCard({ subscription: sub, compact = false }: PassCardProps) {
  const router = useRouter();
  const progress = sub.remainingDays / sub.totalDays;

  if (compact) {
    return (
      <Pressable
        onPress={() => router.push("/(tabs)/pass")}
        style={({ pressed }) => [styles.compact, pressed && { opacity: 0.9 }]}
      >
        <LinearGradient
          colors={["#3B82F6", "#2563EB"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.compactGradient}
        >
          <View style={styles.compactLeft}>
            <Text style={styles.compactMeals}>
              {sub.remainingDays} meals left
            </Text>
            <Text style={styles.compactSubtitle}>
              {sub.restaurantName} · {sub.slot === "lunch" ? "Lunch" : "Dinner"}
            </Text>
          </View>
          <View style={styles.compactRight}>
            <Text style={styles.compactValue}>
              ₹{sub.pricePerDay}/day
            </Text>
            <Text style={styles.compactValueLabel}>until {formatDate(sub.endDate)}</Text>
          </View>
        </LinearGradient>
        <View style={styles.compactProgressBg}>
          <View
            style={[
              styles.compactProgressBar,
              { width: `${Math.max(4, progress * 100)}%` },
            ]}
          />
        </View>
      </Pressable>
    );
  }

  return (
    <LinearGradient
      colors={["#3B82F6", "#2563EB"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <Text style={styles.planName}>
          {sub.restaurantName} · {sub.slot === "lunch" ? "Lunch" : "Dinner"}
        </Text>
        <View
          style={[
            styles.statusPill,
            sub.status === "paused" && { backgroundColor: "#FEF3C7" },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              sub.status === "paused" && { color: "#1E3A8A" },
            ]}
          >
            {sub.status === "active" ? "Active" : sub.status === "paused" ? "Paused" : "Active"}
          </Text>
        </View>
      </View>

      <Text style={styles.credits}>{sub.remainingDays}</Text>
      <Text style={styles.creditsLabel}>meals remaining</Text>

      <View style={styles.progressBg}>
        <View
          style={[
            styles.progressBar,
            { width: `${Math.max(4, progress * 100)}%` },
          ]}
        />
      </View>
      <Text style={styles.progressText}>
        {sub.usedDays} of {sub.totalDays} used
      </Text>

      <View style={styles.divider} />

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>₹{sub.pricePerDay}/day</Text>
          <Text style={styles.statLabel}>rate</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            ₹{(sub.remainingDays * sub.pricePerDay).toLocaleString("en-IN")}
          </Text>
          <Text style={styles.statLabel}>unused value</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formatDate(sub.endDate)}</Text>
          <Text style={styles.statLabel}>ends on</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  planName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    flex: 1,
    marginRight: 8,
  },
  statusPill: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  credits: { fontSize: 52, fontFamily: "Inter_700Bold", color: "#FFFFFF", lineHeight: 56 },
  creditsLabel: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    marginBottom: 16,
  },
  progressBg: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 3,
    marginBottom: 6,
    overflow: "hidden",
  },
  progressBar: { height: "100%", backgroundColor: "#FFFFFF", borderRadius: 3 },
  progressText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 16,
  },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginBottom: 16 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 2 },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
  },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 4 },
  compact: { borderRadius: 14, overflow: "hidden" },
  compactGradient: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  compactLeft: { flex: 1 },
  compactMeals: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginBottom: 2 },
  compactSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },
  compactRight: { alignItems: "flex-end" },
  compactValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  compactValueLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.75)" },
  compactProgressBg: { height: 4, backgroundColor: "#E4E4E7", overflow: "hidden" },
  compactProgressBar: { height: "100%", backgroundColor: "#3B82F6" },
});
