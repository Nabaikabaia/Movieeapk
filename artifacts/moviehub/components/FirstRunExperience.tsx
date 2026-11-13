import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GENRES } from '@/lib/catalog';
import { useColors } from '@/hooks/useColors';

type FirstRunExperienceProps = {
  selectedGenres: string[];
  onToggleGenre: (genre: string) => void;
  onFinish: () => void;
  onEnableDownloadAlerts: () => Promise<boolean>;
  downloadAlertsEnabled: boolean;
  requestingAlerts: boolean;
};

const INTRO_SCREENS = [
  {
    eyebrow: '01 / DISCOVER',
    title: 'Find your next\nfavourite.',
    description: 'Explore films and series picked for the nights you want to disappear into a story.',
    icon: 'film-outline' as const,
    detail: 'MOVIES  ·  SERIES  ·  NEW FINDS',
  },
  {
    eyebrow: '02 / LIVE SPORTS',
    title: 'Stay for\nthe replay.',
    description: 'Catch the live moment, then revisit the highlights when it suits you.',
    icon: 'trophy-outline' as const,
    detail: 'LIVE ACTION  ·  REPLAYS',
  },
  {
    eyebrow: '03 / CHANNELS',
    title: 'A little live\nin your lineup.',
    description: 'Browse live channels and find something worth settling in for.',
    icon: 'radio-outline' as const,
    detail: 'CHANNELS  ·  ALWAYS ON',
  },
];

const FLOW_LENGTH = INTRO_SCREENS.length + 2;

