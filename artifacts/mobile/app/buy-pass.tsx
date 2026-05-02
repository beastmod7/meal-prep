import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { PASS_PLANS } from "@/constants/mockData";
import { useColors } from "@/hooks/useColors";

export default function BuyPassScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { buyPass } = useApp();
  const [loading, setLoading] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("monthly");

  async function handleBuy(planId: string) {
    setLoading(planId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await buyPass(planId);
    setLoading(null);
    router.replace({ pathname: "/payment-success", params: { planId } });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24,
          paddingHorizontal: 16,
        }}
      >
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Buy meals once. Eat flexibly. Cancel tomorrow's meal by 10 PM
          tonight for free.
        </Text>

        {PASS_PLANS.map((plan) => {
          const isSelected = selected === plan.id;
          return (
            <Pressable
              key={plan.id}
              onPress={() => {
                Haptics.selectionAsync();
                setSelected(plan.id);
              }}
              style={({ pressed }) => [
                styles.planCard,
                { borderColor: isSelected ? "#F97316" : colors.border },
                pressed && { opacity: 0.95 },
              ]}
            >
              {plan.popular && (
                <LinearGradient
                  colors={["#F97316", "#EA580C"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.popularBanner}
                >
                  <Text style={styles.popularText}>Most popular</Text>
                </LinearGradient>
              )}
              <View
                style={[
                  styles.planContent,
                  plan.popular && { paddingTop: 8 },
                ]}
              >
                <View style={styles.planTopRow}>
                  <View>
                    <Text
                      style={[styles.planName, { color: colors.foreground }]}
                    >
                      {plan.name}
                    </Text>
                    <Text
                      style={[
                        styles.planDesc,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {plan.description}
                    </Text>
                  </View>
                  <View style={styles.planPriceCol}>
                    <Text
                      style={[styles.planPrice, { color: colors.foreground }]}
                    >
                      ₹{plan.price.toLocaleString("en-IN")}
                    </Text>
                    <Text
                      style={[
                        styles.planPerMeal,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      ₹{Math.round(plan.perMeal)}/meal
                    </Text>
                  </View>
                </View>

                <View
                  style={[styles.divider, { backgroundColor: colors.border }]}
                />

                <View style={styles.planStats}>
                  {[
                    {
                      icon: "coffee" as const,
                      label: `${plan.meals} meals`,
                    },
                    {
                      icon: "calendar" as const,
                      label: `Valid ${plan.validDays} days`,
                    },
                    {
                      icon: "shield" as const,
                      label: "Free cancel by 10 PM",
                    },
                    {
                      icon: "rotate-ccw" as const,
                      label: "Refundable value",
                    },
                  ].map((stat) => (
                    <View key={stat.label} style={styles.planStat}>
                      <Feather
                        name={stat.icon}
                        size={13}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          styles.planStatText,
                          { color: colors.foreground },
                        ]}
                      >
                        {stat.label}
                      </Text>
                    </View>
                  ))}
                </View>

                {isSelected && (
                  <Pressable
                    onPress={() => handleBuy(plan.id)}
                    disabled={loading === plan.id}
                    style={({ pressed }) => [
                      styles.buyBtn,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    {loading === plan.id ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.buyBtnText}>
                        Pay ₹{plan.price.toLocaleString("en-IN")}
                      </Text>
                    )}
                  </Pressable>
                )}
              </View>
            </Pressable>
          );
        })}

        <View
          style={[styles.guaranteeBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        >
          <Feather name="shield" size={16} color="#F97316" />
          <View style={{ flex: 1 }}>
            <Text style={styles.guaranteeTitle}>
              Your money is safe
            </Text>
            <Text style={styles.guaranteeBody}>
              Unused paid meal credits can be carried forward or refunded. No hidden fees.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    paddingVertical: 16,
  },
  planCard: {
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  popularBanner: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  popularText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  planContent: {
    padding: 16,
    paddingTop: 16,
  },
  planTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  planName: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  planDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  planPriceCol: { alignItems: "flex-end" },
  planPrice: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  planPerMeal: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  planStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  planStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  planStatText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  buyBtn: {
    height: 48,
    backgroundColor: "#F97316",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buyBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  guaranteeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 8,
  },
  guaranteeTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#92400E",
    marginBottom: 2,
  },
  guaranteeBody: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#92400E",
    lineHeight: 17,
  },
});
