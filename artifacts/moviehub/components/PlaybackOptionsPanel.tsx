import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { AudioOption, Stream } from '@/lib/providers';
import { InlineLoader } from '@/lib/ui';

export type PlaybackSeason = {
  number: number;
  label: string;
  episodes: Array<{ number: number; title: string; summary?: string; duration?: number }>;
};

type MenuName = 'audio' | 'subtitle' | 'season' | 'quality' | null;

type Props = {
  title: string;
  isSeries: boolean;
  seasons: PlaybackSeason[];
  selectedSeason: number;
  selectedEpisode: number;
  onSeasonChange: (season: number) => void;
  onEpisodeChange: (episode: number) => void;
  streams: Stream[];
  episodeResources?: Record<number, Array<{ quality: string; size: string; format: string }>>;
  episodeResourcesLoading?: boolean;
  loading: boolean;
  error?: string;
  onRetry: () => void;
  selectedStreamId: string;
  onStreamChange: (streamId: string) => void;
  selectedAudio: string;
  audioTracks: AudioOption[];
  onAudioChange: (audio: string) => void;
  selectedSubtitle: string;
  subtitles: Stream['subtitles'];
  subtitlesLoading?: boolean;
  onSubtitleChange: (subtitleUrl: string) => void;
  selectedDownloadEpisodes: number[];
  onToggleDownloadEpisode: (episode: number) => void;
  onSelectAllEpisodes: () => void;
  onDownloadEpisodes: () => void;
  downloadProgress?: { current: number; total: number } | null;
  downloadNotice?: string;
  actionError?: string;
  onDownload: () => void;
  actionLoading?: 'play' | 'download' | null;
};

