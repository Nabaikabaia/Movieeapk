import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useKeepAwake } from 'expo-keep-awake';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { getStreams, Movie, verifyPluto } from '@/lib/providers';
import { useDownloads } from '@/lib/Downloads';
import { useQuery } from '@tanstack/react-query';

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

function BufferMark() {
  const pulse = useSharedValue(0.35);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 780 }), -1, true);
  }, [pulse]);
  const motion = useAnimatedStyle(() => ({ opacity: pulse.value, transform: [{ scale: 0.92 + pulse.value * 0.12 }] }));
  return (
    <Animated.View style={[motion, { width: 60, height: 60, borderRadius: 32, backgroundColor: 'rgba(12,12,14,.68)', borderWidth: 1, borderColor: 'rgba(255,255,255,.17)', alignItems: 'center', justifyContent: 'center' }]}>
      <Ionicons name="play" color="#fff" size={23} />
    </Animated.View>
  );
}

export default function Player() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{
    title?: string;
    url?: string;
    id?: string;
    detailPath?: string;
    season?: string;
    episode?: string;
    local?: string;
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
  const [controlsVisible, setControlsVisible] = useState(true);
  const [trackWidth, setTrackWidth] = useState(1);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const videoViewRef = useRef<VideoView>(null);

  useKeepAwake();

  const sourceQuery = useQuery({
    queryKey: ['player-sources', params.id, params.season, params.episode],
    queryFn: async () => {
      const sources = await getStreams({
        subjectId: String(params.id),
        title,
        subjectType: 0,
        detailPath: String(params.detailPath || ''),
      } as Movie, Number(params.season || 0), Number(params.episode || 0));
      if (!sources.length) throw new Error('This title currently has no available playback sources.');
      return sources;
    },
    enabled: !url && !!params.id,
    retry: 1,
  });

  useEffect(() => {
    if (!url && sourceQuery.data?.length) setUrl(sourceQuery.data[0].url);
  }, [url, sourceQuery.data]);

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
    player.timeUpdateEventInterval = 0.5;
    setPlayerStatus(player.status);
    setPlaying(player.playing);
    setDuration(player.duration);
    return () => {
      timeSub.remove();
      statusSub.remove();
      playSub.remove();
    };
  }, [player]);

  useEffect(() => {
    if (!url) return;
    setFailure('');
    setControlsVisible(true);
    player.play();
  }, [player, url]);

  useEffect(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (!controlsVisible || !playing) return undefined;
    hideTimer.current = setTimeout(() => setControlsVisible(false), 5000);
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [controlsVisible, playing]);

  const { start } = useDownloads();
  const isLocal = params.local === '1';
  const isLive = !!params.kind && params.kind !== 'movie' && params.kind !== 'trailer';
  const progress = duration > 0 && Number.isFinite(duration) ? Math.min(1, currentTime / duration) : 0;
  const bufferedProgress = duration > 0 && Number.isFinite(duration) ? Math.min(1, bufferedTime / duration) : 0;
  const isBuffering = !!url && (playerStatus === 'loading' || playerStatus === 'idle') && !failure;

  const revealControls = () => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing) hideTimer.current = setTimeout(() => setControlsVisible(false), 5000);
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
  const cycleSpeed = () => {
    const next = speedSteps[(speedSteps.indexOf(speed) + 1) % speedSteps.length];
    setSpeed(next);
    player.playbackRate = next;
    revealControls();
  };

  const statusText = failure || sourceQuery.error?.message || (sourceQuery.isFetching ? 'Finding the best stream…' : 'This video is unavailable.');

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

      <Pressable
        accessibilityLabel={controlsVisible ? 'Hide player controls' : 'Show player controls'}
        onPress={() => controlsVisible ? setControlsVisible(false) : revealControls()}
        style={StyleSheet.absoluteFill}
      />

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
        <View pointerEvents="box-none" style={styles.chrome}>
          <View style={[styles.topBar, { paddingTop: Platform.OS === 'web' ? 70 : 42 }]}>
              <Pressable onPress={() => router.back()} accessibilityLabel="Close player" testID="player-close" style={styles.iconButton}>
              <Ionicons name="arrow-back" size={21} color="#fff" />
            </Pressable>
            <View style={styles.titleWrap}>
              <Text numberOfLines={1} style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{isLocal ? 'PLAYING FROM THIS DEVICE' : params.kind ? `${String(params.kind).toUpperCase()} · NABEES MOVIEHUB` : 'NABEES MOVIEHUB'}</Text>
            </View>
            <Pressable onPress={cycleSpeed} accessibilityLabel={`Playback speed ${speed} times`} style={styles.speedButton}>
              <Text style={styles.speedLabel}>{speed}×</Text>
            </Pressable>
            <Pressable onPress={() => void videoViewRef.current?.enterFullscreen()} accessibilityLabel="Enter fullscreen" style={styles.iconButton}>
              <Ionicons name="scan-outline" size={20} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.centerControls}>
            {!failure ? (
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
                <Text style={styles.errorTitle}>{failure}</Text>
                <Pressable onPress={() => { setFailure(''); if (url) player.replace(url); }} style={[styles.retryButton, { backgroundColor: colors.primary }]}>
                  <Text style={styles.retryLabel}>Reload video</Text>
                </Pressable>
              </View>
            )}
          </View>

          <View style={styles.bottomBar}>
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
                  {!isLocal && !!url && (
                    <Pressable onPress={() => void start(title, url)} accessibilityLabel="Download this video" style={styles.downloadButton}>
                      <Ionicons name="download-outline" size={19} color="#fff" />
                      <Text style={styles.downloadLabel}>Save offline</Text>
                    </Pressable>
                  )}
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
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050506', justifyContent: 'center' },
  chrome: { ...StyleSheet.absoluteFill, justifyContent: 'space-between' },
  topBar: { paddingHorizontal: 16, paddingBottom: 36, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(5,5,6,.58)' },
  titleWrap: { flex: 1 },
  title: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 16 },
  subtitle: { color: 'rgba(255,255,255,.6)', fontFamily: 'Outfit_500Medium', fontSize: 9, letterSpacing: 1.2, marginTop: 4 },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' },
  speedButton: { minWidth: 43, height: 42, paddingHorizontal: 9, borderRadius: 21, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' },
  speedLabel: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 12 },
  centerControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 35 },
  skipButton: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center' },
  skipText: { color: '#fff', fontSize: 9, fontFamily: 'Outfit_600SemiBold', marginTop: -3 },
  playButton: { width: 66, height: 66, borderRadius: 34, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', paddingLeft: 2, shadowColor: '#000', shadowOpacity: .35, shadowRadius: 18, elevation: 8 },
  bottomBar: { paddingHorizontal: 20, paddingBottom: Platform.OS === 'web' ? 36 : 26, paddingTop: 40, backgroundColor: 'rgba(5,5,6,.64)' },
  progressTouchArea: { height: 24, justifyContent: 'center' },
  progressTrack: { height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,.3)', overflow: 'visible' },
  bufferedTrack: { position: 'absolute', top: 0, left: 0, height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,.55)' },
  progressFill: { position: 'absolute', top: 0, left: 0, height: 4, borderRadius: 4 },
  progressThumb: { position: 'absolute', top: -4, width: 12, height: 12, marginLeft: -6, borderRadius: 7, backgroundColor: '#fff', borderWidth: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 12 },
  timeLabel: { color: 'rgba(255,255,255,.82)', fontFamily: 'Outfit_500Medium', fontSize: 11 },
  downloadButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 9, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.12)' },
  downloadLabel: { color: '#fff', fontFamily: 'Outfit_600SemiBold', fontSize: 10 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveLabel: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 11, letterSpacing: 1 },
  centerMessage: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 26, gap: 13 },
  bufferText: { color: 'rgba(255,255,255,.76)', fontFamily: 'Outfit_600SemiBold', fontSize: 13, textAlign: 'center' },
  errorCard: { maxWidth: 320, alignItems: 'center', gap: 10, padding: 24, borderRadius: 20, backgroundColor: 'rgba(18,18,21,.92)' },
  errorTitle: { color: '#fff', fontFamily: 'Outfit_600SemiBold', fontSize: 16, textAlign: 'center', lineHeight: 23 },
  retryButton: { marginTop: 6, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 22 },
  retryLabel: { color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 12 },
});
