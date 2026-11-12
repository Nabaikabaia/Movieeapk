import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image, ImageBackground } from 'expo-image';
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
import { PlaybackOptionsPanel, PlaybackSeason } from '@/components/PlaybackOptionsPanel';
import { useFavorites } from '@/lib/Favorites';
import { useDownloads } from '@/lib/Downloads';
import { Loading, Problem, Rail } from '@/lib/ui';

function buildPlaybackSeasons(input: any[]): PlaybackSeason[] {
  return (Array.isArray(input) ? input : []).map((item: any, index: number) => {
    const number = Number(item.se ?? item.season ?? index + 1) || index + 1;
    const rawEpisodes = item.episodes || item.episodeList || item.eps || item.allEp;
    const episodeRows = Array.isArray(rawEpisodes)
      ? rawEpisodes
      : typeof rawEpisodes === 'string'
        ? rawEpisodes.split(/[|,;]/).map((entry) => entry.trim()).filter(Boolean)
        : [];
    const count = Math.min(60, Math.max(episodeRows.length, Number(item.maxEp || item.episodeCount || 0)));
    const episodes = Array.from({ length: count }, (_, episodeIndex) => {
      const source = episodeRows[episodeIndex];
      const episodeNumber = typeof source === 'object'
        ? Number(source.ep ?? source.episode ?? source.number ?? episodeIndex + 1)
        : Number(String(source || '').match(/\d+/)?.[0] || episodeIndex + 1);
      const title = typeof source === 'object'
        ? String(source.title || source.name || source.episodeName || `Episode ${String(episodeNumber).padStart(2, '0')}`)
        : `Episode ${String(episodeNumber).padStart(2, '0')}`;
      return {
        number: episodeNumber || episodeIndex + 1,
        title,
        summary: typeof source === 'object' ? String(source.description || source.summary || '') : '',
      };
    });
    return { number, label: String(item.name || item.title || `Season ${number}`), episodes };
  });
}

