import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
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
const LAUNCH_SCENES = [
  require('../assets/images/family-cinema.jpg'),
  require('../assets/images/sports-legends.jpg'),
  require('../assets/images/live-news.jpg'),
  require('../assets/images/nature-documentary.jpg'),
];

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
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { flexDirection: 'row', flexWrap: 'wrap' }]}>
        {LAUNCH_SCENES.map((scene, index) => (
          <View key={index} style={{ width: '50%', height: '50%', overflow: 'hidden' }}>
            <Image source={scene} contentFit="cover" transition={0} style={{ width: '100%', height: '100%' }} />
          </View>
        ))}
      </View>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(7,9,13,.48)', 'rgba(7,9,13,.65)', 'rgba(7,9,13,.91)']}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />
      <BlurView intensity={19} tint="dark" style={{ position: 'absolute', width: '88%', maxWidth: 380, minHeight: 288, borderRadius: 38, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,.15)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 26 }}>
        <View pointerEvents="none" style={{ position: 'absolute', top: -100, width: 250, height: 250, borderRadius: 130, backgroundColor: `${colors.primary}20` }} />
        <View style={{ alignItems: 'center', marginTop: -2 }}>
          <Image source={LOGO} contentFit="contain" transition={0} style={{ width: 86, height: 86, borderRadius: 26, marginBottom: 21 }} />
          <Text style={{ color: colors.foreground, fontFamily: 'Outfit_800ExtraBold', fontSize: 27, letterSpacing: -0.3, textAlign: 'center' }}>
            Nabees Moviehub
          </Text>
          <Text style={{ color: 'rgba(255,255,255,.78)', fontFamily: 'Outfit_400Regular', fontSize: 12, marginTop: 7, letterSpacing: 0.25, textAlign: 'center' }}>
            Explore curated movies and series just for you
          </Text>
        </View>
      </BlurView>
      <View style={{ position: 'absolute', bottom: 54, alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingVertical: 15, borderRadius: 24, overflow: 'hidden' }}>
        <BlurView intensity={16} tint="dark" style={{ ...StyleSheet.absoluteFill, borderRadius: 24 }} />
        <View accessibilityLabel="Loading" accessibilityRole="progressbar" style={{ flexDirection: 'row', alignItems: 'center', gap: 9, height: 18 }}>
          <LoadingBubble delay={0} />
          <LoadingBubble delay={160} />
          <LoadingBubble delay={320} />
        </View>
      </View>
    </View>
  );
}
