import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface SettingRow {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, activePass } = useApp();

  const firstName = user?.name?.split(" ")[0] ?? "Student";

  const foodPrefLabel: Record<string, string> = {
    veg: "Vegetarian",
    "non-veg": "Non-vegetarian",
    egg: "Egg & Veg",
    jain: "Jain",
  };

  const ACCOUNT_SETTINGS: SettingRow[] = [
    {
      icon: "user",
      label: "Name",
      value: user?.name ?? "—",
    },
    {
      icon: "phone",
      label: "Phone",
      value: user?.phone ? `+91 ${user.phone}` : "—",
    },
    {
      icon: "map-pin",
      label: "Campus",
      value: user?.campusName ?? "—",
    },
    {
      icon: "heart",
      label: "Food preference",
      value: user?.foodPreference
        ? foodPrefLabel[user.foodPreference] ?? user.foodPreference
        : "—",
    },
    {
      icon: "home",
      label: "Delivery address",
      value: user?.address ?? "—",
    },
  ];

  const APP_SETTINGS: SettingRow[] = [
    {
      icon: "bell",
      label: "Notifications",
      onPress: () => {},
    },
    {
      icon: "shield",
      label: "Privacy & Security",
      onPress: () => {},
    },
    {
      icon: "help-circle",
      label: "Support",
      onPress: () => router.push("/support"),
    },
    {
      icon: "file-text",
      label: "Terms of Service",
      onPress: () => {},
    },
  ];

  function handleLogout() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.clear();
          router.replace("/onboarding");
        },
      },
    ]);
  }

  function SettingItem({ row }: { row: SettingRow }) {
    return (
      <Pressable
        onPress={row.onPress}
        style={({ pressed }) => [
          styles.settingRow,
          { borderBottomColor: colors.border },
          pressed && row.onPress && { backgroundColor: colors.muted },
        ]}
      >
        <View
          style={[styles.settingIcon, { backgroundColor: colors.secondary }]}
        >
          <Feather
            name={row.icon as any}
            size={16}
            color={row.danger ? "#EF4444" : colors.primary}
          />
        </View>
        <Text
          style={[
            styles.settingLabel,
            { color: row.danger ? "#EF4444" : colors.foreground },
          ]}
        >
          {row.label}
        </Text>
        <View style={styles.settingRight}>
          {row.value && (
            <Text
              style={[styles.settingValue, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {row.value}
            </Text>
          )}
          {row.onPress && (
            <Feather
              name="chevron-right"
              size={16}
              color={colors.mutedForeground}
            />
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom:
            insets.bottom + (Platform.OS === "web" ? 34 : 0) + 90,
        }}
      >
        {/* Header */}
        <LinearGradient
          colors={["#F97316", "#EA580C"]}
          style={[
            styles.header,
            {
              paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) + 20,
            },
          ]}
        >
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{user?.name ?? "Student"}</Text>
          <Text style={styles.campus}>{user?.campusName ?? "Campus"}</Text>

          {activePass && (
            <View style={styles.passStats}>
              <View style={styles.passStat}>
                <Text style={styles.passStatValue}>
                  {activePass.remainingCredits}
                </Text>
                <Text style={styles.passStatLabel}>meals left</Text>
              </View>
              <View style={styles.passStatDivider} />
              <View style={styles.passStat}>
                <Text style={styles.passStatValue}>
                  ₹{(activePass.remainingCredits * activePass.effectiveCreditValue).toLocaleString("en-IN")}
                </Text>
                <Text style={styles.passStatLabel}>unused value</Text>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* Account settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            Account
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {ACCOUNT_SETTINGS.map((row) => (
              <SettingItem key={row.label} row={row} />
            ))}
          </View>
        </View>

        {/* App settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            App
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {APP_SETTINGS.map((row) => (
              <SettingItem key={row.label} row={row} />
            ))}
          </View>
        </View>

        {/* Sign out */}
        <View style={[styles.section, { marginBottom: 8 }]}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.signOutBtn,
              { borderColor: "#EF4444" },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Feather name="log-out" size={16} color="#EF4444" />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>
          MealPass v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    alignItems: "center",
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  name: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  campus: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    marginBottom: 16,
  },
  passStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 24,
  },
  passStat: { alignItems: "center" },
  passStatValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  passStatLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
  },
  passStatDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: 160,
  },
  settingValue: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "right",
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#EF4444",
  },
  version: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingVertical: 12,
  },
});
