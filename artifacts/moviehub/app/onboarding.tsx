import React, { useState } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import FirstRunExperience from '@/components/FirstRunExperience';
import { useUserPreferences } from '@/lib/UserPreferences';

export default function OnboardingScreen() {
  const {
    preferences,
    isReady,
    togglePreferredGenre,
    setDownloadCompleteNotifications,
    setOnboardingComplete,
  } = useUserPreferences();
  const [requestingAlerts, setRequestingAlerts] = useState(false);

  const enableDownloadAlerts = async () => {
    if (Platform.OS === 'web') return false;
    setRequestingAlerts(true);
    try {
      const Notifications = await import('expo-notifications');
      let permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
      if (!permission.granted) return false;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('downloads', {
          name: 'Downloads',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 180, 120, 180],
        });
      }
      setDownloadCompleteNotifications(true);
      return true;
    } finally {
      setRequestingAlerts(false);
    }
  };

  const finish = () => {
    setOnboardingComplete(true);
    router.replace('/(tabs)');
  };

  if (!isReady) return null;

  return (
    <FirstRunExperience
      selectedGenres={preferences.preferredGenres}
      onToggleGenre={togglePreferredGenre}
      onFinish={finish}
      onEnableDownloadAlerts={enableDownloadAlerts}
      downloadAlertsEnabled={preferences.downloadCompleteNotifications}
      requestingAlerts={requestingAlerts}
    />
  );
}
