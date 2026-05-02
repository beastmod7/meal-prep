import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
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

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const PAUSE_OPTIONS = [
  { days: 1, label: "1 day", desc: "Back tomorrow" },
  { days: 2, label: "2 days", desc: "Skip the weekend" },
  { days: 3, label: "3 days", desc: "Short break" },
  { days: 5, label: "5 days", desc: "Work week" },
  { days: 7, label: "7 days", desc: "Full week" },
  { days: 14, label: "14 days", desc: "Two weeks" },
];

export default function PauseMealsScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { subscriptionId } = useLocalSearchParams<{ subscriptionId?: string }>();
  const { subscriptions, pauseSubscription } = useApp();

  const [selectedDays, setSelectedDays] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const sub = subscriptions.find((s) => s.id === subscriptionId);

  const resumeDate = new Date();
  resumeDate.setDate(resumeDate.getDate() + selectedDays);

  async function handlePause() {
    if (!sub) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);
    await pauseSubscription(sub.id, selectedDays);
    setIsSubmitting(false);
    setSuccess(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  if (!sub) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, padding: 20 }}>
          Subscription not found.
        </Text>
      </View>
    );
  }

  if (success) {
    return (
      <View
        style={[
          styles.container,
          styles.successContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <View style={[styles.successIcon, { backgroundColor: "#EFF6FF" }]}>
          <Feather name="pause-circle" size={32} color="#3B82F6" />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>
          Subscription paused
        </Text>
        <Text style={[styles.successBody, { color: colors.mutedForeground }]}>
          {sub.restaurantName} {sub.slot} is paused for {selectedDays} day
          {selectedDays > 1 ? "s" : ""}. It will resume on{" "}
          {resumeDate.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
          .
        </Text>
        <Text style={[styles.successNote, { color: colors.mutedForeground }]}>
          Your subscription end date will be extended automatically.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.doneBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom:
            insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100,
        }}
      >
        {/* Subscription info */}
        <View
          style={[
            styles.subInfo,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.subInfoEmoji]}>
            {sub.slot === "lunch" ? "☀️" : "🌙"}
          </Text>
          <View>
            <Text style={[styles.subInfoName, { color: colors.foreground }]}>
              {sub.restaurantName}
            </Text>
            <Text
              style={[styles.subInfoDetail, { color: colors.mutedForeground }]}
            >
              {sub.slot === "lunch" ? "Lunch" : "Dinner"} ·{" "}
              {sub.remainingDays} days remaining
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          How long to pause?
        </Text>
        <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
          Your subscription end date will extend by the same number of days.
        </Text>

        <View style={styles.optionsGrid}>
          {PAUSE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.days}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedDays(opt.days);
              }}
              style={[
                styles.optionCard,
                { borderColor: colors.border, backgroundColor: colors.card },
                selectedDays === opt.days && {
                  borderColor: colors.primary,
                  backgroundColor: "#EFF6FF",
                },
              ]}
            >
              <Text
                style={[
                  styles.optionDays,
                  {
                    color:
                      selectedDays === opt.days
                        ? colors.primary
                        : colors.foreground,
                  },
                ]}
              >
                {opt.label}
              </Text>
              <Text
                style={[
                  styles.optionDesc,
                  { color: colors.mutedForeground },
                ]}
              >
                {opt.desc}
              </Text>
            </Pressable>
          ))}
        </View>

        <View
          style={[
            styles.resumeBox,
            { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
          ]}
        >
          <Feather name="play-circle" size={16} color="#16A34A" />
          <Text style={styles.resumeText}>
            Meals will auto-resume on{" "}
            <Text style={styles.resumeDate}>
              {resumeDate.toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "short",
              })}
            </Text>
            .
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom:
              insets.bottom + (Platform.OS === "web" ? 24 : 0) + 8,
          },
        ]}
      >
        <Pressable
          onPress={handlePause}
          disabled={isSubmitting}
          style={({ pressed }) => [
            styles.pauseBtn,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.9 },
            isSubmitting && { opacity: 0.6 },
          ]}
        >
          <Feather name="pause-circle" size={18} color="#FFF" />
          <Text style={styles.pauseBtnText}>
            {isSubmitting
              ? "Pausing…"
              : `Pause for ${selectedDays} day${selectedDays > 1 ? "s" : ""}`}
          </Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>
            Cancel
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  successBody: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  successNote: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
  },
  doneBtn: {
    marginTop: 12,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 14,
  },
  doneBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  subInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  subInfoEmoji: { fontSize: 24 },
  subInfoName: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 1 },
  subInfoDetail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
  sectionHint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, marginBottom: 14 },
  optionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  optionCard: {
    width: "30%",
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    alignItems: "center",
    gap: 3,
  },
  optionDays: { fontSize: 14, fontFamily: "Inter_700Bold" },
  optionDesc: { fontSize: 10, fontFamily: "Inter_400Regular" },
  resumeBox: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  resumeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#166534",
    lineHeight: 18,
  },
  resumeDate: { fontFamily: "Inter_700Bold" },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  pauseBtn: {
    height: 54,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  pauseBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  cancelBtn: { height: 44, alignItems: "center", justifyContent: "center" },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
