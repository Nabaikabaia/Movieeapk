import React from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { getStaffFilmography, isAdultContent } from '@/lib/providers';
import { Empty, Loading, Problem } from '@/lib/ui';
import type { Movie } from '@/lib/providers';
import { useUserPreferences } from '@/lib/UserPreferences';

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ActorFilmography() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { preferences } = useUserPreferences();
  const params = useLocalSearchParams<{ staffId?: string | string[]; name?: string | string[]; avatarUrl?: string | string[]; character?: string | string[] }>();
  const staffId = firstParam(params.staffId);
  const name = firstParam(params.name) || 'Actor';
  const avatarUrl = firstParam(params.avatarUrl);
  const character = firstParam(params.character);
  const filmography = useInfiniteQuery({
    queryKey: ['staff-filmography', staffId],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getStaffFilmography(staffId!, Number(pageParam), 24),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.currentPage + 1 : undefined,
    enabled: !!staffId,
    staleTime: 10 * 60 * 1000,
  });
  const movies: Movie[] = (filmography.data?.pages.flatMap((page) => page.items) || [])
    .filter((movie) => !preferences.parentalControlsEnabled || !isAdultContent(movie));
  const total = filmography.data?.pages[0]?.totalCount || movies.length;

  const openMovie = (movie: Movie) => router.push({
    pathname: '/movie',
    params: { id: String(movie.subjectId), detailPath: String(movie.detailPath || '') },
  } as any);

  const header = (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 17 }}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={{ width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginBottom: 17 }}>
        <Ionicons name="arrow-back" size={21} color={colors.foreground} />
      </Pressable>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 15, borderRadius: 21, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} contentFit="cover" cachePolicy="disk" transition={180} style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.secondary }} />
        ) : (
          <View style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary }}>
            <Ionicons name="person-outline" size={29} color={colors.mutedForeground} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text numberOfLines={2} style={{ color: colors.foreground, fontFamily: 'Outfit_800ExtraBold', fontSize: 20 }}>{name}</Text>
          {character ? <Text numberOfLines={1} style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>as {character}</Text> : null}
          <Text style={{ color: colors.primary, fontFamily: 'Outfit_600SemiBold', fontSize: 10, marginTop: 7 }}>
            {total} {total === 1 ? 'title' : 'titles'} · FILMOGRAPHY
          </Text>
        </View>
      </View>
      <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 19, marginTop: 22 }}>On screen</Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>Movies and series featuring {name}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {filmography.isLoading ? (
        <View style={{ flex: 1 }}>
          {header}
          <Loading label={`Loading ${name}’s filmography…`} />
        </View>
      ) : filmography.isError ? (
        <View style={{ flex: 1 }}>
          {header}
          <Problem message={filmography.error.message || 'Could not load this filmography.'} retry={() => void filmography.refetch()} />
        </View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(movie) => String(movie.subjectId)}
          ListHeaderComponent={header}
          ListEmptyComponent={<Empty icon="film-outline" title="No titles found" subtitle={`No movies or shows are listed for ${name} yet.`} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 36, flexGrow: movies.length ? undefined : 1 }}
          onEndReached={() => {
            if (filmography.hasNextPage && !filmography.isFetchingNextPage) void filmography.fetchNextPage();
          }}
          onEndReachedThreshold={0.55}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const image = item.cover?.url || item.coverUrl || item.poster;
            return (
              <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 30).duration(320)} style={{ paddingHorizontal: 18, marginBottom: 10 }}>
                <Pressable
                  onPress={() => openMovie(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${item.title}`}
                  testID={`filmography-${item.subjectId}`}
                  style={({ pressed }) => ({ flexDirection: 'row', gap: 12, minHeight: 110, padding: 10, borderRadius: 17, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.82 : 1 })}
                >
                  {image ? (
                    <Image source={{ uri: image }} contentFit="cover" cachePolicy="disk" transition={180} style={{ width: 68, height: 94, borderRadius: 12, backgroundColor: colors.secondary }} />
                  ) : (
                    <View style={{ width: 68, height: 94, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary }}>
                      <Ionicons name="film-outline" size={22} color={colors.mutedForeground} />
                    </View>
                  )}
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Text numberOfLines={2} style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 14 }}>{item.title}</Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 5 }}>
                      {item.releaseDate?.slice(0, 4) || (item.subjectType === 2 ? 'Series' : 'Movie')}
                      {item.imdbRatingValue ? `  ·  ★ ${item.imdbRatingValue}` : ''}
                    </Text>
                    <Text numberOfLines={2} style={{ color: colors.mutedForeground, fontSize: 10, lineHeight: 15, marginTop: 7 }}>
                      {item.description || 'Open to see details, available audio, and streaming options.'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={colors.mutedForeground} style={{ alignSelf: 'center' }} />
                </Pressable>
              </Animated.View>
            );
          }}
          ListFooterComponent={filmography.isFetchingNextPage ? <ActivityIndicator color={colors.primary} style={{ padding: 18 }} /> : undefined}
        />
      )}
    </View>
  );
}
