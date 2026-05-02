import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function getDaysFromToday(count: number): Array<{ date: string; label: string; dayLabel: string }> {
  const days = [];
  const today = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const dayLabel = d.toLocaleDateString("en-IN", { weekday: "short" });
    const label = i === 1 ? "Tmrw" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    days.push({ date: dateStr, label, dayLabel });
  }
  return days;
}

export default function ScheduleMealScreen() {
  const params = useLocalSearchParams<{
    restaurantId: string;
    restaurantName: string;
    mealId: string;
    mealName: string;
    premiumExtra: string;
    editOrderId: string;
  }>();

  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { scheduleOrder, activePass } = useApp();

  const days = getDaysFromToday(7);
  const [selectedDate, setSelectedDate] = useState(days[0].date);
  const [selectedSlot, setSelectedSlot] = useState<"lunch" | "dinner">("lunch");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const premiumExtra = parseInt(params.premiumExtra ?? "0", 10) || 0;

  async function handleConfirm() {
    if (!params.restaurantId || !params.mealId) return;
    setLoading(true);
    await scheduleOrder({
      restaurantId: params.restaurantId,
      restaurantName: params.restaurantName ?? "",
      mealId: params.mealId,
      mealName: params.mealName ?? "",
      scheduledDate: selectedDate,
      slot: selectedSlot,
      premiumExtra,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(false);
    setConfirmed(true);
  }

  if (confirmed) {
    const selectedDay = days.find((d) => d.date === selectedDate);
    return (
      <View
        style={[
          styles.successContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <View style={styles.successIcon}>
          <Feather name="check-circle" size={52} color="#16A34A" />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>
          Meal scheduled!
        </Text>
        <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
          {params.mealName} from {params.restaurantName}
          {"\n"}
          {selectedSlot === "lunch" ? "Lunch" : "Dinner"} ·{" "}
          {selectedDay?.label ?? selectedDate}
        </Text>
        <View style={[styles.policyReminder, { backgroundColor: "#F0FDF4", borderColor: "#86EFAC" }]}>
          <Feather name="shield" size={14} color="#16A34A" />
          <Text style={styles.policyText}>
            Free cancellation until 10 PM the previous day.
          </Text>
        </View>
        <Pressable
          onPress={() => router.replace("/(tabs)/orders")}
          style={styles.viewOrdersBtn}
        >
          <Text style={styles.viewOrdersBtnText}>View orders</Text>
        </Pressable>
        <Pressable
          onPress={() => router.back()}
          style={styles.doneLink}
        >
          <Text style={[styles.doneLinkText, { color: colors.mutedForeground }]}>
            Done
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 100,
          padding: 20,
          gap: 20,
        }}
      >
        {/* Meal summary */}
        {params.mealName && (
          <View
            style={[
              styles.mealSummary,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.mealSummaryIcon}>
              <Feather name="coffee" size={18} color="#F97316" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.mealSummaryName, { color: colors.foreground }]}>
                {params.mealName}
              </Text>
              <Text style={[styles.mealSummaryRest, { color: colors.mutedForeground }]}>
                {params.restaurantName}
                {premiumExtra > 0 ? ` · 1 credit + ₹${premiumExtra}` : " · 1 credit"}
              </Text>
            </View>
          </View>
        )}

        {!activePass && (
          <View style={[styles.noPassWarning, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
            <Feather name="alert-circle" size={16} color="#EF4444" />
            <Text style={styles.noPassText}>
              You need an active meal pass to schedule meals.
            </Text>
          </View>
        )}

        {/* Date selection */}
        <View>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Select date
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysRow}
          >
            {days.map((day) => (
              <Pressable
                key={day.date}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedDate(day.date);
                }}
                style={[
                  styles.dayCard,
                  {
                    backgroundColor:
                      selectedDate === day.date
                        ? "#F97316"
                        : colors.card,
                    borderColor:
                      selectedDate === day.date
                        ? "#F97316"
                        : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    {
                      color:
                        selectedDate === day.date
                          ? "rgba(255,255,255,0.75)"
                          : colors.mutedForeground,
                    },
                  ]}
                >
                  {day.dayLabel}
                </Text>
                <Text
                  style={[
                    styles.dayDate,
                    {
                      color:
                        selectedDate === day.date ? "#FFFFFF" : colors.foreground,
                    },
                  ]}
                >
                  {day.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Slot selection */}
        <View>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Meal slot
          </Text>
          <View style={styles.slotRow}>
            {(["lunch", "dinner"] as const).map((slot) => (
              <Pressable
                key={slot}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedSlot(slot);
                }}
                style={[
                  styles.slotCard,
                  {
                    backgroundColor:
                      selectedSlot === slot ? "#FFF3E8" : colors.card,
                    borderColor:
                      selectedSlot === slot ? "#F97316" : colors.border,
                  },
                ]}
              >
                <Feather
                  name={slot === "lunch" ? "sun" : "moon"}
                  size={22}
                  color={selectedSlot === slot ? "#F97316" : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.slotLabel,
                    {
                      color:
                        selectedSlot === slot ? "#F97316" : colors.foreground,
                    },
                  ]}
                >
                  {slot === "lunch" ? "Lunch" : "Dinner"}
                </Text>
                <Text
                  style={[
                    styles.slotTime,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {slot === "lunch" ? "12 – 2 PM" : "7 – 9 PM"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Policy reminder */}
        <View style={[styles.policyBox, { backgroundColor: "#FFF3E8", borderColor: "#FDBA74" }]}>
          <Feather name="info" size={14} color="#F97316" />
          <View style={{ flex: 1 }}>
            <Text style={styles.policyBoxTitle}>Cancellation policy</Text>
            <Text style={styles.policyBoxBody}>
              Free cancellation until 10 PM the previous night.{"\n"}
              After that, late cancellation fee may apply.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* CTA */}
      <View
        style={[
          styles.ctaBar,
          {
            paddingBottom: insets.bottom + 12,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={handleConfirm}
          disabled={loading || !activePass}
          style={({ pressed }) => [
            styles.ctaBtn,
            (!activePass || loading) && styles.btnDisabled,
            pressed && activePass && !loading && { opacity: 0.85 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.ctaBtnText}>Confirm schedule</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  mealSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  mealSummaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF3E8",
    alignItems: "center",
    justifyContent: "center",
  },
  mealSummaryName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 2,
  },
  mealSummaryRest: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  noPassWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  noPassText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#991B1B",
  },
  daysRow: {
    gap: 8,
    paddingVertical: 4,
  },
  dayCard: {
    width: 70,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 4,
  },
  dayLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  dayDate: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  slotRow: {
    flexDirection: "row",
    gap: 10,
  },
  slotCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 16,
    alignItems: "center",
    gap: 6,
  },
  slotLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  slotTime: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  policyBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  policyBoxTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#92400E",
    marginBottom: 3,
  },
  policyBoxBody: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#92400E",
    lineHeight: 17,
  },
  ctaBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  ctaBtn: {
    height: 54,
    backgroundColor: "#F97316",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    backgroundColor: "#D4D4D8",
  },
  ctaBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#F0FDF4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  successSub: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  policyReminder: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    width: "100%",
  },
  policyText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#166534",
  },
  viewOrdersBtn: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: "#F97316",
    borderRadius: 14,
  },
  viewOrdersBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  doneLink: {
    paddingVertical: 8,
  },
  doneLinkText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
