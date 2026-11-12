import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Stream } from '@/lib/providers';
import { InlineLoader } from '@/lib/ui';

export type PlaybackSeason = {
  number: number;
  label: string;
  episodes: Array<{ number: number; title: string; summary?: string }>;
};

type MenuName = 'audio' | 'subtitle' | 'season' | null;

type Props = {
  title: string;
  isSeries: boolean;
  seasons: PlaybackSeason[];
  selectedSeason: number;
  selectedEpisode: number;
  onSeasonChange: (season: number) => void;
  onEpisodeChange: (episode: number) => void;
  streams: Stream[];
  loading: boolean;
  error?: string;
  onRetry: () => void;
  selectedStreamId: string;
  onStreamChange: (streamId: string) => void;
  selectedAudio: string;
  audioTracks: Stream['audioTracks'];
  onAudioChange: (audio: string) => void;
  selectedSubtitle: string;
  subtitles: Stream['subtitles'];
  onSubtitleChange: (subtitleUrl: string) => void;
  onPlay: () => void;
  onDownload: () => void;
};

function DropdownTrigger({
  label,
  value,
  open,
  onPress,
  testID,
}: {
  label: string;
  value: string;
  open: boolean;
  onPress: () => void;
  testID: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      testID={testID}
      style={{ flex: 1, minWidth: 0, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: colors.secondary, borderWidth: 1, borderColor: open ? colors.primary : colors.border }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 5 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_500Medium', fontSize: 10, letterSpacing: 0.7 }}>{label.toUpperCase()}</Text>
          <Text numberOfLines={1} style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 12, marginTop: 4 }}>{value}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={open ? colors.primary : colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

function Choice({
  label,
  detail,
  selected,
  onPress,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={{ minHeight: 45, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, borderRadius: 12, backgroundColor: selected ? 'rgba(228,17,17,.12)' : 'transparent' }}
    >
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ color: selected ? colors.foreground : colors.mutedForeground, fontFamily: selected ? 'Outfit_600SemiBold' : 'Outfit_500Medium', fontSize: 12 }}>{label}</Text>
        {detail ? <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 2 }}>{detail}</Text> : null}
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={18} color={colors.primary} /> : null}
    </Pressable>
  );
}

