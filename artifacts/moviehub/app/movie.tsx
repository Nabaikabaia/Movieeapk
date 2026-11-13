import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image, ImageBackground } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { AudioOption, getDetails, getRecommendations, getStreams, getSubtitles, isAdultContent, Movie, Stream } from '@/lib/providers';
import { PlaybackOptionsPanel, PlaybackSeason } from '@/components/PlaybackOptionsPanel';
import { useFavorites } from '@/lib/Favorites';
import { useDownloads } from '@/lib/Downloads';
import { useUserPreferences } from '@/lib/UserPreferences';
import { useWatchHistory } from '@/lib/WatchHistory';
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
        duration: typeof source === 'object' ? Number(source.duration) || undefined : undefined,
      };
    });
    return { number, label: String(item.name || item.title || `Season ${number}`), episodes };
  });
}

type EpisodeSourceSize = { quality: string; size: string; format: string };
async function loadEpisodeSizes(
  movie: Movie,
  season: number,
  episodes: PlaybackSeason['episodes'],
): Promise<Record<number, EpisodeSourceSize[]>> {
  const sizes: Record<number, EpisodeSourceSize[]> = {};
  for (let offset = 0; offset < episodes.length; offset += 4) {
    const batch = episodes.slice(offset, offset + 4);
    const rows = await Promise.all(batch.map(async (item) => {
      try {
        const streams = await getStreams(movie, season, item.number);
        return [item.number, streams.map(({ quality, size, format }) => ({ quality, size, format }))] as [number, EpisodeSourceSize[]];
      } catch {
        return [item.number, []] as [number, EpisodeSourceSize[]];
      }
    }));
    rows.forEach(([episodeNumber, resources]) => { sizes[episodeNumber] = resources; });
  }
  return sizes;
}

