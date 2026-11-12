import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { findMovies, getMovies, getSuggestions, Movie } from '@/lib/providers';
import { Empty, Poster, Problem } from '@/lib/ui';

const TRENDING_SEARCHES = ['Action', 'K-Drama', 'Anime', 'Nollywood', 'Romance', 'Sci-Fi', 'Thriller', 'Comedy'];

export default function Search() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setTerm(text.trim()), 300);
    return () => clearTimeout(timeout);
  }, [text]);

  const results = useQuery({
    queryKey: ['search-results', term],
    queryFn: () => findMovies(term),
    enabled: term.length > 1,
  });
  const suggestions = useQuery({
    queryKey: ['search-suggestions', term],
    queryFn: () => getSuggestions(term),
    enabled: term.length > 1,
    staleTime: 90_000,
  });
  const popular = useQuery({
    queryKey: ['search-popular'],
    queryFn: () => getMovies('popular', 1, 12),
    staleTime: 300_000,
  });

  const searchFor = (value: string) => {
    setText(value);
    setTerm(value.trim());
  };
  const openMovie = (movie: Movie) => {
    Keyboard.dismiss();
    router.push({ pathname: '/movie', params: { id: String(movie.subjectId) } });
  };

  const showResults = term.length > 1;
  const suggestionItems = (suggestions.data || []).slice(0, 5);
  const resultItems = results.data || [];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ paddingTop: insets.top + 12, paddingBottom: 12 }}>
        <View style={{ paddingHorizontal: 20, marginBottom: 17 }}>
          <Text style={{ color: colors.primary, fontFamily: 'Outfit_700Bold', fontSize: 10, letterSpacing: 1.6 }}>FIND YOUR NEXT FAVORITE</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ color: colors.foreground, fontFamily: 'Outfit_800ExtraBold', fontSize: 29 }}>Search</Text>
            <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_500Medium', fontSize: 11, paddingBottom: 5 }}>Movies · series · more</Text>
          </View>
        </View>
        <View style={{ marginHorizontal: 18, minHeight: 54, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: text ? colors.primary : colors.border }}>
          <Ionicons name="search" size={19} color={text ? colors.primary : colors.mutedForeground} />
          <TextInput
            value={text}
            onChangeText={setText}
            returnKeyType="search"
            onSubmitEditing={() => { setTerm(text.trim()); Keyboard.dismiss(); }}
            placeholder="Search movies, shows, actors…"
            placeholderTextColor={colors.mutedForeground}
            style={{ flex: 1, color: colors.foreground, paddingVertical: 14, paddingHorizontal: 11, fontFamily: 'Outfit_500Medium', fontSize: 14 }}
            testID="movie-search-input"
            accessibilityLabel="Search movies and series"
          />
          {text ? (
            <Pressable
              onPress={() => { setText(''); setTerm(''); }}
              accessibilityLabel="Clear search"
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={19} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 125 }}
      >
        {!showResults ? (
          <>
            <View style={{ paddingHorizontal: 20, marginTop: 9 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 13 }}>
                <Ionicons name="trending-up" size={16} color={colors.primary} />
                <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 15 }}>Trending searches</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
                {TRENDING_SEARCHES.map((query, index) => (
                  <Pressable
                    key={query}
                    onPress={() => searchFor(query)}
                    testID={`trending-search-${index}`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 15, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
                  >
                    <Text style={{ color: colors.mutedForeground, fontFamily: 'Outfit_600SemiBold', fontSize: 10 }}>{String(index + 1).padStart(2, '0')}</Text>
                    <Text style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 12 }}>{query}</Text>
                    <Ionicons name="arrow-up-outline" size={12} color={colors.mutedForeground} />
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={{ marginTop: 28 }}>
              <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
                <View>
                  <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 17 }}>Popular right now</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 11, marginTop: 3 }}>Worth a look tonight</Text>
                </View>
                {popular.isFetching ? <Text style={{ color: colors.primary, fontFamily: 'Outfit_700Bold', fontSize: 8, letterSpacing: 1 }}>UPDATING</Text> : null}
              </View>
              {popular.isError ? (
                <Problem message="Popular titles are temporarily unavailable." retry={() => void popular.refetch()} />
              ) : popular.data?.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
                  {popular.data.slice(0, 12).map((movie) => (
                    <Poster key={movie.subjectId} movie={movie} width={112} onPress={() => openMovie(movie)} />
                  ))}
                </ScrollView>
              ) : popular.isFetching ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
                  {[0, 1, 2, 3].map((index) => (
                    <View key={index} style={{ width: 112 }}>
                      <View style={{ height: 150, borderRadius: 15, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }} />
                      <View style={{ width: '76%', height: 8, borderRadius: 5, backgroundColor: colors.card, marginTop: 8 }} />
                      <View style={{ width: '48%', height: 6, borderRadius: 4, backgroundColor: colors.card, marginTop: 6 }} />
                    </View>
                  ))}
                </ScrollView>
              ) : !popular.isFetching ? (
                <Empty icon="film-outline" title="Popular titles will appear here" subtitle="Browse the catalogue while trending picks load." />
              ) : null}
            </View>

            <View style={{ marginHorizontal: 20, marginTop: 25, padding: 15, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 38, height: 38, borderRadius: 14, backgroundColor: 'rgba(228,17,17,.14)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 12 }}>Search the whole catalogue</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 3 }}>Get suggestions as you type.</Text>
              </View>
              <Ionicons name="arrow-forward" size={17} color={colors.mutedForeground} />
            </View>
          </>
        ) : (
          <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
            {suggestionItems.length ? (
              <View style={{ marginBottom: 19 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 }}>
                  <Ionicons name="flash-outline" size={15} color={colors.primary} />
                  <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 14 }}>Suggestions</Text>
                </View>
                <View style={{ borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                  {suggestionItems.map((movie, index) => (
                    <Pressable
                      key={movie.subjectId || `${movie.title}-${index}`}
                      onPress={() => movie.subjectId ? openMovie(movie) : searchFor(movie.title)}
                      testID={`search-suggestion-${index}`}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: index < suggestionItems.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
                    >
                      {movie.coverUrl || movie.cover?.url ? (
                        <Image source={{ uri: movie.coverUrl || movie.cover?.url }} contentFit="cover" cachePolicy="disk" transition={180} style={{ width: 38, height: 50, borderRadius: 8, backgroundColor: colors.secondary }} />
                      ) : (
                        <View style={{ width: 38, height: 50, borderRadius: 8, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="film-outline" size={17} color={colors.mutedForeground} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 12 }}>{movie.title}</Text>
                        <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 4 }}>{movie.releaseDate?.slice(0, 4) || 'Movie'}{movie.subjectType === 2 ? ' · Series' : ''}</Text>
                      </View>
                      <Ionicons name="arrow-up-outline" size={16} color={colors.mutedForeground} />
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 15 }}>Results</Text>
              {results.isFetching || suggestions.isFetching ? <Text style={{ color: colors.primary, fontFamily: 'Outfit_600SemiBold', fontSize: 10 }}>SEARCHING</Text> : null}
              {!results.isFetching && resultItems.length ? <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>{resultItems.length} found</Text> : null}
            </View>

            {results.isError ? (
              <Problem message={results.error.message} retry={() => void results.refetch()} />
            ) : resultItems.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 15 }}>
                {resultItems.map((movie) => <Poster key={movie.subjectId} movie={movie} width={145} onPress={() => openMovie(movie)} />)}
              </View>
            ) : results.isFetching || suggestions.isFetching ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 }}>
                {[0, 1, 2, 3].map((index) => (
                  <View key={index} style={{ width: '47%', height: 190, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }} />
                ))}
              </View>
            ) : !results.isFetching && !suggestions.isFetching && !suggestionItems.length ? (
              <Empty icon="search-outline" title="No matches found" subtitle="Try another title, actor, or one of the trending searches." />
            ) : null}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
