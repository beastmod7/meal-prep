import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Derives the same 4-digit OTP as the portal's deriveVerificationCode().
 * Input: subscriptionId + scheduled date (YYYY-MM-DD).
 * Code rotates at midnight — same subscription yields a new code each day.
 */
function deriveVerificationCode(subscriptionId: string, date: string): string {
  const input = subscriptionId.replace(/-/g, "") + date.replace(/-/g, "");
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash = hash & 0x7fffffff;
  }
  return String(hash % 10000).padStart(4, "0");
}

function todayString(): string {
  return new Date().toISOString().split("T")[0]!;
}

function secondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

function formatCountdown(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function ShowPassScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { subscriptionId, slot, restaurantName } = useLocalSearchParams<{
    subscriptionId: string;
    slot: string;
    restaurantName: string;
  }>();

  const [today, setToday] = useState(todayString());
  const [countdown, setCountdown] = useState(secondsUntilMidnight());

  // Refresh at midnight to get new code
  useEffect(() => {
    const iv = setInterval(() => {
      const newToday = todayString();
      setToday(newToday);
      setCountdown(secondsUntilMidnight());
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const code = subscriptionId ? deriveVerificationCode(subscriptionId, today) : "----";
  const digits = code.split("");
  const isLunch = slot !== "dinner";

  const gradientColors: [string, string] = isLunch
    ? ["#F59E0B", "#D97706"]
    : ["#6366F1", "#4F46E5"];

  const slotLabel = isLunch ? "Lunch" : "Dinner";
  const slotEmoji = isLunch ? "☀️" : "🌙";

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const dateLabel = new Date(today + "T12:00:00").toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={StyleSheet.absoluteFill} />

      {/* Close button */}
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 12 },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
        >
          <Feather name="x" size={20} color="rgba(255,255,255,0.9)" />
        </Pressable>
      </View>

      <View style={styles.content}>
        {/* Restaurant + slot badge */}
        <View style={styles.headerBadge}>
          <Text style={styles.slotEmoji}>{slotEmoji}</Text>
          <View>
            <Text style={styles.restaurantLabel} numberOfLines={1}>
              {restaurantName ?? "Restaurant"}
            </Text>
            <Text style={styles.slotSub}>{slotLabel} pass · {dateLabel}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Your Meal Code</Text>
        <Text style={styles.subtitle}>
          Show this to the staff when picking up your meal
        </Text>

        {/* Code display — 4 big digit boxes */}
        <View style={styles.codeRow}>
          {digits.map((d, i) => (
            <View key={i} style={styles.digitBox}>
              <Text style={styles.digitText}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Validity strip */}
        <View style={styles.validityCard}>
          <View style={styles.validityRow}>
            <Feather name="clock" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.validityText}>
              Code refreshes in {formatCountdown(countdown)}
            </Text>
          </View>
          <View style={styles.validityRow}>
            <Feather name="shield" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.validityText}>
              Unique to your subscription · Valid today only
            </Text>
          </View>
        </View>

        {/* Tip */}
        <View style={styles.tipCard}>
          <Feather name="info" size={14} color="rgba(255,255,255,0.6)" />
          <Text style={styles.tipText}>
            If the code doesn't work, ask the staff to tap "Deliver without code." Contact
            support if you face issues.
          </Text>
        </View>
      </View>

      {/* Bottom spacer */}
      <View style={{ height: insets.bottom + 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  slotEmoji: { fontSize: 22 },
  restaurantLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    maxWidth: 220,
  },
  slotSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    marginTop: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 20,
    marginTop: -8,
    maxWidth: 260,
  },
  codeRow: {
    flexDirection: "row",
    gap: 12,
    marginVertical: 8,
  },
  digitBox: {
    width: 70,
    height: 88,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  digitText: {
    fontSize: 52,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    lineHeight: 60,
  },
  validityCard: {
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  validityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  validityText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    flex: 1,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.12)",
    borderRadius: 12,
    padding: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
    lineHeight: 16,
  },
});
