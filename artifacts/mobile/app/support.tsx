import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const CATEGORIES = [
  { key: "not_delivered", label: "Food not delivered", icon: "package" },
  { key: "wrong_meal", label: "Wrong meal received", icon: "alert-triangle" },
  { key: "poor_quality", label: "Poor quality", icon: "thumbs-down" },
  { key: "refund_issue", label: "Refund issue", icon: "rotate-ccw" },
  { key: "restaurant_issue", label: "Restaurant issue", icon: "coffee" },
  { key: "payment_failed", label: "Payment failed", icon: "credit-card" },
  { key: "other", label: "Other", icon: "help-circle" },
];

export default function SupportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!selectedCategory || !message.trim()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <View
        style={[
          styles.successContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <View style={[styles.successIcon, { backgroundColor: "#F0FDF4" }]}>
          <Feather name="check-circle" size={40} color="#16A34A" />
        </View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>
          Ticket submitted
        </Text>
        <Text
          style={[styles.successBody, { color: colors.mutedForeground }]}
        >
          We'll get back to you within 2–4 hours. Check your phone or email for updates.
        </Text>
        <Pressable
          onPress={() => {
            setSubmitted(false);
            setSelectedCategory(null);
            setMessage("");
          }}
          style={styles.newTicketBtn}
        >
          <Text style={styles.newTicketText}>Submit another ticket</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 100,
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          What's the issue?
        </Text>

        <View style={styles.categoriesGrid}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.key}
              onPress={() => setSelectedCategory(cat.key)}
              style={({ pressed }) => [
                styles.categoryCard,
                {
                  backgroundColor:
                    selectedCategory === cat.key
                      ? "#FFF3E8"
                      : colors.card,
                  borderColor:
                    selectedCategory === cat.key
                      ? "#F97316"
                      : colors.border,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Feather
                name={cat.icon as any}
                size={18}
                color={selectedCategory === cat.key ? "#F97316" : colors.mutedForeground}
              />
              <Text
                style={[
                  styles.categoryLabel,
                  {
                    color:
                      selectedCategory === cat.key
                        ? "#F97316"
                        : colors.foreground,
                  },
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {selectedCategory && (
          <>
            <View>
              <Text
                style={[styles.sectionLabel, { color: colors.mutedForeground }]}
              >
                Describe the issue
              </Text>
              <TextInput
                style={[
                  styles.messageInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="Tell us what happened. Include the order ID if possible..."
                placeholderTextColor={colors.mutedForeground}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            <View
              style={[
                styles.infoBox,
                { backgroundColor: "#FFF3E8", borderColor: "#FDBA74" },
              ]}
            >
              <Feather name="clock" size={14} color="#F97316" />
              <Text style={styles.infoText}>
                Average response time: 2–4 hours. We'll contact you via the
                phone number on your account.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {selectedCategory && (
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
            onPress={handleSubmit}
            disabled={loading || !message.trim()}
            style={({ pressed }) => [
              styles.ctaBtn,
              (!message.trim() || loading) && styles.btnDisabled,
              pressed && message.trim() && !loading && { opacity: 0.85 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.ctaBtnText}>Submit ticket</Text>
            )}
          </Pressable>
        </View>
      )}
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
    marginBottom: 2,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  categoryLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  messageInput: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 120,
    marginTop: 10,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#92400E",
    lineHeight: 18,
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
  btnDisabled: { backgroundColor: "#D4D4D8" },
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
    gap: 14,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  successBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 280,
  },
  newTicketBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#F97316",
  },
  newTicketText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#F97316",
  },
});
