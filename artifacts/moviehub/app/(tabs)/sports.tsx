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
import { getAllMatches, getMatchDetail, Match, SportType } from '@/lib/sports';
import { Empty, Loading, Problem } from '@/lib/ui';

type SportsFilter = 'All' | 'Live' | 'Upcoming' | 'Results';
type SportFilter = 'All' | SportType;

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
  const [sportFilter, setSportFilter] = useState<SportFilter>('All');
  const [openingMatchId, setOpeningMatchId] = useState('');
  const [playError, setPlayError] = useState('');
  const query = useQuery({
    queryKey: ['sports', 'all-matches'],
    queryFn: () => getAllMatches(),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const matches = useMemo(() => {
    const all = query.data || [];
    return all.filter((match) =>
      (sportFilter === 'All' || match.type === sportFilter) &&
      (filter === 'All' || getStatus(match.status) === filter),
    );
  }, [query.data, filter, sportFilter]);

  const openMatch = async (match: Match) => {
    setOpeningMatchId(match.id);
    setPlayError('');
    try {
      const detail = await getMatchDetail(match.id, match.type, undefined, match);
      const sources = detail.match.playSource
        .filter((source) => !!source.path)
        .map((source) => ({ id: source.id, title: source.title, url: source.path }));
      if (!sources.length) throw new Error('No playable stream is available for this match right now.');
      router.push({
        pathname: '/player',
        params: {
          title: `${detail.match.team1.name} vs ${detail.match.team2.name}`,
          url: sources[0].url,
          sources: JSON.stringify(sources),
          kind: 'sports',
          sport: detail.match.type,
        },
      });
    } catch (error) {
      setPlayError(error instanceof Error ? error.message : 'This sports stream could not be opened.');
    } finally {
      setOpeningMatchId('');
    }
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, gap: 8, marginTop: 17 }}>
        {([
          ['All', 'All sports'],
          ['football', 'Football'],
          ['basketball', 'Basketball'],
          ['cricket', 'Cricket'],
        ] as [SportFilter, string][]).map(([value, label]) => (
          <Pressable
            key={value}
            onPress={() => setSportFilter(value)}
            style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 18, backgroundColor: sportFilter === value ? colors.primary : colors.card, borderWidth: 1, borderColor: sportFilter === value ? colors.primary : colors.border }}
          >
            <Text style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 11 }}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>

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
      {playError ? (
        <Text accessibilityRole="alert" style={{ color: colors.primary, marginHorizontal: 20, marginTop: 12, fontSize: 12 }}>
          {playError}
        </Text>
      ) : null}

      {!query.isLoading && !query.isError && matches.length === 0 ? (
        <Empty icon="trophy-outline" title="No fixtures in this view" subtitle="Try another filter or check again later." />
      ) : null}

      <View style={{ gap: 11, paddingHorizontal: 16, marginTop: 15 }}>
        {matches.map((match, index) => {
          const status = getStatus(match.status);
          const playable = match.hasStream;
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
                  onPress={() => void openMatch(match)}
                  disabled={openingMatchId === match.id}
                  accessibilityLabel={`Watch ${match.team1?.name} versus ${match.team2?.name}`}
                  style={{ marginHorizontal: 12, marginBottom: 12, minHeight: 42, borderRadius: 13, backgroundColor: 'rgba(228,17,17,.15)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                >
                  <Ionicons name="play-circle" size={19} color={colors.primary} />
                  <Text style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 12 }}>
                    {openingMatchId === match.id ? 'Preparing stream…' : status === 'Live' ? 'Watch live' : 'Watch stream'}
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
