import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sendOtp, verifyOtp, saveToken } from "@/services/api";

type Step = "phone" | "otp";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef<Array<TextInput | null>>([null, null, null, null, null, null]);

  async function handleSendOtp() {
    if (phone.length < 10) return;
    setLoading(true);
    try {
      await sendOtp(phone);
      setStep("otp");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(text: string, index: number) {
    const digits = text.replace(/[^0-9]/g, "").slice(0, 1);
    const newOtp = [...otp];
    newOtp[index] = digits;
    setOtp(newOtp);
    if (digits && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyPress(key: string, index: number) {
    if (key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerifyOtp() {
    const code = otp.join("");
    if (code.length < 6) return;
    setLoading(true);
    try {
      const result = await verifyOtp(phone, code);
      await saveToken(result.token);
      router.replace("/campus-select");
    } catch (err) {
      Alert.alert("Invalid OTP", err instanceof Error ? err.message : "Please try again");
    } finally {
      setLoading(false);
    }
  }

  const phoneValid = phone.replace(/\s/g, "").length === 10;
  const otpComplete = otp.every((d) => d !== "");

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient
        colors={["#3B82F6", "#2563EB"]}
        style={[
          styles.topDecor,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) },
        ]}
      >
        <Text style={styles.logo}>MealPass</Text>
        <Text style={styles.tagline}>Meals sorted for student life</Text>
      </LinearGradient>

      <View
        style={[
          styles.card,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24 },
        ]}
      >
        {step === "phone" ? (
          <>
            <Text style={styles.title}>Sign in</Text>
            <Text style={styles.subtitle}>
              Enter your phone number to continue
            </Text>

            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="98765 43210"
                placeholderTextColor="#A1A1AA"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={10}
                autoFocus
              />
            </View>

            <Pressable
              onPress={handleSendOtp}
              disabled={!phoneValid || loading}
              style={({ pressed }) => [
                styles.primaryBtn,
                (!phoneValid || loading) && styles.btnDisabled,
                pressed && !loading && { opacity: 0.85 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Send OTP</Text>
              )}
            </Pressable>

            <Text style={styles.hint}>
              Dev mode: use OTP 123456
            </Text>

            <Text style={styles.terms}>
              By signing in, you agree to our Terms of Service and Privacy
              Policy.
            </Text>
          </>
        ) : (
          <>
            <Pressable onPress={() => setStep("phone")} style={styles.backLink}>
              <Text style={styles.backLinkText}>← Change number</Text>
            </Pressable>
            <Text style={styles.title}>Enter OTP</Text>
            <Text style={styles.subtitle}>
              Sent to +91 {phone}
            </Text>

            <View style={styles.otpRow}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(ref) => { otpRefs.current[i] = ref; }}
                  style={[styles.otpBox, digit && styles.otpBoxFilled]}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text, i)}
                  onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  autoFocus={i === 0}
                />
              ))}
            </View>

            <Text style={styles.hint}>
              Dev mode: use 123456
            </Text>

            <Pressable
              onPress={handleVerifyOtp}
              disabled={!otpComplete || loading}
              style={({ pressed }) => [
                styles.primaryBtn,
                (!otpComplete || loading) && styles.btnDisabled,
                pressed && !loading && { opacity: 0.85 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Verify & Continue</Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F4FF" },
  topDecor: { paddingHorizontal: 28, paddingBottom: 32 },
  logo: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFFFFF", marginTop: 48, marginBottom: 4 },
  tagline: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  card: { flex: 1, backgroundColor: "#F0F4FF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 28, marginTop: -20 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#1A1A1A", marginBottom: 6 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", color: "#71717A", marginBottom: 28 },
  phoneRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  countryCode: { height: 52, paddingHorizontal: 14, backgroundColor: "#F4F4F5", borderRadius: 12, borderWidth: 1, borderColor: "#E4E4E7", alignItems: "center", justifyContent: "center" },
  countryText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#1A1A1A" },
  phoneInput: { flex: 1, height: 52, backgroundColor: "#F4F4F5", borderRadius: 12, borderWidth: 1, borderColor: "#E4E4E7", paddingHorizontal: 16, fontSize: 16, fontFamily: "Inter_500Medium", color: "#1A1A1A" },
  otpRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  otpBox: { flex: 1, height: 56, backgroundColor: "#F4F4F5", borderRadius: 12, borderWidth: 2, borderColor: "#E4E4E7", fontSize: 22, fontFamily: "Inter_700Bold", color: "#1A1A1A" },
  otpBoxFilled: { borderColor: "#3B82F6", backgroundColor: "#EFF6FF" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#A1A1AA", textAlign: "center", marginBottom: 16 },
  primaryBtn: { height: 56, backgroundColor: "#3B82F6", borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  btnDisabled: { backgroundColor: "#D4D4D8" },
  primaryBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  terms: { fontSize: 12, fontFamily: "Inter_400Regular", color: "#A1A1AA", textAlign: "center", lineHeight: 18 },
  backLink: { marginBottom: 12 },
  backLinkText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#3B82F6" },
});
