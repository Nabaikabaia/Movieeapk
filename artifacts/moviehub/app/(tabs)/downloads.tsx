import React from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useDownloads, saveToDevice } from '@/lib/Downloads';
import { Empty } from '@/lib/ui';

const PARTIAL_PREVIEW_MIN_BYTES = 1024 * 1024;
const mb = (n: number) => n > 1024 ** 3
  ? `${(n / 1024 ** 3).toFixed(1)} GB`
  : n > 1024 ** 2
    ? `${(n / 1024 ** 2).toFixed(0)} MB`
    : n > 1024
      ? `${(n / 1024).toFixed(0)} KB`
      : '0 B';

export default function Downloads() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, pause, resume, remove, removeAll } = useDownloads();
  const finished = items.filter((item) => item.state === 'complete').length;
  const active = items.filter((item) => item.state === 'downloading').length;

  const openLocalVideo = (title: string, uri: string, downloadId: string, partial: boolean) => {
    router.push({
      pathname: '/player',
      params: { title, url: uri, local: '1', partial: partial ? '1' : '0', downloadId },
    });
  };

  const confirmDelete = (id: string, title: string) => {
    Alert.alert('Delete download?', `Remove ${title} from this device?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void remove(id) },
    ]);
  };

  const confirmDeleteAll = () => {
    Alert.alert('Delete all downloads?', `Remove all ${items.length} saved and in-progress videos from this device?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete all', style: 'destructive', onPress: () => void removeAll() },
    ]);
  };

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
          <Pressable
            onPress={confirmDeleteAll}
            accessibilityLabel="Delete all downloads"
            testID="delete-all-downloads"
            style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
          >
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
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(228,17,17,.14)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="play-forward-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 12 }}>Keep watching while it saves</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 3 }}>Some videos can play before the download finishes.</Text>
            </View>
          </View>

          <View style={{ gap: 12, marginTop: 17 }}>
            {items.map((item) => {
              const progress = item.total > 0 ? Math.min(1, item.bytes / item.total) : 0;
              const isComplete = item.state === 'complete';
              const canPreview = !isComplete && item.bytes >= PARTIAL_PREVIEW_MIN_BYTES && Platform.OS !== 'web';
              const previewText = item.bytes >= PARTIAL_PREVIEW_MIN_BYTES
                ? `${mb(item.bytes)} saved so far`
                : 'Waiting for the first megabyte';

              return (
                <View key={item.id} style={{ padding: 14, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 48, height: 58, borderRadius: 11, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      <Ionicons
                        name={isComplete ? 'checkmark-circle' : item.state === 'error' ? 'alert-circle-outline' : 'film-outline'}
                        size={23}
                        color={isComplete ? '#67C78B' : item.state === 'error' ? colors.destructive : colors.primary}
                      />
                    </View>
                    <Pressable
                      onPress={() => {
                        const uri = item.localUri || (isComplete ? item.uri : '');
                        if (uri) openLocalVideo(item.title, uri, item.id, false);
                      }}
                      disabled={!isComplete}
                      style={{ flex: 1 }}
                    >
                      <Text numberOfLines={1} style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 13 }}>{item.title}</Text>
                      <Text numberOfLines={2} style={{ color: colors.mutedForeground, fontSize: 10, lineHeight: 15, marginTop: 5 }}>
                        {isComplete
                          ? `Ready offline · ${mb(item.bytes || item.total)}`
                          : item.error || `${item.state === 'downloading' ? 'Downloading' : item.state === 'paused' ? 'Paused' : 'Waiting'} · ${mb(item.bytes)}${item.total > 0 ? ` of ${mb(item.total)}` : ''}`}
                      </Text>
                    </Pressable>
                    {item.state === 'downloading' ? (
                      <Pressable onPress={() => void pause(item.id)} accessibilityLabel="Pause download" testID={`pause-${item.id}`} style={{ padding: 6 }}>
                        <Ionicons name="pause-circle" size={27} color={colors.foreground} />
                      </Pressable>
                    ) : item.state === 'paused' || item.state === 'error' || item.state === 'queued' ? (
                      <Pressable onPress={() => void resume(item.id)} accessibilityLabel="Continue download" testID={`resume-${item.id}`} style={{ padding: 6 }}>
                        <Ionicons name="play-circle" size={27} color={colors.primary} />
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => void saveToDevice(item.localUri || item.uri).then(() => Alert.alert('Saved to device', 'This video is now in your Android video library.')).catch((error) => Alert.alert('Permission needed', error.message))}
                        accessibilityLabel="Save to device video library"
                        style={{ padding: 6 }}
                      >
                        <Ionicons name="share-outline" size={20} color={colors.primary} />
                      </Pressable>
                    )}
                    <Pressable onPress={() => confirmDelete(item.id, item.title)} accessibilityLabel="Delete download" testID={`delete-${item.id}`} style={{ padding: 6 }}>
                      <Ionicons name="trash-outline" size={18} color={colors.mutedForeground} />
                    </Pressable>
                  </View>

                  {item.state === 'downloading' || item.state === 'paused' || item.state === 'error' || item.state === 'queued' ? (
                    <View style={{ marginTop: 13 }}>
                      <View style={{ height: 5, borderRadius: 4, backgroundColor: colors.secondary, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${Math.max(item.bytes > 0 ? 3 : 0, progress * 100)}%`, backgroundColor: colors.primary }} />
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 7 }}>
                        <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>{previewText}</Text>
                        {item.total > 0 ? <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_600SemiBold', fontSize: 10 }}>{Math.round(progress * 100)}%</Text> : null}
                      </View>
                      <Pressable
                        onPress={() => openLocalVideo(item.title, item.uri, item.id, true)}
                        disabled={!canPreview}
                        accessibilityLabel={canPreview ? 'Play the downloaded portion' : 'Wait for more of the download before previewing'}
                        testID={`play-partial-${item.id}`}
                        style={{ minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12, borderRadius: 14, backgroundColor: canPreview ? 'rgba(228,17,17,.13)' : colors.secondary, borderWidth: 1, borderColor: canPreview ? 'rgba(228,17,17,.35)' : colors.border, opacity: canPreview ? 1 : 0.68 }}
                      >
                        <Ionicons name="play" size={14} color={canPreview ? colors.primary : colors.mutedForeground} />
                        <Text style={{ color: canPreview ? colors.foreground : colors.mutedForeground, fontFamily: 'Outfit_600SemiBold', fontSize: 11 }}>
                          {canPreview ? 'Watch downloaded portion' : 'Preparing preview'}
                        </Text>
                        {item.state === 'downloading' ? <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>· keeps downloading</Text> : null}
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => openLocalVideo(item.title, item.localUri || item.uri, item.id, false)}
                      testID={`play-download-${item.id}`}
                      style={{ minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12, borderRadius: 14, backgroundColor: colors.primary }}
                    >
                      <Ionicons name="play" size={14} color={colors.primaryForeground} />
                      <Text style={{ color: colors.primaryForeground, fontFamily: 'Outfit_700Bold', fontSize: 11 }}>Play offline</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}
