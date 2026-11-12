import React, { useMemo } from 'react';
import {
  Pressable,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQueries } from '@tanstack/react-query';
import { FadeInDown } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { GENRES, MOVIE_CATEGORIES } from '@/lib/catalog';
import { getMovies, Movie } from '@/lib/providers';
import { Problem, Rail, RailSkeleton } from '@/lib/ui';
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeCategoryCount, setActiveCategoryCount] = useState(3);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const categoryOffsets = useRef<Record<number, number>>({});
  const categoryQueries = useQueries({
    queries: MOVIE_CATEGORIES.map((category, index) => ({
      queryKey: ['moviehub', 'homepage-category', category.slug],
      queryFn: () => getMovies(category.slug, 1, 14),
      enabled: index < activeCategoryCount,
      staleTime: 300_000,
      retry: 1,
    })),
  });

  const heroSlides = useMemo(() => {
    const seen = new Set<string>();
    return categoryQueries.flatMap((query) => query.data || [])
      .filter((movie) => {
        const id = String(movie.subjectId);
        if (!(movie.cover?.url || movie.coverUrl || movie.poster) || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .slice(0, 8);
  }, [categoryQueries]);
  const hero = heroSlides.length ? heroSlides[carouselIndex % heroSlides.length] : undefined;

  useEffect(() => {
    if (heroSlides.length < 2) return undefined;
    const timer = setTimeout(() => {
      setCarouselIndex((index) => (index + 1) % heroSlides.length);
    }, 4000);
    return () => clearTimeout(timer);
  }, [carouselIndex, heroSlides.length]);

  const loadVisibleCategories = (event: any) => {
    const { contentOffset, layoutMeasurement } = event.nativeEvent;
    const near = contentOffset.y + layoutMeasurement.height * 1.35;
    const nextIndex = Object.entries(categoryOffsets.current)
      .map(([index, top]) => [Number(index), top] as const)
      .filter(([index, top]) => index >= activeCategoryCount && top <= near)
      .map(([index]) => index)
      .sort((a, b) => a - b)[0];
    if (nextIndex !== undefined) {
      setActiveCategoryCount((count) => Math.max(count, Math.min(MOVIE_CATEGORIES.length, nextIndex + 3)));
    }
  };
  const homeCategoryItems = (index: number): Movie[] => {
    return categoryQueries[index]?.data || [];
  };
  const hasCatalogData = categoryQueries.some((query) => !!query.data?.length);
  const loadingCatalog = categoryQueries.slice(0, activeCategoryCount).some((query) => query.isFetching);
  const activeQueries = categoryQueries.slice(0, activeCategoryCount);
  const allCatalogRequestsFailed = activeQueries.length > 0 && activeQueries.every((query) => query.isError);
  const refreshCatalog = () => Promise.all(categoryQueries.slice(0, activeCategoryCount).map((query) => query.refetch()));
  const openMovie = (movie: Movie) =>
    router.push({ pathname: '/movie', params: { id: String(movie.subjectId), detailPath: String(movie.detailPath || '') } });
  const openGenre = (slug: string) =>
    router.push({ pathname: '/(tabs)/discover', params: { genre: slug } } as any);
  const openCategory = (slug: string) =>
    router.push({ pathname: '/(tabs)/discover', params: { slug } } as any);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      refreshControl={
        <RefreshControl
          refreshing={categoryQueries.some((query) => query.isRefetching)}
          onRefresh={() => void refreshCatalog()}
          tintColor={colors.primary}
        />
      }
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      onScroll={loadVisibleCategories}
      scrollEventThrottle={240}
    >
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <View>
          <Text style={{ color: colors.foreground, fontFamily: 'Outfit_800ExtraBold', fontSize: 24 }}>
            Nãbēēs
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 10, letterSpacing: 2.4, marginTop: -3 }}>
            MOVIEHUB
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { icon: 'search-outline', label: 'Search', path: '/(tabs)/search' },
            { icon: 'bookmark-outline', label: 'Library', path: '/(tabs)/library' },
          ].map((item) => (
            <Pressable
              key={item.label}
              onPress={() => router.push(item.path as any)}
              accessibilityLabel={item.label}
              style={{
                width: 42,
                height: 42,
                borderRadius: 22,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={item.icon as any} color={colors.foreground} size={19} />
            </Pressable>
          ))}
        </View>
      </View>

      {!hasCatalogData && loadingCatalog ? (
        <View style={{ height: 185, marginHorizontal: 14, borderRadius: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 20, justifyContent: 'flex-end', overflow: 'hidden' }}>
          <View style={{ width: 104, height: 8, backgroundColor: colors.secondary, borderRadius: 8, marginBottom: 12 }} />
          <View style={{ width: '76%', height: 22, backgroundColor: colors.secondary, borderRadius: 8, marginBottom: 9 }} />
          <View style={{ width: '58%', height: 11, backgroundColor: colors.secondary, borderRadius: 8 }} />
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_500Medium', marginTop: 13 }}>Finding your next watch…</Text>
        </View>
      ) : null}

      {!hasCatalogData && allCatalogRequestsFailed ? (
        <Problem
          message="The movie catalog could not be reached. Check your connection and try again."
          retry={() => void refreshCatalog()}
        />
      ) : null}

      {hero && (
        <View style={{ marginTop: 2, marginBottom: 5 }}>
          <View style={{ height: 390, marginHorizontal: 14, overflow: 'hidden', position: 'relative' }}>
            {heroSlides.length > 1 && [1, -1].map((offset) => {
              const index = (carouselIndex + offset + heroSlides.length) % heroSlides.length;
              const movie = heroSlides[index];
              const isLeft = offset === -1;
              return (
                <Animated.View
                  key={`${isLeft ? 'left' : 'right'}-${movie.subjectId}`}
                  entering={FadeInDown.duration(420)}
                  style={{
                    position: 'absolute',
                    left: isLeft ? '-38%' : '79%',
                    top: 12,
                    width: '59%',
                    height: 352,
                    zIndex: 1,
                  }}
                >
                  <Animated.View
                    style={{
                      flex: 1,
                    borderRadius: 23,
                    overflow: 'hidden',
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                    opacity: 0.74,
                    transform: Platform.OS === 'web'
                      ? [{ rotate: isLeft ? '-7deg' : '7deg' }, { scale: 0.86 }]
                      : [{ perspective: 900 }, { rotateY: isLeft ? '17deg' : '-17deg' }, { rotate: isLeft ? '-5deg' : '5deg' }, { scale: 0.86 }],
                  }}
                  >
                  <Pressable
                    onPress={() => setCarouselIndex(index)}
                    accessibilityLabel={`Show ${movie.title}`}
                    style={{ flex: 1 }}
                  >
                    <Image
                      source={{ uri: movie.cover?.url || movie.coverUrl || movie.poster || '' }}
                      contentFit="cover"
                      cachePolicy="disk"
                      transition={300}
                      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
                    />
                    <LinearGradient
                      colors={['rgba(8,9,11,.04)', 'rgba(8,9,11,.9)']}
                      style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
                    />
                    <View style={{ position: 'absolute', left: 12, right: 12, bottom: 17 }}>
                      <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,.72)', fontSize: 9, letterSpacing: 1.7, fontFamily: 'Outfit_700Bold', marginBottom: 5 }}>
                        {isLeft ? 'PREVIOUS' : 'UP NEXT'}
                      </Text>
                      <Text numberOfLines={2} style={{ color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 14, lineHeight: 17 }}>
                        {movie.title}
                      </Text>
                    </View>
                  </Pressable>
                  </Animated.View>
                </Animated.View>
              );
            })}

            <Animated.View
              key={String(hero.subjectId)}
              entering={FadeInDown.duration(500)}
              style={{
                position: 'absolute',
                left: '16%',
                top: 0,
                width: '68%',
                height: 378,
                zIndex: 2,
                borderRadius: 25,
                overflow: 'hidden',
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,.32)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 15 },
                shadowOpacity: 0.42,
                shadowRadius: 20,
                elevation: 12,
              }}
            >
              <Image
                source={{ uri: hero.cover?.url || hero.coverUrl || hero.poster || '' }}
                contentFit="cover"
                cachePolicy="disk"
                transition={360}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
              />
              <LinearGradient
                colors={['rgba(8,9,11,.06)', 'rgba(8,9,11,.08)', 'rgba(8,9,11,.96)']}
                locations={[0, 0.38, 1]}
                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
              />
              <View style={{ position: 'absolute', top: 16, left: 15, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <View style={{ backgroundColor: colors.primary, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 5 }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontFamily: 'Outfit_700Bold', letterSpacing: 1.2 }}>FEATURED</Text>
                </View>
                <Text style={{ color: '#fff', fontFamily: 'Outfit_600SemiBold', fontSize: 11 }}>
                  {hero.imdbRatingValue || hero.rating || 'NEW'}
                </Text>
              </View>

              <View style={{ position: 'absolute', left: 16, right: 15, bottom: 17 }}>
                <Text numberOfLines={2} style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 27, lineHeight: 31, color: '#fff' }}>
                  {hero.title}
                </Text>
                <Text numberOfLines={2} style={{ fontSize: 11, lineHeight: 16, color: 'rgba(255,255,255,.76)', marginTop: 6 }}>
                  {hero.description || hero.releaseDate?.slice(0, 4) || 'A story worth staying in for.'}
                </Text>
                <Pressable
                  onPress={() => openMovie(hero)}
                  testID="hero-play"
                  accessibilityLabel={`Explore ${hero.title}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    alignSelf: 'flex-start',
                    gap: 7,
                    backgroundColor: '#fff',
                    borderRadius: 22,
                    paddingVertical: 10,
                    paddingHorizontal: 15,
                    marginTop: 12,
                  }}
                >
                  <Ionicons name="play" size={15} color="#101114" />
                  <Text style={{ color: '#101114', fontFamily: 'Outfit_700Bold', fontSize: 12 }}>Explore title</Text>
                </Pressable>
              </View>
            </Animated.View>

            {heroSlides.length > 1 ? (
              <>
                <Pressable
                  onPress={() => setCarouselIndex((index) => (index - 1 + heroSlides.length) % heroSlides.length)}
                  accessibilityLabel="Previous featured title"
                  testID="hero-previous"
                  style={{ position: 'absolute', left: 5, top: '43%', width: 38, height: 38, borderRadius: 21, backgroundColor: 'rgba(8,9,11,.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,.26)', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}
                >
                  <Ionicons name="chevron-back" size={19} color="#fff" />
                </Pressable>
                <Pressable
                  onPress={() => setCarouselIndex((index) => (index + 1) % heroSlides.length)}
                  accessibilityLabel="Next featured title"
                  testID="hero-next"
                  style={{ position: 'absolute', right: 5, top: '43%', width: 38, height: 38, borderRadius: 21, backgroundColor: 'rgba(8,9,11,.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,.26)', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}
                >
                  <Ionicons name="chevron-forward" size={19} color="#fff" />
                </Pressable>
              </>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 3 }}>
            {heroSlides.slice(0, 6).map((slide, index) => (
              <Pressable
                key={String(slide.subjectId)}
                onPress={() => setCarouselIndex(index)}
                accessibilityLabel={`Show featured title ${index + 1}`}
                style={{
                  width: index === carouselIndex % heroSlides.length ? 22 : 5,
                  height: 5,
                  borderRadius: 4,
                  backgroundColor: index === carouselIndex % heroSlides.length ? colors.primary : colors.mutedForeground,
                }}
              />
            ))}
            <Text style={{ marginLeft: 6, color: colors.mutedForeground, fontSize: 9, letterSpacing: 1.4, fontFamily: 'Outfit_600SemiBold' }}>
              {String((carouselIndex % heroSlides.length) + 1).padStart(2, '0')} / {String(heroSlides.length).padStart(2, '0')}
            </Text>
          </View>
        </View>
      )}

      <Animated.View entering={FadeInDown.delay(100).duration(480)}>
        <View style={{ paddingHorizontal: 20, marginTop: 24, marginBottom: 10 }}>
          <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 19 }}>
            Your channels
          </Text>
          <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 3 }}>
            Jump straight into what you want to watch.
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 9, paddingHorizontal: 16 }}>
          {[
            { icon: 'football-outline', label: 'Sports', path: '/(tabs)/sports' },
            { icon: 'globe-outline', label: 'IPTV', path: '/(tabs)/iptv' },
            { icon: 'planet-outline', label: 'Pluto TV', path: '/(tabs)/pluto' },
          ].map((item) => (
            <Pressable
              key={item.label}
              onPress={() => router.push(item.path as any)}
              style={{
                flex: 1,
                alignItems: 'center',
                gap: 7,
                borderRadius: 16,
                paddingVertical: 13,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons name={item.icon as any} size={20} color={colors.primary} />
              <Text style={{ color: colors.foreground, fontSize: 11, fontFamily: 'Outfit_600SemiBold' }}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      <View style={{ marginTop: 25 }}>
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 19 }}>
            Explore by genre
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, gap: 9 }}>
          {GENRES.map((genre) => (
            <Pressable
              key={genre.slug}
              onPress={() => openGenre(genre.slug)}
              style={{
                paddingHorizontal: 15,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 12, fontFamily: 'Outfit_600SemiBold' }}>
                {genre.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={{ marginTop: 23 }}>
        <View style={{ paddingHorizontal: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="sparkles-outline" color={colors.primary} size={18} />
          <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 19 }}>
            Browse collections
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}>
          {MOVIE_CATEGORIES.map((category) => (
            <Pressable
              key={category.slug}
              onPress={() => openCategory(category.slug)}
              style={{
                borderRadius: 20,
                paddingHorizontal: 13,
                paddingVertical: 9,
                backgroundColor: 'rgba(255,255,255,.045)',
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Outfit_500Medium' }}>
                {category.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {MOVIE_CATEGORIES.map((category, index) => {
        const items = homeCategoryItems(index);
        if (!categoryQueries[index]?.isError && !items.length) {
          return (
            <View key={category.slug} onLayout={(event) => { categoryOffsets.current[index] = event.nativeEvent.layout.y; }}>
              <RailSkeleton title={category.title} />
            </View>
          );
        }
        if (!items.length) return null;
        return (
          <View key={category.slug} onLayout={(event) => { categoryOffsets.current[index] = event.nativeEvent.layout.y; }}>
            <Rail title={category.title} items={items.slice(0, 10)} onMovie={openMovie} />
          </View>
        );
      })}
    </ScrollView>
  );
}
