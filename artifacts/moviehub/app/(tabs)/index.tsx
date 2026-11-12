import React, { useMemo } from 'react';
import {
  ImageBackground,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
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
import { Problem, Rail } from '@/lib/ui';

export default function Home() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const categoryQueries = useQueries({
    queries: MOVIE_CATEGORIES.map((category) => ({
      queryKey: ['moviehub', 'homepage-category', category.slug],
      queryFn: () => getMovies(category.slug, 1, 14),
      enabled: true,
      staleTime: 300_000,
      retry: 1,
    })),
  });

  const hero = useMemo(
    () => categoryQueries[0]?.data?.find((movie) => movie.cover?.url)
      || categoryQueries[1]?.data?.[0]
      || categoryQueries.find((query) => query.data?.length)?.data?.[0],
    [categoryQueries],
  );
  const homeCategoryItems = (index: number): Movie[] => {
    return categoryQueries[index]?.data || [];
  };
  const hasCatalogData = categoryQueries.some((query) => !!query.data?.length);
  const loadingCatalog = categoryQueries.some((query) => query.isFetching);
  const allCatalogRequestsFailed = categoryQueries.length > 0 && categoryQueries.every((query) => query.isError);
  const refreshCatalog = () => Promise.all(categoryQueries.map((query) => query.refetch()));
  const openMovie = (movie: Movie) =>
    router.push({ pathname: '/movie', params: { id: String(movie.subjectId) } });
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
        <View style={{ height: 185, marginHorizontal: 14, borderRadius: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 11 }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_500Medium' }}>Finding your next watch…</Text>
        </View>
      ) : null}

      {!hasCatalogData && allCatalogRequestsFailed ? (
        <Problem
          message="The movie catalog could not be reached. Check your connection and try again."
          retry={() => void refreshCatalog()}
        />
      ) : null}

      {hero && (
        <Animated.View entering={FadeInDown.duration(520)} style={{ marginHorizontal: 14, height: 500, borderRadius: 26, overflow: 'hidden', backgroundColor: colors.card }}>
          <ImageBackground
            source={{ uri: hero.cover?.url || hero.coverUrl || '' }}
            resizeMode="cover"
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <LinearGradient
              colors={['rgba(8,9,11,.02)', 'rgba(8,9,11,.32)', 'rgba(8,9,11,.98)']}
              locations={[0, 0.46, 1]}
              style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
            />
            <View style={{ padding: 22, paddingBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <View style={{ backgroundColor: colors.primary, borderRadius: 5, paddingHorizontal: 9, paddingVertical: 5 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontFamily: 'Outfit_700Bold', letterSpacing: 1.1 }}>
                    FEATURED
                  </Text>
                </View>
                <Text style={{ color: '#fff', fontFamily: 'Outfit_600SemiBold', fontSize: 12 }}>
                  ★ {hero.imdbRatingValue || hero.rating || 'NEW'}
                </Text>
              </View>
              <Text numberOfLines={3} style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 34, lineHeight: 39, color: '#fff' }}>
                {hero.title}
              </Text>
              <Text numberOfLines={2} style={{ fontSize: 13, lineHeight: 20, color: 'rgba(255,255,255,.74)', marginTop: 9 }}>
                {hero.description || hero.releaseDate?.slice(0, 4) || 'Find your next favorite'}
              </Text>
              <Pressable
                onPress={() => openMovie(hero)}
                testID="hero-play"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                  gap: 8,
                  backgroundColor: '#fff',
                  borderRadius: 24,
                  paddingVertical: 12,
                  paddingHorizontal: 18,
                  marginTop: 18,
                }}
              >
                <Ionicons name="play" size={17} color="#101114" />
                <Text style={{ color: '#101114', fontFamily: 'Outfit_700Bold' }}>Explore title</Text>
              </Pressable>
            </View>
          </ImageBackground>
        </Animated.View>
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
        if (!items.length) return null;
        return (
          <Rail
            key={category.slug}
            title={category.title}
            items={items.slice(0, 10)}
            onMovie={openMovie}
          />
        );
      })}
    </ScrollView>
  );
}
