import React, { useDeferredValue, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { FadeInDown } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { getGlobeChannels, getIptv, getIptvStream } from '@/lib/providers';
import { Empty, Loading, Problem } from '@/lib/ui';

type ChannelSource = 'IPTV' | 'GlobeTV';

export default function IPTV() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [source, setSource] = useState<ChannelSource>('IPTV');
  const [filter, setFilter] = useState('');
  const queryTerm = useDeferredValue(filter.trim());
  const iptvQuery = useQuery({
    queryKey: ['iptv-channels', queryTerm],
    queryFn: () => getIptv(queryTerm),
    enabled: source === 'IPTV',
    staleTime: 180_000,
  });
  const globeQuery = useQuery({
    queryKey: ['globetv-channels'],
    queryFn: getGlobeChannels,
    enabled: source === 'GlobeTV',
    staleTime: 300_000,
  });
  const query = source === 'IPTV' ? iptvQuery : globeQuery;
  const channels: any[] = query.data || [];

  const playChannel = (channel: any) => {
    const stream = channel.streams?.[0];
    const url = stream?.url || channel.url || channel.streamUrl;
    if (!url) return;
    const finalUrl = source === 'IPTV'
      ? getIptvStream(url, stream?.userAgent || channel.userAgent, stream?.referrer || channel.referrer)
      : url;
    router.push({
      pathname: '/player',
      params: { title: channel.name || channel.title || 'Live channel', url: finalUrl, kind: source },
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
        <Text style={{ color: colors.foreground, fontFamily: 'Outfit_800ExtraBold', fontSize: 30 }}>IPTV</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 3 }}>Find live channels from IPTV and GlobeTV.</Text>
      </View>

      <View style={{ flexDirection: 'row', marginHorizontal: 18, marginTop: 20, padding: 4, borderRadius: 23, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
        {(['IPTV', 'GlobeTV'] as ChannelSource[]).map((item) => (
          <Pressable
            key={item}
            onPress={() => setSource(item)}
            style={{ flex: 1, borderRadius: 20, paddingVertical: 10, backgroundColor: source === item ? colors.primary : 'transparent', alignItems: 'center' }}
          >
            <Text style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 12 }}>{item}</Text>
          </Pressable>
        ))}
      </View>

      {source === 'IPTV' ? (
        <View style={{ marginHorizontal: 20, marginTop: 15, borderRadius: 15, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Ionicons name="search-outline" size={18} color={colors.mutedForeground} />
          <TextInput
            value={filter}
            onChangeText={setFilter}
            placeholder="Filter channels"
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="search"
            style={{ flex: 1, color: colors.foreground, paddingVertical: 13, fontFamily: 'Outfit_400Regular' }}
          />
        </View>
      ) : null}

      {query.isLoading && <Loading label={`Loading ${source} channels…`} />}
      {query.isError && <Problem message={query.error.message} retry={() => void query.refetch()} />}

      {!query.isLoading && !query.isError && !channels.length ? (
        <Empty icon="tv-outline" title="No channels found" subtitle="Try another name or switch to GlobeTV." />
      ) : null}

      <View style={{ gap: 9, paddingHorizontal: 17, marginTop: 17 }}>
        {channels.map((channel, index) => {
          const stream = channel.streams?.[0];
          const logo = channel.thumbnail || channel.logo || stream?.logo;
          return (
            <Animated.View key={String(channel.id || channel.name || index)} entering={FadeInDown.delay(Math.min(index, 8) * 24).duration(320)}>
              <Pressable
                onPress={() => playChannel(channel)}
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
                    {channel.name || channel.title || 'Live channel'}
                  </Text>
                  <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 4 }}>
                    {channel.category || channel.country || channel.network || source}
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