export function PlaybackOptionsPanel(props: Props) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(true);
  const [openMenu, setOpenMenu] = useState<MenuName>(null);
  const activeStream = props.streams.find((stream) => stream.id === props.selectedStreamId) || props.streams[0];
  const selectedSeason = props.seasons.find((season) => season.number === props.selectedSeason);
  const audioLabel = props.selectedAudio === 'auto'
    ? 'Auto / original'
    : props.audioTracks.find((track) => track.id === props.selectedAudio || track.code === props.selectedAudio)?.label || 'Selected audio';
  const subtitleLabel = props.selectedSubtitle
    ? props.subtitles.find((subtitle) => subtitle.url === props.selectedSubtitle)?.language || 'Selected subtitle'
    : 'Off';
  const selectedQuality = activeStream ? `${activeStream.quality}p` : 'Choose quality';
  const uniqueAudioTracks = useMemo(
    () => [...new Map(props.audioTracks.map((track) => [track.id || track.code || track.label, track])).values()],
    [props.audioTracks],
  );

  const selectMenu = (menu: Exclude<MenuName, null>) => setOpenMenu((current) => current === menu ? null : menu);

  return (
    <View style={{ marginHorizontal: 16, marginTop: 23, borderRadius: 23, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
      <Pressable
        onPress={() => { setExpanded((value) => !value); setOpenMenu(null); }}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Close playback options' : 'Open playback options'}
        testID="playback-options-toggle"
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 }}
      >
        <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: 'rgba(228,17,17,.14)', alignItems: 'center', justifyContent: 'center', marginRight: 11 }}>
          <Ionicons name="options-outline" size={19} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.primary, fontFamily: 'Outfit_700Bold', fontSize: 9, letterSpacing: 1.5 }}>WATCH SETUP</Text>
          <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 16, marginTop: 2 }}>
            {props.isSeries ? `Season ${props.selectedSeason} · Episode ${props.selectedEpisode}` : 'Playback options'}
          </Text>
        </View>
        <View style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, backgroundColor: colors.secondary, marginRight: 9 }}>
          <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 11 }}>{selectedQuality}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
      </Pressable>

      {expanded ? (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
          <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 13 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <DropdownTrigger label="Audio" value={audioLabel} open={openMenu === 'audio'} onPress={() => selectMenu('audio')} testID="audio-selector" />
            <DropdownTrigger label="Subtitles" value={subtitleLabel} open={openMenu === 'subtitle'} onPress={() => selectMenu('subtitle')} testID="subtitle-selector" />
          </View>

          {openMenu === 'audio' ? (
            <View style={{ marginTop: 8, padding: 7, borderRadius: 16, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}>
              <Choice label="Auto / original" detail="Let the source choose its default track" selected={props.selectedAudio === 'auto'} onPress={() => { props.onAudioChange('auto'); setOpenMenu(null); }} />
              {uniqueAudioTracks.map((track) => {
                const key = track.id || track.code || track.label;
                return <Choice key={key} label={track.label} detail={track.language || track.code || 'Audio track'} selected={props.selectedAudio === key || props.selectedAudio === track.code} onPress={() => { props.onAudioChange(key); setOpenMenu(null); }} />;
              })}
              {!uniqueAudioTracks.length ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, paddingHorizontal: 11, paddingVertical: 8 }}>This source will expose any additional audio tracks when playback starts.</Text> : null}
            </View>
          ) : null}

          {openMenu === 'subtitle' ? (
            <View style={{ marginTop: 8, padding: 7, borderRadius: 16, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}>
              <Choice label="Off" detail="Play without captions" selected={!props.selectedSubtitle} onPress={() => { props.onSubtitleChange(''); setOpenMenu(null); }} />
              {props.subtitles.map((subtitle) => (
                <Choice key={`${subtitle.code}-${subtitle.url}`} label={subtitle.language} detail={subtitle.code || 'Subtitle file'} selected={props.selectedSubtitle === subtitle.url} onPress={() => { props.onSubtitleChange(subtitle.url); setOpenMenu(null); }} />
              ))}
              {!props.subtitles.length ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 17, paddingHorizontal: 11, paddingVertical: 8 }}>No subtitle tracks were supplied for this selection.</Text> : null}
            </View>
          ) : null}

          {props.isSeries ? (
            <View style={{ marginTop: 9 }}>
              <DropdownTrigger
                label="Season"
                value={selectedSeason?.label || `Season ${props.selectedSeason}`}
                open={openMenu === 'season'}
                onPress={() => selectMenu('season')}
                testID="season-selector"
              />
              {openMenu === 'season' ? (
                <View style={{ marginTop: 8, padding: 7, borderRadius: 16, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}>
                  {props.seasons.map((season) => (
                    <Choice key={season.number} label={season.label} detail={`${season.episodes.length} episodes`} selected={props.selectedSeason === season.number} onPress={() => { props.onSeasonChange(season.number); setOpenMenu(null); }} />
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={{ marginTop: 17 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
              <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 14 }}>
                {props.isSeries ? 'Episodes' : 'Resolution'}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_500Medium', fontSize: 10 }}>
                {props.isSeries ? `${selectedSeason?.episodes.length || 0} available` : 'Choose a stream'}
              </Text>
            </View>
            {props.loading ? <InlineLoader label="Finding playable options…"/> : null}
            {!props.loading && props.error ? (
              <View style={{ padding: 13, borderRadius: 14, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 12, lineHeight: 18 }}>{props.error}</Text>
                <Pressable onPress={props.onRetry} accessibilityLabel="Retry loading playback options" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 9, alignSelf: 'flex-start' }}>
                  <Ionicons name="refresh" size={14} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontFamily: 'Outfit_600SemiBold', fontSize: 11 }}>Try again</Text>
                </Pressable>
              </View>
            ) : null}

            {!props.loading && !props.error && !props.isSeries ? (
              props.streams.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {props.streams.map((stream) => {
                    const selected = stream.id === activeStream?.id;
                    return (
                      <Pressable
                        key={stream.id}
                        onPress={() => props.onStreamChange(stream.id)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        testID={`resolution-${stream.quality}`}
                        style={{ minWidth: 92, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 15, backgroundColor: selected ? 'rgba(228,17,17,.13)' : colors.background, borderWidth: 1, borderColor: selected ? colors.primary : colors.border }}
                      >
                        <Text style={{ color: selected ? colors.primary : colors.foreground, fontFamily: 'Outfit_800ExtraBold', fontSize: 17 }}>{stream.quality}p</Text>
                        <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 3 }}>{stream.format} · {stream.size}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : !props.error ? <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>No resolutions are available yet.</Text> : null
            ) : null}

            {props.isSeries && !props.loading && !props.error && selectedSeason?.episodes.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {selectedSeason.episodes.map((episode) => {
                  const selected = episode.number === props.selectedEpisode;
                  return (
                    <Pressable
                      key={episode.number}
                      onPress={() => props.onEpisodeChange(episode.number)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      testID={`episode-${episode.number}`}
                      style={{ width: '48.5%', minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, borderRadius: 15, backgroundColor: selected ? 'rgba(228,17,17,.13)' : colors.background, borderWidth: 1, borderColor: selected ? colors.primary : colors.border }}
                    >
                      <View style={{ width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.primary : colors.secondary }}>
                        <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 11 }}>{String(episode.number).padStart(2, '0')}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 11 }}>{episode.title}</Text>
                        <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 9, marginTop: 3 }}>{selected ? 'Selected episode' : 'Tap to select'}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', gap: 9, marginTop: 16 }}>
            <Pressable
              onPress={props.onPlay}
              disabled={!activeStream}
              testID="play-selected-stream"
              style={{ flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, backgroundColor: activeStream ? colors.primary : colors.secondary, opacity: activeStream ? 1 : 0.6 }}
            >
              <Ionicons name="play" size={17} color={colors.primaryForeground} />
              <Text style={{ color: colors.primaryForeground, fontFamily: 'Outfit_700Bold', fontSize: 13 }}>Play {selectedQuality}</Text>
            </Pressable>
            <Pressable
              onPress={props.onDownload}
              disabled={!activeStream}
              accessibilityLabel="Download selected resolution"
              testID="download-selected-stream"
              style={{ width: 49, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border, opacity: activeStream ? 1 : 0.5 }}
            >
              <Ionicons name="download-outline" size={19} color={colors.foreground} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