export default function MovieDetails() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [isMuted, setIsMuted] = useState(true);
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [selectedAudio, setSelectedAudio] = useState('auto');
  const [selectedSubtitle, setSelectedSubtitle] = useState('');
  const detailsQuery = useQuery({
    queryKey: ['details', id],
    queryFn: () => getDetails(String(id)),
    enabled: !!id,
    staleTime: 300_000,
  });
  const details = detailsQuery.data;
  const subject = details?.subject as Movie | undefined;
  const title = subject?.title || 'Movie details';
  const isSeries = subject?.subjectType === 2;
  const sourceSeason = isSeries ? season : 0;
  const sourceEpisode = isSeries ? episode : 0;
  const trailerUrl = subject?.trailer?.videoAddress?.url;
  const trailerPlayer = useVideoPlayer(trailerUrl || null);
  const { items: favorites, toggle } = useFavorites();
  const { start: startDownload } = useDownloads();
  const isFavorite = favorites.some((item) => item.subjectId === subject?.subjectId);
  const detailPath = String(subject?.detailPath || id || '');
  const sourceQuery = useQuery({
    queryKey: ['movie-api-source', subject?.subjectId, detailPath, sourceSeason, sourceEpisode],
    queryFn: () => getStreams(subject!, sourceSeason, sourceEpisode),
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
  const rawSeasons = details?.resource?.seasons || subject?.seasons || [];
  const playbackSeasons = useMemo(() => buildPlaybackSeasons(rawSeasons), [rawSeasons]);
  const activeSeason = playbackSeasons.find((item) => item.number === season);
  const streams = sourceQuery.data || [];
  const selectedStream = streams.find((stream) => stream.id === selectedStreamId) || streams[0];
  const audioTracks = [...new Map(streams.flatMap((stream) => stream.audioTracks).map((track) => [track.id || track.code || track.label, track])).values()];
  const subtitles = selectedStream?.subtitles || [];

  useEffect(() => {
    if (playbackSeasons.length && !playbackSeasons.some((item) => item.number === season)) {
      setSeason(playbackSeasons[0].number);
      setEpisode(1);
    }
  }, [playbackSeasons, season]);

  useEffect(() => {
    const streams = sourceQuery.data || [];
    if (!streams.length) return;
    setSelectedStreamId((current) => streams.some((stream) => stream.id === current) ? current : streams[0].id);
  }, [sourceQuery.data]);

  useEffect(() => {
    if (selectedSubtitle && !subtitles.some((subtitle) => subtitle.url === selectedSubtitle)) {
      setSelectedSubtitle('');
    }
    if (selectedAudio !== 'auto' && !audioTracks.some((track) => track.id === selectedAudio || track.code === selectedAudio)) {
      setSelectedAudio('auto');
    }
  }, [selectedStreamId, selectedSubtitle, selectedAudio, subtitles, audioTracks]);

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
    const subtitle = stream?.subtitles.find((item) => item.url === selectedSubtitle);
    const params = {
      title,
      id: String(subject.subjectId),
      detailPath,
      season: String(sourceSeason),
      episode: String(sourceEpisode),
      kind: 'movie',
      subjectType: String(subject.subjectType || 1),
      audio: selectedAudio,
      subtitleUrl: selectedSubtitle,
      subtitleLanguage: subtitle?.language || '',
    };
    if (url) {
      router.push({
        pathname: '/player',
        params: { ...params, url },
      });
      return;
    }
    router.push({
      pathname: '/player',
      params,
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

  const actors = (details?.stars || []).filter((person: any) => person.staffType === 1);
  const crew = (details?.stars || []).filter((person: any) => person.staffType !== 1);
  const image = subject?.cover?.url || subject?.coverUrl || subject?.still?.url || '';

  if (detailsQuery.isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.background }}><Loading label="Loading title details…"/></View>;
  }
  if (!subject) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <Pressable onPress={() => router.back()} accessibilityLabel="Go back" style={{ padding: 18 }}>
          <Ionicons name="arrow-back" size={23} color={colors.foreground} />
        </Pressable>
        <Problem message={detailsQuery.error?.message || 'This title could not be found.'} retry={() => void detailsQuery.refetch()} />
      </View>
    );
  }

  const playSelected = () => openPlayer(selectedStream);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 116 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ height: 550, backgroundColor: colors.card }}>
        <ImageBackground source={{ uri: image }} contentFit="cover" cachePolicy="disk" transition={260} style={{ flex: 1, justifyContent: 'flex-end' }}>
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
                onPress={playSelected}
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

      {isSeries || subject ? (
        <PlaybackOptionsPanel
          title={title}
          isSeries={isSeries}
          seasons={playbackSeasons}
          selectedSeason={season}
          selectedEpisode={episode}
          onSeasonChange={(value) => { setSeason(value); setEpisode(1); }}
          onEpisodeChange={setEpisode}
          streams={streams}
          loading={sourceQuery.isFetching}
          error={sourceQuery.isError ? sourceQuery.error.message : undefined}
          onRetry={() => void sourceQuery.refetch()}
          selectedStreamId={selectedStreamId}
          onStreamChange={setSelectedStreamId}
          selectedAudio={selectedAudio}
          audioTracks={audioTracks}
          onAudioChange={setSelectedAudio}
          selectedSubtitle={selectedSubtitle}
          subtitles={subtitles}
          onSubtitleChange={setSelectedSubtitle}
          onPlay={playSelected}
          onDownload={() => {
            if (!selectedStream) return;
            const suffix = isSeries ? ` S${season} E${episode}` : '';
            void startDownload(`${title}${suffix}`, selectedStream.downloadUrl);
          }}
        />
      ) : null}

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
                  <Image source={{ uri: person.avatarUrl }} contentFit="cover" cachePolicy="disk" transition={180} style={{ width: 66, height: 66, borderRadius: 34, backgroundColor: colors.card }} />
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
                  <Image source={{ uri: person.avatarUrl }} contentFit="cover" cachePolicy="disk" transition={180} style={{ width: 45, height: 45, borderRadius: 24 }} />
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
