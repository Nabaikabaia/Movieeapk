import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DownloadNetworkPolicy = 'any' | 'wifi' | 'cellular';

export type UserPreferences = {
  downloadNetwork: DownloadNetworkPolicy;
  preferredGenres: string[];
  downloadCompleteNotifications: boolean;
  parentalControlsEnabled: boolean;
  onboardingComplete: boolean;
  appTourComplete: boolean;
};

type PreferencesContextValue = {
  preferences: UserPreferences;
  isReady: boolean;
  setDownloadNetwork: (policy: DownloadNetworkPolicy) => void;
  togglePreferredGenre: (genre: string) => void;
  setDownloadCompleteNotifications: (enabled: boolean) => void;
  setParentalControlsEnabled: (enabled: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setAppTourComplete: (complete: boolean) => void;
};

const STORAGE_KEY = 'moviehub-user-preferences-v1';
const DEFAULT_PREFERENCES: UserPreferences = {
  downloadNetwork: 'any',
  preferredGenres: [],
  downloadCompleteNotifications: false,
  parentalControlsEnabled: true,
  onboardingComplete: false,
  appTourComplete: false,
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function UserPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (!active) return;
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<UserPreferences>;
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...parsed,
          downloadNetwork: parsed.downloadNetwork === 'wifi' || parsed.downloadNetwork === 'cellular'
            ? parsed.downloadNetwork
            : 'any',
          preferredGenres: Array.isArray(parsed.preferredGenres)
            ? parsed.preferredGenres.filter((genre): genre is string => typeof genre === 'string')
            : [],
          downloadCompleteNotifications: parsed.downloadCompleteNotifications === true,
          parentalControlsEnabled: parsed.parentalControlsEnabled !== false,
          onboardingComplete: parsed.onboardingComplete === true,
          appTourComplete: parsed.appTourComplete === true,
        });
      }
    }).catch(() => undefined).finally(() => {
      if (active) setIsReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isReady) void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)).catch(() => undefined);
  }, [isReady, preferences]);

  const setDownloadNetwork = useCallback((downloadNetwork: DownloadNetworkPolicy) => {
    setPreferences((current) => ({ ...current, downloadNetwork }));
  }, []);

  const togglePreferredGenre = useCallback((genre: string) => {
    setPreferences((current) => ({
      ...current,
      preferredGenres: current.preferredGenres.includes(genre)
        ? current.preferredGenres.filter((item) => item !== genre)
        : [...current.preferredGenres, genre],
    }));
  }, []);

  const setDownloadCompleteNotifications = useCallback((downloadCompleteNotifications: boolean) => {
    setPreferences((current) => ({ ...current, downloadCompleteNotifications }));
  }, []);

  const setParentalControlsEnabled = useCallback((parentalControlsEnabled: boolean) => {
    setPreferences((current) => ({ ...current, parentalControlsEnabled }));
  }, []);

  const setOnboardingComplete = useCallback((onboardingComplete: boolean) => {
    setPreferences((current) => ({ ...current, onboardingComplete }));
  }, []);

  const setAppTourComplete = useCallback((appTourComplete: boolean) => {
    setPreferences((current) => ({ ...current, appTourComplete }));
  }, []);

  const value = useMemo(() => ({
    preferences,
    isReady,
    setDownloadNetwork,
    togglePreferredGenre,
    setDownloadCompleteNotifications,
    setParentalControlsEnabled,
    setOnboardingComplete,
    setAppTourComplete,
  }), [
    preferences,
    isReady,
    setDownloadNetwork,
    togglePreferredGenre,
    setDownloadCompleteNotifications,
    setParentalControlsEnabled,
    setOnboardingComplete,
    setAppTourComplete,
  ]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function useUserPreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('UserPreferencesProvider is missing.');
  return context;
}
