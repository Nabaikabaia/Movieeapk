import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { findMovies, getMovies, Movie } from '@/lib/providers';
import { Empty, Poster, Problem } from '@/lib/ui';

const TRENDING_SEARCHES = ['Action', 'K-Drama', 'Anime', 'Nollywood', 'Romance', 'Sci-Fi', 'Thriller', 'Comedy'];

export default function Search() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [term, setTerm] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setTerm(text.trim()), 220);
    return () => clearTimeout(timeout);
  }, [text]);

  const results = useQuery({
    queryKey: ['search-results', term],
    queryFn: () => findMovies(term),
    enabled: term.length > 1,
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
    router.push({ pathname: '/movie', params: { id: String(movie.subjectId), detailPath: String(movie.detailPath || '') } });
  };

  const typedText = text.trim();
  const showSearchSuggestions = typedText.length > 0;
  const showResults = typedText.length > 1;
  const suggestionsAreCurrent = term === typedText;
  const matchingTrending = showSearchSuggestions
    ? TRENDING_SEARCHES.filter((query) => query.toLowerCase().includes(typedText.toLowerCase())).slice(0, 4)
    : [];
  const remoteSuggestions = suggestionsAreCurrent ? (results.data || []).slice(0, 5) : [];
  const suggestionItems = remoteSuggestions.length
    ? remoteSuggestions
    : matchingTrending.map((title) => ({ title, subjectId: '' } as Movie));
  const resultItems = suggestionsAreCurrent ? results.data || [] : [];
  const waitingForCurrentTerm = showResults && !suggestionsAreCurrent;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior="padding"
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
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 125 }}
      >
        {!showSearchSuggestions ? (
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

          </>
        ) : (
          <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
            <View style={{ marginBottom: 15 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="flash-outline" size={14} color={colors.primary} />
                  <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 13 }}>Suggestions</Text>
                </View>
                {results.isFetching || waitingForCurrentTerm ? (
                  <Text style={{ color: colors.primary, fontFamily: 'Outfit_600SemiBold', fontSize: 9 }}>UPDATING</Text>
                ) : null}
              </View>
              {suggestionItems.length ? (
                <View style={{ borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                  {suggestionItems.map((movie, index) => (
                    <Pressable
                      key={movie.subjectId || `${movie.title}-${index}`}
                      onPress={() => movie.subjectId ? openMovie(movie) : searchFor(movie.title)}
                      testID={`search-suggestion-${index}`}
                      style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: index < suggestionItems.length - 1 ? 1 : 0, borderBottomColor: colors.border }}
                    >
                      {movie.coverUrl || movie.cover?.url ? (
                        <Image source={{ uri: movie.coverUrl || movie.cover?.url }} contentFit="cover" cachePolicy="disk" transition={160} style={{ width: 30, height: 38, borderRadius: 7, backgroundColor: colors.secondary }} />
                      ) : (
                        <View style={{ width: 30, height: 38, borderRadius: 7, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="search" size={14} color={colors.mutedForeground} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ color: colors.foreground, fontFamily: 'Outfit_600SemiBold', fontSize: 11 }}>{movie.title}</Text>
                        {movie.subjectId ? (
                          <Text style={{ color: colors.mutedForeground, fontSize: 9, marginTop: 2 }}>
                            {movie.releaseDate?.slice(0, 4) || 'Movie'}{movie.subjectType === 2 ? ' · Series' : ''}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="arrow-up-outline" size={14} color={colors.mutedForeground} />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View style={{ minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
                  <Ionicons name="search-outline" size={14} color={colors.mutedForeground} />
                  <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>
                    {typedText.length < 2 ? 'Type one more character for live matches.' : results.isFetching || waitingForCurrentTerm ? 'Finding matches as you type…' : 'No title suggestions yet.'}
                  </Text>
                </View>
              )}
            </View>

            {showResults ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <Text style={{ color: colors.foreground, fontFamily: 'Outfit_700Bold', fontSize: 14 }}>Results</Text>
                  {results.isFetching || waitingForCurrentTerm ? <Text style={{ color: colors.primary, fontFamily: 'Outfit_600SemiBold', fontSize: 9 }}>SEARCHING</Text> : null}
                  {!results.isFetching && resultItems.length ? <Text style={{ color: colors.mutedForeground, fontSize: 9 }}>{resultItems.length} found</Text> : null}
                </View>
                {suggestionsAreCurrent && results.isError ? (
                  <Problem message={results.error.message} retry={() => void results.refetch()} />
                ) : resultItems.length ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 }}>
                    {resultItems.map((movie) => <Poster key={movie.subjectId} movie={movie} width={145} onPress={() => openMovie(movie)} />)}
                  </View>
                ) : waitingForCurrentTerm || results.isFetching ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
                    {[0, 1, 2, 3].map((index) => (
                      <View key={index} style={{ width: '47%', height: 180, borderRadius: 15, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }} />
                    ))}
                  </View>
                ) : (
                  <Empty icon="search-outline" title="No matches found" subtitle="Try another title, actor, or one of the trending searches." />
                )}
              </>
            ) : (
              <Text style={{ color: colors.mutedForeground, fontSize: 10, marginTop: 2 }}>Keep typing to search the catalogue.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
