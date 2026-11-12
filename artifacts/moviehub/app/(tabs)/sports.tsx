import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { FadeInDown } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { getSports } from '@/lib/providers';
import { Empty, Loading, Problem } from '@/lib/ui';

type SportsFilter = 'All' | 'Live' | 'Upcoming' | 'Results';

function getStatus(status: string) {
  if (/ing|live|progress/i.test(status)) return 'Live';
  if (/notstart|upcoming|pending/i.test(status)) return 'Upcoming';
  return 'Results';
}

function matchTime(value?: string) {
  const time = Number(value);
  if (!Number.isFinite(time) || !time) return 'Time not listed';
  return new Date(time).toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function Sports() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<SportsFilter>('All');
  const query = useQuery({ queryKey: ['sports', 'movie-api'], queryFn: getSports, staleTime: 90_000 });

  const matches = useMemo(() => {
    const data = query.data || {};
    const all = Object.values(data).flatMap((value: any) => Array.isArray(value) ? value : []);
    const unique = [...new Map(all.map((match: any) => [match.id, match])).values()] as any[];
    return filter === 'All' ? unique : unique.filter((match) => getStatus(match.status) === filter);
  }, [query.data, filter]);

  const openMatch = (match: any) => {
    const source = match.streamUrl || match.playUrl || match.playPath || match.playSource?.[0]?.url;
    if (!source) return;
    router.push({
      pathname: '/player',
      params: { title: `${match.team1?.name || ''} vs ${match.team2?.name || ''}`, url: source, kind: 'sports' },
    });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 125 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ color: colors.foreground, fontFamily: 'Outfit_800ExtraBold', fontSize: 30 }}>Sports</Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 3 }}>Live fixtures, upcoming games and replays.</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, gap: 8, marginTop: 19 }}>
        {(['All', 'Live', 'Upcoming', 'Results'] as SportsFilter[]).map((item) => (
          <Pressable
            key={item}
            onPress={() => setFilter(item)}
            style={{ paddingHorizontal: 15, paddingVertical: 9, borderRadius: 20, backgroundColor: filter === item ? colors.primary : colors.card, borderWidth: 1, borderColor: filter === item ? colors.primary : colors.border }}
          >
            <Text style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 12 }}>{item}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {query.isLoading && <Loading label="Loading sports fixtures…" />}
      {query.isError && <Problem message={query.error.message} retry={() => void query.refetch()} />}

      {!query.isLoading && !query.isError && matches.length === 0 ? (
        <Empty icon="trophy-outline" title="No fixtures in this view" subtitle="Try another filter or check again later." />
      ) : null}

      <View style={{ gap: 11, paddingHorizontal: 16, marginTop: 15 }}>
        {matches.map((match, index) => {
          const status = getStatus(match.status);
          const playable = Boolean(match.streamUrl || match.playUrl || match.playPath || match.playSource?.[0]?.url);
          return (
            <Animated.View
              key={match.id}
              entering={FadeInDown.delay(Math.min(index, 8) * 35).duration(360)}
              style={{ borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 13 }}>
                <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontFamily: 'Outfit_600SemiBold', fontSize: 11, flex: 1 }}>
                  {match.league || match.type || 'Sports'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  {status === 'Live' ? <View style={{ width: 6, height: 6, borderRadius: 4, backgroundColor: colors.primary }} /> : null}
                  <Text style={{ color: status === 'Live' ? colors.primary : colors.mutedForeground, fontSize: 10, fontFamily: 'Outfit_700Bold', letterSpacing: 0.8 }}>
                    {status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8 }}>
                <View style={{ flex: 1, alignItems: 'center', gap: 7 }}>
                  {match.team1?.avatar ? <Image source={{ uri: match.team1.avatar }} contentFit="contain" cachePolicy="disk" transition={180} style={{ width: 42, height: 42 }} /> : null}
                  <Text numberOfLines={2} style={{ minHeight: 34, color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 12, textAlign: 'center' }}>
                    {match.team1?.name || 'Home'}
                  </Text>
                  {status !== 'Upcoming' ? <Text style={{ color: colors.foreground, fontFamily: 'Outfit_800ExtraBold', fontSize: 20 }}>{match.team1?.score ?? '—'}</Text> : null}
                </View>
                <View style={{ alignItems: 'center', gap: 5 }}>
                  <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_700Bold', fontSize: 11 }}>VS</Text>
                  <Text numberOfLines={1} style={{ maxWidth: 105, color: colors.mutedForeground, fontSize: 9, textAlign: 'center' }}>
                    {status === 'Upcoming' ? matchTime(match.startTime) : match.timeDesc || match.matchRound || ''}
                  </Text>
                </View>
                <View style={{ flex: 1, alignItems: 'center', gap: 7 }}>
                  {match.team2?.avatar ? <Image source={{ uri: match.team2.avatar }} contentFit="contain" cachePolicy="disk" transition={180} style={{ width: 42, height: 42 }} /> : null}
                  <Text numberOfLines={2} style={{ minHeight: 34, color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 12, textAlign: 'center' }}>
                    {match.team2?.name || 'Away'}
                  </Text>
                  {status !== 'Upcoming' ? <Text style={{ color: colors.foreground, fontFamily: 'Outfit_800ExtraBold', fontSize: 20 }}>{match.team2?.score ?? '—'}</Text> : null}
                </View>
              </View>

              {playable ? (
                <Pressable
                  onPress={() => openMatch(match)}
                  accessibilityLabel={`Watch ${match.team1?.name} versus ${match.team2?.name}`}
                  style={{ marginHorizontal: 12, marginBottom: 12, minHeight: 42, borderRadius: 13, backgroundColor: 'rgba(228,17,17,.15)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                >
                  <Ionicons name="play-circle" size={19} color={colors.primary} />
                  <Text style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 12 }}>
                    {status === 'Live' ? 'Watch live' : 'Watch stream'}
                  </Text>
                </Pressable>
              ) : null}
            </Animated.View>
          );
        })}
      </View>
    </ScrollView>
  );
}
