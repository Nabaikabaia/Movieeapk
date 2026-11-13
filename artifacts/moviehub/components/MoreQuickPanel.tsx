import React, { useEffect } from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type Destination = 'downloads' | 'search' | 'iptv' | 'pluto' | 'library' | 'discover';

type MoreQuickPanelProps = {
  visible: boolean;
  onClose: () => void;
  onNavigate: (destination: Destination) => void;
};

const FEATURED_LINKS: Array<{
  destination: Destination;
  label: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { destination: 'library', label: 'My library', detail: 'Videos on this device', icon: 'folder-open-outline' },
  { destination: 'iptv', label: 'IPTV', detail: 'Live channels', icon: 'globe-outline' },
];

const QUICK_LINKS: Array<{
  destination: Destination;
  label: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { destination: 'downloads', label: 'Downloads', detail: 'Take it offline', icon: 'download-outline' },
  { destination: 'search', label: 'Search', detail: 'Find your next watch', icon: 'search-outline' },
  { destination: 'pluto', label: 'Pluto TV', detail: 'Free live TV', icon: 'planet-outline' },
  { destination: 'discover', label: 'Genres', detail: 'Browse by genre', icon: 'list-outline' },
];

export default function MoreQuickPanel({ visible, onClose, onNavigate }: MoreQuickPanelProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [presented, setPresented] = React.useState(visible);
  const entrance = useSharedValue(0);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setPresented(true);
      entrance.value = withSpring(1, { damping: 21, stiffness: 205, mass: 0.76 });
      backdrop.value = withTiming(1, { duration: 230 });
      return;
    }
    if (!presented) return;
    entrance.value = withSpring(0, { damping: 22, stiffness: 225, mass: 0.78 }, (finished) => {
      if (finished) runOnJS(setPresented)(false);
    });
    backdrop.value = withTiming(0, { duration: 190 });
  }, [backdrop, entrance, presented, visible]);

  const panelMotion = useAnimatedStyle(() => ({
    opacity: interpolate(entrance.value, [0, 0.12, 1], [0, 0.72, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: (1 - entrance.value) * 34 },
      { scale: 0.95 + interpolate(entrance.value, [0, 1], [0, 0.05], Extrapolation.CLAMP) },
    ],
  }));
  const backdropMotion = useAnimatedStyle(() => ({ opacity: backdrop.value * 0.72 }));

  const navigateTo = (destination: Destination) => {
    onClose();
    onNavigate(destination);
  };

  return (
    <Modal
      visible={presented}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      <View
        pointerEvents={visible ? 'auto' : 'none'}
        accessibilityViewIsModal={visible}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.background }, backdropMotion]} />
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close quick destinations"
          testID="more-quick-backdrop"
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <Animated.View
          accessibilityViewIsModal
          style={[
            panelMotion,
            {
              marginHorizontal: 12,
              marginBottom: Math.max(10, insets.bottom + 8),
              padding: 17,
              paddingBottom: 13,
              borderRadius: 28,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,.17)',
              backgroundColor: 'rgba(16,16,18,.87)',
              shadowColor: '#000',
              shadowOpacity: 0.38,
              shadowRadius: 28,
              shadowOffset: { width: 0, height: 14 },
              elevation: 22,
            },
          ]}
        >
          <BlurView intensity={66} tint="dark" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
          <LinearGradient
            colors={[`${colors.primary}29`, `${colors.card}26`, `${colors.background}42`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
            pointerEvents="none"
          />
          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,.19)', position: 'absolute', top: 0, left: 24, right: 24 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
            <View>
              <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 19 }}>More to explore</Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_400Regular', fontSize: 11, marginTop: 2 }}>Saved videos, live channels and shortcuts.</Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              testID="more-quick-close"
              hitSlop={8}
              style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.65 : 1 })}
            >
              <Ionicons name="close" size={19} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={{ flexDirection: 'row', gap: 9, marginBottom: 15 }}>
            {FEATURED_LINKS.map((item, index) => (
              <Pressable
                key={item.destination}
                onPress={() => navigateTo(item.destination)}
                accessibilityRole="button"
                accessibilityLabel={`${item.label}. ${item.detail}`}
                testID={`more-quick-${item.destination}`}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 88,
                  justifyContent: 'space-between',
                  padding: 12,
                  borderRadius: 19,
                  borderWidth: 1,
                  borderColor: pressed ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.09)',
                  backgroundColor: pressed ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.045)',
                  opacity: pressed ? 0.86 : 1,
                  transform: [{ scale: pressed ? 0.985 : 1 }],
                })}
              >
                <View style={{ width: 35, height: 35, borderRadius: 12, backgroundColor: index === 0 ? 'rgba(255,255,255,.09)' : `${colors.primary}25`, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={item.icon} size={17} color={index === 0 ? colors.foreground : colors.primary} />
                </View>
                <View>
                  <Text style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 12 }}>{item.label}</Text>
                  <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontFamily: 'Outfit_400Regular', fontSize: 9, marginTop: 2 }}>{item.detail}</Text>
                </View>
              </Pressable>
            ))}
          </View>

          <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_700Bold', fontSize: 9, letterSpacing: 1.1, marginBottom: 7 }}>SHORTCUTS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
            {QUICK_LINKS.map((item, index) => (
              <Pressable
                key={item.destination}
                onPress={() => navigateTo(item.destination)}
                accessibilityRole="button"
                accessibilityLabel={`${item.label}. ${item.detail}`}
                testID={`more-quick-${item.destination}`}
                style={({ pressed }) => ({
                  width: '48%',
                  minHeight: 52,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 9,
                  paddingHorizontal: 9,
                  borderRadius: 15,
                  backgroundColor: pressed ? 'rgba(255,255,255,.1)' : 'rgba(255,255,255,.035)',
                  borderWidth: 1,
                  borderColor: pressed ? 'rgba(255,255,255,.13)' : 'rgba(255,255,255,.045)',
                  opacity: pressed ? 0.82 : 1,
                  transform: [{ scale: pressed ? 0.985 : 1 }],
                })}
              >
                <View style={{ width: 31, height: 31, borderRadius: 11, backgroundColor: index === 0 ? `${colors.primary}29` : 'rgba(255,255,255,.075)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name={item.icon} size={15} color={index === 0 ? colors.primary : 'rgba(255,255,255,.86)'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 11 }}>{item.label}</Text>
                  <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontFamily: 'Outfit_400Regular', fontSize: 8, marginTop: 2 }}>{item.detail}</Text>
                </View>
                <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,.42)" />
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
