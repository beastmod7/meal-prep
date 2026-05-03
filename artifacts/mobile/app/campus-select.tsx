import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { getCampuses, getProfile, Campus } from "@/services/api";

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

export default function CampusSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setUser, setOnboarded } = useApp();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loadingCampuses, setLoadingCampuses] = useState(true);
  const [selectedCampus, setSelectedCampus] = useState<string | null>(null);
  const [selectedPref, setSelectedPref] = useState<User["foodPreference"] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCampuses()
      .then(setCampuses)
      .catch(() => {})
      .finally(() => setLoadingCampuses(false));
  }, []);

  const canProceed = selectedCampus && selectedPref;

  async function handleConfirm() {
    if (!canProceed) return;
    setLoading(true);
    try {
      const campus = campuses.find((c) => c.id === selectedCampus)!;
      const profile = await getProfile();
      const user: User = {
        id: profile.id,
        name: profile.name || "Student",
        phone: profile.phone,
        campusId: campus.id,
        campusName: campus.name,
        foodPreference: selectedPref!,
        address: `${campus.area}, ${campus.city}`,
      };
      await setUser(user);
      await setOnboarded();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch {
      setLoading(false);
    }
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 16,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0),
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

        {loadingCampuses ? (
          <ActivityIndicator color="#3B82F6" style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.campusGrid}>
            {campuses.map((campus) => (
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
                  color={selectedCampus === campus.id ? "#3B82F6" : "#71717A"}
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
                    selectedCampus === campus.id && { color: "#3B82F6" },
                  ]}
                >
                  {campus.city}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

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
              style={[
                styles.prefCard,
                selectedPref === pref.key && styles.prefCardSelected,
              ]}
            >
              <Text style={styles.prefEmoji}>{pref.emoji}</Text>
              <Text
                style={[
                  styles.prefLabel,
                  selectedPref === pref.key && { color: "#3B82F6" },
                ]}
              >
                {pref.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.infoBox, { marginTop: 28 }]}>
          <Feather name="info" size={13} color="#2563EB" />
          <Text style={styles.infoText}>
            You can change your campus and food preferences anytime from your profile.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleConfirm}
          disabled={!canProceed || loading}
          style={[
            styles.confirmBtn,
            (!canProceed || loading) && styles.confirmBtnDisabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.confirmBtnText}>Continue</Text>
              <Feather name="arrow-right" size={18} color="#FFF" />
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4FF" },
  header: { paddingHorizontal: 24, marginBottom: 8 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#1A1A1A", marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", color: "#71717A", lineHeight: 20 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
  sectionLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#71717A", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  campusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  campusCard: {
    width: "47%", backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1.5,
    borderColor: "#E4E4E7", padding: 14, gap: 4,
  },
  campusCardSelected: { borderColor: "#3B82F6", backgroundColor: "#EFF6FF" },
  campusName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#1A1A1A" },
  campusNameSelected: { color: "#1E3A8A" },
  campusCity: { fontSize: 11, fontFamily: "Inter_400Regular", color: "#71717A" },
  prefRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  prefCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 11,
    backgroundColor: "#FFFFFF", borderRadius: 12,
    borderWidth: 1.5, borderColor: "#E4E4E7",
  },
  prefCardSelected: { borderColor: "#3B82F6", backgroundColor: "#EFF6FF" },
  prefEmoji: { fontSize: 18 },
  prefLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#1A1A1A" },
  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#EFF6FF", borderRadius: 10, padding: 12 },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", color: "#1E3A8A", lineHeight: 17 },
  footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 },
  confirmBtn: {
    height: 56, backgroundColor: "#3B82F6", borderRadius: 16,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  confirmBtnDisabled: { backgroundColor: "#D4D4D8" },
  confirmBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
});
