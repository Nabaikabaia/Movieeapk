import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import MoreQuickPanel from '@/components/MoreQuickPanel';

const tabItems = [
  { route: 'index', href: '/', label: 'Home', icon: 'home-outline' },
  { route: 'discover', href: '/(tabs)/discover', label: 'Explore', icon: 'compass-outline' },
  { route: 'sports', href: '/(tabs)/sports', label: 'Sports', icon: 'trophy-outline' },
  { route: 'more', href: '', label: 'More', icon: 'ellipsis-horizontal-circle-outline' },
  { route: 'me', href: '/(tabs)/me', label: 'Me', icon: 'person-circle-outline' },
] as const;

function FloatingTabItem({
  route,
  href,
  routeKey,
  label,
  icon,
  focused,
  navigation,
  onSpecialPress,
  beforeNavigate,
}: {
  route: string;
  href: string;
  routeKey: string;
  label: string;
  icon: string;
  focused: boolean;
  navigation: any;
  onSpecialPress?: () => void;
  beforeNavigate?: () => void;
}) {
  const colors = useColors();
  const router = useRouter();
  const selection = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    selection.value = withSpring(focused ? 1 : 0, { damping: 16, stiffness: 210 });
  }, [focused, selection]);

  const motion = useAnimatedStyle(() => ({
    transform: [{ scale: 0.92 + selection.value * 0.08 }],
  }));
  const iconMotion = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - selection.value) * 1.5 }],
  }));

  const press = () => {
    if (onSpecialPress) {
      onSpecialPress();
      return;
    }
    beforeNavigate?.();
    if (focused) return;
    const event = navigation?.emit?.({ type: 'tabPress', target: routeKey, canPreventDefault: true });
    if (event?.defaultPrevented) return;
    if (typeof navigation?.navigate === 'function') navigation.navigate(route as never);
    else router.navigate(href as never);
  };

  return (
    <Pressable
      onPress={press}
      onLongPress={() => navigation?.emit?.({ type: 'tabLongPress', target: routeKey })}
      accessibilityRole={onSpecialPress ? 'button' : 'tab'}
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={{ flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' }}
      testID={`tab-${route}`}
    >
      <Animated.View
        style={[
          motion,
          {
            width: '100%',
            minHeight: 54,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            backgroundColor: focused ? 'rgba(228,17,17,.16)' : 'transparent',
          },
        ]}
      >
        <Animated.View style={iconMotion}>
          <Ionicons
            name={icon as any}
            size={20}
            color={focused ? colors.primary : 'rgba(255,255,255,.64)'}
          />
        </Animated.View>
        <Text
          numberOfLines={1}
          style={{
            maxWidth: '100%',
            color: focused ? colors.foreground : 'rgba(255,255,255,.62)',
            fontFamily: focused ? 'Outfit_600SemiBold' : 'Outfit_500Medium',
            fontSize: 9.5,
          }}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function FloatingGlassBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const currentRoute = state.routes[state.index]?.name;
  const colors = useColors();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const selectedTab = ['index', 'discover', 'sports', 'me'].includes(currentRoute)
    ? currentRoute
    : 'more';

  const openDestination = (destination: 'downloads' | 'search' | 'iptv' | 'pluto' | 'library') => {
    setMoreOpen(false);
    router.push(`/(tabs)/${destination}` as any);
  };

  return (
    <>
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: Math.max(8, insets.bottom),
          height: 69,
          borderRadius: 29,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,.15)',
          backgroundColor: 'rgba(11,11,13,.72)',
          shadowColor: '#000',
          shadowOpacity: 0.32,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 10 },
          elevation: 18,
        }}
      >
        <BlurView intensity={56} tint="dark" style={StyleSheet.absoluteFill} />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(11,11,13,.53)', borderRadius: 29 },
          ]}
        />
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5 }}>
          {tabItems.map((item) => {
            const routeIndex = state.routes.findIndex((route: any) => route.name === item.route);
            const route = state.routes[routeIndex];
            if (!route && item.route !== 'more') return null;
            return (
              <FloatingTabItem
                key={route?.key || item.route}
                route={item.route}
                href={item.href}
                routeKey={route?.key || item.route}
                label={item.label}
                icon={item.icon}
                focused={item.route === 'more' ? moreOpen || selectedTab === 'more' : selectedTab === item.route}
                navigation={navigation}
                onSpecialPress={item.route === 'more' ? () => setMoreOpen((open) => !open) : undefined}
                beforeNavigate={() => setMoreOpen(false)}
              />
            );
          })}
        </View>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,.16)' }} />
      </View>
      <MoreQuickPanel
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
        onNavigate={openDestination}
      />
    </>
  );
}

export default function TabLayout() {
  const colors = useColors();
  return (
    <Tabs
      tabBar={(props) => <FloatingGlassBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarStyle: { backgroundColor: colors.background, borderTopWidth: 0 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="discover" options={{ title: 'Explore' }} />
      <Tabs.Screen name="sports" options={{ title: 'Sports' }} />
      <Tabs.Screen name="downloads" options={{ href: null }} />
      <Tabs.Screen name="me" options={{ title: 'Me' }} />
      <Tabs.Screen name="iptv" options={{ href: null }} />
      <Tabs.Screen name="pluto" options={{ href: null }} />
      <Tabs.Screen name="library" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
    </Tabs>
  );
}
