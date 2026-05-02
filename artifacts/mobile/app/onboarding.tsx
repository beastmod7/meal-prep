import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    id: "1",
    emoji: "😤",
    headline: "Daily food ordering\nis exhausting.",
    body: "No more deciding, paying, and tracking every single meal. There's a better way.",
    bg: ["#1A1A1A", "#2D2D2D"] as [string, string],
  },
  {
    id: "2",
    emoji: "🎫",
    headline: "Buy meals once.\nEat flexibly.",
    body: "Get meal credits and use them across partner restaurants near your campus.",
    bg: ["#F97316", "#EA580C"] as [string, string],
  },
  {
    id: "3",
    emoji: "✅",
    headline: "Cancel tomorrow's\nmeal by tonight.",
    body: "Cancel before 10 PM the previous day for free. Your meal credit stays safe — always.",
    bg: ["#166534", "#15803D"] as [string, string],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleNext() {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1 });
      setActiveIndex(activeIndex + 1);
    } else {
      router.replace("/login");
    }
  }

  function handleSkip() {
    router.replace("/login");
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LinearGradient
            colors={item.bg}
            style={[styles.slide, { width }]}
          >
            <View
              style={[
                styles.slideContent,
                {
                  paddingTop: insets.top + (Platform.OS === "web" ? 67 : 40),
                  paddingBottom: insets.bottom + 160,
                },
              ]}
            >
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text style={styles.headline}>{item.headline}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          </LinearGradient>
        )}
      />

      <View
        style={[
          styles.footer,
          {
            paddingBottom:
              insets.bottom + (Platform.OS === "web" ? 34 : 0) + 24,
          },
        ]}
      >
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.nextBtn,
            { backgroundColor: SLIDES[activeIndex].bg[0] },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.nextBtnText}>
            {activeIndex === SLIDES.length - 1 ? "Get Started" : "Next"}
          </Text>
        </Pressable>

        {activeIndex < SLIDES.length - 1 && (
          <Pressable
            onPress={handleSkip}
            style={({ pressed }) => [
              styles.skipBtn,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A1A",
  },
  slide: {
    flex: 1,
    justifyContent: "center",
  },
  slideContent: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: "center",
  },
  emoji: {
    fontSize: 64,
    marginBottom: 28,
  },
  headline: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    lineHeight: 40,
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    lineHeight: 24,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    backgroundColor: "transparent",
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dotActive: {
    width: 20,
    backgroundColor: "#FFFFFF",
  },
  nextBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  nextBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  skipBtn: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  skipText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.5)",
  },
});
