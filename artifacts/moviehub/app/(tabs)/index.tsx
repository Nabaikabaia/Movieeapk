import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQueries } from '@tanstack/react-query';
import Animated, {
  Easing,
  Extrapolation,
  FadeInDown,
  interpolate,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { GENRES, MOVIE_CATEGORIES } from '@/lib/catalog';
import { findMovies, getMovies, isAdultContent, Movie } from '@/lib/providers';
import { useUserPreferences } from '@/lib/UserPreferences';
import { Problem, Rail, RailSkeleton } from '@/lib/ui';

type OrbitCardProps = {
  movie: Movie;
  offset: number;
  virtualPosition: number;
  progress: SharedValue<number>;
  screenWidth: number;
  colors: ReturnType<typeof useColors>;
  isActive: boolean;
  onPress: () => void;
  onExplore: () => void;
};

function FeaturedOrbitCard({
  movie,
  offset,
  virtualPosition,
  progress,
  screenWidth,
  colors,
  isActive,
  onPress,
  onExplore,
}: OrbitCardProps) {
  const orbitStyle = useAnimatedStyle(() => {
    const orbitPosition = virtualPosition - progress.value;
    const angle = orbitPosition * 38;
    const radians = (angle * Math.PI) / 180;
    const distance = Math.abs(orbitPosition);
    return {
      opacity: interpolate(distance, [0, 1, 1.45, 2], [1, 0.76, 0.22, 0], Extrapolation.CLAMP),
      zIndex: Math.round(12 - distance * 4),
      transform: [
        { perspective: 1000 },
        { translateX: Math.sin(radians) * screenWidth * 0.58 },
        { translateY: (1 - Math.cos(radians)) * 54 },
        { rotateY: `${-angle * 0.72}deg` },
        { rotate: `${angle * 0.075}deg` },
        { scale: interpolate(distance, [0, 1, 2], [1, 0.84, 0.62], Extrapolation.CLAMP) },
      ],
    };
  }, [virtualPosition, screenWidth]);

  return (
    <Animated.View
      pointerEvents={Math.abs(offset) > 1 ? 'none' : 'auto'}
      style={[{
        position: 'absolute',
        left: '16%',
        top: 0,
        width: '68%',
        height: 378,
        borderRadius: 25,
        overflow: 'hidden',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: isActive ? 'rgba(255,255,255,.32)' : colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: isActive ? 0.42 : 0.18,
        shadowRadius: 20,
        elevation: isActive ? 12 : 4,
      }, orbitStyle]}
    >
      <Image
        source={{ uri: movie.cover?.url || movie.coverUrl || movie.poster || '' }}
        contentFit="cover"
        cachePolicy="disk"
        transition={320}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      <LinearGradient
        colors={isActive
          ? ['rgba(8,9,11,.06)', 'rgba(8,9,11,.08)', 'rgba(8,9,11,.96)']
          : ['rgba(8,9,11,.04)', 'rgba(8,9,11,.9)']}
        locations={isActive ? [0, 0.38, 1] : undefined}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      {isActive ? (
        <>
          <View style={{ position: 'absolute', top: 16, left: 15, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <View style={{ backgroundColor: colors.primary, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 5 }}>
              <Text style={{ color: '#fff', fontSize: 9, fontFamily: 'Outfit_700Bold', letterSpacing: 1.2 }}>FEATURED</Text>
            </View>
            <Text style={{ color: '#fff', fontFamily: 'Outfit_600SemiBold', fontSize: 11 }}>
              {movie.imdbRatingValue || movie.rating || 'NEW'}
            </Text>
          </View>
          <View style={{ position: 'absolute', left: 16, right: 15, bottom: 17 }}>
            <Text numberOfLines={2} style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 27, lineHeight: 31, color: '#fff' }}>
              {movie.title}
            </Text>
            <Text numberOfLines={2} style={{ fontSize: 11, lineHeight: 16, color: 'rgba(255,255,255,.76)', marginTop: 6 }}>
              {movie.description || movie.releaseDate?.slice(0, 4) || 'A story worth staying in for.'}
            </Text>
            <Pressable
              onPress={onExplore}
              testID="hero-details"
              accessibilityRole="button"
              accessibilityLabel={`Open details for ${movie.title}`}
              style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, backgroundColor: '#fff', borderRadius: 22, paddingVertical: 10, paddingHorizontal: 15, marginTop: 12 }}
            >
              <Ionicons name="chevron-forward" size={15} color="#101114" />
              <Text style={{ color: '#101114', fontFamily: 'Outfit_700Bold', fontSize: 12 }}>Details</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={`Show ${movie.title}`}
          style={{ flex: 1, justifyContent: 'flex-end', padding: 12 }}
        >
          <Text numberOfLines={1} style={{ color: 'rgba(255,255,255,.72)', fontSize: 9, letterSpacing: 1.7, fontFamily: 'Outfit_700Bold', marginBottom: 5 }}>
            {offset < 0 ? 'PREVIOUS' : 'UP NEXT'}
          </Text>
          <Text numberOfLines={2} style={{ color: '#fff', fontFamily: 'Outfit_700Bold', fontSize: 14, lineHeight: 17 }}>
            {movie.title}
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

export default function Home() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { preferences, isReady, setAppTourComplete } = useUserPreferences();
  const [tourStep, setTourStep] = useState(0);
  const { width: screenWidth } = useWindowDimensions();
  const [activeCategoryCount, setActiveCategoryCount] = useState(3);
  const [carouselPosition, setCarouselPosition] = useState(0);
  const carouselTransitioning = useRef(false);
  const carouselProgress = useSharedValue(0);
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
  const preferredGenreQueries = useQueries({
    queries: preferences.preferredGenres.slice(0, 3).map((slug) => {
      const genre = GENRES.find((item) => item.slug === slug);
      return {
        queryKey: ['moviehub', 'preferred-genre', slug],
        queryFn: () => findMovies(genre?.query || slug, 1, 10),
        enabled: !!genre,
        staleTime: 300_000,
      };
    }),
  });

  const heroSlides = useMemo(() => {
    const seen = new Set<string>();
    return categoryQueries.flatMap((query) => query.data || [])
      .filter((movie) => {
        const id = String(movie.subjectId);
        if (preferences.parentalControlsEnabled && isAdultContent(movie)) return false;
        if (!(movie.cover?.url || movie.coverUrl || movie.poster) || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .slice(0, 8);
  }, [categoryQueries, preferences.parentalControlsEnabled]);
  const carouselIndex = heroSlides.length
    ? ((carouselPosition % heroSlides.length) + heroSlides.length) % heroSlides.length
    : 0;
  const hero = heroSlides.length ? heroSlides[carouselIndex] : undefined;
  const preferredMovies = useMemo(() => {
    const seen = new Set<string>();
    return preferredGenreQueries.flatMap((query) => query.data || []).filter((movie) => {
      const id = String(movie.subjectId);
      if (!id || (preferences.parentalControlsEnabled && isAdultContent(movie)) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [preferredGenreQueries, preferences.parentalControlsEnabled]);

  const unlockCarousel = useCallback(() => { carouselTransitioning.current = false; }, []);
  const settleCarouselCard = useCallback((nextIndex: number) => {
    setCarouselPosition(nextIndex);
    carouselTransitioning.current = false;
  }, []);
  const navigateCarousel = useCallback((direction: number) => {
    const length = heroSlides.length;
    if (length < 2 || carouselTransitioning.current) return;
    const step = direction >= 0 ? 1 : -1;
    const nextPosition = carouselPosition + step;
    carouselTransitioning.current = true;
    carouselProgress.value = withTiming(nextPosition, { duration: 760, easing: Easing.inOut(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(settleCarouselCard)(nextPosition);
      else runOnJS(unlockCarousel)();
    });
  }, [carouselPosition, carouselProgress, heroSlides.length, settleCarouselCard, unlockCarousel]);
  const carouselPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_event, gesture) => (
      Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2
    ),
    onMoveShouldSetPanResponderCapture: (_event, gesture) => (
      Math.abs(gesture.dx) > 18 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2
    ),
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dx < -42) navigateCarousel(1);
      else if (gesture.dx > 42) navigateCarousel(-1);
    },
    onPanResponderTerminationRequest: () => false,
  }), [navigateCarousel]);

  useEffect(() => {
    if (heroSlides.length < 2) return undefined;
    const timer = setTimeout(() => navigateCarousel(1), 4000);
    return () => clearTimeout(timer);
  }, [carouselIndex, heroSlides.length, navigateCarousel]);

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
    return (categoryQueries[index]?.data || []).filter((movie) => (
      !preferences.parentalControlsEnabled || !isAdultContent(movie)
    ));
  };
  const hasCatalogData = categoryQueries.some((query) => (
    query.data?.some((movie) => !preferences.parentalControlsEnabled || !isAdultContent(movie))
  ));
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
  const showFirstRunTour = isReady && preferences.onboardingComplete && !preferences.appTourComplete;
  const finishTour = () => setAppTourComplete(true);

  return (
    <>
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
            { icon: 'search-outline', label: 'Search', path: '/search' },
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
          <View
            {...carouselPanResponder.panHandlers}
            accessibilityLabel="Featured titles. Swipe left or right to rotate."
            style={{ height: 390, marginHorizontal: 14, overflow: 'hidden', position: 'relative' }}
          >
            {heroSlides.length > 1 && [-2, -1, 0, 1, 2].map((offset) => {
              const virtualPosition = carouselPosition + offset;
              const index = ((virtualPosition % heroSlides.length) + heroSlides.length) % heroSlides.length;
              const movie = heroSlides[index];
              return (
                <FeaturedOrbitCard
                  key={virtualPosition}
                  movie={movie}
                  offset={offset}
                  virtualPosition={virtualPosition}
                  progress={carouselProgress}
                  screenWidth={screenWidth}
                  colors={colors}
                  isActive={offset === 0}
                  onPress={() => navigateCarousel(offset < 0 ? -1 : 1)}
                  onExplore={() => openMovie(movie)}
                />
              );
            })}
          </View>

          <View accessibilityRole="progressbar" accessibilityValue={{ now: (carouselIndex % heroSlides.length) + 1, min: 1, max: heroSlides.length }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 3 }}>
            {heroSlides.slice(0, 6).map((slide, index) => (
              <View
                key={String(slide.subjectId)}
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

      {preferredMovies.length ? (
        <Rail title="Picked for you" items={preferredMovies} onMovie={openMovie} />
      ) : preferences.preferredGenres.length && preferredGenreQueries.some((query) => query.isLoading) ? (
        <RailSkeleton title="Picked for you" />
      ) : !preferences.preferredGenres.length ? (
        <Pressable
          onPress={() => router.push('/(tabs)/me' as any)}
          accessibilityRole="button"
          testID="set-preferred-genres"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 17, marginTop: 19, padding: 13, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
        >
          <Ionicons name="sparkles-outline" size={19} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 12 }}>Tune your recommendations</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 3 }}>Choose favorite genres in Me.</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        </Pressable>
      ) : null}

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
        if (!categoryQueries[index]?.isError && !categoryQueries[index]?.data) {
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
      <Modal
        visible={showFirstRunTour}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={finishTour}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.78)' }}>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 76, alignItems: 'center' }}>
            <View style={{ width: 1, height: 24, backgroundColor: 'rgba(255,255,255,.55)' }} />
            <View style={{ width: 8, height: 8, borderRadius: 5, backgroundColor: colors.primary, marginTop: -2 }} />
          </View>
          <Animated.View
            key={`tour-${tourStep}`}
            entering={FadeInDown.duration(250)}
            style={{ marginHorizontal: 17, marginBottom: insets.bottom + 91, padding: 18, borderRadius: 23, backgroundColor: 'rgba(24,24,27,.98)', borderWidth: 1, borderColor: 'rgba(255,255,255,.18)' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 6, height: 6, borderRadius: 4, backgroundColor: colors.primary }} />
                <Text style={{ color: colors.primary, fontFamily: 'Outfit_700Bold', fontSize: 9, letterSpacing: 1.5 }}>
                  QUICK TOUR · {tourStep + 1} OF 2
                </Text>
              </View>
              <Pressable onPress={finishTour} accessibilityRole="button" accessibilityLabel="Skip the app tour" testID="tour-skip">
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_500Medium', fontSize: 11 }}>Skip</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 }}>
              <View style={{ width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(228,17,17,.14)' }}>
                <Ionicons name={tourStep === 0 ? 'ellipsis-horizontal-circle-outline' : 'person-circle-outline'} size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 16 }}>
                  {tourStep === 0 ? 'More lives here' : 'Me is your control room'}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_400Regular', fontSize: 11, lineHeight: 16, marginTop: 4 }}>
                  {tourStep === 0
                    ? 'Search, downloads, IPTV, Pluto TV and videos on your device are all one tap away.'
                    : 'Choose your genres, control adult suggestions, set download rules and manage alerts.'}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
              <Pressable
                onPress={() => tourStep === 0 ? setTourStep(1) : finishTour()}
                accessibilityRole="button"
                accessibilityLabel={tourStep === 0 ? 'Show Me settings tip' : 'Finish the app tour'}
                testID="tour-next"
                style={({ pressed }) => ({ minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, borderRadius: 15, backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 })}
              >
                <Text style={{ color: colors.primaryForeground, fontFamily: 'Outfit_700Bold', fontSize: 12 }}>{tourStep === 0 ? 'Next' : 'Start exploring'}</Text>
                <Ionicons name={tourStep === 0 ? 'arrow-forward' : 'checkmark'} size={15} color={colors.primaryForeground} />
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}
