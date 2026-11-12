import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { GENRES } from '@/lib/catalog';
import { useDownloads } from '@/lib/Downloads';
import { useFavorites } from '@/lib/Favorites';
import { DownloadNetworkPolicy, useUserPreferences } from '@/lib/UserPreferences';
import { useWatchHistory } from '@/lib/WatchHistory';

const NETWORK_CHOICES: Array<{ value: DownloadNetworkPolicy; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { value: 'any', label: 'Any network', icon: 'swap-horizontal-outline' },
  { value: 'wifi', label: 'Wi-Fi only', icon: 'wifi-outline' },
  { value: 'cellular', label: 'Mobile data only', icon: 'cellular-outline' },
];

function MoreRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      testID={`more-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
      style={({ pressed }) => ({
        minHeight: 62,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 12,
        borderRadius: 16,
        backgroundColor: pressed ? colors.secondary : colors.card,
        borderWidth: 1,
        borderColor: colors.border,
      })}
    >
      <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary }}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 13 }}>{title}</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 3 }}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.mutedForeground} />
    </Pressable>
  );
}

export default function Me() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { preferences, isReady, setDownloadNetwork, togglePreferredGenre, setDownloadCompleteNotifications } = useUserPreferences();
  const { items: favorites } = useFavorites();
  const { items: downloads } = useDownloads();
  const { items: watchHistory } = useWatchHistory();
  const [accountMessage, setAccountMessage] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');

  const setNotifications = async (enabled: boolean) => {
    setNotificationMessage('');
    if (!enabled) {
      setDownloadCompleteNotifications(false);
      return;
    }
    if (Platform.OS === 'web') {
      setNotificationMessage('Download notifications can be enabled in the Android app.');
      return;
    }
    try {
      const Notifications = await import('expo-notifications');
      let permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
      if (!permission.granted) {
        setNotificationMessage('Allow notifications in device settings to turn on download alerts.');
        return;
      }
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('downloads', {
          name: 'Downloads',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 180, 120, 180],
        });
      }
      setDownloadCompleteNotifications(true);
    } catch {
      setNotificationMessage('Could not enable notifications. Try again in device settings.');
    }
  };

  const showAccountSetup = () => {
    const message = 'Guest preferences stay on this device. This workspace has no Supabase account connection, so sign-up and cross-device sync are not enabled yet.';
    setAccountMessage(message);
    Alert.alert('Guest profile', message);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 14, paddingHorizontal: 18, paddingBottom: insets.bottom + 112 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 17 }}>
        <View>
          <Text style={{ color: colors.foreground, fontFamily: 'Outfit_800ExtraBold', fontSize: 30 }}>Me</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 3 }}>Your Moviehub, set your way.</Text>
        </View>
        <View style={{ width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="person-outline" size={21} color={colors.primary} />
        </View>
      </View>

      <Pressable onPress={showAccountSetup} testID="account-sync-card" accessibilityRole="button">
        <LinearGradient
          colors={['rgba(228,17,17,.28)', 'rgba(31,31,34,.8)', 'rgba(31,31,34,.58)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 17, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(228,17,17,.28)' }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
            <View style={{ width: 45, height: 45, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,10,10,.32)' }}>
              <Ionicons name="cloud-upload-outline" size={22} color={colors.foreground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 15 }}>Guest profile</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>Saved on this device</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={colors.foreground} />
          </View>
          <Text style={{ color: colors.foreground, fontSize: 11, lineHeight: 17, marginTop: 13 }}>
            Sign-in and cloud sync can be added after an authorized Supabase account project is connected.
          </Text>
        </LinearGradient>
      </Pressable>
      {accountMessage ? <Text style={{ color: colors.mutedForeground, fontSize: 10, lineHeight: 15, marginTop: 8 }}>{accountMessage}</Text> : null}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        {[
          { icon: 'heart-outline' as const, label: 'Saved titles', value: favorites.length },
          { icon: 'download-outline' as const, label: 'Downloads', value: downloads.length },
        ].map((stat) => (
          <View key={stat.label} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <Ionicons name={stat.icon} size={18} color={colors.primary} />
            <View>
              <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 16 }}>{stat.value}</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 9, marginTop: 2 }}>{stat.label}</Text>
            </View>
          </View>
        ))}
      </View>

      {watchHistory.length ? (
        <View style={{ marginTop: 25 }}>
          <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 18 }}>Recently watched</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3, marginBottom: 10 }}>Your last titles stay on this device.</Text>
          <View style={{ gap: 8 }}>
            {watchHistory.slice(0, 5).map((entry) => {
              const movie = entry.movie;
              const image = movie.cover?.url || movie.coverUrl || movie.poster;
              return (
                <Pressable
                  key={movie.subjectId}
                  onPress={() => router.push({ pathname: '/movie', params: { id: String(movie.subjectId), detailPath: String(movie.detailPath || '') } } as any)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${movie.title} from watch history`}
                  testID={`watch-history-${movie.subjectId}`}
                  style={{ minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 8, borderRadius: 15, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
                >
                  {image ? (
                    <Image source={{ uri: image }} contentFit="cover" cachePolicy="disk" transition={160} style={{ width: 43, height: 58, borderRadius: 9, backgroundColor: colors.secondary }} />
                  ) : (
                    <View style={{ width: 43, height: 58, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary }}>
                      <Ionicons name="film-outline" size={18} color={colors.mutedForeground} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 12 }}>{movie.title}</Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 4 }}>
                      {entry.season ? `Season ${entry.season} · Episode ${entry.episode || 1}` : 'Movie'}
                    </Text>
                  </View>
                  <Ionicons name="play-circle-outline" size={22} color={colors.primary} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={{ marginTop: 26 }}>
        <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 18 }}>Downloads</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 3, marginBottom: 11 }}>
          Choose which connection can be used for movie files.
        </Text>
        <View style={{ gap: 8 }}>
          {NETWORK_CHOICES.map((choice) => {
            const selected = preferences.downloadNetwork === choice.value;
            return (
              <Pressable
                key={choice.value}
                onPress={() => setDownloadNetwork(choice.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                disabled={!isReady}
                testID={`download-network-${choice.value}`}
                style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: selected ? 'rgba(228,17,17,.11)' : colors.card, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, opacity: isReady ? 1 : 0.55 }}
              >
                <Ionicons name={choice.icon} size={17} color={selected ? colors.primary : colors.mutedForeground} />
                <Text style={{ flex: 1, color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 12 }}>{choice.label}</Text>
                <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={selected ? colors.primary : colors.mutedForeground} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ marginTop: 26 }}>
        <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 18 }}>Your taste</Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 3, marginBottom: 11 }}>
          Pick genres to shape the suggestions on Home.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {GENRES.map((genre) => {
            const selected = preferences.preferredGenres.includes(genre.slug);
            return (
              <Pressable
                key={genre.slug}
                onPress={() => togglePreferredGenre(genre.slug)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                disabled={!isReady}
                testID={`preferred-genre-${genre.slug}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 9, borderRadius: 18, backgroundColor: selected ? 'rgba(228,17,17,.13)' : colors.card, borderWidth: 1, borderColor: selected ? colors.primary : colors.border, opacity: isReady ? 1 : 0.55 }}
              >
                {selected ? <Ionicons name="checkmark" size={12} color={colors.primary} /> : null}
                <Text style={{ color: selected ? colors.foreground : colors.mutedForeground, fontFamily: 'Outfit_600SemiBold', fontSize: 11 }}>{genre.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ marginTop: 26, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 13 }}>Download complete alerts</Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 10, lineHeight: 15, marginTop: 3 }}>Get a device notification when a movie finishes downloading.</Text>
          {notificationMessage ? <Text style={{ color: colors.primary, fontSize: 10, lineHeight: 14, marginTop: 6 }}>{notificationMessage}</Text> : null}
        </View>
        <Switch
          value={preferences.downloadCompleteNotifications}
          onValueChange={(enabled) => { void setNotifications(enabled); }}
          disabled={!isReady}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.foreground}
          accessibilityLabel="Download complete notifications"
          testID="download-notification-toggle"
        />
      </View>

      <View style={{ marginTop: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 11 }}>
          <Ionicons name="ellipsis-horizontal-circle-outline" size={19} color={colors.primary} />
          <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 18 }}>More</Text>
        </View>
        <View style={{ gap: 8 }}>
          <MoreRow icon="globe-outline" title="IPTV" subtitle="International channels and guide" onPress={() => router.push('/(tabs)/iptv' as any)} />
          <MoreRow icon="planet-outline" title="Pluto TV" subtitle="Browse free live channels" onPress={() => router.push('/(tabs)/pluto' as any)} />
          <MoreRow icon="folder-open-outline" title="My library" subtitle="Play videos stored on this device" onPress={() => router.push('/(tabs)/library' as any)} />
          <MoreRow icon="search-outline" title="Search" subtitle="Find films, shows, and cast" onPress={() => router.push('/(tabs)/search' as any)} />
        </View>
      </View>
    </ScrollView>
  );
}
