import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider, useApp } from "@/context/AppContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function NavigationController() {
  const { isOnboarded, isLoading } = useApp();
  const router = useRouter();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!isLoading && !initialized) {
      setInitialized(true);
      if (!isOnboarded) {
        router.replace("/onboarding");
      }
    }
  }, [isLoading, isOnboarded, initialized]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="campus-select" />
      <Stack.Screen
        name="restaurant/[id]"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: "Back",
          headerTransparent: true,
        }}
      />
      <Stack.Screen
        name="meal/[id]"
        options={{
          headerShown: true,
          headerTitle: "",
          headerBackTitle: "Back",
          headerTransparent: true,
        }}
      />
      <Stack.Screen
        name="schedule-meal"
        options={{
          presentation: "modal",
          headerShown: true,
          headerTitle: "Schedule Meal",
          headerBackTitle: "Cancel",
        }}
      />
      <Stack.Screen
        name="buy-pass"
        options={{
          headerShown: true,
          headerTitle: "Subscribe",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen name="payment-success" options={{ gestureEnabled: false }} />
      <Stack.Screen
        name="checkout"
        options={{
          headerShown: true,
          headerTitle: "Checkout",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="order-tracking/[id]"
        options={{
          headerShown: true,
          headerTitle: "Track Order",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="refund-request"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="free-meal"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ledger"
        options={{
          headerShown: true,
          headerTitle: "Credit Ledger",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="support"
        options={{
          headerShown: true,
          headerTitle: "Support",
          headerBackTitle: "Back",
        }}
      />
      <Stack.Screen
        name="pause-meals"
        options={{
          presentation: "modal",
          headerShown: true,
          headerTitle: "Pause Meals",
          headerBackTitle: "Cancel",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AppProvider>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <NavigationController />
            </GestureHandlerRootView>
          </QueryClientProvider>
        </AppProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