export default function MovieDetails() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const { id, detailPath: requestedDetailPath } = useLocalSearchParams<{ id?: string; detailPath?: string }>();
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [showFullSynopsis, setShowFullSynopsis] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const posterArrival = useSharedValue(0);
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [selectedAudio, setSelectedAudio] = useState('auto');
  const [selectedSubtitle, setSelectedSubtitle] = useState('');
  const [selectedDownloadEpisodes, setSelectedDownloadEpisodes] = useState<number[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);
  const [downloadNotice, setDownloadNotice] = useState('');
  const [actionLoading, setActionLoading] = useState<'play' | 'download' | null>(null);
  const [actionError, setActionError] = useState('');
  const detailsQuery = useQuery({
    queryKey: ['details', id, requestedDetailPath],
    queryFn: () => getDetails(String(requestedDetailPath || id)),
    enabled: !!(requestedDetailPath || id),
    staleTime: 300_000,
  });
  const details = detailsQuery.data;
  const subject = details?.subject as Movie | undefined;
  const title = subject?.title || 'Movie details';
  const isSeries = subject?.subjectType === 2;
  const detailPath = String(subject?.detailPath || requestedDetailPath || id || '');
  const posterUrl = subject?.cover?.url || subject?.coverUrl || subject?.still?.url || '';
  const rawDubs = subject?.dubs?.length ? subject.dubs : details?.dubs || [];
  const audioDubs = useMemo<AudioOption[]>(() => (Array.isArray(rawDubs) ? rawDubs : [])
    .map((dub: any) => {
      const sourceSubjectId = String(dub.subjectId || dub.subject_id || '');
      const sourceDetailPath = String(dub.detailPath || dub.detail_path || '');
      const language = String(dub.lanName || dub.language || dub.lanCode || 'Audio dub');
      const isOriginal = !!dub.original;
      return {
        id: `dub:${sourceSubjectId}`,
        language,
        code: String(dub.lanCode || dub.languageCode || ''),
        label: `${language}${isOriginal ? ' · Original' : ''}`,
        kind: 'dub' as const,
        sourceSubjectId,
        sourceDetailPath,
        isOriginal,
      };
    })
    .filter((dub) => !!dub.sourceSubjectId && !!dub.sourceDetailPath), [subject?.dubs, details?.dubs]);
  const selectedDub = audioDubs.find((track) => track.id === selectedAudio);
  const playbackSubject = subject && selectedDub
    ? { ...subject, subjectId: selectedDub.sourceSubjectId!, detailPath: selectedDub.sourceDetailPath! }
    : subject;
  const sourceSeason = isSeries ? season : 0;
  const sourceEpisode = isSeries ? episode : 0;
  const trailerUrl = subject?.trailer?.videoAddress?.url;
  const trailerPlayer = useVideoPlayer(trailerUrl || null);
  const { items: favorites, toggle } = useFavorites();
  const { start: startDownload, canStart: canStartDownload } = useDownloads();
  const { record: recordWatch } = useWatchHistory();
  const { preferences } = useUserPreferences();
  const isFavorite = favorites.some((item) => item.subjectId === subject?.subjectId);
  const sourceQuery = useQuery({
    queryKey: ['movie-api-source', playbackSubject?.subjectId, playbackSubject?.detailPath, sourceSeason, sourceEpisode],
    queryFn: () => getStreams(playbackSubject!, sourceSeason, sourceEpisode),
    enabled: !!playbackSubject?.subjectId && !!playbackSubject?.detailPath,
    staleTime: 0,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const recommendationsQuery = useQuery({
    queryKey: ['recommendations', subject?.subjectId],
    queryFn: () => getRecommendations(String(subject!.subjectId), details),
    enabled: !!subject?.subjectId,
    staleTime: 300_000,
  });
  const recommendationItems = (recommendationsQuery.data || []).filter((movie) => (
    !preferences.parentalControlsEnabled || !isAdultContent(movie)
  ));
  const directEpisodes = details?.resource?.episodes || details?.episodes;
  const rawSeasons = details?.resource?.seasons?.length
    ? details.resource.seasons
    : subject?.seasons?.length
      ? subject.seasons
      : Array.isArray(directEpisodes)
        ? [{ se: details?.resource?.season || details?.season || 1, episodes: directEpisodes }]
        : [];
  const playbackSeasons = useMemo(() => buildPlaybackSeasons(rawSeasons), [rawSeasons]);
  const activeSeason = playbackSeasons.find((item) => item.number === season);
  const streams = sourceQuery.data || [];
  const selectedStream = streams.find((stream) => stream.id === selectedStreamId) || streams[0];
  const episodeResourcesQuery = useQuery({
    queryKey: ['episode-source-sizes', playbackSubject?.subjectId, playbackSubject?.detailPath, sourceSeason],
    queryFn: () => loadEpisodeSizes(playbackSubject!, sourceSeason, activeSeason?.episodes || []),
    enabled: isSeries && !!playbackSubject?.subjectId && !!activeSeason?.episodes.length,
    staleTime: 300_000,
    retry: false,
  });
  const subtitleQuery = useQuery({
    queryKey: ['movie-api-subtitles', playbackSubject?.subjectId, playbackSubject?.detailPath, sourceSeason, sourceEpisode, selectedStream?.id],
    queryFn: () => selectedStream?.subtitles.length
      ? Promise.resolve(selectedStream.subtitles)
      : getSubtitles(playbackSubject!, selectedStream!, sourceSeason, sourceEpisode),
    enabled: !!playbackSubject?.subjectId && !!selectedStream?.id,
    staleTime: 60_000,
    retry: false,
  });
  const embeddedAudioTracks = useMemo(
    () => [...new Map(streams.flatMap((stream) => stream.audioTracks).map((track) => [track.id || track.code || track.label, track])).values()],
    [streams],
  );
  const audioTracks = useMemo(() => [...audioDubs, ...embeddedAudioTracks], [audioDubs, embeddedAudioTracks]);
  const subtitles = selectedStream?.subtitles.length ? selectedStream.subtitles : subtitleQuery.data || [];

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

  useEffect(() => {
    posterArrival.value = 0;
    posterArrival.value = withDelay(100, withSpring(1, { damping: 22, stiffness: 105, mass: 0.9 }));
  }, [id, posterArrival]);

  useFocusEffect(
    useCallback(() => {
      if (!trailerUrl) return undefined;
      trailerPlayer.loop = true;
      trailerPlayer.muted = isMuted;
      trailerPlayer.play();
      return () => trailerPlayer.pause();
    }, [trailerPlayer, trailerUrl, isMuted]),
  );

  const changeSeason = (nextSeason: number) => {
    setSeason(nextSeason);
    setEpisode(1);
    setSelectedDownloadEpisodes([]);
    setDownloadNotice('');
    setActionError('');
  };

  const toggleDownloadEpisode = (episodeNumber: number) => {
    setSelectedDownloadEpisodes((current) => current.includes(episodeNumber)
      ? current.filter((number) => number !== episodeNumber)
      : [...current, episodeNumber].sort((a, b) => a - b));
    setDownloadNotice('');
    setActionError('');
  };

  const toggleSelectAllEpisodes = () => {
    const availableEpisodes = activeSeason?.episodes.map((item) => item.number) || [];
    const allSelected = availableEpisodes.length > 0
      && availableEpisodes.every((number) => selectedDownloadEpisodes.includes(number));
    setSelectedDownloadEpisodes(allSelected ? [] : availableEpisodes);
    setDownloadNotice('');
    setActionError('');
  };

  const refreshSelectedStream = async (requested?: Stream): Promise<Stream> => {
    const result = await sourceQuery.refetch();
    if (result.isError) {
      throw result.error instanceof Error ? result.error : new Error('The Movie API could not refresh this stream.');
    }
    const freshStreams = result.data || [];
    const selected = freshStreams.find((stream) => stream.id === (requested || selectedStream)?.id)
      || freshStreams.find((stream) => stream.quality === (requested || selectedStream)?.quality)
      || freshStreams[0];
    if (!selected?.url) throw new Error('No playable source is available for this title, episode, and audio selection.');
    setSelectedStreamId(selected.id);
    return selected;
  };

  const openPlayer = async (requested?: Stream) => {
    if (!subject || actionLoading) return;
    setActionLoading('play');
    setActionError('');
    try {
      const stream = await refreshSelectedStream(requested);
      const audioChoice = audioTracks.find((track) => track.id === selectedAudio || track.code === selectedAudio);
      const oldSubtitle = subtitles.find((item) => item.url === selectedSubtitle);
      const playerSubject = playbackSubject || subject;
      let freshSubtitleOptions = stream.subtitles;
      if (selectedSubtitle && !freshSubtitleOptions.some((item) => item.url === selectedSubtitle)) {
        freshSubtitleOptions = await getSubtitles(playerSubject, stream, sourceSeason, sourceEpisode);
      }
      const freshSubtitle = freshSubtitleOptions.find((item) => item.url === selectedSubtitle)
        || freshSubtitleOptions.find((item) => item.code === oldSubtitle?.code || item.language === oldSubtitle?.language)
        || oldSubtitle;
      recordWatch(subject, isSeries ? { season: sourceSeason, episode: sourceEpisode } : undefined);
      router.push({
        pathname: '/player',
        params: {
          title,
          episodeTitle: isSeries ? activeSeason?.episodes.find((item) => item.number === sourceEpisode)?.title || '' : '',
          episodeNumbers: isSeries ? activeSeason?.episodes.map((item) => item.number).join(',') || '' : '',
          posterUrl,
          id: String(playerSubject.subjectId),
          detailPath: String(playerSubject.detailPath || detailPath),
          season: String(sourceSeason),
          episode: String(sourceEpisode),
          kind: isSeries ? 'series' : 'movie',
          subjectType: String(subject.subjectType || 1),
          quality: stream.quality,
          audio: audioChoice?.kind === 'embedded' ? selectedAudio : 'auto',
          subtitleUrl: freshSubtitle?.url || '',
          subtitleLanguage: freshSubtitle?.language || '',
          url: stream.url,
        },
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The Movie API could not load this stream.');
    } finally {
      setActionLoading(null);
    }
  };

  const downloadSelected = async () => {
    if (!subject || actionLoading) return;
    setActionLoading('download');
    setActionError('');
    setDownloadNotice('');
    try {
      if (!(await canStartDownload())) throw new Error('Your download network setting is blocking this connection.');
      const stream = await refreshSelectedStream();
      const downloadUrl = stream.downloadUrl || stream.proxyUrl || stream.url;
      if (!downloadUrl) throw new Error('This source does not provide a downloadable file.');
      const suffix = isSeries ? ` S${season} E${episode}` : '';
      const languageSuffix = selectedDub ? ` · ${selectedDub.language}` : '';
      void startDownload(`${title}${suffix}${languageSuffix} · ${stream.quality}p`, downloadUrl, isSeries
        ? {
            seriesKey: String(subject.subjectId),
            seriesTitle: title,
            posterUrl,
            season,
            episode,
            episodeTitle: activeSeason?.episodes.find((item) => item.number === episode)?.title,
          }
        : { posterUrl });
      setDownloadNotice(isSeries ? 'Current episode added to Downloads.' : 'Movie added to Downloads.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'The Movie API could not prepare this download.');
    } finally {
      setActionLoading(null);
    }
  };

  const downloadEpisodes = async () => {
    const episodeNumbers = [...new Set(selectedDownloadEpisodes)].sort((a, b) => a - b);
    if (!subject || !playbackSubject || !episodeNumbers.length || actionLoading) return;
    if (Platform.OS === 'web') {
      setActionError('Episode downloads are available in the Android app.');
      return;
    }

    setActionLoading('download');
    setActionError('');
    setDownloadNotice('');
    setDownloadProgress({ current: 0, total: episodeNumbers.length });
    const failedEpisodes: number[] = [];
    const fallbackEpisodes: number[] = [];
    let queued = 0;

    try {
      if (!(await canStartDownload())) {
        setActionError('Your download network setting is blocking this connection.');
        return;
      }
      for (let offset = 0; offset < episodeNumbers.length; offset += 3) {
        const batch = episodeNumbers.slice(offset, offset + 3);
        const resolved = await Promise.all(batch.map(async (episodeNumber) => {
          try {
            const availableStreams = await getStreams(playbackSubject, sourceSeason, episodeNumber);
            const stream = availableStreams.find((item) => item.quality === selectedStream?.quality)
              || availableStreams[0];
            return { episodeNumber, stream };
          } catch {
            return { episodeNumber, stream: undefined };
          }
        }));

        for (const { episodeNumber, stream } of resolved) {
          const downloadUrl = stream?.downloadUrl || stream?.proxyUrl || stream?.url;
          if (!stream || !downloadUrl) {
            failedEpisodes.push(episodeNumber);
            continue;
          }
          if (selectedStream?.quality && stream.quality !== selectedStream.quality) {
            fallbackEpisodes.push(episodeNumber);
          }
          const episodeTitle = activeSeason?.episodes.find((item) => item.number === episodeNumber)?.title
            || `Episode ${String(episodeNumber).padStart(2, '0')}`;
          const audioLabel = selectedDub ? ` · ${selectedDub.language}` : '';
          const downloadTitle = `${title} S${season} E${episodeNumber} · ${episodeTitle}${audioLabel} · ${stream.quality}p`;
          void startDownload(downloadTitle, downloadUrl, {
            seriesKey: String(subject.subjectId),
            seriesTitle: title,
            posterUrl,
            season,
            episode: episodeNumber,
            episodeTitle,
          });
          queued += 1;
        }
        setDownloadProgress({ current: Math.min(offset + batch.length, episodeNumbers.length), total: episodeNumbers.length });
      }

      if (queued) {
        const fallbackNotice = fallbackEpisodes.length
          ? ` ${fallbackEpisodes.length} used another available resolution.`
          : '';
        setDownloadNotice(`${queued} episode download${queued === 1 ? '' : 's'} started. Track progress in Downloads.${fallbackNotice}`);
      }
      if (failedEpisodes.length) {
        setActionError(`${failedEpisodes.length} selected episode${failedEpisodes.length === 1 ? '' : 's'} had no downloadable source.`);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not prepare the selected episode downloads.');
    } finally {
      setActionLoading(null);
      setDownloadProgress(null);
    }
  };

  const openRecommendation = (movie: Movie) => {
    router.push({ pathname: '/movie', params: { id: String(movie.subjectId), detailPath: String(movie.detailPath || '') } });
  };

  const synopsis = String(subject?.description || details?.description || '').trim();
  const actors = (details?.stars || []).filter((person: any) => person.staffType === 1 && person.staffId);
  const crew = (details?.stars || []).filter((person: any) => person.staffType !== 1);
  const image = subject?.cover?.url || subject?.coverUrl || subject?.still?.url || '';
  const heroHeight = Math.min(650, Math.max(540, screenHeight * 0.72));
  const posterStyle = useAnimatedStyle(() => {
    const startWidth = Math.min(screenWidth * 0.76, 310);
    const startHeight = heroHeight * 0.66;
    return {
      left: interpolate(posterArrival.value, [0, 1], [(screenWidth - startWidth) / 2, 20]),
      top: interpolate(posterArrival.value, [0, 1], [heroHeight * 0.035, heroHeight - 194]),
      width: interpolate(posterArrival.value, [0, 1], [startWidth, 104]),
      height: interpolate(posterArrival.value, [0, 1], [startHeight, 154]),
      borderRadius: interpolate(posterArrival.value, [0, 1], [24, 17]),
    };
  });
  const heroContentStyle = useAnimatedStyle(() => ({
    opacity: posterArrival.value,
    transform: [{ translateY: interpolate(posterArrival.value, [0, 1], [17, 0]) }],
  }));

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

  const playSelected = () => { void openPlayer(selectedStream); };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 116 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ height: heroHeight, backgroundColor: colors.card, overflow: 'hidden' }}>
        <ImageBackground source={{ uri: image }} contentFit="cover" cachePolicy="disk" transition={260} style={StyleSheet.absoluteFill} />
        {trailerUrl ? (
          <VideoView
            player={trailerPlayer}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />
        ) : null}
        <LinearGradient
          colors={['rgba(8,9,11,.2)', 'rgba(8,9,11,.05)', 'rgba(8,9,11,.34)', colors.background]}
          locations={[0, 0.38, 0.66, 1]}
          style={StyleSheet.absoluteFill}
        />
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          style={{ position: 'absolute', top: insets.top + 8, left: 18, width: 43, height: 43, borderRadius: 24, backgroundColor: 'rgba(8,9,11,.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,.13)', alignItems: 'center', justifyContent: 'center', zIndex: 7 }}
        >
          <Ionicons name="arrow-back" size={21} color={colors.foreground} />
        </Pressable>
        {trailerUrl ? (
          <Pressable
            onPress={() => setIsMuted((muted) => !muted)}
            accessibilityLabel={isMuted ? 'Unmute background trailer' : 'Mute background trailer'}
            style={{ position: 'absolute', top: insets.top + 8, right: 18, width: 43, height: 43, borderRadius: 24, backgroundColor: 'rgba(8,9,11,.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,.13)', alignItems: 'center', justifyContent: 'center', zIndex: 7 }}
          >
            <Ionicons name={isMuted ? 'volume-mute-outline' : 'volume-high-outline'} size={19} color={colors.foreground} />
          </Pressable>
        ) : null}

        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', overflow: 'hidden', zIndex: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,.38)', backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 12 }, posterStyle]}
        >
          <Image source={{ uri: image }} contentFit="cover" cachePolicy="disk" transition={320} style={{ width: '100%', height: '100%' }} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,.36)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 54 }} />
        </Animated.View>

        <Animated.View style={[{ position: 'absolute', left: 140, right: 18, bottom: 22, zIndex: 4 }, heroContentStyle]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 7 }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, backgroundColor: colors.primary }}>
              <Text style={{ color: colors.primaryForeground, fontFamily: 'Outfit_700Bold', fontSize: 8, letterSpacing: 1 }}>{isSeries ? 'SERIES' : 'MOVIE'}</Text>
            </View>
            <Text style={{ color: 'rgba(255,255,255,.86)', fontFamily: 'Outfit_600SemiBold', fontSize: 10 }}>
              {subject.releaseDate?.slice(0, 4) || 'FEATURED'}  ·  ★ {subject.imdbRatingValue || subject.rating || '—'}
            </Text>
          </View>
          <Text numberOfLines={2} style={{ color: colors.foreground, fontFamily: 'Outfit_800ExtraBold', fontSize: 22, lineHeight: 26 }}>
            {title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 11 }}>
            <Pressable
              onPress={playSelected}
              testID="play-movie"
              style={{ minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.foreground, borderRadius: 20, paddingHorizontal: 13 }}
            >
              <Ionicons name="play" size={14} color={colors.background} />
              <Text style={{ color: colors.background, fontFamily: 'Outfit_700Bold', fontSize: 11 }}>Watch now</Text>
            </Pressable>
            <Pressable
              onPress={() => toggle(subject)}
              accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              style={{ width: 39, height: 39, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,.28)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={17} color={isFavorite ? colors.primary : colors.foreground} />
            </Pressable>
          </View>
        </Animated.View>
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

      {synopsis ? (
        <View style={{ marginHorizontal: 16, marginTop: 17, padding: 13, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 14 }}>Synopsis</Text>
          <Text
            numberOfLines={showFullSynopsis ? undefined : 3}
            style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, marginTop: 6 }}
          >
            {synopsis}
          </Text>
          {synopsis.length > 170 ? (
            <Pressable
              onPress={() => setShowFullSynopsis((expanded) => !expanded)}
              accessibilityRole="button"
              accessibilityLabel={showFullSynopsis ? 'Show less synopsis' : 'Show more synopsis'}
              style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 7, paddingRight: 8 }}
            >
              <Text style={{ color: colors.primary, fontFamily: 'Outfit_700Bold', fontSize: 11 }}>
                {showFullSynopsis ? 'Less' : 'More'}
              </Text>
              <Ionicons name={showFullSynopsis ? 'chevron-up' : 'chevron-down'} size={13} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {isSeries || subject ? (
        <PlaybackOptionsPanel
          title={title}
          isSeries={isSeries}
          seasons={playbackSeasons}
          selectedSeason={season}
          selectedEpisode={episode}
          onSeasonChange={changeSeason}
          onEpisodeChange={setEpisode}
          streams={streams}
          episodeResources={episodeResourcesQuery.data}
          episodeResourcesLoading={episodeResourcesQuery.isFetching}
          loading={sourceQuery.isFetching}
          error={sourceQuery.isError ? sourceQuery.error.message : undefined}
          onRetry={() => { setActionError(''); void sourceQuery.refetch(); }}
          actionLoading={actionLoading}
          selectedStreamId={selectedStreamId}
          onStreamChange={setSelectedStreamId}
          selectedAudio={selectedAudio}
          audioTracks={audioTracks}
          onAudioChange={setSelectedAudio}
          selectedSubtitle={selectedSubtitle}
          subtitles={subtitles}
          subtitlesLoading={subtitleQuery.isFetching && !subtitles.length}
          onSubtitleChange={setSelectedSubtitle}
          selectedDownloadEpisodes={selectedDownloadEpisodes}
          onToggleDownloadEpisode={toggleDownloadEpisode}
          onSelectAllEpisodes={toggleSelectAllEpisodes}
          onDownloadEpisodes={() => { void downloadEpisodes(); }}
          downloadProgress={downloadProgress}
          downloadNotice={downloadNotice}
          actionError={actionError}
          onDownload={() => { void downloadSelected(); }}
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
                <Pressable
                  onPress={() => router.push({
                    pathname: '/actor/[staffId]',
                    params: {
                      staffId: String(person.staffId),
                      name: String(person.name || 'Actor'),
                      avatarUrl: String(person.avatarUrl || ''),
                      character: String(person.character || ''),
                    },
                  } as any)}
                  accessibilityRole="button"
                  accessibilityLabel={`See ${person.name || 'actor'} filmography`}
                  testID={`cast-${person.staffId}`}
                  style={{ width: '100%', alignItems: 'center' }}
                >
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
                </Pressable>
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

      {recommendationItems.length ? (
        <View style={{ marginTop: 25 }}>
          <Rail title="You might also like" items={recommendationItems} onMovie={openRecommendation} />
        </View>
      ) : null}
    </ScrollView>
  );
}
