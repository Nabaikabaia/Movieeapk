import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { GENRES, MOVIE_CATEGORIES } from '@/lib/catalog';
import { findMoviesPage, getMoviesPage, Movie } from '@/lib/providers';
import { Empty, Loading, Problem } from '@/lib/ui';

const PAGE_SIZE = 20;
type BrowseFilter = { kind: 'category' | 'genre'; slug: string };

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function Discover() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string | string[]; genre?: string | string[] }>();
  const [selected, setSelected] = useState<BrowseFilter>(() => ({
    kind: firstParam(params.genre) ? 'genre' : 'category',
    slug: firstParam(params.genre) || firstParam(params.slug) || 'popular',
  }));

  useEffect(() => {
    const genre = firstParam(params.genre);
    const slug = firstParam(params.slug);
    if (genre) setSelected({ kind: 'genre', slug: genre });
    else if (slug) setSelected({ kind: 'category', slug });
  }, [params.genre, params.slug]);

  const genre = selected.kind === 'genre' ? GENRES.find((item) => item.slug === selected.slug) : undefined;
  const category = selected.kind === 'category' ? MOVIE_CATEGORIES.find((item) => item.slug === selected.slug) : undefined;
  const query = useInfiniteQuery({
    queryKey: ['browse-list', 'page-v2', selected.kind, selected.slug],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => selected.kind === 'genre'
      ? findMoviesPage(genre?.query || selected.slug, Number(pageParam), PAGE_SIZE)
      : getMoviesPage(selected.slug, Number(pageParam), PAGE_SIZE),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.currentPage + 1 : undefined,
    staleTime: 240_000,
  });
  const movies = useMemo(() => {
    const seen = new Set<string>();
    const pageItems = (query.data?.pages || []).flatMap((page) => {
      const legacyItems = page as unknown as Movie[];
      if (Array.isArray(legacyItems)) return legacyItems;
      return Array.isArray((page as any)?.items) ? (page as any).items as Movie[] : [];
    });
    return pageItems.filter((movie): movie is Movie => {
      if (!movie || typeof movie !== 'object' || movie.subjectId == null) return false;
      const id = String(movie.subjectId);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [query.data?.pages]);
  const title = genre?.label || category?.title || 'Popular';

  const selectCategory = (slug: string) => setSelected({ kind: 'category', slug });
  const selectGenre = (slug: string) => setSelected({ kind: 'genre', slug });
  const openMovie = (movie: Movie) => router.push({
    pathname: '/movie',
    params: { id: String(movie.subjectId), detailPath: String(movie.detailPath || '') },
  } as any);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: colors.foreground, fontFamily: 'Outfit_800ExtraBold', fontSize: 28 }}>Browse</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 2 }}>Find something worth watching.</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(tabs)/search' as any)}
            accessibilityRole="button"
            accessibilityLabel="Search movies and series"
            testID="browse-search"
            style={{ width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
          >
            <Ionicons name="search" size={19} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      <View style={{ flex: 1, flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border }}>
        <ScrollView
          style={{ width: 118, flexGrow: 0, borderRightWidth: 1, borderRightColor: colors.border }}
          contentContainerStyle={{ paddingHorizontal: 8, paddingTop: 12, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_700Bold', fontSize: 9, letterSpacing: 1.1, paddingHorizontal: 7, marginBottom: 7 }}>COLLECTIONS</Text>
          {MOVIE_CATEGORIES.map((item) => {
            const active = selected.kind === 'category' && selected.slug === item.slug;
            return (
              <Pressable
                key={item.slug}
                onPress={() => selectCategory(item.slug)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                testID={`browse-category-${item.slug}`}
                style={{ minHeight: 39, justifyContent: 'center', paddingHorizontal: 9, marginBottom: 3, borderRadius: 11, backgroundColor: active ? 'rgba(228,17,17,.15)' : 'transparent', borderLeftWidth: active ? 2 : 0, borderLeftColor: colors.primary }}
              >
                <Text numberOfLines={2} style={{ color: active ? colors.foreground : colors.mutedForeground, fontFamily: active ? 'Outfit_600SemiBold' : 'Outfit_500Medium', fontSize: 10, lineHeight: 14 }}>
                  {item.title}
                </Text>
              </Pressable>
            );
          })}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 11 }} />
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_700Bold', fontSize: 9, letterSpacing: 1.1, paddingHorizontal: 7, marginBottom: 7 }}>GENRES</Text>
          {GENRES.map((item) => {
            const active = selected.kind === 'genre' && selected.slug === item.slug;
            return (
              <Pressable
                key={item.slug}
                onPress={() => selectGenre(item.slug)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                testID={`browse-genre-${item.slug}`}
                style={{ minHeight: 38, justifyContent: 'center', paddingHorizontal: 9, marginBottom: 3, borderRadius: 11, backgroundColor: active ? colors.secondary : 'transparent' }}
              >
                <Text numberOfLines={1} style={{ color: active ? colors.foreground : colors.mutedForeground, fontFamily: active ? 'Outfit_600SemiBold' : 'Outfit_500Medium', fontSize: 10 }}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ flex: 1, minWidth: 0 }}>
          <FlatList
            key={`${selected.kind}-${selected.slug}`}
            data={movies}
            keyExtractor={(movie) => String(movie.subjectId)}
            scrollEnabled={movies.length > 0}
            contentContainerStyle={{ paddingHorizontal: 11, paddingTop: 12, paddingBottom: insets.bottom + 103, flexGrow: movies.length ? undefined : 1 }}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            windowSize={7}
            onEndReached={() => {
              if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
            }}
            onEndReachedThreshold={0.6}
            ListHeaderComponent={
              <Animated.View key={`${selected.kind}-${selected.slug}-title`} entering={FadeIn.duration(220)} style={{ marginBottom: 11 }}>
                <Text numberOfLines={2} style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 14 }}>{title}</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 9, marginTop: 3 }}>
                  {movies.length ? `${movies.length} titles loaded` : 'Curated for your next watch'}
                </Text>
              </Animated.View>
            }
            ListEmptyComponent={
              query.isLoading
                ? <Loading label={`Loading ${title}…`} />
                : query.isError
                  ? <Problem message={query.error.message || 'Could not load titles.'} retry={() => void query.refetch()} />
                  : <Empty icon="film-outline" title="Nothing to show yet" subtitle="Choose another collection or genre to keep exploring." />
            }
            ListFooterComponent={
              query.isFetchingNextPage
                ? <View style={{ alignItems: 'center', gap: 7, paddingVertical: 16 }}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.mutedForeground, fontSize: 10 }}>Loading more titles…</Text></View>
                : query.hasNextPage
                  ? <Text style={{ color: colors.mutedForeground, textAlign: 'center', fontSize: 9, paddingVertical: 14 }}>Scroll for more</Text>
                : undefined
            }
            renderItem={({ item, index }) => {
              const image = item.cover?.url || item.coverUrl || item.poster;
              return (
                <Animated.View entering={FadeIn.delay(Math.min(index, 6) * 22).duration(260)}>
                  <Pressable
                    onPress={() => openMovie(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${item.title}`}
                    testID={`browse-title-${item.subjectId}`}
                    style={({ pressed }) => ({ flexDirection: 'row', gap: 10, minHeight: 110, padding: 8, marginBottom: 8, borderRadius: 15, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.8 : 1 })}
                  >
                    {image ? (
                      <Image source={{ uri: image }} contentFit="cover" cachePolicy="disk" transition={180} style={{ width: 67, height: 94, borderRadius: 11, backgroundColor: colors.secondary }} />
                    ) : (
                      <View style={{ width: 67, height: 94, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary }}>
                        <Ionicons name="film-outline" size={23} color={colors.mutedForeground} />
                      </View>
                    )}
                    <View style={{ flex: 1, justifyContent: 'center' }}>
                      <Text numberOfLines={2} style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 12, lineHeight: 16 }}>{item.title}</Text>
                      <Text numberOfLines={1} style={{ color: colors.primary, fontFamily: 'Outfit_500Medium', fontSize: 9, marginTop: 4 }}>
                        {item.releaseDate?.slice(0, 4) || (item.subjectType === 2 ? 'Series' : 'Movie')}
                        {item.imdbRatingValue ? `  ·  ★ ${item.imdbRatingValue}` : ''}
                      </Text>
                      <Text numberOfLines={3} style={{ color: colors.mutedForeground, fontSize: 9, lineHeight: 13, marginTop: 6 }}>
                        {item.description || 'Open to view the story, cast, and available streams.'}
                      </Text>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            }}
          />
        </View>
      </View>
    </View>
  );
}