function parseSizeBytes(value?: string) {
  if (!value) return null;
  const match = value.trim().match(/^([\d.]+)\s*(B|KB|KIB|MB|MIB|GB|GIB|TB|TIB)?$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = (match[2] || 'B').toUpperCase();
  const power = unit.startsWith('T') ? 4 : unit.startsWith('G') ? 3 : unit.startsWith('M') ? 2 : unit.startsWith('K') ? 1 : 0;
  return Number.isFinite(amount) ? Math.round(amount * 1024 ** power) : null;
}

function formatSize(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function DropdownTrigger({
  label,
  value,
  open,
  onPress,
  testID,
  disabled = false,
}: {
  label: string;
  value: string;
  open: boolean;
  onPress: () => void;
  testID: string;
  disabled?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      disabled={disabled}
      testID={testID}
      style={{ flex: 1, minWidth: 0, borderRadius: 12, paddingHorizontal: 7, paddingVertical: 8, backgroundColor: colors.secondary, borderWidth: 1, borderColor: open ? colors.primary : colors.border, opacity: disabled ? 0.58 : 1 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 5 }}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontFamily: 'Outfit_500Medium', fontSize: 8, letterSpacing: 0.45 }}>{label.toUpperCase()}</Text>
          <Text numberOfLines={1} style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 10, marginTop: 3 }}>{value}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={12} color={open ? colors.primary : colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

function formatEpisodeDuration(seconds?: number) {
  if (!seconds || seconds < 1) return '';
  const minutes = Math.round(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
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
      style={{ minHeight: 37, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 9, borderRadius: 10, backgroundColor: selected ? 'rgba(228,17,17,.12)' : 'transparent' }}
    >
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ color: selected ? colors.foreground : colors.mutedForeground, fontFamily: selected ? 'Outfit_600SemiBold' : 'Outfit_500Medium', fontSize: 10.5 }}>{label}</Text>
        {detail ? <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 9, marginTop: 1 }}>{detail}</Text> : null}
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
    ? 'Auto'
    : props.audioTracks.find((track) => track.id === props.selectedAudio || track.code === props.selectedAudio)?.label || 'Selected audio';
  const subtitleLabel = props.selectedSubtitle
    ? props.subtitles.find((subtitle) => subtitle.url === props.selectedSubtitle)?.language || 'Selected subtitle'
    : 'Off';
  const selectedQuality = activeStream ? `${activeStream.quality}p` : 'Choose quality';
  const allEpisodesSelected = !!selectedSeason?.episodes.length
    && selectedSeason.episodes.every((episode) => props.selectedDownloadEpisodes.includes(episode.number));
  const selectedEpisodeSizes = props.selectedDownloadEpisodes.map((episodeNumber) => {
    const resources = props.episodeResources?.[episodeNumber] || [];
    const resource = resources.find((item) => item.quality.replace(/p$/i, '') === String(activeStream?.quality || '').replace(/p$/i, ''))
      || resources[0];
    return parseSizeBytes(resource?.size);
  });
  const knownEpisodeSizes = selectedEpisodeSizes.filter((size): size is number => size !== null);
  const selectedSizeLabel = !props.selectedDownloadEpisodes.length
    ? ''
    : knownEpisodeSizes.length === props.selectedDownloadEpisodes.length
      ? formatSize(knownEpisodeSizes.reduce((sum, size) => sum + size, 0))
      : knownEpisodeSizes.length
        ? `At least ${formatSize(knownEpisodeSizes.reduce((sum, size) => sum + size, 0))}`
        : props.episodeResourcesLoading ? 'Calculating size…' : 'Size unavailable';
  const uniqueAudioTracks = useMemo(
    () => [...new Map(props.audioTracks.map((track) => [track.id || track.code || track.label, track])).values()],
    [props.audioTracks],
  );

  const selectMenu = (menu: Exclude<MenuName, null>) => setOpenMenu((current) => current === menu ? null : menu);

  return (
    <View style={{ marginHorizontal: 16, marginTop: 17, borderRadius: 19, overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
      <Pressable
        onPress={() => { setExpanded((value) => !value); setOpenMenu(null); }}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Close playback options' : 'Open playback options'}
        testID="playback-options-toggle"
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 12 }}
      >
        <View style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: 'rgba(228,17,17,.14)', alignItems: 'center', justifyContent: 'center', marginRight: 9 }}>
          <Ionicons name="options-outline" size={16} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.primary, fontFamily: 'Outfit_700Bold', fontSize: 8, letterSpacing: 1.25 }}>WATCH SETUP</Text>
          <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 13, marginTop: 2 }}>
            {props.isSeries ? `Season ${props.selectedSeason} · Episode ${props.selectedEpisode}` : 'Playback options'}
          </Text>
        </View>
        <View style={{ paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, backgroundColor: colors.secondary, marginRight: 7 }}>
          <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 9 }}>{selectedQuality}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
      </Pressable>

      {expanded ? (
        <View style={{ paddingHorizontal: 11, paddingBottom: 11 }}>
          <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 10 }} />
          <View style={{ flexDirection: 'row', gap: 5 }}>
            <DropdownTrigger label="Audio" value={audioLabel} open={openMenu === 'audio'} onPress={() => selectMenu('audio')} testID="audio-selector" disabled={!!props.actionLoading} />
            <DropdownTrigger label="Subs" value={subtitleLabel} open={openMenu === 'subtitle'} onPress={() => selectMenu('subtitle')} testID="subtitle-selector" disabled={!!props.actionLoading} />
            <DropdownTrigger label="Res" value={selectedQuality} open={openMenu === 'quality'} onPress={() => selectMenu('quality')} testID="resolution-selector" disabled={!!props.actionLoading} />
            {props.isSeries ? (
              <DropdownTrigger
                label="Season"
                value={`S${props.selectedSeason}`}
                open={openMenu === 'season'}
                onPress={() => selectMenu('season')}
                testID="season-selector"
                disabled={!!props.actionLoading}
              />
            ) : null}
          </View>

          {openMenu === 'audio' ? (
            <View style={{ marginTop: 6, padding: 5, borderRadius: 13, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}>
              <Choice label="Auto / original" selected={props.selectedAudio === 'auto'} onPress={() => { props.onAudioChange('auto'); setOpenMenu(null); }} />
              {uniqueAudioTracks.map((track) => {
                const key = track.id || track.code || track.label;
                return <Choice key={key} label={track.label} selected={props.selectedAudio === key || props.selectedAudio === track.code} onPress={() => { props.onAudioChange(key); setOpenMenu(null); }} />;
              })}
              {!uniqueAudioTracks.length ? <Text style={{ color: colors.mutedForeground, fontSize: 10, lineHeight: 15, paddingHorizontal: 9, paddingVertical: 6 }}>Extra tracks may appear when playback starts.</Text> : null}
            </View>
          ) : null}

          {openMenu === 'subtitle' ? (
            <View style={{ marginTop: 6, padding: 5, borderRadius: 13, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}>
              <Choice label="Off" selected={!props.selectedSubtitle} onPress={() => { props.onSubtitleChange(''); setOpenMenu(null); }} />
              {props.subtitlesLoading ? <Text style={{ color: colors.mutedForeground, fontSize: 10, paddingHorizontal: 9, paddingVertical: 6 }}>Loading subtitle choices…</Text> : null}
              {props.subtitles.map((subtitle) => (
                <Choice key={`${subtitle.code}-${subtitle.url}`} label={subtitle.language} selected={props.selectedSubtitle === subtitle.url} onPress={() => { props.onSubtitleChange(subtitle.url); setOpenMenu(null); }} />
              ))}
              {!props.subtitlesLoading && !props.subtitles.length ? <Text style={{ color: colors.mutedForeground, fontSize: 10, lineHeight: 15, paddingHorizontal: 9, paddingVertical: 6 }}>No subtitle tracks were supplied.</Text> : null}
            </View>
          ) : null}

          {openMenu === 'quality' ? (
            <View style={{ marginTop: 6, padding: 5, borderRadius: 13, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}>
              {props.streams.map((stream) => (
                <Choice
                  key={stream.id}
                  label={`${stream.quality}p`}
                  selected={activeStream?.id === stream.id}
                  onPress={() => { props.onStreamChange(stream.id); setOpenMenu(null); }}
                />
              ))}
              {!props.streams.length ? <Text style={{ color: colors.mutedForeground, fontSize: 10, paddingHorizontal: 9, paddingVertical: 6 }}>Resolutions appear when sources load.</Text> : null}
            </View>
          ) : null}

          {openMenu === 'season' ? (
            <View style={{ marginTop: 6, padding: 5, borderRadius: 13, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}>
              {props.seasons.map((season) => (
                <Choice key={season.number} label={season.label} detail={`${season.episodes.length} episodes`} selected={props.selectedSeason === season.number} onPress={() => { props.onSeasonChange(season.number); setOpenMenu(null); }} />
              ))}
            </View>
          ) : null}

          {!props.isSeries ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 3 }}>
              <Ionicons name="document-text-outline" size={12} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_500Medium', fontSize: 9 }}>File size</Text>
              <Text style={{ flex: 1, textAlign: 'right', color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 10 }}>
                {activeStream?.size && activeStream.size !== '—' ? activeStream.size : 'Unavailable'}
              </Text>
            </View>
          ) : null}

          <View style={{ marginTop: props.isSeries ? 12 : 8 }}>
            {props.isSeries ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 12 }}>Episodes</Text>
                {selectedSeason?.episodes.length ? (
                  <Pressable
                    onPress={props.onSelectAllEpisodes}
                    accessibilityRole="button"
                    accessibilityLabel={allEpisodesSelected ? 'Clear all episode download selections' : 'Select all episodes for download'}
                    disabled={!!props.actionLoading}
                    testID="select-all-episodes"
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 6, opacity: props.actionLoading ? 0.55 : 1 }}
                  >
                    <Ionicons name={allEpisodesSelected ? 'remove-circle-outline' : 'checkmark-done-outline'} size={13} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontFamily: 'Outfit_600SemiBold', fontSize: 9 }}>
                      {allEpisodesSelected ? 'Clear all' : 'Select all'}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            {props.loading ? <InlineLoader label="Finding playable options…"/> : null}
            {!props.loading && props.error ? (
              <View style={{ padding: 10, borderRadius: 12, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 10, lineHeight: 15 }}>{props.error}</Text>
                <Pressable onPress={props.onRetry} accessibilityLabel="Retry loading playback options" style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7, alignSelf: 'flex-start' }}>
                  <Ionicons name="refresh" size={12} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontFamily: 'Outfit_600SemiBold', fontSize: 10 }}>Try again</Text>
                </Pressable>
              </View>
            ) : null}

            {props.isSeries ? (
              <View style={{ gap: 6 }}>
                {(selectedSeason?.episodes || []).map((episode) => {
                  const isPlaying = episode.number === props.selectedEpisode;
                  const isForDownload = props.selectedDownloadEpisodes.includes(episode.number);
                  const duration = formatEpisodeDuration(episode.duration);
                  const resources = props.episodeResources?.[episode.number] || [];
                  const episodeResource = resources.find((resource) => resource.quality === activeStream?.quality) || resources[0];
                  const resourceLine = episodeResource?.size && episodeResource.size !== '—'
                    ? `${episodeResource.quality}p · ${episodeResource.size}${duration ? ` · ${duration}` : ''}`
                    : props.episodeResourcesLoading ? 'Checking file size…' : 'File size unavailable';
                  return (
                    <View
                      key={episode.number}
                      style={{ minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 6, padding: 7, borderRadius: 12, backgroundColor: isPlaying ? 'rgba(228,17,17,.1)' : colors.background, borderWidth: 1, borderColor: isPlaying ? colors.primary : colors.border }}
                    >
                      <Pressable
                        onPress={() => props.onToggleDownloadEpisode(episode.number)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isForDownload }}
                        accessibilityLabel={`${isForDownload ? 'Remove' : 'Add'} episode ${episode.number} ${episode.title} ${isForDownload ? 'from' : 'to'} downloads`}
                        disabled={!!props.actionLoading}
                        testID={`download-episode-${episode.number}`}
                        style={{ width: 26, height: 32, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <View style={{ width: 17, height: 17, borderRadius: 5, borderWidth: 1.3, borderColor: isForDownload ? colors.primary : colors.mutedForeground, backgroundColor: isForDownload ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                          {isForDownload ? <Ionicons name="checkmark" size={12} color={colors.primaryForeground} /> : null}
                        </View>
                      </Pressable>
                      <Pressable
                        onPress={() => props.onEpisodeChange(episode.number)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isPlaying }}
                        disabled={!!props.actionLoading}
                        testID={`episode-${episode.number}`}
                        style={{ flex: 1, minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7 }}
                      >
                        <View style={{ width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: isPlaying ? colors.primary : colors.secondary }}>
                          <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 9 }}>{String(episode.number).padStart(2, '0')}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text numberOfLines={1} style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 10.5 }}>{episode.title}</Text>
                          <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 8.5, marginTop: 2 }}>{resourceLine}</Text>
                        </View>
                        {isPlaying ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }} /> : null}
                      </Pressable>
                    </View>
                  );
                })}
                {!selectedSeason?.episodes.length ? <Text style={{ color: colors.mutedForeground, fontSize: 10, lineHeight: 15 }}>Episode details are not available for this season.</Text> : null}
                <Pressable
                  onPress={props.onDownloadEpisodes}
                  disabled={!props.selectedDownloadEpisodes.length || !!props.actionLoading}
                  accessibilityRole="button"
                  accessibilityLabel={`Download ${props.selectedDownloadEpisodes.length} selected episodes`}
                  testID="download-selected-episodes"
                  style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 2, paddingHorizontal: 10, borderRadius: 12, backgroundColor: props.selectedDownloadEpisodes.length ? colors.secondary : colors.background, borderWidth: 1, borderColor: colors.border, opacity: props.selectedDownloadEpisodes.length ? 1 : 0.55 }}
                >
                  <Ionicons name={props.actionLoading === 'download' ? 'refresh' : 'download-outline'} size={15} color={colors.primary} />
                  <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 10 }}>
                    {props.downloadProgress
                      ? `Preparing ${props.downloadProgress.current}/${props.downloadProgress.total}`
                      : `Download ${props.selectedDownloadEpisodes.length} selected`}
                  </Text>
                  {props.selectedDownloadEpisodes.length ? <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_500Medium', fontSize: 9 }}>{selectedQuality} · {selectedSizeLabel}</Text> : null}
                </Pressable>
              </View>
            ) : null}
          </View>

          {!props.isSeries ? (
            <Pressable
              onPress={props.onDownload}
              disabled={!activeStream || !!props.actionLoading}
              accessibilityLabel="Download selected resolution"
              testID="download-selected-stream"
              style={{ minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, borderRadius: 13, backgroundColor: activeStream ? colors.primary : colors.secondary, borderWidth: 1, borderColor: colors.border, opacity: activeStream ? 1 : 0.5 }}
            >
              <Ionicons name={props.actionLoading === 'download' ? 'refresh' : 'download-outline'} size={16} color={colors.primaryForeground} />
              <Text style={{ color: colors.primaryForeground, fontFamily: 'Outfit_700Bold', fontSize: 11 }}>
                {props.actionLoading === 'download' ? 'Preparing download…' : `Download ${selectedQuality}`}
              </Text>
            </Pressable>
          ) : null}
          {props.actionError ? <Text accessibilityRole="alert" style={{ color: colors.primary, fontSize: 11, lineHeight: 16, marginTop: 10 }}>{props.actionError}</Text> : null}
          {props.downloadNotice ? <Text style={{ color: colors.mutedForeground, fontSize: 11, lineHeight: 16, marginTop: 8 }}>{props.downloadNotice}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}
