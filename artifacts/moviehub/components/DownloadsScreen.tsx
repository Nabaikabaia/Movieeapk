import React, { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { DownloadItem, useDownloads, saveToDevice } from '@/lib/Downloads';
import { Empty } from '@/lib/ui';

const PARTIAL_PREVIEW_MIN_BYTES = 1024 * 1024;
const mb = (n: number) => n > 1024 ** 3
  ? `${(n / 1024 ** 3).toFixed(1)} GB`
  : n > 1024 ** 2
    ? `${(n / 1024 ** 2).toFixed(0)} MB`
    : n > 1024
      ? `${(n / 1024).toFixed(0)} KB`
      : '0 B';

type EpisodeIdentity = {
  seriesKey: string;
  seriesTitle: string;
  season?: number;
  episode?: number;
  episodeTitle?: string;
};

function episodeIdentity(item: DownloadItem): EpisodeIdentity | null {
  if (item.seriesKey && item.seriesTitle) {
    return {
      seriesKey: item.seriesKey,
      seriesTitle: item.seriesTitle,
      season: item.season,
      episode: item.episode,
      episodeTitle: item.episodeTitle,
    };
  }
  const match = item.title.match(/^(.*?)\s+S(\d+)\s+E(\d+)\s*·\s*([^·]*)/i);
  if (!match) return null;
  const seriesTitle = match[1].trim();
  return {
    seriesKey: `legacy:${seriesTitle.toLowerCase()}`,
    seriesTitle,
    season: Number(match[2]),
    episode: Number(match[3]),
    episodeTitle: match[4].trim() || undefined,
  };
}

function progressCopy(item: DownloadItem) {
  const progress = Math.max(0, Math.min(1, item.watchProgress || 0));
  if (progress >= 0.95) return 'Watched';
  if (progress > 0) return `${Math.round(progress * 100)}% watched · resume where you left off`;
  return 'Not started';
}

export default function DownloadsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, pause, resume, remove, removeAll } = useDownloads();
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const finished = items.filter((item) => item.state === 'complete').length;
  const active = items.filter((item) => item.state === 'downloading').length;

  const { folders, movies } = useMemo(() => {
    const grouped = new Map<string, { key: string; title: string; posterUrl?: string; items: DownloadItem[] }>();
    const movieItems: DownloadItem[] = [];
    for (const item of items) {
      const identity = episodeIdentity(item);
      if (!identity) {
        movieItems.push(item);
        continue;
      }
      const group = grouped.get(identity.seriesKey) || {
        key: identity.seriesKey,
        title: identity.seriesTitle,
        posterUrl: item.posterUrl,
        items: [],
      };
      if (!group.posterUrl && item.posterUrl) group.posterUrl = item.posterUrl;
      group.items.push(item);
      grouped.set(identity.seriesKey, group);
    }
    for (const group of grouped.values()) {
      group.items.sort((a, b) => {
        const left = episodeIdentity(a);
        const right = episodeIdentity(b);
        return (left?.season || 0) - (right?.season || 0)
          || (left?.episode || 0) - (right?.episode || 0);
      });
    }
    return { folders: [...grouped.values()], movies: movieItems };
  }, [items]);

  const openLocalVideo = (item: DownloadItem, partial = false) => {
    const identity = episodeIdentity(item);
    const seasonEpisodes = identity
      ? items
          .filter((candidate) => {
            const candidateIdentity = episodeIdentity(candidate);
            return candidateIdentity?.seriesKey === identity.seriesKey
              && candidateIdentity.season === identity.season
              && candidateIdentity.episode;
          })
          .map((candidate) => episodeIdentity(candidate)?.episode)
          .filter((episode): episode is number => typeof episode === 'number' && Number.isFinite(episode))
          .sort((a, b) => a - b)
      : [];
    router.push({
      pathname: '/player',
      params: {
        title: identity?.seriesTitle || item.title,
        episodeTitle: identity?.episodeTitle || '',
        episodeNumbers: seasonEpisodes.join(','),
        season: identity?.season ? String(identity.season) : '',
        episode: identity?.episode ? String(identity.episode) : '',
        kind: identity ? 'series' : 'movie',
        url: item.localUri || item.uri,
        local: '1',
        partial: partial ? '1' : '0',
        downloadId: item.id,
      },
    });
  };

  const confirmDelete = (item: DownloadItem) => {
    Alert.alert('Delete download?', `Remove ${item.title} from this device?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void remove(item.id) },
    ]);
  };

  const confirmDeleteAll = () => {
    removeAll();
  };

  const progressBar = (value: number, color = colors.primary) => (
    <View style={{ height: 4, borderRadius: 4, backgroundColor: colors.secondary, overflow: 'hidden' }}>
      <View style={{ height: '100%', width: `${Math.max(value > 0 ? 3 : 0, value * 100)}%`, backgroundColor: color }} />
    </View>
  );

  const renderEpisode = (item: DownloadItem) => {
    const identity = episodeIdentity(item);
    const downloadProgress = item.total > 0 ? Math.min(1, item.bytes / item.total) : 0;
    const watchedProgress = Math.max(0, Math.min(1, item.watchProgress || 0));
    const isComplete = item.state === 'complete';
    const canPreview = !isComplete && item.bytes >= PARTIAL_PREVIEW_MIN_BYTES && Platform.OS !== 'web';
    return (
      <View key={item.id} style={{ padding: 12, borderRadius: 17, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <View style={{ width: 46, height: 56, borderRadius: 11, overflow: 'hidden', backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
            {item.posterUrl ? <Image source={{ uri: item.posterUrl }} contentFit="cover" cachePolicy="disk" transition={180} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="film-outline" size={20} color={colors.primary} />}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 12 }}>
              S{String(identity?.season || 1).padStart(2, '0')} · E{String(identity?.episode || 1).padStart(2, '0')}
            </Text>
            <Text numberOfLines={1} style={{ color: colors.foreground, fontFamily: 'Outfit_500Medium', fontSize: 10, marginTop: 3 }}>
              {identity?.episodeTitle || item.title}
            </Text>
            <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 9, marginTop: 3 }}>
              {isComplete ? `Ready offline · ${mb(item.bytes || item.total)}` : item.error || `${item.state === 'downloading' ? 'Downloading' : item.state === 'paused' ? 'Paused' : 'Waiting'} · ${mb(item.bytes)}${item.total > 0 ? ` of ${mb(item.total)}` : ''}`}
            </Text>
          </View>
          {item.state === 'downloading' ? (
            <Pressable onPress={() => void pause(item.id)} accessibilityLabel="Pause episode download" testID={`pause-${item.id}`} style={{ padding: 5 }}>
              <Ionicons name="pause-circle" size={26} color={colors.foreground} />
            </Pressable>
          ) : item.state === 'paused' || item.state === 'error' || item.state === 'queued' ? (
            <Pressable onPress={() => void resume(item.id)} accessibilityLabel="Continue episode download" testID={`resume-${item.id}`} style={{ padding: 5 }}>
              <Ionicons name="play-circle" size={26} color={colors.primary} />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => void saveToDevice(item.localUri || item.uri).then(() => Alert.alert('Saved to device', 'This video is now in your Android video library.')).catch((error) => Alert.alert('Permission needed', error.message))}
              accessibilityLabel="Save episode to device video library"
              style={{ padding: 5 }}
            >
              <Ionicons name="share-outline" size={19} color={colors.primary} />
            </Pressable>
          )}
          <Pressable onPress={() => confirmDelete(item)} accessibilityLabel="Delete episode download" testID={`delete-${item.id}`} style={{ padding: 5 }}>
            <Ionicons name="trash-outline" size={17} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {!isComplete ? (
          <View style={{ marginTop: 11, gap: 7 }}>
            {progressBar(downloadProgress)}
            <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>
              {item.total > 0 ? `${Math.round(downloadProgress * 100)}% downloaded` : `${mb(item.bytes)} downloaded`}
            </Text>
          </View>
        ) : null}

        <View style={{ marginTop: 10 }}>
          {progressBar(watchedProgress, watchedProgress >= 0.95 ? '#67C78B' : colors.primary)}
          <Text style={{ color: colors.mutedForeground, fontSize: 9, marginTop: 5 }}>{progressCopy(item)}</Text>
        </View>

        {isComplete ? (
          <Pressable
            onPress={() => openLocalVideo(item)}
            testID={`play-download-${item.id}`}
            style={{ minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10, borderRadius: 13, backgroundColor: colors.primary }}
          >
            <Ionicons name="play" size={13} color={colors.primaryForeground} />
            <Text style={{ color: colors.primaryForeground, fontFamily: 'Outfit_700Bold', fontSize: 10 }}>{watchedProgress > 0 && watchedProgress < 0.95 ? 'Continue episode' : 'Play offline'}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => openLocalVideo(item, true)}
            disabled={!canPreview}
            accessibilityLabel={canPreview ? 'Play the downloaded portion' : 'Wait for more of the download before previewing'}
            testID={`play-partial-${item.id}`}
            style={{ minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 10, borderRadius: 13, backgroundColor: canPreview ? `${colors.primary}20` : colors.secondary, borderWidth: 1, borderColor: canPreview ? `${colors.primary}55` : colors.border, opacity: canPreview ? 1 : 0.68 }}
          >
            <Ionicons name="play" size={13} color={canPreview ? colors.primary : colors.mutedForeground} />
            <Text style={{ color: canPreview ? colors.foreground : colors.mutedForeground, fontFamily: 'Outfit_600SemiBold', fontSize: 10 }}>{canPreview ? 'Watch downloaded portion' : 'Preparing preview'}</Text>
          </Pressable>
        )}
      </View>
    );
  };

  const renderMovie = (item: DownloadItem) => {
    const progress = item.total > 0 ? Math.min(1, item.bytes / item.total) : 0;
    const isComplete = item.state === 'complete';
    const canPreview = !isComplete && item.bytes >= PARTIAL_PREVIEW_MIN_BYTES && Platform.OS !== 'web';
    const watchProgress = Math.max(0, Math.min(1, item.watchProgress || 0));
    return (
      <View key={item.id} style={{ padding: 14, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 58, height: 70, borderRadius: 12, backgroundColor: colors.secondary, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
            {item.posterUrl ? <Image source={{ uri: item.posterUrl }} contentFit="cover" cachePolicy="disk" transition={180} style={{ width: '100%', height: '100%' }} /> : <Ionicons name={isComplete ? 'checkmark-circle' : 'film-outline'} size={23} color={isComplete ? '#67C78B' : colors.primary} />}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 13 }}>{item.title}</Text>
            <Text numberOfLines={2} style={{ color: colors.mutedForeground, fontSize: 10, lineHeight: 15, marginTop: 5 }}>
              {isComplete ? `Ready offline · ${mb(item.bytes || item.total)}` : item.error || `${item.state === 'downloading' ? 'Downloading' : item.state === 'paused' ? 'Paused' : 'Waiting'} · ${mb(item.bytes)}${item.total > 0 ? ` of ${mb(item.total)}` : ''}`}
            </Text>
          </View>
          {item.state === 'downloading' ? (
            <Pressable onPress={() => void pause(item.id)} accessibilityLabel="Pause download" testID={`pause-${item.id}`} style={{ padding: 6 }}>
              <Ionicons name="pause-circle" size={27} color={colors.foreground} />
            </Pressable>
          ) : item.state === 'paused' || item.state === 'error' || item.state === 'queued' ? (
            <Pressable onPress={() => void resume(item.id)} accessibilityLabel="Continue download" testID={`resume-${item.id}`} style={{ padding: 6 }}>
              <Ionicons name="play-circle" size={27} color={colors.primary} />
            </Pressable>
          ) : (
            <Pressable onPress={() => void saveToDevice(item.localUri || item.uri).then(() => Alert.alert('Saved to device', 'This video is now in your Android video library.')).catch((error) => Alert.alert('Permission needed', error.message))} accessibilityLabel="Save to device video library" style={{ padding: 6 }}>
              <Ionicons name="share-outline" size={20} color={colors.primary} />
            </Pressable>
          )}
          <Pressable onPress={() => confirmDelete(item)} accessibilityLabel="Delete download" testID={`delete-${item.id}`} style={{ padding: 6 }}>
            <Ionicons name="trash-outline" size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {!isComplete ? (
          <View style={{ marginTop: 13 }}>
            {progressBar(progress)}
            <Text style={{ color: colors.mutedForeground, fontSize: 9, marginTop: 6 }}>{item.total > 0 ? `${Math.round(progress * 100)}% downloaded` : `${mb(item.bytes)} downloaded`}</Text>
          </View>
        ) : null}
        <View style={{ marginTop: 10 }}>
          {progressBar(watchProgress, watchProgress >= 0.95 ? '#67C78B' : colors.primary)}
          <Text style={{ color: colors.mutedForeground, fontSize: 9, marginTop: 5 }}>{progressCopy(item)}</Text>
        </View>

        {isComplete ? (
          <Pressable onPress={() => openLocalVideo(item)} testID={`play-download-${item.id}`} style={{ minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12, borderRadius: 14, backgroundColor: colors.primary }}>
            <Ionicons name="play" size={14} color={colors.primaryForeground} />
            <Text style={{ color: colors.primaryForeground, fontFamily: 'Outfit_700Bold', fontSize: 11 }}>{watchProgress > 0 && watchProgress < 0.95 ? 'Continue watching' : 'Play offline'}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => openLocalVideo(item, true)}
            disabled={!canPreview}
            accessibilityLabel={canPreview ? 'Play the downloaded portion' : 'Wait for more of the download before previewing'}
            testID={`play-partial-${item.id}`}
            style={{ minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12, borderRadius: 14, backgroundColor: canPreview ? `${colors.primary}20` : colors.secondary, borderWidth: 1, borderColor: canPreview ? `${colors.primary}55` : colors.border, opacity: canPreview ? 1 : 0.68 }}
          >
            <Ionicons name="play" size={14} color={canPreview ? colors.primary : colors.mutedForeground} />
            <Text style={{ color: canPreview ? colors.foreground : colors.mutedForeground, fontFamily: 'Outfit_600SemiBold', fontSize: 11 }}>{canPreview ? 'Watch downloaded portion' : 'Preparing preview'}</Text>
            {item.state === 'downloading' ? <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>· keeps downloading</Text> : null}
          </Pressable>
        )}
      </View>
    );
  };

  const toggleFolder = (key: string) => setExpandedFolders((current) => current.includes(key)
    ? current.filter((item) => item !== key)
    : [...current, key]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: insets.top + 15, paddingHorizontal: 18, paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ color: colors.primary, fontFamily: 'Outfit_700Bold', fontSize: 9, letterSpacing: 1.5 }}>YOUR OFFLINE LIBRARY</Text>
          <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 29, color: colors.foreground, marginTop: 3 }}>Downloads</Text>
          <Text style={{ color: colors.mutedForeground, marginTop: 4, fontSize: 12 }}>{finished} ready · {active} in progress</Text>
        </View>
        {items.length > 0 ? (
          <Pressable onPress={confirmDeleteAll} accessibilityLabel="Delete all downloads" testID="delete-all-downloads" style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <Ionicons name="trash-outline" size={18} color={colors.destructive} />
          </Pressable>
        ) : null}
      </View>

      {!items.length ? (
        <View style={{ marginTop: 24, padding: 20, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
          <Empty icon="cloud-download-outline" title="Your offline cinema" subtitle="Save a movie from its playback options and it will appear here." />
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15, marginTop: 21, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: `${colors.primary}24`, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="play-forward-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 12 }}>Keep watching while it saves</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 3 }}>Downloaded episodes stay together in their series folder.</Text>
            </View>
          </View>

          {folders.length ? (
            <View style={{ gap: 11, marginTop: 17 }}>
              {folders.map((folder) => {
                const expanded = expandedFolders.includes(folder.key);
                const averageWatched = folder.items.reduce((sum, item) => sum + Math.max(0, Math.min(1, item.watchProgress || 0)), 0) / folder.items.length;
                const watchedEpisodes = folder.items.filter((item) => (item.watchProgress || 0) >= 0.95).length;
                const readyEpisodes = folder.items.filter((item) => item.state === 'complete').length;
                return (
                  <View key={folder.key} style={{ overflow: 'hidden', borderRadius: 21, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                    <Pressable onPress={() => toggleFolder(folder.key)} accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={`${expanded ? 'Collapse' : 'Open'} ${folder.title}, ${folder.items.length} downloaded episodes`} testID={`series-folder-${folder.key}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 }}>
                      <View style={{ width: 62, height: 78, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
                        {folder.posterUrl ? <Image source={{ uri: folder.posterUrl }} contentFit="cover" cachePolicy="disk" transition={200} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="albums-outline" size={25} color={colors.primary} />}
                        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: 'rgba(255,255,255,.28)' }}>
                          <View style={{ width: `${averageWatched * 100}%`, height: '100%', backgroundColor: averageWatched >= 0.95 ? '#67C78B' : colors.primary }} />
                        </View>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text numberOfLines={1} style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 14 }}>{folder.title}</Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 5 }}>{folder.items.length} episode{folder.items.length === 1 ? '' : 's'} · {readyEpisodes} ready</Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 9, marginTop: 4 }}>{watchedEpisodes} watched · {Math.round(averageWatched * 100)}% series progress</Text>
                        <View style={{ marginTop: 9 }}>{progressBar(averageWatched, averageWatched >= 0.95 ? '#67C78B' : colors.primary)}</View>
                      </View>
                      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
                    </Pressable>
                    {expanded ? (
                      <View style={{ gap: 9, paddingHorizontal: 11, paddingTop: 2, paddingBottom: 11, borderTopWidth: 1, borderTopColor: colors.border }}>
                        {folder.items.map(renderEpisode)}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          {movies.length ? (
            <View style={{ gap: 12, marginTop: folders.length ? 20 : 17 }}>
              {folders.length ? <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 16 }}>Movies</Text> : null}
              {movies.map(renderMovie)}
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