export default function FirstRunExperience({
  selectedGenres,
  onToggleGenre,
  onFinish,
  onEnableDownloadAlerts,
  downloadAlertsEnabled,
  requestingAlerts,
}: FirstRunExperienceProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [alertMessage, setAlertMessage] = useState('');
  const accentColor = step === 1 ? colors.accent : colors.primary;

  const isGenreStep = step === INTRO_SCREENS.length;
  const isPermissionStep = step === FLOW_LENGTH - 1;
  const intro = INTRO_SCREENS[step];
  const advance = () => setStep((current) => Math.min(current + 1, FLOW_LENGTH - 1));
  const goBack = () => setStep((current) => Math.max(current - 1, 0));

  const enableAlerts = async () => {
    setAlertMessage('');
    try {
      const enabled = await onEnableDownloadAlerts();
      setAlertMessage(
        enabled
          ? 'You’ll get an alert when a transfer is complete.'
          : 'No problem. You can turn alerts on later in Me.',
      );
    } catch {
      setAlertMessage('Alerts could not be enabled right now. You can try again later in Me.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={[`${colors.primary}2B`, `${colors.background}00`]}
        start={{ x: 0.04, y: 0 }}
        end={{ x: 0.86, y: 0.68 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 310 }}
        pointerEvents="none"
      />
      <View style={{ flex: 1, paddingTop: insets.top + 9, paddingBottom: Math.max(16, insets.bottom + 12), paddingHorizontal: 22 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 42 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: `${colors.primary}29`, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="play" size={14} color={colors.primary} />
            </View>
            <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 15, letterSpacing: 0.2 }}>Nabees <Text style={{ color: colors.primary }}>Moviehub</Text></Text>
          </View>
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_500Medium', fontSize: 11, letterSpacing: 1 }}>
            {String(step + 1).padStart(2, '0')} <Text style={{ color: colors.border }}>/</Text> {String(FLOW_LENGTH).padStart(2, '0')}
          </Text>
        </View>

        <View style={{ height: 3, flexDirection: 'row', gap: 5, marginTop: 12 }}>
          {Array.from({ length: FLOW_LENGTH }, (_, index) => (
            <View key={index} style={{ flex: 1, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.secondary }}>
              {index <= step ? <View style={{ flex: 1, backgroundColor: index === step ? colors.primary : `${colors.primary}8F` }} /> : null}
            </View>
          ))}
        </View>

        {intro ? (
          <Animated.View key={step} entering={FadeInDown.duration(340)} style={{ flex: 1, justifyContent: 'center', paddingBottom: 14 }}>
            <View style={{ height: 246, borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,.12)', marginBottom: 29 }}>
              <LinearGradient
                colors={['rgba(52,24,26,.96)', 'rgba(22,20,23,.97)', 'rgba(14,15,17,.98)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ flex: 1, padding: 22, justifyContent: 'space-between' }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: 'rgba(255,255,255,.68)', fontFamily: 'Outfit_600SemiBold', fontSize: 10, letterSpacing: 2 }}>{intro.eyebrow}</Text>
                  <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.08)', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={intro.icon} size={19} color={accentColor} />
                  </View>
                </View>

                <View style={{ position: 'absolute', right: -12, bottom: 15, width: 168, height: 168, borderRadius: 84, borderWidth: 1, borderColor: 'rgba(255,255,255,.08)', alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 126, height: 126, borderRadius: 63, borderWidth: 1, borderColor: 'rgba(255,255,255,.07)', alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 82, height: 82, borderRadius: 30, backgroundColor: `${accentColor}22`, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={intro.icon} size={38} color={accentColor} />
                    </View>
                  </View>
                </View>
                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,.12)', width: '47%' }} />
                <Text style={{ color: 'rgba(255,255,255,.62)', fontFamily: 'Outfit_600SemiBold', fontSize: 9, letterSpacing: 1.6 }}>{intro.detail}</Text>
                <BlurView intensity={16} tint="dark" style={{ position: 'absolute', bottom: 19, right: 18, width: 71, height: 48, borderRadius: 15, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderColor: 'rgba(255,255,255,.16)', borderWidth: 1 }}>
                  <Ionicons name={step === 1 ? 'play' : step === 2 ? 'radio' : 'sparkles-outline'} size={18} color={colors.foreground} />
                </BlurView>
              </LinearGradient>
            </View>

            <Text style={{ color: colors.primary, fontFamily: 'Outfit_600SemiBold', fontSize: 10, letterSpacing: 2.2, marginBottom: 10 }}>{intro.eyebrow}</Text>
            <Text style={{ color: colors.foreground, fontFamily: 'Outfit_800ExtraBold', fontSize: 35, lineHeight: 39, letterSpacing: -0.8 }}>{intro.title}</Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_400Regular', fontSize: 14, lineHeight: 21, marginTop: 12, maxWidth: 330 }}>{intro.description}</Text>
          </Animated.View>
        ) : isGenreStep ? (
          <Animated.View key="genres" entering={FadeInDown.duration(340)} style={{ flex: 1, paddingTop: 26 }}>
            <Text style={{ color: colors.primary, fontFamily: 'Outfit_600SemiBold', fontSize: 10, letterSpacing: 2.2 }}>MAKE IT YOURS</Text>
            <Text style={{ color: colors.foreground, fontFamily: 'Outfit_800ExtraBold', fontSize: 32, lineHeight: 37, marginTop: 10 }}>What are you{'\n'}in the mood for?</Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_400Regular', fontSize: 13, lineHeight: 19, marginTop: 10, marginBottom: 21 }}>Choose a few. Your picks shape what shows up on Home.</Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, paddingBottom: 12 }}
              style={{ flexGrow: 0 }}
            >
              {GENRES.map((genre) => {
                const selected = selectedGenres.includes(genre.slug);
                return (
                  <Pressable
                    key={genre.slug}
                    onPress={() => onToggleGenre(genre.slug)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${genre.label}${selected ? ', selected' : ''}`}
                    testID={`first-run-genre-${genre.slug}`}
                    style={({ pressed }) => ({
                      minHeight: 45,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 7,
                      paddingHorizontal: 14,
                      borderRadius: 17,
                      backgroundColor: selected ? `${colors.primary}26` : colors.card,
                      borderWidth: 1,
                      borderColor: selected ? colors.primary : colors.border,
                      opacity: pressed ? 0.78 : 1,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    })}
                  >
                    {selected ? <Ionicons name="checkmark" size={14} color={colors.primary} /> : null}
                    <Text style={{ color: selected ? colors.foreground : colors.mutedForeground, fontFamily: 'Outfit_600SemiBold', fontSize: 13 }}>{genre.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_400Regular', fontSize: 11, marginTop: 10 }}>{selectedGenres.length ? `${selectedGenres.length} selected` : 'You can change these any time in Me.'}</Text>
          </Animated.View>
        ) : (
          <Animated.View key="permission" entering={FadeInDown.duration(340)} style={{ flex: 1, justifyContent: 'center', paddingBottom: 12 }}>
            <View style={{ width: 68, height: 68, borderRadius: 23, backgroundColor: `${colors.primary}21`, borderWidth: 1, borderColor: `${colors.primary}40`, alignItems: 'center', justifyContent: 'center', marginBottom: 23 }}>
              <Ionicons name="download-outline" size={30} color={colors.primary} />
            </View>
            <Text style={{ color: colors.primary, fontFamily: 'Outfit_600SemiBold', fontSize: 10, letterSpacing: 2.2 }}>READY WHEN YOU ARE</Text>
            <Text style={{ color: colors.foreground, fontFamily: 'Outfit_800ExtraBold', fontSize: 31, lineHeight: 37, marginTop: 9 }}>Take it offline.</Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_400Regular', fontSize: 14, lineHeight: 21, marginTop: 10, marginBottom: 22 }}>
              On Android, background transfers keep running while Moviehub is in the background.
            </Text>
            <View style={{ borderRadius: 19, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,.11)' }}>
              <LinearGradient colors={['rgba(255,255,255,.075)', 'rgba(255,255,255,.025)']} style={{ padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: `${colors.primary}21`, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="notifications-outline" size={17} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 13 }}>Completion alerts are optional</Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_400Regular', fontSize: 11, lineHeight: 16, marginTop: 5 }}>
                    Notification permission only lets us tell you when a download finishes. It does not control whether transfers keep running.
                  </Text>
                </View>
              </LinearGradient>
            </View>
            {alertMessage ? <Text accessibilityLiveRegion="polite" style={{ color: downloadAlertsEnabled ? colors.primary : colors.mutedForeground, fontFamily: 'Outfit_500Medium', fontSize: 11, lineHeight: 16, marginTop: 12 }}>{alertMessage}</Text> : null}
          </Animated.View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12 }}>
          {step > 0 ? (
            <Pressable
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              testID="first-run-back"
              hitSlop={8}
              style={({ pressed }) => ({ width: 54, height: 54, borderRadius: 19, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.72 : 1 })}
            >
              <Ionicons name="arrow-back" size={20} color={colors.foreground} />
            </Pressable>
          ) : null}

          {isPermissionStep ? (
            <Pressable
              onPress={() => void enableAlerts()}
              disabled={requestingAlerts || downloadAlertsEnabled}
              accessibilityRole="button"
              accessibilityLabel={downloadAlertsEnabled ? 'Download alerts enabled' : requestingAlerts ? 'Requesting notification permission' : 'Enable download completion alerts'}
              testID="first-run-enable-alerts"
              style={({ pressed }) => ({ flex: 1, minHeight: 54, borderRadius: 19, borderWidth: 1, borderColor: downloadAlertsEnabled ? `${colors.primary}6B` : colors.border, backgroundColor: downloadAlertsEnabled ? `${colors.primary}21` : colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, opacity: pressed ? 0.76 : requestingAlerts ? 0.64 : 1 })}
            >
              <Ionicons name={downloadAlertsEnabled ? 'checkmark-circle-outline' : 'notifications-outline'} size={18} color={downloadAlertsEnabled ? colors.primary : colors.foreground} />
              <Text style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 13 }}>{downloadAlertsEnabled ? 'Alerts enabled' : requestingAlerts ? 'Requesting…' : 'Enable alerts'}</Text>
            </Pressable>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <Pressable
            onPress={isPermissionStep ? onFinish : advance}
            accessibilityRole="button"
            accessibilityLabel={isPermissionStep ? 'Finish setup' : 'Next'}
            testID={isPermissionStep ? 'first-run-finish' : 'first-run-next'}
            style={({ pressed }) => ({ minWidth: isPermissionStep ? 112 : 148, height: 54, paddingHorizontal: 19, borderRadius: 19, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, opacity: pressed ? 0.84 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}
          >
            <Text style={{ color: colors.primaryForeground, fontFamily: 'Outfit_700Bold', fontSize: 14 }}>{isPermissionStep ? 'Finish' : 'Next'}</Text>
            <Ionicons name={isPermissionStep ? 'checkmark' : 'arrow-forward'} size={17} color={colors.primaryForeground} />
          </Pressable>
        </View>
        {isPermissionStep ? (
          <Pressable
            onPress={onFinish}
            accessibilityRole="button"
            accessibilityLabel="Skip alerts and finish setup"
            testID="first-run-skip-alerts"
            hitSlop={8}
            style={({ pressed }) => ({ alignSelf: 'center', paddingVertical: 11, paddingHorizontal: 16, opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_500Medium', fontSize: 12 }}>Not now — finish without alerts</Text>
          </Pressable>
        ) : (
          <View style={{ height: 38 }} />
        )}
      </View>
    </View>
  );
}
