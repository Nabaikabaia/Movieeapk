import React, { useEffect } from 'react';
import { dehydrate, hydrate, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/outfit';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { DownloadsProvider } from '@/lib/Downloads';
import { FavoritesProvider } from '@/lib/Favorites';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const OFFLINE_CACHE_KEY = 'moviehub-offline-content-v1';
const OFFLINE_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const OFFLINE_QUERY_PREFIXES = ['moviehub', 'details', 'recommendations', 'category', 'genre', 'search-results'];
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: OFFLINE_CACHE_MAX_AGE,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, headerBackTitle: 'Back', animation: 'slide_from_right', animationDuration: 340, gestureEnabled: true, contentStyle: { backgroundColor: '#0A0A0A' } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Inter_600SemiBold: Outfit_600SemiBold,
    Inter_700Bold: Outfit_700Bold,
  });
  const [offlineCacheReady, setOfflineCacheReady] = React.useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(OFFLINE_CACHE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (Date.now() - Number(saved.savedAt || 0) < OFFLINE_CACHE_MAX_AGE && saved.state) {
            hydrate(queryClient, saved.state);
          } else {
            await AsyncStorage.removeItem(OFFLINE_CACHE_KEY);
          }
        }
      } catch {
        await AsyncStorage.removeItem(OFFLINE_CACHE_KEY).catch(() => undefined);
      } finally {
        if (!cancelled) setOfflineCacheReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!offlineCacheReady) return undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const allQueries = dehydrate(queryClient, {
          shouldDehydrateQuery: (query) =>
            query.state.status === 'success'
            && OFFLINE_QUERY_PREFIXES.includes(String(query.queryKey[0])),
        });
        const queries = [...allQueries.queries]
          .sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt)
          .slice(0, 48);
        void AsyncStorage.setItem(
          OFFLINE_CACHE_KEY,
          JSON.stringify({ savedAt: Date.now(), state: { ...allQueries, queries } }),
        ).catch(() => undefined);
      }, 700);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, [offlineCacheReady]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && offlineCacheReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, offlineCacheReady]);

  if ((!fontsLoaded && !fontError) || !offlineCacheReady) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <FavoritesProvider><DownloadsProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider><RootLayoutNav /></KeyboardProvider>
            </GestureHandlerRootView>
          </DownloadsProvider></FavoritesProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
