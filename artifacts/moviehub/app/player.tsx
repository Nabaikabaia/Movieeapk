import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useKeepAwake } from 'expo-keep-awake';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { getStreams, Movie, verifyPluto } from '@/lib/providers';
import { useDownloads } from '@/lib/Downloads';
import { useQuery } from '@tanstack/react-query';
import { parseCaptions, CaptionCue } from '@/lib/subtitles';
import { NabeesOrbitMark } from '@/lib/ui';

const speedSteps = [1, 1.25, 1.5, 1.75, 2];

type PlayerRouteSource = { id: string; title: string; url: string };

function parsePlayerSources(input?: string | string[]): PlayerRouteSource[] {
  const value = Array.isArray(input) ? input[0] : input;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((source): source is PlayerRouteSource =>
        !!source && typeof source.url === 'string' && /^https?:\/\//i.test(source.url),
      )
      .slice(0, 6);
  } catch {
    return [];
  }
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const value = Math.floor(seconds);
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const remainder = value % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function BufferMark() {
  return <NabeesOrbitMark size={70} />;
}

export default function Player() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const isLandscape = viewportWidth > viewportHeight;
  const params = useLocalSearchParams<{
    title?: string;
    episodeTitle?: string;
    episodeNumbers?: string;
    posterUrl?: string;
    url?: string;
    id?: string;
    detailPath?: string;
    season?: string;
    episode?: string;
    subjectType?: string;
    quality?: string;
    audio?: string;
    subtitleUrl?: string;
    subtitleLanguage?: string;
    local?: string;
    partial?: string;
    downloadId?: string;
    channelId?: string;
    kind?: string;
    live?: string;
    sources?: string | string[];
  }>();
  const initialUrl = String(params.url || '');
  const mediaKind = String(params.kind || '').toLowerCase();
  const isLive = params.live === '1' || !!params.channelId || ['live', 'sports', 'iptv', 'globetv', 'pluto'].includes(mediaKind);
  const routeSources = parsePlayerSources(params.sources);
  const title = String(params.title || 'Now playing');
  const { items: downloadItems, start, updatePlaybackProgress } = useDownloads();
  const isLocal = params.local === '1';
  const isPartialDownload = params.partial === '1';
  const activeDownload = downloadItems.find((item) => item.id === String(params.downloadId || ''));
  const episodeNumbers = String(params.episodeNumbers || '')
    .split(',')
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  const activeEpisodeIndex = episodeNumbers.indexOf(Number(params.episode || 0));
  const previousEpisode = activeEpisodeIndex > 0 ? episodeNumbers[activeEpisodeIndex - 1] : undefined;
  const nextEpisode = activeEpisodeIndex >= 0 && activeEpisodeIndex < episodeNumbers.length - 1
    ? episodeNumbers[activeEpisodeIndex + 1]
    : undefined;
  const [url, setUrl] = useState(initialUrl);
  const [failure, setFailure] = useState('');
  const [playing, setPlaying] = useState(false);
  const [playerStatus, setPlayerStatus] = useState<'idle' | 'loading' | 'readyToPlay' | 'error'>('idle');
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [controlsLocked, setControlsLocked] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(String(params.quality || ''));
  const [subtitleUrl, setSubtitleUrl] = useState(String(params.subtitleUrl || ''));
  const [subtitleLanguage, setSubtitleLanguage] = useState(String(params.subtitleLanguage || ''));
  const [trackWidth, setTrackWidth] = useState(1);
  const [captions, setCaptions] = useState<CaptionCue[]>([]);
  const [subtitleLoading, setSubtitleLoading] = useState(false);
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [activeAudioId, setActiveAudioId] = useState(String(params.audio || 'auto'));
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const videoViewRef = useRef<VideoView>(null);
  const activeUrlRef = useRef(url);
  const routeSourcesRef = useRef(routeSources);
  const triedSourcesRef = useRef(new Set<string>());
  const lastProgressSavedRef = useRef(0);
  const resumedDownloadRef = useRef('');
  activeUrlRef.current = url;
  routeSourcesRef.current = routeSources;

  const playerSource = (sourceUrl: string) => isLive
    ? { uri: sourceUrl, contentType: 'hls' as const }
    : sourceUrl;

  useKeepAwake();

  const sourceQuery = useQuery({
    queryKey: ['player-sources', params.id, params.season, params.episode],
    queryFn: async () => {
      const sources = await getStreams({
        subjectId: String(params.id),
        title,
        subjectType: Number(params.subjectType || 0),
        detailPath: String(params.detailPath || ''),
      } as Movie, Number(params.season || 0), Number(params.episode || 0));
      if (!sources.length) throw new Error('This title currently has no available playback sources.');
      return sources;
    },
    enabled: !!params.id,
    retry: 1,
  });

  useEffect(() => {
    if (!sourceQuery.data?.length) return;
    if (url) {
      const current = sourceQuery.data.find((stream) => stream.url === url);
      if (current && !selectedQuality) setSelectedQuality(current.quality);
      return;
    }
    const requestedQuality = Number(String(params.quality || '').replace(/[^\d]/g, ''));
    const preferred = sourceQuery.data.find((stream) => Number(stream.quality) === requestedQuality) || sourceQuery.data[0];
    setUrl(preferred.url);
    setSelectedQuality(preferred.quality);
  }, [url, sourceQuery.data, params.quality, selectedQuality]);

  useEffect(() => {
    if (!params.channelId || params.url) return undefined;
    let cancelled = false;
    void verifyPluto(String(params.channelId))
      .then((streamUrl) => { if (!cancelled) setUrl(streamUrl); })
      .catch((error) => { if (!cancelled) setFailure(error?.message || 'Live channel unavailable'); });
    return () => { cancelled = true; };
  }, [params.channelId, params.url]);

  const player = useVideoPlayer(url ? playerSource(url) : null, (instance) => {
    instance.loop = false;
    instance.keepScreenOnWhilePlaying = true;
  });

  useEffect(() => {
    const downloadId = String(params.downloadId || '');
    const timeSub = player.addListener('timeUpdate', (event) => {
      setCurrentTime(event.currentTime);
      setBufferedTime(event.bufferedPosition);
      setDuration(player.duration);
      if (downloadId && event.currentTime - lastProgressSavedRef.current >= 5) {
        lastProgressSavedRef.current = event.currentTime;
        updatePlaybackProgress(downloadId, event.currentTime, player.duration);
      }
    });
    const statusSub = player.addListener('statusChange', (event) => {
      setPlayerStatus(event.status);
      if (event.status === 'error') {
        const failedUrl = activeUrlRef.current;
        const fallback = routeSourcesRef.current.find(
          (source) => source.url !== failedUrl && !triedSourcesRef.current.has(source.url),
        );
        if (fallback) {
          triedSourcesRef.current.add(failedUrl);
          setFailure('');
          setUrl(fallback.url);
          return;
        }
        setFailure(event.error?.message || 'This video could not be played.');
      }
    });
    const playSub = player.addListener('playingChange', (event) => setPlaying(event.isPlaying));
    const audioSub = player.addListener('availableAudioTracksChange', (event) => {
      setAudioTracks(event.availableAudioTracks || []);
    });
    player.timeUpdateEventInterval = 0.5;
    setAudioTracks(player.availableAudioTracks || []);
    setPlayerStatus(player.status);
    setPlaying(player.playing);
    setDuration(player.duration);
    return () => {
      timeSub.remove();
      statusSub.remove();
      playSub.remove();
      audioSub.remove();
    };
  }, [player, params.downloadId, updatePlaybackProgress]);

  useEffect(() => {
    player.volume = volume;
  }, [player, volume]);

  const requestedAudio = String(params.audio || '');
  useEffect(() => {
    if (!subtitleUrl) {
      setCaptions([]);
      setSubtitleLoading(false);
      return undefined;
    }
    let cancelled = false;
    setSubtitleLoading(true);
    void fetch(subtitleUrl)
      .then((response) => {
        if (!response.ok) throw new Error('Subtitle download failed');
        return response.text();
      })
      .then((text) => {
        if (!cancelled) setCaptions(parseCaptions(text));
      })
      .catch(() => { if (!cancelled) setCaptions([]); })
      .finally(() => { if (!cancelled) setSubtitleLoading(false); });
    return () => { cancelled = true; };
  }, [subtitleUrl]);

  useEffect(() => {
    if (!requestedAudio || requestedAudio === 'auto' || !audioTracks.length) return;
    const selected = audioTracks.find((track) =>
      [track.id, track.code, track.language, track.label, track.name].some((value) => String(value || '') === requestedAudio),
    );
    if (!selected) return;
    if (player.audioTrack?.id !== selected.id) player.audioTrack = selected;
    setActiveAudioId(String(selected.id || selected.label || selected.language || 'auto'));
  }, [audioTracks, player, requestedAudio]);

  useEffect(() => {
    if (!url) return;
    setFailure('');
    setControlsVisible(true);
    player.play();
  }, [player, url]);

  useEffect(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (!controlsVisible || !playing || settingsOpen) return undefined;
    hideTimer.current = setTimeout(() => setControlsVisible(false), 3500);
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [controlsVisible, playing, settingsOpen]);

  const subtitleOptions = [...new Map(
    (sourceQuery.data || []).flatMap((stream) => stream.subtitles || []).map((subtitle) => [subtitle.url, subtitle]),
  ).values()];
  const progress = duration > 0 && Number.isFinite(duration) ? Math.min(1, currentTime / duration) : 0;
  const bufferedProgress = duration > 0 && Number.isFinite(duration) ? Math.min(1, bufferedTime / duration) : 0;
  const isBuffering = !!url && (playerStatus === 'loading' || playerStatus === 'idle') && !failure;
  const activeCaption = captions.find((cue) => currentTime >= cue.start && currentTime <= cue.end)?.text;
  const partialStatus = isPartialDownload
    ? activeDownload?.state === 'complete'
      ? `OFFLINE COPY READY · ${formatBytes(activeDownload.bytes || activeDownload.total)}`
      : `${formatBytes(activeDownload?.bytes || 0)} DOWNLOADED · ${activeDownload?.state === 'paused' ? 'DOWNLOAD PAUSED' : 'MORE ARRIVING'}`
    : params.kind === 'series'
      ? `S${String(params.season || 1).padStart(2, '0')} · E${String(params.episode || 1).padStart(2, '0')}${params.episodeTitle ? ` · ${String(params.episodeTitle)}` : ''}`
      : isLocal ? 'PLAYING FROM THIS DEVICE' : params.kind ? `${String(params.kind).toUpperCase()} · NABEES MOVIEHUB` : 'NABEES MOVIEHUB';
  const displayedFailure = failure && isPartialDownload && activeDownload?.state !== 'complete'
    ? activeDownload?.state === 'downloading'
      ? 'This video needs a little more of the file before it can play. The download is still running.'
      : 'This downloaded portion may need more data to start. Continue the download, then retry from here.'
    : failure;

  useEffect(() => {
    lastProgressSavedRef.current = 0;
    resumedDownloadRef.current = '';
  }, [params.downloadId]);

  useEffect(() => {
    const downloadId = String(params.downloadId || '');
    const savedSeconds = activeDownload?.watchedSeconds || 0;
    if (!downloadId || !savedSeconds || resumedDownloadRef.current === downloadId) return;
    if (playerStatus !== 'readyToPlay' || !Number.isFinite(duration) || duration <= 0) return;
    resumedDownloadRef.current = downloadId;
    if (savedSeconds < duration - 8) {
      player.currentTime = savedSeconds;
      setCurrentTime(savedSeconds);
    }
  }, [activeDownload?.watchedSeconds, duration, params.downloadId, player, playerStatus]);

  const chooseAudio = (track?: any) => {
    if (!track) {
      player.audioTrack = null;
      setActiveAudioId('auto');
    } else {
      player.audioTrack = track;
      setActiveAudioId(String(track.id || track.label || track.language || 'auto'));
    }
    setSettingsOpen(false);
    revealControls();
  };

  const chooseQuality = (stream: NonNullable<typeof sourceQuery.data>[number]) => {
    setSelectedQuality(stream.quality);
    setUrl(stream.url);
    setFailure('');
    setSettingsOpen(false);
    revealControls();
  };

  const chooseLiveSource = (source: PlayerRouteSource) => {
    triedSourcesRef.current.clear();
    setUrl(source.url);
    setSelectedQuality('');
    setFailure('');
    setSettingsOpen(false);
    revealControls();
  };

  const chooseSubtitle = (nextUrl: string, language: string) => {
    setSubtitleUrl(nextUrl);
    setSubtitleLanguage(language);
    setSettingsOpen(false);
    revealControls();
  };

  const chooseSpeed = (nextSpeed: number) => {
    setSpeed(nextSpeed);
    player.playbackRate = nextSpeed;
    setSettingsOpen(false);
    revealControls();
  };

  const revealControls = () => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing) hideTimer.current = setTimeout(() => setControlsVisible(false), 3500);
  };
  const togglePlayback = () => {
    revealControls();
    if (playing) player.pause();
    else player.play();
  };
  const seekTo = (x: number) => {
    if (duration > 0 && Number.isFinite(duration) && !isLive) {
      player.currentTime = Math.max(0, Math.min(duration, (x / trackWidth) * duration));
      revealControls();
    }
  };
  const statusText = displayedFailure || sourceQuery.error?.message || (sourceQuery.isFetching ? 'Finding the best stream…' : 'This video is unavailable.');
  const navigateEpisode = (target?: number) => {
    if (!target) return;
    triedSourcesRef.current.clear();
    setUrl('');
    setSelectedQuality('');
    setCurrentTime(0);
    setFailure('');
    router.setParams({
      episode: String(target),
      episodeTitle: `Episode ${String(target).padStart(2, '0')}`,
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      {!!url && (
        <VideoView
          ref={videoViewRef}
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          nativeControls={false}
          fullscreenOptions={{ enable: true }}
          allowsPictureInPicture
        />
      )}

      {!!url ? (
        <Pressable
          accessibilityLabel={controlsVisible ? 'Hide player controls' : 'Show player controls'}
          onPress={() => {
            if (controlsLocked) return;
            if (settingsOpen) { setSettingsOpen(false); return; }
            controlsVisible ? setControlsVisible(false) : revealControls();
          }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {!!url ? (
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Close player"
          testID="player-close"
          style={[styles.closeButton, { top: insets.top + 10 }]}
        >
          <Ionicons name="close" size={20} color={colors.foreground} />
        </Pressable>
      ) : null}

      {isBuffering && (
      <View pointerEvents="none" style={styles.centerMessage}>
          <BufferMark />
          <Text style={styles.bufferText}>Loading your stream</Text>
        </View>
      )}

      {!!url && controlsLocked ? (
        <Pressable
          onPress={() => { setControlsLocked(false); revealControls(); }}
          accessibilityRole="button"
          accessibilityLabel="Unlock player controls"
          testID="player-unlock"
          style={styles.lockOverlay}
        >
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={22} color="#fff" />
          </View>
          <Text style={styles.lockHint}>Tap to unlock</Text>
        </Pressable>
      ) : null}

      {!url && (
        <View style={styles.centerMessage}>
          {sourceQuery.isFetching ? (
            <>
              <BufferMark />
              <Text style={styles.bufferText}>Finding a stream for you</Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-offline-outline" color={colors.primary} size={34} />
              <Text style={styles.errorTitle}>{statusText}</Text>
              <Pressable onPress={() => { setFailure(''); void sourceQuery.refetch(); }} style={[styles.retryButton, { backgroundColor: colors.primary }]}>
                <Text style={styles.retryLabel}>Try again</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {url && controlsVisible && !controlsLocked && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} pointerEvents="box-none" style={styles.chrome}>
          <LinearGradient colors={['rgba(4,5,7,.84)', 'rgba(4,5,7,.24)', 'transparent']} locations={[0, 0.72, 1]} style={styles.topFade} pointerEvents="none" />
          <LinearGradient colors={['transparent', 'rgba(4,5,7,.34)', 'rgba(4,5,7,.92)']} locations={[0, 0.2, 1]} style={styles.bottomFade} pointerEvents="none" />
          <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
            <View style={styles.titleWrap}>
              <Text numberOfLines={1} style={styles.title}>{title}</Text>
              <Text numberOfLines={1} style={styles.subtitle}>{partialStatus}</Text>
            </View>
              <Pressable onPress={() => { setSettingsOpen(true); revealControls(); }} accessibilityLabel={`Video quality ${selectedQuality || 'automatic'}`} style={({ pressed }) => [styles.qualityBadge, pressed && styles.pressed]}>
              <Text style={styles.qualityBadgeText}>
                {routeSources.length > 1
                  ? `FEED ${Math.max(1, routeSources.findIndex((source) => source.url === url) + 1)}`
                  : selectedQuality ? `${selectedQuality.replace(/p$/i, '')}p` : isLive ? 'LIVE' : 'AUTO'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { setSettingsOpen((open) => !open); setControlsVisible(true); }}
              accessibilityLabel="Open playback settings"
              testID="player-settings"
               style={({ pressed }) => [styles.iconButton, settingsOpen && styles.iconButtonActive, pressed && styles.pressed]}
            >
              <Ionicons name="options-outline" size={19} color="#fff" />
            </Pressable>
          </View>

          {settingsOpen ? (
            <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(130)} style={[styles.settingsPanel, isLandscape && styles.settingsPanelLandscape]}>
              <View style={styles.settingsHeader}>
                <View>
                  <Text style={styles.settingsTitle}>Playback settings</Text>
                  <Text style={styles.settingsSubtitle}>Choose how this video plays</Text>
                </View>
                <Pressable onPress={() => setSettingsOpen(false)} accessibilityLabel="Close playback settings" style={styles.settingsClose}>
                  <Ionicons name="close" size={17} color="#fff" />
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.settingsContent}>
                {routeSources.length > 1 ? (
                  <>
                    <Text style={styles.settingSection}>STREAM SOURCE</Text>
                    <View style={styles.choiceWrap}>
                      {routeSources.map((source, index) => {
                        const selected = url === source.url;
                        return (
                          <Pressable
                            key={`${source.id}-${source.url}`}
                            onPress={() => chooseLiveSource(source)}
                            accessibilityLabel={`Select ${source.title}`}
                            style={[styles.choicePill, selected && styles.choicePillActive]}
                          >
                            <Text style={[styles.choiceLabel, selected && styles.choiceLabelActive]}>
                              {source.title || `Feed ${index + 1}`}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : null}
                <Text style={styles.settingSection}>VIDEO QUALITY</Text>
                {sourceQuery.data?.length ? (
                  <View style={styles.choiceWrap}>
                    {sourceQuery.data.map((stream, index) => {
                      const selected = url === stream.url || String(stream.quality) === selectedQuality;
                      const label = stream.quality ? `${String(stream.quality).replace(/p$/i, '')}p` : `Source ${index + 1}`;
                      return (
                        <Pressable key={`${stream.id}-${index}`} onPress={() => chooseQuality(stream)} style={[styles.choicePill, selected && styles.choicePillActive]}>
                          <Text style={[styles.choiceLabel, selected && styles.choiceLabelActive]}>{label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.settingsHint}>{sourceQuery.isFetching ? 'Checking available streams…' : 'No alternate quality options for this source.'}</Text>
                )}

                <Text style={styles.settingSection}>PLAYBACK SPEED</Text>
                <View style={styles.choiceWrap}>
                  {speedSteps.map((step) => (
                    <Pressable key={step} onPress={() => chooseSpeed(step)} style={[styles.choicePill, speed === step && styles.choicePillActive]}>
                      <Text style={[styles.choiceLabel, speed === step && styles.choiceLabelActive]}>{step}×</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.settingSection}>AUDIO</Text>
                <Pressable onPress={() => chooseAudio()} style={styles.settingOption}>
                  <Text style={styles.settingOptionLabel}>Auto / source default</Text>
                  {activeAudioId === 'auto' ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                </Pressable>
                {audioTracks.map((track, index) => {
                  const id = String(track.id || track.label || track.language || index);
                  const label = String(track.label || track.name || track.language || `Audio ${index + 1}`);
                  const selected = activeAudioId === id;
                  return (
                    <Pressable key={id} onPress={() => chooseAudio(track)} style={styles.settingOption}>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={styles.settingOptionLabel}>{label}</Text>
                        {track.language && track.language !== label ? <Text style={styles.settingsHint}>{track.language}</Text> : null}
                      </View>
                      {selected ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                    </Pressable>
                  );
                })}
                {!audioTracks.length ? <Text style={styles.settingsHint}>Using the audio included with this stream.</Text> : null}

                <Text style={styles.settingSection}>SUBTITLES</Text>
                <Pressable onPress={() => chooseSubtitle('', '')} style={styles.settingOption}>
                  <Text style={styles.settingOptionLabel}>Off</Text>
                  {!subtitleUrl ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                </Pressable>
                {subtitleOptions.map((subtitle) => (
                  <Pressable key={subtitle.url} onPress={() => chooseSubtitle(subtitle.url, subtitle.language)} style={styles.settingOption}>
                    <Text numberOfLines={1} style={styles.settingOptionLabel}>{subtitle.language || 'Subtitles'}</Text>
                    {subtitleUrl === subtitle.url ? <Ionicons name="checkmark" size={16} color={colors.primary} /> : null}
                  </Pressable>
                ))}
                {!subtitleOptions.length ? <Text style={styles.settingsHint}>No separate subtitle tracks were listed for this source.</Text> : null}

                <Text style={styles.settingSection}>VOLUME</Text>
                <View style={styles.volumeRow}>
                  <Pressable onPress={() => setVolume((value) => Math.max(0, Number((value - 0.1).toFixed(1))))} accessibilityLabel="Lower volume" style={styles.volumeButton}>
                    <Ionicons name="volume-low-outline" size={17} color="#fff" />
                  </Pressable>
                  <View style={styles.volumeTrack}>
                    <View style={[styles.volumeFill, { width: `${volume * 100}%`, backgroundColor: colors.primary }]} />
                  </View>
                  <Pressable onPress={() => setVolume((value) => Math.min(1, Number((value + 0.1).toFixed(1))))} accessibilityLabel="Raise volume" style={styles.volumeButton}>
                    <Ionicons name="volume-high-outline" size={17} color="#fff" />
                  </Pressable>
                </View>
              </ScrollView>
            </Animated.View>
          ) : null}

          <View style={[styles.centerDock, isLandscape && styles.centerDockLandscape]}>
            <BlurView intensity={32} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.centerControls}>
            {previousEpisode ? (
              <Pressable onPress={() => navigateEpisode(previousEpisode)} accessibilityLabel="Previous episode" testID="player-previous-episode" style={({ pressed }) => [styles.episodeSkipButton, pressed && styles.pressed]}>
                <Ionicons name="play-skip-back" color="#fff" size={20} />
              </Pressable>
            ) : null}
            {!displayedFailure ? (
              <>
                <Pressable onPress={() => { player.seekBy(-10); revealControls(); }} accessibilityLabel="Back ten seconds" style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}>
                  <Ionicons name="play-back" color="#fff" size={22} />
                  <Text style={styles.skipText}>10</Text>
                </Pressable>
                <Pressable onPress={togglePlayback} accessibilityLabel={playing ? 'Pause video' : 'Play video'} testID="player-play-pause" style={({ pressed }) => [styles.playButton, { backgroundColor: colors.primary, borderColor: 'rgba(255,255,255,.32)' }, pressed && styles.pressed]}>
                  <Ionicons name={playing ? 'pause' : 'play'} color="#fff" size={26} />
                </Pressable>
                <Pressable onPress={() => { player.seekBy(10); revealControls(); }} accessibilityLabel="Forward ten seconds" style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}>
                  <Ionicons name="play-forward" color="#fff" size={22} />
                  <Text style={styles.skipText}>10</Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" color="#fff" size={25} />
                <Text style={styles.errorTitle}>{displayedFailure}</Text>
                <Pressable onPress={() => { triedSourcesRef.current.clear(); setFailure(''); if (url) player.replace(playerSource(url)); }} style={[styles.retryButton, { backgroundColor: colors.primary }]}>
                  <Text style={styles.retryLabel}>{isPartialDownload ? 'Retry downloaded part' : 'Reload video'}</Text>
                </Pressable>
              </View>
            )}
            {nextEpisode ? (
              <Pressable onPress={() => navigateEpisode(nextEpisode)} accessibilityLabel="Next episode" testID="player-next-episode" style={({ pressed }) => [styles.episodeSkipButton, pressed && styles.pressed]}>
                <Ionicons name="play-skip-forward" color="#fff" size={20} />
              </Pressable>
            ) : null}
            </View>
          </View>

          <View style={[styles.bottomBar, styles.bottomDock, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
            <BlurView intensity={34} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
            {!isLive ? (
              <>
                <View
                  onLayout={(event) => setTrackWidth(Math.max(1, event.nativeEvent.layout.width))}
                  style={styles.progressTouchArea}
                >
                  <Pressable
                    accessibilityRole="adjustable"
                    accessibilityLabel="Video progress"
                    onPress={(event) => seekTo(event.nativeEvent.locationX)}
                    style={({ pressed }) => [styles.progressTrack, pressed && styles.progressTrackPressed]}
                  >
                    <View style={[styles.bufferedTrack, { width: `${bufferedProgress * 100}%` }]} />
                    <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
                    <View style={[styles.progressThumb, { left: `${progress * 100}%`, borderColor: colors.primary, backgroundColor: colors.primary }]} />
                  </Pressable>
                </View>
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>{formatTime(currentTime)}</Text>
                  <View style={{ flex: 1 }} />
                  {!isLocal && !isPartialDownload && !!url && (
                    <Pressable
                      onPress={() => void start(title, url, params.kind === 'series'
                        ? {
                            seriesKey: String(params.id || params.detailPath || title),
                            seriesTitle: title,
                            posterUrl: String(params.posterUrl || ''),
                            season: Number(params.season || 1),
                            episode: Number(params.episode || 1),
                            episodeTitle: String(params.episodeTitle || ''),
                          }
                        : { posterUrl: String(params.posterUrl || '') })}
                      accessibilityLabel="Download this video"
                      style={styles.downloadButton}
                    >
                      <Ionicons name="download-outline" size={19} color="#fff" />
                      <Text style={styles.downloadLabel}>Download</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => setVolume((value) => value > 0 ? 0 : 1)} accessibilityLabel={volume > 0 ? 'Mute video' : 'Unmute video'} style={styles.actionButton}>
                    <Ionicons name={volume > 0 ? 'volume-high-outline' : 'volume-mute-outline'} size={17} color="#fff" />
                  </Pressable>
                  <Pressable onPress={() => { setControlsLocked(true); setControlsVisible(false); }} accessibilityLabel="Lock player controls" testID="player-lock" style={styles.actionButton}>
                    <Ionicons name="lock-closed-outline" size={16} color="#fff" />
                  </Pressable>
                  <Pressable onPress={() => void videoViewRef.current?.enterFullscreen()} accessibilityLabel="Enter fullscreen" style={styles.actionButton}>
                    <Ionicons name="scan-outline" size={17} color="#fff" />
                  </Pressable>
                  <Text style={styles.timeLabel}>{formatTime(duration)}</Text>
                </View>
              </>
            ) : (
              <View style={styles.liveRow}>
                    <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.liveLabel}>LIVE</Text>
                <Text style={styles.subtitle}>Playing live channel</Text>
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {subtitleLoading ? (
        <View pointerEvents="none" style={[styles.captionWrap, { bottom: controlsVisible ? 152 : 62 }]}>
          <Text style={styles.captionText}>Loading {subtitleLanguage || 'subtitles'}…</Text>
        </View>
      ) : activeCaption ? (
        <View pointerEvents="none" style={[styles.captionWrap, { bottom: controlsVisible ? 152 : 62 }]}>
          <Text style={styles.captionText}>{activeCaption}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050506', justifyContent: 'center' },
  chrome: { ...StyleSheet.absoluteFill, justifyContent: 'space-between' },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 230 },
  bottomFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 275 },
  closeButton: { position: 'absolute', left: 18, width: 42, height: 42, zIndex: 12, borderRadius: 22, backgroundColor: 'rgba(24,26,30,.68)', borderWidth: 1, borderColor: 'rgba(255,255,255,.24)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: .3, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  topBar: { paddingHorizontal: 18, paddingLeft: 72, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  titleWrap: { flex: 1, minWidth: 0 },
  title: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 15 },
  subtitle: { color: 'rgba(242,239,232,.66)', fontFamily: 'Outfit_500Medium', fontSize: 8, letterSpacing: 1.15, marginTop: 4 },
  iconButton: { width: 42, height: 42, borderRadius: 22, backgroundColor: 'rgba(235,238,242,.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,.21)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: .24, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  iconButtonActive: { backgroundColor: 'rgba(228,17,17,.42)', borderColor: 'rgba(255,255,255,.38)' },
  qualityBadge: { minWidth: 48, height: 36, paddingHorizontal: 10, borderRadius: 12, backgroundColor: 'rgba(235,238,242,.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,.22)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: .2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  qualityBadgeText: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 10, letterSpacing: .7 },
  settingsPanel: { position: 'absolute', right: 16, bottom: 104, width: '86%', maxWidth: 360, maxHeight: '62%', overflow: 'hidden', borderRadius: 24, backgroundColor: 'rgba(23,25,29,.91)', borderWidth: 1, borderColor: 'rgba(255,255,255,.22)', zIndex: 9, shadowColor: '#000', shadowOpacity: .52, shadowRadius: 28, shadowOffset: { width: 0, height: 14 }, elevation: 18 },
  settingsPanelLandscape: { width: 344, maxHeight: '76%', bottom: 78 },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17, paddingTop: 16, paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.12)', backgroundColor: 'rgba(255,255,255,.035)' },
  settingsTitle: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 14 },
  settingsSubtitle: { color: 'rgba(255,255,255,.58)', fontFamily: 'Outfit_400Regular', fontSize: 10, marginTop: 3 },
  settingsClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,.1)', alignItems: 'center', justifyContent: 'center' },
  settingsContent: { paddingHorizontal: 15, paddingTop: 5, paddingBottom: 18 },
  settingSection: { color: 'rgba(244,224,204,.72)', fontFamily: 'Outfit_700Bold', fontSize: 9, letterSpacing: 1.35, marginTop: 16, marginBottom: 9 },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choicePill: { minHeight: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(255,255,255,.16)', backgroundColor: 'rgba(255,255,255,.065)', alignItems: 'center', justifyContent: 'center' },
  choicePillActive: { backgroundColor: 'rgba(228,17,17,.24)', borderColor: 'rgba(255,255,255,.58)', shadowColor: '#e41111', shadowOpacity: .16, shadowRadius: 8, elevation: 2 },
  choiceLabel: { color: 'rgba(255,255,255,.82)', fontFamily: 'Outfit_500Medium', fontSize: 10 },
  choiceLabelActive: { color: '#fff', fontFamily: 'Outfit_700Bold' },
  settingOption: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 11, borderRadius: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,.055)' },
  settingOptionLabel: { color: '#fff', fontFamily: 'Outfit_500Medium', fontSize: 11 },
  settingsHint: { color: 'rgba(255,255,255,.54)', fontFamily: 'Outfit_400Regular', fontSize: 10, lineHeight: 15, marginHorizontal: 10, marginTop: 3 },
  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 5, paddingVertical: 2 },
  volumeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,.1)', alignItems: 'center', justifyContent: 'center' },
  volumeTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.2)', overflow: 'hidden' },
  volumeFill: { height: '100%', borderRadius: 3 },
  centerDock: { width: '92%', maxWidth: 370, minHeight: 108, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,.2)', backgroundColor: 'rgba(14,16,20,.5)', shadowColor: '#000', shadowOpacity: .3, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 9 },
  centerDockLandscape: { minHeight: 92, maxWidth: 440 },
  centerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 7 },
  episodeSkipButton: { width: 42, height: 46, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' },
  skipButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,.2)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: .32, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  skipText: { color: '#fff', fontSize: 9, fontFamily: 'Outfit_600SemiBold', marginTop: -3, textShadowColor: 'rgba(0,0,0,.5)', textShadowRadius: 3 },
  playButton: { width: 68, height: 68, borderRadius: 36, backgroundColor: 'rgba(228,17,17,.96)', borderWidth: 4, borderColor: 'rgba(255,255,255,.34)', alignItems: 'center', justifyContent: 'center', paddingLeft: 2, shadowColor: '#e41111', shadowOpacity: .4, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 11 },
  pressed: { transform: [{ scale: .94 }], opacity: .86 },
  bottomBar: { paddingHorizontal: 18, paddingTop: 22 },
  bottomDock: { paddingHorizontal: 14, paddingTop: 10, marginHorizontal: 12, marginBottom: 10, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,.19)', backgroundColor: 'rgba(12,14,17,.55)' },
  progressTouchArea: { height: 30, justifyContent: 'center' },
  progressTrack: { height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,.3)', overflow: 'visible' },
  progressTrackPressed: { height: 6 },
  bufferedTrack: { position: 'absolute', top: 0, left: 0, height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,.5)' },
  progressFill: { position: 'absolute', top: 0, left: 0, height: 4, borderRadius: 4 },
  progressThumb: { position: 'absolute', top: -5, width: 14, height: 14, marginLeft: -7, borderRadius: 7, borderWidth: 2, shadowColor: '#fff', shadowOpacity: .35, shadowRadius: 5, elevation: 3 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 8 },
  timeLabel: { color: 'rgba(255,255,255,.9)', fontFamily: 'Outfit_600SemiBold', fontSize: 11, fontVariant: ['tabular-nums'] },
  downloadButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,.13)' },
  downloadLabel: { color: '#fff', fontFamily: 'Outfit_600SemiBold', fontSize: 10 },
  actionButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(235,238,242,.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveLabel: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 11, letterSpacing: 1 },
  centerMessage: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 26, gap: 13 },
  lockOverlay: { ...StyleSheet.absoluteFill, zIndex: 8, alignItems: 'center', justifyContent: 'center' },
  lockBadge: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(0,0,0,.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,.23)', alignItems: 'center', justifyContent: 'center' },
  lockHint: { color: 'rgba(255,255,255,.72)', fontFamily: 'Outfit_500Medium', fontSize: 11, marginTop: 9 },
  captionWrap: { position: 'absolute', left: 22, right: 22, alignItems: 'center', zIndex: 6 },
  captionText: { overflow: 'hidden', color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 17, lineHeight: 24, textAlign: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, backgroundColor: 'rgba(0,0,0,.78)', textShadowColor: 'rgba(0,0,0,.85)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  bufferText: { color: 'rgba(255,255,255,.76)', fontFamily: 'Outfit_600SemiBold', fontSize: 13, textAlign: 'center' },
  errorCard: { maxWidth: 320, alignItems: 'center', gap: 10, padding: 24, borderRadius: 20, backgroundColor: 'rgba(18,18,21,.92)' },
  errorTitle: { color: '#fff', fontFamily: 'Outfit_600SemiBold', fontSize: 16, textAlign: 'center', lineHeight: 23 },
  retryButton: { marginTop: 6, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 22 },
  retryLabel: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 12 },
});
