import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

import { useApp, User } from "@/context/AppContext";
import { CAMPUSES } from "@/constants/mockData";

const FOOD_PREFS: Array<{
  key: User["foodPreference"];
  label: string;
  emoji: string;
}> = [
  { key: "veg", label: "Veg only", emoji: "🥦" },
  { key: "non-veg", label: "Non-veg", emoji: "🍗" },
  { key: "egg", label: "Egg & Veg", emoji: "🥚" },
  { key: "jain", label: "Jain", emoji: "🫙" },
];

const DEMO_NAMES = [
  "Rahul Kumar",
  "Priya Sharma",
  "Ankit Singh",
  "Neha Patel",
  "Rohan Mehta",
];

export default function CampusSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setUser, setOnboarded } = useApp();
  const [selectedCampus, setSelectedCampus] = useState<string | null>(null);
  const [selectedPref, setSelectedPref] = useState<
    User["foodPreference"] | null
  >(null);
  const [loading, setLoading] = useState(false);

  const canProceed = selectedCampus && selectedPref;

  async function handleConfirm() {
    if (!canProceed) return;
    setLoading(true);
    const campus = CAMPUSES.find((c) => c.id === selectedCampus)!;
    const name = DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];
    const user: User = {
      id: `u_${Date.now()}`,
      name,
      phone: "9876543210",
      campusId: campus.id,
      campusName: campus.name,
      foodPreference: selectedPref!,
      address: `${campus.area}, ${campus.city}`,
    };
    await setUser(user);
    await setOnboarded();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)");
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop:
            insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
          paddingBottom:
            insets.bottom + (Platform.OS === "web" ? 34 : 0),
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Your campus</Text>
        <Text style={styles.subtitle}>
          We'll show restaurants that can actually deliver to you.
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionLabel}>Select campus</Text>
        <View style={styles.campusGrid}>
          {CAMPUSES.map((campus) => (
            <Pressable
              key={campus.id}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedCampus(campus.id);
              }}
              style={({ pressed }) => [
                styles.campusCard,
                selectedCampus === campus.id && styles.campusCardSelected,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Feather
                name="map-pin"
                size={14}
                color={selectedCampus === campus.id ? "#F97316" : "#71717A"}
              />
              <Text
                style={[
                  styles.campusName,
                  selectedCampus === campus.id && styles.campusNameSelected,
                ]}
              >
                {campus.name}
              </Text>
              <Text
                style={[
                  styles.campusCity,
                  selectedCampus === campus.id && { color: "#F97316" },
                ]}
              >
                {campus.city}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
          Food preference
        </Text>
        <View style={styles.prefRow}>
          {FOOD_PREFS.map((pref) => (
            <Pressable
              key={pref.key}
              onPress={() => {
                Haptics.selectionAsync();
                setSelectedPref(pref.key);
              }}
              style={({ pressed }) => [
                styles.prefCard,
                selectedPref === pref.key && styles.prefCardSelected,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.prefEmoji}>{pref.emoji}</Text>
              <Text
                style={[
                  styles.prefLabel,
                  selectedPref === pref.key && { color: "#F97316" },
                ]}
              >
                {pref.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Feather name="info" size={14} color="#F97316" />
          <Text style={styles.infoText}>
            You can change your preferences anytime from your profile.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleConfirm}
          disabled={!canProceed || loading}
          style={({ pressed }) => [
            styles.confirmBtn,
            (!canProceed || loading) && styles.btnDisabled,
            pressed && canProceed && !loading && { opacity: 0.85 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmBtnText}>Start eating</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAF8",
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "#71717A",
    lineHeight: 22,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#71717A",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  campusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  campusCard: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E4E4E7",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  campusCardSelected: {
    borderColor: "#F97316",
    backgroundColor: "#FFF3E8",
  },
  campusName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#1A1A1A",
  },
  campusNameSelected: {
    color: "#F97316",
  },
  campusCity: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#71717A",
  },
  prefRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  prefCard: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E4E4E7",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    gap: 4,
  },
  prefCardSelected: {
    borderColor: "#F97316",
    backgroundColor: "#FFF3E8",
  },
  prefEmoji: {
    fontSize: 22,
  },
  prefLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#1A1A1A",
    textAlign: "center",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FFF3E8",
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#92400E",
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  confirmBtn: {
    height: 56,
    backgroundColor: "#F97316",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: {
    backgroundColor: "#D4D4D8",
  },
  confirmBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
});
