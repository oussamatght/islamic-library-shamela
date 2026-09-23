import React, { useEffect } from 'react';
import { I18nManager, Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary as AppErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import Constants from 'expo-constants';
import { setBaseUrl } from '@workspace/api-client-react';

// Prevent the splash screen from auto-hiding before asset loading is complete.
void SplashScreen.preventAutoHideAsync();

function resolveApiBaseUrl(): string | null {
  const configuredDomain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (configuredDomain) {
    return /^https?:\/\//i.test(configuredDomain)
      ? configuredDomain
      : `https://${configuredDomain}`;
  }
  const host = Constants.expoConfig?.hostUri?.replace(/:\d+$/, '');
  if (__DEV__ && host) {
    const apiPort = process.env.EXPO_PUBLIC_API_PORT?.trim() || '3000';
    return `http://${host}:${apiPort}`;
  }
  if (__DEV__) {
    console.warn(
      '[api-client] EXPO_PUBLIC_DOMAIN is not set and the Expo dev host could not be resolved. Set EXPO_PUBLIC_API_PORT or EXPO_PUBLIC_DOMAIN.',
    );
  }
  return null;
}

setBaseUrl(resolveApiBaseUrl());
I18nManager.allowRTL(true);
if (Platform.OS !== 'web') {
  I18nManager.forceRTL(true);
}

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'رجوع', headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="quran-reader" options={{ animation: 'slide_from_left' }} />
      <Stack.Screen name="adhkar-counter" options={{ animation: 'slide_from_left' }} />
      <Stack.Screen name="prayer" options={{ animation: 'slide_from_left' }} />
      <Stack.Screen name="qibla" options={{ animation: 'slide_from_left' }} />
      <Stack.Screen name="settings" options={{ animation: 'slide_from_left' }} />
      <Stack.Screen name="favorites" options={{ animation: 'slide_from_left' }} />
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
      <AppErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}

export { RouteErrorBoundary as ErrorBoundary } from '@/components/RouteErrorBoundary';
