import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

const tabItems = [
  { route: 'index', label: 'Home', icon: 'home-outline' },
  { route: 'discover', label: 'Explore', icon: 'compass-outline' },
  { route: 'sports', label: 'Sports', icon: 'trophy-outline' },
  { route: 'iptv', label: 'IPTV', icon: 'globe-outline' },
  { route: 'pluto', label: 'Pluto', icon: 'planet-outline' },
  { route: 'downloads', label: 'Downloads', icon: 'download-outline' },
] as const;

function FloatingTabItem({
  route,
  routeKey,
  label,
  icon,
  focused,
  navigation,
}: {
  route: string;
  routeKey: string;
  label: string;
  icon: string;
  focused: boolean;
  navigation: any;
}) {
  const colors = useColors();
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
    const event = navigation.emit({ type: 'tabPress', target: routeKey, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(route as never);
  };

  return (
    <Pressable
      onPress={press}
      onLongPress={() => navigation.emit({ type: 'tabLongPress', target: routeKey })}
      accessibilityRole="tab"
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

  if (!tabItems.some((item) => item.route === currentRoute)) return null;

  return (
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
          if (!route) return null;
          return (
            <FloatingTabItem
              key={route.key}
              route={route.name}
              routeKey={route.key}
              label={item.label}
              icon={item.icon}
              focused={state.index === routeIndex}
              navigation={navigation}
            />
          );
        })}
      </View>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,.16)' }} />
    </View>
  );
}

export default function TabLayout() {
  const colors = useColors();
  return (
    <Tabs
      tabBar={(props) => <FloatingGlassBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.background, borderTopWidth: 0 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="discover" options={{ title: 'Explore' }} />
      <Tabs.Screen name="sports" options={{ title: 'Sports' }} />
      <Tabs.Screen name="iptv" options={{ title: 'IPTV' }} />
      <Tabs.Screen name="pluto" options={{ title: 'Pluto TV' }} />
      <Tabs.Screen name="downloads" options={{ title: 'Downloads' }} />
      <Tabs.Screen name="library" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
    </Tabs>
  );
}
