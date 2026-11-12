import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Movie } from './providers';

export type WatchHistoryItem = {
  movie: Movie;
  watchedAt: number;
  season?: number;
  episode?: number;
};

type WatchHistoryContextValue = {
  items: WatchHistoryItem[];
  isReady: boolean;
  record: (movie: Movie, position?: { season?: number; episode?: number }) => void;
};

const STORAGE_KEY = 'moviehub-watch-history-v1';
const WatchHistoryContext = createContext<WatchHistoryContextValue | null>(null);

export function WatchHistoryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WatchHistoryItem[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (!active || !saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) setItems(parsed.filter((item) => item?.movie?.subjectId));
    }).catch(() => undefined).finally(() => {
      if (active) setIsReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isReady) void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(() => undefined);
  }, [isReady, items]);

  const record = useCallback((movie: Movie, position?: { season?: number; episode?: number }) => {
    setItems((current) => [{
      movie,
      watchedAt: Date.now(),
      season: position?.season,
      episode: position?.episode,
    }, ...current.filter((item) => item.movie.subjectId !== movie.subjectId)].slice(0, 50));
  }, []);

  const value = useMemo(() => ({ items, isReady, record }), [items, isReady, record]);
  return <WatchHistoryContext.Provider value={value}>{children}</WatchHistoryContext.Provider>;
}

export function useWatchHistory() {
  const context = useContext(WatchHistoryContext);
  if (!context) throw new Error('WatchHistoryProvider is missing.');
  return context;
}
