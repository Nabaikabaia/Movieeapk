import React, { useEffect, useRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { useUserPreferences } from '@/lib/UserPreferences';

const LOGO = require('../assets/images/icon.png');

function LoadingBubble({ delay }: { delay: number }) {
  const colors = useColors();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withDelay(
        delay,
        withSequence(
          withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 480, easing: Easing.inOut(Easing.cubic) }),
        ),
      ),
      -1,
      false,
    );
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.34 + progress.value * 0.66,
    transform: [{ translateY: -progress.value * 6 }, { scale: 0.78 + progress.value * 0.22 }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 8,
          height: 8,
          borderRadius: 5,
          backgroundColor: colors.foreground,
        },
        animatedStyle,
      ]}
    />
  );
}

export default function LaunchScreen() {
  const colors = useColors();
  const { preferences, isReady } = useUserPreferences();
  const mountedAt = useRef(Date.now());
  const didNavigate = useRef(false);

  useEffect(() => {
    if (!isReady || didNavigate.current) return undefined;
    const remaining = Math.max(0, 4000 - (Date.now() - mountedAt.current));
    const timer = setTimeout(() => {
      didNavigate.current = true;
      router.replace(preferences.onboardingComplete ? '/(tabs)' : '/onboarding');
    }, remaining);
    return () => clearTimeout(timer);
  }, [isReady, preferences.onboardingComplete]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
      <View pointerEvents="none" style={{ position: 'absolute', width: 290, height: 290, borderRadius: 150, backgroundColor: 'rgba(228,17,17,.12)' }} />
      <View style={{ alignItems: 'center', marginTop: -22 }}>
        <Image source={LOGO} resizeMode="contain" style={{ width: 86, height: 86, borderRadius: 26, marginBottom: 21 }} />
        <Text style={{ color: colors.foreground, fontFamily: 'Outfit_800ExtraBold', fontSize: 27, letterSpacing: -0.3 }}>
          Nabees Moviehub
        </Text>
        <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_400Regular', fontSize: 12, marginTop: 7, letterSpacing: 0.25 }}>
          Explore curated movies and series just for you
        </Text>
      </View>
      <View style={{ position: 'absolute', bottom: 54, alignItems: 'center', gap: 12 }}>
        <View accessibilityLabel="Loading" accessibilityRole="progressbar" style={{ flexDirection: 'row', alignItems: 'center', gap: 9, height: 18 }}>
          <LoadingBubble delay={0} />
          <LoadingBubble delay={160} />
          <LoadingBubble delay={320} />
        </View>
      </View>
    </View>
  );
}
