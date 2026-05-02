import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { restaurantName, slot, days, totalPaid } = useLocalSearchParams<{
    restaurantName?: string;
    slot?: string;
    days?: string;
    totalPaid?: string;
  }>();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const daysNum = parseInt(days ?? "20", 10);
  const totalNum = parseInt(totalPaid ?? "0", 10);

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + daysNum - 1);

  function fmt(d: Date) {
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 0),
        },
      ]}
    >
      <LinearGradient
        colors={["#FFFFFF", "#EFF6FF"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <Animated.View
          style={[styles.iconWrap, { transform: [{ scale: scaleAnim }] }]}
        >
          <LinearGradient
            colors={["#3B82F6", "#2563EB"]}
            style={styles.iconGradient}
          >
            <Feather name="check" size={36} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[styles.textBlock, { opacity: fadeAnim }]}>
          <Text style={styles.title}>You're subscribed!</Text>
          <Text style={styles.subtitle}>
            Daily {slot === "lunch" ? "lunch" : "dinner"} meals from{" "}
            <Text style={styles.highlight}>{restaurantName}</Text> have been
            auto-scheduled for you.
          </Text>

          <View style={styles.summaryCard}>
            <SummaryRow
              icon="coffee"
              label="Restaurant"
              value={restaurantName ?? ""}
            />
            <SummaryRow
              icon={slot === "lunch" ? "sun" : "moon"}
              label="Slot"
              value={slot === "lunch" ? "Lunch · 12–2 PM" : "Dinner · 7–9 PM"}
            />
            <SummaryRow
              icon="calendar"
              label="Duration"
              value={`${days} days (${fmt(startDate)} – ${fmt(endDate)})`}
            />
            <SummaryRow
              icon="credit-card"
              label="Amount paid"
              value={`₹${totalNum.toLocaleString("en-IN")}`}
              highlight
            />
          </View>

          <View style={styles.tip}>
            <Feather name="bell" size={14} color="#2563EB" />
            <Text style={styles.tipText}>
              Cancel any day for free before 10 PM the previous night. Manage
              your subscription in <Text style={styles.tipBold}>My Plans</Text>.
            </Text>
          </View>
        </Animated.View>
      </View>

      <Animated.View style={[styles.actions, { opacity: fadeAnim }]}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && { opacity: 0.9 },
          ]}
          onPress={() => router.replace("/(tabs)/pass")}
        >
          <Text style={styles.primaryBtnText}>View my plans</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.secondaryBtn,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => router.replace("/(tabs)/orders")}
        >
          <Text style={styles.secondaryBtnText}>See scheduled meals</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: any;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={summaryStyles.row}>
      <Feather name={icon} size={14} color="#71717A" />
      <Text style={summaryStyles.label}>{label}</Text>
      <Text
        style={[
          summaryStyles.value,
          highlight && { color: "#3B82F6", fontFamily: "Inter_700Bold" },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  label: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", color: "#71717A" },
  value: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#1A1A1A" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: "center", alignItems: "center" },
  iconWrap: { marginBottom: 24 },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { width: "100%", alignItems: "center" },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#1A1A1A",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#71717A",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 280,
  },
  highlight: { fontFamily: "Inter_700Bold", color: "#1A1A1A" },
  summaryCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E4E7",
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
  },
  tip: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 12,
    width: "100%",
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#1E3A8A",
    lineHeight: 17,
  },
  tipBold: { fontFamily: "Inter_700Bold" },
  actions: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 10,
  },
  primaryBtn: {
    height: 54,
    backgroundColor: "#3B82F6",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  secondaryBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: { fontSize: 15, fontFamily: "Inter_500Medium", color: "#71717A" },
});
