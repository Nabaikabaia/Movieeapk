import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { FadeInDown } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { getPluto } from '@/lib/providers';
import { Empty, Loading, Problem } from '@/lib/ui';

export default function PlutoTV() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('');
  const query = useQuery({ queryKey: ['pluto', 'channels'], queryFn: getPluto, staleTime: 300_000 });
  const channels: any[] = query.data || [];
  const visible = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return term
      ? channels.filter((channel) => `${channel.name || ''} ${channel.category || ''} ${channel.slug || ''}`.toLowerCase().includes(term))
      : channels;
  }, [channels, filter]);

  const openChannel = (channel: any) => {
    const id = String(channel.id || channel._id || channel.slug || channel.name || '');
    router.push({
      pathname: '/player',
      params: { title: channel.name || channel.title || 'Pluto TV', channelId: id, kind: 'pluto', live: '1' },
    });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 125 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ color: colors.foreground, fontFamily: 'Outfit_800ExtraBold', fontSize: 30 }}>Pluto TV</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 3 }}>Free live channels, verified when you tune in.</Text>
      </View>

      <View style={{ marginHorizontal: 20, marginTop: 18, borderRadius: 15, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
        <TextInput
          value={filter}
          onChangeText={setFilter}
          placeholder="Search Pluto channels"
          placeholderTextColor={colors.mutedForeground}
          returnKeyType="search"
          style={{ flex: 1, color: colors.foreground, paddingVertical: 13, fontFamily: 'Outfit_400Regular' }}
        />
      </View>

      {query.isLoading && <Loading label="Finding Pluto channels…" />}
      {query.isError && <Problem message={query.error.message} retry={() => void query.refetch()} />}

      {!query.isLoading && !query.isError && !visible.length ? (
        <Empty icon="tv-outline" title="No channels found" subtitle="Try a different channel name." />
      ) : null}

      <View style={{ gap: 9, paddingHorizontal: 17, marginTop: 16 }}>
        {visible.map((channel, index) => {
          const logo = channel.thumbnail || channel.logo || channel.image;
          return (
            <Animated.View key={String(channel.id || channel.name || index)} entering={FadeInDown.delay(Math.min(index, 8) * 20).duration(300)}>
              <Pressable
                onPress={() => openChannel(channel)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
              >
                {logo ? (
                    <Image source={{ uri: logo }} contentFit="contain" cachePolicy="disk" transition={180} style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: colors.background }} />
                ) : (
                  <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="tv-outline" size={20} color={colors.primary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 13 }}>
                    {channel.name || channel.title || channel.slug || 'Live channel'}
                  </Text>
                  <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>
                    {channel.category || channel.genre || 'Live TV'}
                  </Text>
                </View>
                <Ionicons name="play-circle" size={26} color={colors.primary} />
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </ScrollView>
  );
}
