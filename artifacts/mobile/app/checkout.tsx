import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import {
  notifyPaymentSuccess,
  requestNotificationPermissions,
} from "@/utils/notifications";


type PayMethod = "upi" | "card" | "netbanking";
type UpiApp = "gpay" | "phonepe" | "paytm" | "other";

const UPI_APPS: { id: UpiApp; label: string; emoji: string; color: string }[] =
  [
    { id: "gpay", label: "Google Pay", emoji: "G", color: "#4285F4" },
    { id: "phonepe", label: "PhonePe", emoji: "P", color: "#5F259F" },
    { id: "paytm", label: "Paytm", emoji: "₹", color: "#00BAF2" },
    { id: "other", label: "Other UPI", emoji: "@", color: "#6B7280" },
  ];

const BANKS = [
  "SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Bank", "PNB",
];

export default function CheckoutScreen() {
  const params = useLocalSearchParams<{
    restaurantId: string;
    restaurantName: string;
    packageId: string;
    slot: string;
    days: string;
    pricePerDay: string;
    totalPrice: string;
    mealName: string;
  }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { subscribe } = useApp();

  const [payMethod, setPayMethod] = useState<PayMethod>("upi");
  const [upiApp, setUpiApp] = useState<UpiApp>("gpay");
  const [upiId, setUpiId] = useState("");
  const [selectedBank, setSelectedBank] = useState(BANKS[0]);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const slot = params.slot as "lunch" | "dinner" | "both";
  const days = Number(params.days);
  const pricePerDay = Number(params.pricePerDay);
  const totalPrice = Number(params.totalPrice);

  const slotLabel =
    slot === "both"
      ? "Lunch + Dinner"
      : slot === "lunch"
        ? "Lunch"
        : "Dinner";

  async function handlePay() {
    if (!agreedToTerms || isProcessing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);

    await new Promise((r) => setTimeout(r, 1600));

    try {
      await subscribe({
        restaurantId: params.restaurantId,
        packageId: params.packageId,
      });

      const hasPermission = await requestNotificationPermissions();
      if (hasPermission) {
        await notifyPaymentSuccess(params.restaurantName, slot, days);
      }

      router.replace({
        pathname: "/payment-success",
        params: {
          restaurantName: params.restaurantName,
          slot,
          days: params.days,
          totalPaid: params.totalPrice,
        },
      });
    } catch {
      setIsProcessing(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 120,
        }}
      >
        <View style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.orderCardTitle, { color: colors.foreground }]}>
            Order Summary
          </Text>
          <View style={styles.orderRow}>
            <View style={[styles.restIcon, { backgroundColor: "#EFF6FF" }]}>
              <Feather name="coffee" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.restName, { color: colors.foreground }]}>
                {params.restaurantName}
              </Text>
              <Text style={[styles.restMeta, { color: colors.mutedForeground }]}>
                {slotLabel} · {days} days
              </Text>
            </View>
            <View style={[
              styles.slotBadge,
              {
                backgroundColor:
                  slot === "both"
                    ? "#F0FDF4"
                    : slot === "lunch"
                      ? "#EFF6FF"
                      : "#F5F3FF",
              },
            ]}>
              <Text style={[
                styles.slotBadgeText,
                {
                  color:
                    slot === "both"
                      ? "#15803D"
                      : slot === "lunch"
                        ? "#1D4ED8"
                        : "#6D28D9",
                },
              ]}>
                {slot === "both" ? "🍽️ Both" : slot === "lunch" ? "☀️ Lunch" : "🌙 Dinner"}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>
                Rate
              </Text>
              <Text style={[styles.priceValue, { color: colors.foreground }]}>
                ₹{pricePerDay}/day {slot === "both" ? "(both meals)" : ""}
              </Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: colors.mutedForeground }]}>
                Duration
              </Text>
              <Text style={[styles.priceValue, { color: colors.foreground }]}>
                {days} days
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 8 }]} />
            <View style={styles.priceRow}>
              <Text style={[styles.totalLabel, { color: colors.foreground }]}>
                Total
              </Text>
              <Text style={[styles.totalValue, { color: colors.primary }]}>
                ₹{totalPrice.toLocaleString("en-IN")}
              </Text>
            </View>
            <View style={[styles.gstNote, { backgroundColor: colors.muted }]}>
              <Feather name="file-text" size={11} color={colors.mutedForeground} />
              <Text style={[styles.gstNoteText, { color: colors.mutedForeground }]}>
                Price inclusive of all applicable GST. A tax invoice will be available in your order history.
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Payment method
        </Text>

        <View style={[styles.methodTabs, { backgroundColor: colors.muted }]}>
          {(["upi", "card", "netbanking"] as PayMethod[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => { Haptics.selectionAsync(); setPayMethod(m); }}
              style={[
                styles.methodTab,
                payMethod === m && {
                  backgroundColor: colors.card,
                  shadowColor: "#000",
                  shadowOpacity: 0.06,
                  shadowRadius: 4,
                  elevation: 2,
                },
              ]}
            >
              <Text style={[
                styles.methodTabText,
                {
                  color: payMethod === m ? colors.foreground : colors.mutedForeground,
                  fontFamily: payMethod === m ? "Inter_600SemiBold" : "Inter_400Regular",
                },
              ]}>
                {m === "upi" ? "UPI" : m === "card" ? "Card" : "Net Banking"}
              </Text>
            </Pressable>
          ))}
        </View>

        {payMethod === "upi" && (
          <View style={[styles.payPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.panelLabel, { color: colors.foreground }]}>
              Pay with UPI app
            </Text>
            <View style={styles.upiGrid}>
              {UPI_APPS.map((app) => (
                <Pressable
                  key={app.id}
                  onPress={() => { Haptics.selectionAsync(); setUpiApp(app.id); }}
                  style={[
                    styles.upiAppCard,
                    { borderColor: upiApp === app.id ? app.color : colors.border },
                    upiApp === app.id && { backgroundColor: app.color + "10" },
                  ]}
                >
                  <View style={[styles.upiAppIcon, { backgroundColor: app.color }]}>
                    <Text style={styles.upiAppEmoji}>{app.emoji}</Text>
                  </View>
                  <Text style={[
                    styles.upiAppLabel,
                    { color: upiApp === app.id ? app.color : colors.mutedForeground },
                  ]}>
                    {app.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {upiApp === "other" && (
              <View style={[styles.upiInputWrap, { borderColor: colors.border }]}>
                <Feather name="at-sign" size={16} color={colors.mutedForeground} />
                <TextInput
                  value={upiId}
                  onChangeText={setUpiId}
                  placeholder="yourname@upi"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  style={[styles.upiInput, { color: colors.foreground }]}
                />
              </View>
            )}
            <View style={[styles.upiNote, { backgroundColor: "#EFF6FF" }]}>
              <Feather name="info" size={12} color={colors.primary} />
              <Text style={[styles.upiNoteText, { color: colors.primary }]}>
                Demo mode — no real transaction will occur
              </Text>
            </View>
          </View>
        )}

        {payMethod === "card" && (
          <View style={[styles.payPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.demoCard, { backgroundColor: colors.primary }]}>
              <Text style={styles.demoCardChip}>▉▉</Text>
              <Text style={styles.demoCardNumber}>•••• •••• •••• 4242</Text>
              <View style={styles.demoCardFooter}>
                <Text style={styles.demoCardName}>STUDENT USER</Text>
                <Text style={styles.demoCardExpiry}>12/27</Text>
              </View>
              <Text style={styles.demoCardNetwork}>VISA</Text>
            </View>
            <View style={[styles.upiNote, { backgroundColor: "#EFF6FF", marginTop: 12 }]}>
              <Feather name="lock" size={12} color={colors.primary} />
              <Text style={[styles.upiNoteText, { color: colors.primary }]}>
                Demo card — no real charge. Secured with 256-bit encryption.
              </Text>
            </View>
          </View>
        )}

        {payMethod === "netbanking" && (
          <View style={[styles.payPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.panelLabel, { color: colors.foreground }]}>
              Select your bank
            </Text>
            <View style={styles.bankGrid}>
              {BANKS.map((bank) => (
                <Pressable
                  key={bank}
                  onPress={() => { Haptics.selectionAsync(); setSelectedBank(bank); }}
                  style={[
                    styles.bankCard,
                    { borderColor: selectedBank === bank ? colors.primary : colors.border },
                    selectedBank === bank && { backgroundColor: "#EFF6FF" },
                  ]}
                >
                  <Feather
                    name="home"
                    size={14}
                    color={selectedBank === bank ? colors.primary : colors.mutedForeground}
                  />
                  <Text style={[
                    styles.bankLabel,
                    { color: selectedBank === bank ? colors.primary : colors.foreground },
                  ]}>
                    {bank}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <Pressable
          onPress={() => { Haptics.selectionAsync(); setAgreedToTerms((v) => !v); }}
          style={styles.termsRow}
        >
          <View style={[
            styles.checkbox,
            { borderColor: agreedToTerms ? colors.primary : colors.border },
            agreedToTerms && { backgroundColor: colors.primary },
          ]}>
            {agreedToTerms && <Feather name="check" size={11} color="#FFF" />}
          </View>
          <Text style={[styles.termsText, { color: colors.mutedForeground }]}>
            I agree to the{" "}
            <Text style={{ color: colors.primary }}>Terms & Conditions</Text>
            {" "}and the tiered cancellation policy for meal subscriptions.
          </Text>
        </Pressable>
      </ScrollView>

      <View style={[
        styles.footer,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 0) + 8,
        },
      ]}>
        <View style={styles.footerInfo}>
          <Text style={[styles.footerLabel, { color: colors.mutedForeground }]}>
            You pay
          </Text>
          <Text style={[styles.footerTotal, { color: colors.foreground }]}>
            ₹{totalPrice.toLocaleString("en-IN")}
          </Text>
        </View>
        <Pressable
          onPress={handlePay}
          disabled={!agreedToTerms || isProcessing}
          style={({ pressed }) => [
            styles.payBtn,
            { backgroundColor: colors.primary },
            pressed && { opacity: 0.9 },
            (!agreedToTerms || isProcessing) && { opacity: 0.5 },
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.payBtnText}>
              Confirm & Pay ₹{totalPrice.toLocaleString("en-IN")}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  orderCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 20 },
  orderCardTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  orderRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  restIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  restName: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 2 },
  restMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  slotBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  slotBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  divider: { height: 1 },
  priceBreakdown: { marginTop: 12 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  priceLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  priceValue: { fontSize: 13, fontFamily: "Inter_500Medium" },
  totalLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  totalValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  gstNote: { flexDirection: "row", alignItems: "flex-start", gap: 6, borderRadius: 8, padding: 8, marginTop: 8 },
  gstNoteText: { flex: 1, fontSize: 10, fontFamily: "Inter_400Regular", lineHeight: 14 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 10 },
  methodTabs: { flexDirection: "row", borderRadius: 12, padding: 3, marginBottom: 14 },
  methodTab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  methodTabText: { fontSize: 13 },
  payPanel: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  panelLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  upiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  upiAppCard: { width: "47%", flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderRadius: 12, padding: 10 },
  upiAppIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  upiAppEmoji: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFF" },
  upiAppLabel: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  upiInputWrap: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 4, marginBottom: 10 },
  upiInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  upiNote: { flexDirection: "row", alignItems: "center", gap: 6, padding: 8, borderRadius: 8 },
  upiNoteText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  demoCard: { borderRadius: 14, padding: 20, marginBottom: 4, height: 140, justifyContent: "space-between" },
  demoCardChip: { fontSize: 18, color: "#FFD700" },
  demoCardNumber: { fontSize: 16, fontFamily: "Inter_500Medium", color: "#FFF", letterSpacing: 2 },
  demoCardFooter: { flexDirection: "row", justifyContent: "space-between" },
  demoCardName: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.8)", letterSpacing: 1 },
  demoCardExpiry: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  demoCardNetwork: { position: "absolute", top: 20, right: 20, fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFF", fontStyle: "italic" },
  bankGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  bankCard: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  bankLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1 },
  termsText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  footer: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  footerInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  footerTotal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  payBtn: { height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  payBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
});
