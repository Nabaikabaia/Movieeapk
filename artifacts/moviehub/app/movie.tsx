import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FadeInDown } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { getDetails, getRecommendations, getStreams, Movie, Stream } from '@/lib/providers';
import { useFavorites } from '@/lib/Favorites';
import { useDownloads } from '@/lib/Downloads';
import { Empty, Problem, Rail } from '@/lib/ui';

export default function MovieDetails() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [isMuted, setIsMuted] = useState(true);
  const detailsQuery = useQuery({
    queryKey: ['details', id],
    queryFn: () => getDetails(String(id)),
    enabled: !!id,
    staleTime: 300_000,
  });
  const details = detailsQuery.data;
  const subject = details?.subject as Movie | undefined;
  const title = subject?.title || 'Movie details';
  const trailerUrl = subject?.trailer?.videoAddress?.url;
  const trailerPlayer = useVideoPlayer(trailerUrl || null);
  const { items: favorites, toggle } = useFavorites();
  const { start: startDownload } = useDownloads();
  const isFavorite = favorites.some((item) => item.subjectId === subject?.subjectId);
  const detailPath = String(subject?.detailPath || id || '');
  const sourceQuery = useQuery({
    queryKey: ['movie-api-source', subject?.subjectId, detailPath, season, episode],
    queryFn: () => getStreams(subject!, season, episode),
    enabled: !!subject?.subjectId && !!subject?.detailPath,
    staleTime: 240_000,
    retry: false,
  });
  const recommendationsQuery = useQuery({
    queryKey: ['recommendations', subject?.subjectId],
    queryFn: () => getRecommendations(String(subject!.subjectId), details),
    enabled: !!subject?.subjectId,
    staleTime: 300_000,
  });

  useEffect(() => {
    trailerPlayer.muted = isMuted;
  }, [trailerPlayer, isMuted]);

  useFocusEffect(
    useCallback(() => {
      if (!trailerUrl) return undefined;
      trailerPlayer.loop = true;
      trailerPlayer.muted = isMuted;
      trailerPlayer.play();
      return () => trailerPlayer.pause();
    }, [trailerPlayer, trailerUrl, isMuted]),
  );

  const openPlayer = (stream?: Stream) => {
    if (!subject) return;
    const url = stream?.url || stream?.proxyUrl;
    if (url) {
      router.push({
        pathname: '/player',
        params: { title, url, kind: 'movie' },
      });
      return;
    }
    router.push({
      pathname: '/player',
      params: {
        title,
        id: String(subject.subjectId),
        detailPath,
        season: String(season),
        episode: String(episode),
        kind: 'movie',
      },
    });
  };

  const openTrailer = () => {
    if (!trailerUrl) return;
    trailerPlayer.pause();
    router.push({
      pathname: '/player',
      params: { title: `${title} · Trailer`, url: trailerUrl, kind: 'trailer' },
    });
  };
  const openRecommendation = (movie: Movie) => {
    router.push({ pathname: '/movie', params: { id: String(movie.subjectId) } });
  };

  const seasons = details?.resource?.seasons || subject?.seasons || [];
  const currentSeason = seasons.find((item: any) => Number(item.se || 1) === season);
  const episodeCount = Math.min(60, Number(currentSeason?.maxEp || currentSeason?.episodeCount || 0));
  const actors = (details?.stars || []).filter((person: any) => person.staffType === 1);
  const crew = (details?.stars || []).filter((person: any) => person.staffType !== 1);
  const image = subject?.cover?.url || subject?.coverUrl || subject?.still?.url || '';

  if (detailsQuery.isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }
  if (detailsQuery.isError || !subject) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Go back" style={{ padding: 18 }}>
          <Ionicons name="arrow-back" size={23} color={colors.foreground} />
        </Pressable>
        <Problem message={detailsQuery.error?.message || 'This title could not be found.'} retry={() => void detailsQuery.refetch()} />
      </View>
    );
  }

  const playSource = (stream?: Stream) => openPlayer(stream);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 116 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ height: 550, backgroundColor: colors.card }}>
        <ImageBackground source={{ uri: image }} resizeMode="cover" style={{ flex: 1, justifyContent: 'flex-end' }}>
          {trailerUrl ? (
            <VideoView
              player={trailerPlayer}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              contentFit="cover"
              nativeControls={false}
            />
          ) : null}
          <LinearGradient
            colors={['rgba(8,9,11,.12)', 'rgba(8,9,11,.23)', 'rgba(8,9,11,.93)', colors.background]}
            locations={[0, 0.48, 0.82, 1]}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          />
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            style={{
              position: 'absolute',
              top: insets.top + 8,
              left: 18,
              width: 43,
              height: 43,
              borderRadius: 24,
              backgroundColor: 'rgba(8,9,11,.62)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,.13)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="arrow-back" size={21} color="#fff" />
          </Pressable>
          {trailerUrl ? (
            <View style={{ position: 'absolute', top: insets.top + 8, right: 18, flexDirection: 'row', gap: 8 }}>
              <Pressable
                onPress={() => setIsMuted((muted) => !muted)}
                accessibilityLabel={isMuted ? 'Unmute trailer' : 'Mute trailer'}
                style={{ width: 43, height: 43, borderRadius: 24, backgroundColor: 'rgba(8,9,11,.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,.13)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name={isMuted ? 'volume-mute-outline' : 'volume-high-outline'} size={19} color="#fff" />
              </Pressable>
            </View>
          ) : null}

          <View style={{ paddingHorizontal: 22, paddingBottom: 25 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              {trailerUrl ? (
                <View style={{ borderRadius: 12, backgroundColor: 'rgba(255,255,255,.12)', paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ color: '#fff', fontFamily: 'Outfit_600SemiBold', fontSize: 10, letterSpacing: 1 }}>
                    TRAILER · AUTOPLAY
                  </Text>
                </View>
              ) : null}
              <Text style={{ color: '#fff', fontFamily: 'Outfit_600SemiBold', fontSize: 12 }}>
                {subject.releaseDate?.slice(0, 4) || 'FEATURED'}  ·  {subject.subjectType === 2 ? 'SERIES' : 'MOVIE'}  ·  ★ {subject.imdbRatingValue || subject.rating || '—'}
              </Text>
            </View>
            <Animated.View entering={FadeInDown.duration(450)}>
              <Text numberOfLines={3} style={{ color: '#fff', fontFamily: 'Outfit_800ExtraBold', fontSize: 34, lineHeight: 39 }}>
                {title}
              </Text>
              <Text numberOfLines={3} style={{ color: 'rgba(255,255,255,.78)', lineHeight: 20, marginTop: 9 }}>
                {subject.description || details.description || 'A new story to add to your list.'}
              </Text>
            </Animated.View>
            <View style={{ flexDirection: 'row', gap: 9, marginTop: 18 }}>
              <Pressable
                onPress={() => playSource()}
                testID="play-movie"
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 19, paddingVertical: 12 }}
              >
                <Ionicons name="play" size={17} color="#101114" />
                <Text style={{ color: '#101114', fontFamily: 'Outfit_700Bold' }}>Play</Text>
              </Pressable>
              {trailerUrl ? (
                <Pressable
                  onPress={openTrailer}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 24, backgroundColor: 'rgba(255,255,255,.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,.2)', paddingHorizontal: 16, paddingVertical: 11 }}
                >
                  <Ionicons name="play-circle-outline" size={19} color="#fff" />
                  <Text style={{ color: '#fff', fontFamily: 'Outfit_600SemiBold' }}>Watch trailer</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => toggle(subject)}
                accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                style={{ width: 45, height: 45, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,.38)', alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? colors.primary : '#fff'} />
              </Pressable>
            </View>
          </View>
        </ImageBackground>
      </View>

      {subject.genre ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingTop: 18 }}>
          {String(subject.genre).split(',').map((genre: string) => (
            <View key={genre.trim()} style={{ borderRadius: 20, backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Outfit_500Medium' }}>{genre.trim()}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {!!seasons.length ? (
        <View style={{ paddingHorizontal: 20, marginTop: 25 }}>
          <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 20 }}>Episodes</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9, marginTop: 13 }}>
            {seasons.map((item: any, index: number) => {
              const value = Number(item.se || index + 1);
              return (
                <Pressable
                  key={value}
                  onPress={() => { setSeason(value); setEpisode(1); }}
                  style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 15, backgroundColor: season === value ? colors.primary : colors.card }}
                >
                  <Text style={{ color: '#fff', fontFamily: 'Outfit_600SemiBold' }}>Season {value}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {episodeCount > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 12 }}>
              {Array.from({ length: episodeCount }, (_, index) => index + 1).map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setEpisode(value)}
                  style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: episode === value ? colors.primary : colors.card, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: '#fff', fontFamily: 'Outfit_600SemiBold' }}>{value}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>
      ) : null}

      <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 20 }}>
              Ready to watch
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 3 }}>
              Movie API · one stream provider
            </Text>
          </View>
          {sourceQuery.isFetching ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        </View>
        {sourceQuery.isError ? (
          <Problem message={sourceQuery.error.message} retry={() => void sourceQuery.refetch()} />
        ) : sourceQuery.data?.length ? (
          sourceQuery.data.map((stream) => (
            <View
              key={stream.id}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 14, marginTop: 10, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
            >
              <View style={{ backgroundColor: colors.secondary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 }}>
                <Text style={{ color: colors.primary, fontFamily: 'Outfit_700Bold', fontSize: 12 }}>{stream.quality}p</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold' }}>{stream.format.toUpperCase()} · {stream.size}</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>Movie API source</Text>
              </View>
              <Pressable onPress={() => playSource(stream)} accessibilityLabel={`Play ${stream.quality}p`} style={{ padding: 8 }}>
                <Ionicons name="play-circle" size={27} color={colors.primary} />
              </Pressable>
              <Pressable onPress={() => void startDownload(`${title}${subject.subjectType === 2 ? ` S${season} E${episode}` : ''}`, stream.downloadUrl)} accessibilityLabel={`Download ${stream.quality}p`} style={{ padding: 8 }}>
                <Ionicons name="download-outline" size={21} color={colors.foreground} />
              </Pressable>
            </View>
          ))
        ) : !sourceQuery.isFetching ? (
          <Empty icon="videocam-off-outline" title="No stream available" subtitle="The Movie API has no source for this title right now. Try again later." />
        ) : null}
      </View>

      {actors.length ? (
        <View style={{ marginTop: 30 }}>
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 20 }}>Cast</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}>Actors and actresses</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 13, paddingHorizontal: 20 }}>
            {actors.map((person: any, index: number) => (
              <Animated.View key={`${person.staffId}-${index}`} entering={FadeInDown.delay(index * 35).duration(360)} style={{ width: 78, alignItems: 'center' }}>
                {person.avatarUrl ? (
                  <Image source={{ uri: person.avatarUrl }} style={{ width: 66, height: 66, borderRadius: 34, backgroundColor: colors.card }} />
                ) : (
                  <View style={{ width: 66, height: 66, borderRadius: 34, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="person-outline" size={24} color={colors.mutedForeground} />
                  </View>
                )}
                <Text numberOfLines={1} style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 11, marginTop: 8, textAlign: 'center' }}>
                  {person.name}
                </Text>
                <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 2, textAlign: 'center' }}>
                  {person.character || 'Cast'}
                </Text>
              </Animated.View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {crew.length ? (
        <View style={{ marginTop: 25 }}>
          <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 20, paddingHorizontal: 20, marginBottom: 12 }}>Featured creators</Text>
          <View style={{ gap: 9, paddingHorizontal: 20 }}>
            {crew.slice(0, 6).map((person: any, index: number) => (
              <Animated.View key={`${person.staffId}-${index}`} entering={FadeInDown.delay(index * 35).duration(360)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 15, backgroundColor: colors.card, padding: 12 }}>
                {person.avatarUrl ? (
                  <Image source={{ uri: person.avatarUrl }} style={{ width: 45, height: 45, borderRadius: 24 }} />
                ) : (
                  <View style={{ width: 45, height: 45, borderRadius: 24, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="person-outline" size={18} color={colors.mutedForeground} />
                  </View>
                )}
                <View><Text style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold' }}>{person.name}</Text><Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>{person.character || 'Creator'}</Text></View>
              </Animated.View>
            ))}
          </View>
        </View>
      ) : null}

      {subject.description || details.description ? (
        <View style={{ marginTop: 27, paddingHorizontal: 20 }}>
          <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 20 }}>About this title</Text>
          <Text style={{ color: colors.mutedForeground, lineHeight: 22, marginTop: 9 }}>
            {subject.description || details.description}
          </Text>
        </View>
      ) : null}

      {recommendationsQuery.data?.length ? (
        <View style={{ marginTop: 25 }}>
          <Rail title="You might also like" items={recommendationsQuery.data} onMovie={openRecommendation} />
        </View>
      ) : null}
    </ScrollView>
  );
}
