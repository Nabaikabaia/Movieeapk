import React from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';

// IMPORTANT: iOS 26 uses NativeTabs for native tabs with liquid glass support.
// NativeTabs intentionally does NOT use custom design tokens — liquid glass
// is a system-level appearance provided by iOS and cannot be overridden.
// Custom brand colors are applied only on the ClassicTabLayout path (older iOS / Android / web).
function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
        />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="discover"><NativeTabs.Trigger.Icon sf={{ default: 'safari', selected: 'safari.fill' }} /><NativeTabs.Trigger.Label>Browse</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="live"><NativeTabs.Trigger.Icon sf={{ default: 'dot.radiowaves.left.and.right', selected: 'dot.radiowaves.left.and.right' }} /><NativeTabs.Trigger.Label>Live</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="downloads"><NativeTabs.Trigger.Icon sf={{ default: 'arrow.down.circle', selected: 'arrow.down.circle.fill' }} /><NativeTabs.Trigger.Label>Offline</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="library"><NativeTabs.Trigger.Icon sf={{ default: 'books.vertical', selected: 'books.vertical.fill' }} /><NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name="house" tintColor={color} size={24} />
            ) : (
              <Feather
                name="home"
                size={22}
                color={focused ? colors.primary : colors.mutedForeground}
              />
            ),
        }}
      />
      <Tabs.Screen name="discover" options={{ title: 'Browse', tabBarIcon: ({ color }) => <Feather name="compass" size={21} color={String(color)}/> }} />
      <Tabs.Screen name="live" options={{ title: 'Live TV', tabBarIcon: ({ color }) => <Feather name="radio" size={20} color={String(color)}/> }} />
      <Tabs.Screen name="downloads" options={{ title: 'Offline', tabBarIcon: ({ color }) => <Feather name="download" size={20} color={String(color)}/> }} />
      <Tabs.Screen name="library" options={{ title: 'Library', tabBarIcon: ({ color }) => <Feather name="bookmark" size={20} color={String(color)}/> }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="more" options={{ href: null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
