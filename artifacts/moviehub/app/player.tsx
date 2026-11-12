import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { useKeepAwake } from 'expo-keep-awake';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { getStreams, Movie, verifyPluto } from '@/lib/providers';
import { useDownloads } from '@/lib/Downloads';
import { useQuery } from '@tanstack/react-query';
import { parseCaptions, CaptionCue } from '@/lib/subtitles';

const speedSteps = [1, 1.25, 1.5, 1.75, 2];

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
  const pulse = useSharedValue(0.35);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 780 }), -1, true);
  }, [pulse]);
  const motion = useAnimatedStyle(() => ({ opacity: 0.3 + pulse.value * 0.55, transform: [{ scale: 0.86 + pulse.value * 0.2 }] }));
  return (
    <View style={{ width: 70, height: 70, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[motion, { position: 'absolute', width: 66, height: 66, borderRadius: 35, borderWidth: 1, borderColor: 'rgba(228,17,17,.72)', backgroundColor: 'rgba(228,17,17,.08)' }]} />
      <View style={{ width: 49, height: 49, borderRadius: 26, backgroundColor: 'rgba(18,19,22,.94)', borderWidth: 1, borderColor: 'rgba(255,255,255,.2)', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="film-outline" color="#fff" size={21} />
      </View>
    </View>
  );
}

export default function Player() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    title?: string;
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
  }>();
  const initialUrl = String(params.url || '');
  const [url, setUrl] = useState(initialUrl);
  const [title] = useState(String(params.title || 'Now playing'));
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

  const player = useVideoPlayer(url || null, (instance) => {
    instance.loop = false;
    instance.keepScreenOnWhilePlaying = true;
  });

  useEffect(() => {
    const timeSub = player.addListener('timeUpdate', (event) => {
      setCurrentTime(event.currentTime);
      setBufferedTime(event.bufferedPosition);
      setDuration(player.duration);
    });
    const statusSub = player.addListener('statusChange', (event) => {
      setPlayerStatus(event.status);
      if (event.status === 'error') setFailure(event.error?.message || 'This video could not be played.');
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
  }, [player]);

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

  const { items: downloadItems, start } = useDownloads();
  const isLocal = params.local === '1';
  const isLive = !!params.kind && params.kind !== 'movie' && params.kind !== 'trailer';
  const isPartialDownload = params.partial === '1';
  const activeDownload = downloadItems.find((item) => item.id === String(params.downloadId || ''));
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
    : isLocal ? 'PLAYING FROM THIS DEVICE' : params.kind ? `${String(params.kind).toUpperCase()} · NABEES MOVIEHUB` : 'NABEES MOVIEHUB';
  const displayedFailure = failure && isPartialDownload && activeDownload?.state !== 'complete'
    ? activeDownload?.state === 'downloading'
      ? 'This video needs a little more of the file before it can play. The download is still running.'
      : 'This downloaded portion may need more data to start. Continue the download, then retry from here.'
    : failure;

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

      {url && controlsVisible && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} pointerEvents="box-none" style={styles.chrome}>
          <LinearGradient colors={['rgba(4,5,7,.84)', 'rgba(4,5,7,.24)', 'transparent']} locations={[0, 0.72, 1]} style={styles.topFade} pointerEvents="none" />
          <LinearGradient colors={['transparent', 'rgba(4,5,7,.34)', 'rgba(4,5,7,.92)']} locations={[0, 0.2, 1]} style={styles.bottomFade} pointerEvents="none" />
          <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
            <View style={styles.titleWrap}>
              <Text numberOfLines={1} style={styles.title}>{title}</Text>
              <Text numberOfLines={1} style={styles.subtitle}>{partialStatus}</Text>
            </View>
            <Pressable onPress={() => { setSettingsOpen(true); revealControls(); }} accessibilityLabel={`Video quality ${selectedQuality || 'automatic'}`} style={styles.qualityBadge}>
              <Text style={styles.qualityBadgeText}>{selectedQuality ? `${selectedQuality.replace(/p$/i, '')}p` : 'AUTO'}</Text>
            </Pressable>
            <Pressable
              onPress={() => { setSettingsOpen((open) => !open); setControlsVisible(true); }}
              accessibilityLabel="Open playback settings"
              testID="player-settings"
              style={[styles.iconButton, settingsOpen && styles.iconButtonActive]}
            >
              <Ionicons name="options-outline" size={19} color="#fff" />
            </Pressable>
          </View>

          {settingsOpen ? (
            <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={styles.settingsPanel}>
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

          <View style={styles.centerControls}>
            {!displayedFailure ? (
              <>
                <Pressable onPress={() => { player.seekBy(-10); revealControls(); }} accessibilityLabel="Back ten seconds" style={styles.skipButton}>
                  <Ionicons name="play-back" color="#fff" size={23} />
                  <Text style={styles.skipText}>10</Text>
                </Pressable>
                <Pressable onPress={togglePlayback} accessibilityLabel={playing ? 'Pause video' : 'Play video'} testID="player-play-pause" style={styles.playButton}>
                  <Ionicons name={playing ? 'pause' : 'play'} color="#171719" size={28} />
                </Pressable>
                <Pressable onPress={() => { player.seekBy(10); revealControls(); }} accessibilityLabel="Forward ten seconds" style={styles.skipButton}>
                  <Ionicons name="play-forward" color="#fff" size={23} />
                  <Text style={styles.skipText}>10</Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle-outline" color="#fff" size={25} />
                <Text style={styles.errorTitle}>{displayedFailure}</Text>
                <Pressable onPress={() => { setFailure(''); if (url) player.replace(url); }} style={[styles.retryButton, { backgroundColor: colors.primary }]}>
                  <Text style={styles.retryLabel}>{isPartialDownload ? 'Retry downloaded part' : 'Reload video'}</Text>
                </Pressable>
              </View>
            )}
          </View>

          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) + 10 }]}>
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
                    style={styles.progressTrack}
                  >
                    <View style={[styles.bufferedTrack, { width: `${bufferedProgress * 100}%` }]} />
                    <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
                    <View style={[styles.progressThumb, { left: `${progress * 100}%`, borderColor: colors.primary }]} />
                  </Pressable>
                </View>
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>{formatTime(currentTime)}</Text>
                  <View style={{ flex: 1 }} />
                  {!isLocal && !isPartialDownload && !!url && (
                    <Pressable onPress={() => void start(title, url)} accessibilityLabel="Download this video" style={styles.downloadButton}>
                      <Ionicons name="download-outline" size={19} color="#fff" />
                      <Text style={styles.downloadLabel}>Download</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => setVolume((value) => value > 0 ? 0 : 1)} accessibilityLabel={volume > 0 ? 'Mute video' : 'Unmute video'} style={styles.actionButton}>
                    <Ionicons name={volume > 0 ? 'volume-high-outline' : 'volume-mute-outline'} size={17} color="#fff" />
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
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
  bottomFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 260 },
  closeButton: { position: 'absolute', left: 18, width: 42, height: 42, zIndex: 12, borderRadius: 22, backgroundColor: 'rgba(16,17,19,.74)', borderWidth: 1, borderColor: 'rgba(255,255,255,.2)', alignItems: 'center', justifyContent: 'center' },
  topBar: { paddingHorizontal: 18, paddingLeft: 72, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  titleWrap: { flex: 1, minWidth: 0 },
  title: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 15 },
  subtitle: { color: 'rgba(255,255,255,.64)', fontFamily: 'Outfit_500Medium', fontSize: 8, letterSpacing: 1, marginTop: 4 },
  iconButton: { width: 40, height: 40, borderRadius: 21, backgroundColor: 'rgba(255,255,255,.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,.13)', alignItems: 'center', justifyContent: 'center' },
  iconButtonActive: { backgroundColor: 'rgba(228,17,17,.42)', borderColor: 'rgba(255,255,255,.32)' },
  qualityBadge: { minWidth: 44, height: 36, paddingHorizontal: 9, borderRadius: 12, backgroundColor: 'rgba(255,255,255,.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' },
  qualityBadgeText: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 10, letterSpacing: .5 },
  settingsPanel: { position: 'absolute', right: 16, bottom: 104, width: '86%', maxWidth: 360, maxHeight: '62%', overflow: 'hidden', borderRadius: 22, backgroundColor: 'rgba(17,18,21,.96)', borderWidth: 1, borderColor: 'rgba(255,255,255,.17)', zIndex: 9, shadowColor: '#000', shadowOpacity: .42, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 18 },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 15, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.1)' },
  settingsTitle: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 14 },
  settingsSubtitle: { color: 'rgba(255,255,255,.5)', fontFamily: 'Outfit_400Regular', fontSize: 10, marginTop: 3 },
  settingsClose: { width: 31, height: 31, borderRadius: 16, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' },
  settingsContent: { paddingHorizontal: 15, paddingTop: 5, paddingBottom: 16 },
  settingSection: { color: 'rgba(255,255,255,.52)', fontFamily: 'Outfit_700Bold', fontSize: 9, letterSpacing: 1.15, marginTop: 15, marginBottom: 8 },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choicePill: { minHeight: 31, paddingHorizontal: 11, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,.15)', backgroundColor: 'rgba(255,255,255,.07)', alignItems: 'center', justifyContent: 'center' },
  choicePillActive: { backgroundColor: 'rgba(228,17,17,.2)', borderColor: 'rgba(228,17,17,.8)' },
  choiceLabel: { color: 'rgba(255,255,255,.77)', fontFamily: 'Outfit_500Medium', fontSize: 10 },
  choiceLabelActive: { color: '#fff', fontFamily: 'Outfit_700Bold' },
  settingOption: { minHeight: 37, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 10, borderRadius: 10 },
  settingOptionLabel: { color: '#fff', fontFamily: 'Outfit_500Medium', fontSize: 11 },
  settingsHint: { color: 'rgba(255,255,255,.48)', fontFamily: 'Outfit_400Regular', fontSize: 10, lineHeight: 15, marginHorizontal: 10, marginTop: 3 },
  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 5, paddingVertical: 2 },
  volumeButton: { width: 31, height: 31, borderRadius: 16, backgroundColor: 'rgba(255,255,255,.1)', alignItems: 'center', justifyContent: 'center' },
  volumeTrack: { flex: 1, height: 4, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.18)', overflow: 'hidden' },
  volumeFill: { height: '100%', borderRadius: 3 },
  centerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 36 },
  skipButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(17,18,21,.43)', borderWidth: 1, borderColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' },
  skipText: { color: '#fff', fontSize: 9, fontFamily: 'Outfit_600SemiBold', marginTop: -3 },
  playButton: { width: 72, height: 72, borderRadius: 38, backgroundColor: '#fff', borderWidth: 4, borderColor: 'rgba(255,255,255,.32)', alignItems: 'center', justifyContent: 'center', paddingLeft: 2, shadowColor: '#000', shadowOpacity: .45, shadowRadius: 20, elevation: 10 },
  bottomBar: { paddingHorizontal: 18, paddingTop: 24 },
  progressTouchArea: { height: 25, justifyContent: 'center' },
  progressTrack: { height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,.25)', overflow: 'visible' },
  bufferedTrack: { position: 'absolute', top: 0, left: 0, height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,.46)' },
  progressFill: { position: 'absolute', top: 0, left: 0, height: 4, borderRadius: 4 },
  progressThumb: { position: 'absolute', top: -4, width: 12, height: 12, marginLeft: -6, borderRadius: 7, backgroundColor: '#fff', borderWidth: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  timeLabel: { color: 'rgba(255,255,255,.82)', fontFamily: 'Outfit_500Medium', fontSize: 11 },
  downloadButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.12)' },
  downloadLabel: { color: '#fff', fontFamily: 'Outfit_600SemiBold', fontSize: 10 },
  actionButton: { width: 32, height: 32, borderRadius: 17, backgroundColor: 'rgba(255,255,255,.13)', alignItems: 'center', justifyContent: 'center' },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveLabel: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 11, letterSpacing: 1 },
  centerMessage: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 26, gap: 13 },
  captionWrap: { position: 'absolute', left: 22, right: 22, alignItems: 'center', zIndex: 6 },
  captionText: { overflow: 'hidden', color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 17, lineHeight: 24, textAlign: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, backgroundColor: 'rgba(0,0,0,.78)', textShadowColor: 'rgba(0,0,0,.85)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  bufferText: { color: 'rgba(255,255,255,.76)', fontFamily: 'Outfit_600SemiBold', fontSize: 13, textAlign: 'center' },
  errorCard: { maxWidth: 320, alignItems: 'center', gap: 10, padding: 24, borderRadius: 20, backgroundColor: 'rgba(18,18,21,.92)' },
  errorTitle: { color: '#fff', fontFamily: 'Outfit_600SemiBold', fontSize: 16, textAlign: 'center', lineHeight: 23 },
  retryButton: { marginTop: 6, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 22 },
  retryLabel: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 12 },
});
