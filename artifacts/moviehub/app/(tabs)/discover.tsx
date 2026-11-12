import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { GENRES, MOVIE_CATEGORIES } from '@/lib/catalog';
import { findMovies, getMovies } from '@/lib/providers';
import { Empty, Loading, Poster, Problem } from '@/lib/ui';

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function Discover() {
  const colors = useColors();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ slug?: string | string[]; genre?: string | string[] }>();
  const [selected, setSelected] = useState(firstParam(params.slug) || 'popular');
  const [selectedGenre, setSelectedGenre] = useState(firstParam(params.genre) || '');

  useEffect(() => {
    if (params.slug) setSelected(firstParam(params.slug)!);
    if (params.genre) setSelectedGenre(firstParam(params.genre)!);
  }, [params.slug, params.genre]);

  const genre = GENRES.find((item) => item.slug === selectedGenre);
  const categoryQuery = useQuery({
    queryKey: ['category', selected],
    queryFn: () => getMovies(selected, 1, 30),
    enabled: !genre,
    staleTime: 240_000,
  });
  const genreQuery = useQuery({
    queryKey: ['genre', selectedGenre],
    queryFn: () => findMovies(genre!.query),
    enabled: !!genre,
    staleTime: 240_000,
  });
  const items = genre ? genreQuery.data : categoryQuery.data;
  const isLoading = genre ? genreQuery.isLoading : categoryQuery.isLoading;
  const isError = genre ? genreQuery.isError : categoryQuery.isError;
  const error = genre ? genreQuery.error : categoryQuery.error;
  const retry = () => void (genre ? genreQuery.refetch() : categoryQuery.refetch());
  const selectedCategory = MOVIE_CATEGORIES.find((item) => item.slug === selected);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: 22, paddingBottom: 125 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingHorizontal: 20 }}>
        <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 30, color: colors.foreground }}>
          Discover
        </Text>
        <Text style={{ color: colors.mutedForeground, marginTop: 3 }}>
          {genre?.label || selectedCategory?.title || 'Find your next watch'}
        </Text>
        <Pressable
          onPress={() => router.push('/search' as any)}
          style={{
            marginTop: 19,
            borderRadius: 16,
            backgroundColor: colors.card,
            padding: 15,
            flexDirection: 'row',
            gap: 11,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name="search" size={19} color={colors.mutedForeground} />
          <Text style={{ color: colors.mutedForeground }}>Search movies and series</Text>
        </Pressable>
      </View>

      <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 17, marginTop: 25, paddingHorizontal: 20 }}>
        Collections
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, gap: 8, marginTop: 11 }}>
        {MOVIE_CATEGORIES.map((category) => (
          <Pressable
            key={category.slug}
            onPress={() => {
              setSelected(category.slug);
              setSelectedGenre('');
            }}
            style={{
              backgroundColor: !genre && selected === category.slug ? colors.primary : colors.card,
              borderColor: !genre && selected === category.slug ? colors.primary : colors.border,
              borderWidth: 1,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 9,
            }}
          >
            <Text style={{ color: '#fff', fontFamily: 'Outfit_600SemiBold', fontSize: 11 }}>
              {category.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 17, marginTop: 23, paddingHorizontal: 20 }}>
        Genres
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, gap: 8, marginTop: 11 }}>
        {GENRES.map((item) => (
          <Pressable
            key={item.slug}
            onPress={() => setSelectedGenre(item.slug === selectedGenre ? '' : item.slug)}
            style={{
              backgroundColor: selectedGenre === item.slug ? colors.secondary : 'transparent',
              borderColor: selectedGenre === item.slug ? colors.primary : colors.border,
              borderWidth: 1,
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 9,
            }}
          >
            <Text style={{ color: selectedGenre === item.slug ? colors.foreground : colors.mutedForeground, fontFamily: 'Outfit_600SemiBold', fontSize: 11 }}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading && <Loading label={`Loading ${genre?.label || selectedCategory?.title || 'titles'}…`} />}
      {isError && <Problem message={error?.message || 'Could not load titles.'} retry={retry} />}
      {items?.length ? (
        <View style={{ paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 24 }}>
          {items.map((movie) => (
            <Poster
              key={movie.subjectId}
              movie={movie}
              width={(width - 54) / 2.45}
              onPress={() => router.push({ pathname: '/movie', params: { id: String(movie.subjectId) } })}
            />
          ))}
        </View>
      ) : !isLoading && !isError ? (
        <Empty title="Nothing to show yet" subtitle="Choose another collection or genre to explore." />
      ) : null}
    </ScrollView>
  );
}
