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

import { useApp } from "@/context/AppContext";
import { PASS_PLANS } from "@/constants/mockData";

export default function PaymentSuccessScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activePass } = useApp();

  const plan = PASS_PLANS.find((p) => p.id === planId);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, []);

  const validUntil = activePass
    ? new Date(activePass.validUntil).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
      })
    : "";

  return (
    <LinearGradient
      colors={["#F97316", "#EA580C"]}
      style={[
        styles.container,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0),
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0),
        },
      ]}
    >
      <View style={styles.content}>
        <Animated.View
          style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}
        >
          <Feather name="check" size={48} color="#F97316" />
        </Animated.View>

        <Text style={styles.title}>Your Meal Pass is active</Text>
        <Text style={styles.subtitle}>
          {plan ? `${plan.meals} meals added` : "Pass activated"}
          {validUntil ? `\nValid till ${validUntil}` : ""}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{plan?.meals ?? 0}</Text>
            <Text style={styles.statLabel}>meals</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              ₹{plan ? Math.round(plan.price / plan.meals) : 0}
            </Text>
            <Text style={styles.statLabel}>per meal</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{plan?.validDays ?? 0}</Text>
            <Text style={styles.statLabel}>days valid</Text>
          </View>
        </View>

        <View style={styles.featureList}>
          {[
            "Cancel before 10 PM for free",
            "Unused meals carry forward",
            "Unused paid value refundable",
          ].map((f) => (
            <View key={f} style={styles.featureRow}>
              <Feather name="check-circle" size={16} color="#4ADE80" />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() =>
            router.replace({ pathname: "/(tabs)", params: { tab: "meals" } })
          }
          style={({ pressed }) => [
            styles.primaryBtn,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={styles.primaryBtnText}>Schedule first meal</Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace("/(tabs)")}
          style={({ pressed }) => [
            styles.secondaryBtn,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.secondaryBtnText}>Go to home</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 32,
    width: "100%",
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 24,
    width: "100%",
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  featureList: {
    width: "100%",
    gap: 10,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.9)",
  },
  primaryBtn: {
    height: 54,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#F97316",
  },
  secondaryBtn: {
    height: 48,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.75)",
  },
});
