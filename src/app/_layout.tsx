import 'expo-blob';
import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PetProvider, usePet } from '../context/PetContext';
import { Toast } from '../components/Toast';
import { VideoPlayerModal } from '../components/VideoPlayerModal';
import { AuthModal } from '../components/AuthModal';
import { NewMessageNotificationBanner } from '../components/NewMessageNotificationBanner';
import { ApplicationChatModal } from '../components/ApplicationChatModal';
import { PetConnectColors } from '../constants/colors';

// Silence non-critical LogBox runtime notices in development
LogBox.ignoreLogs([
  "Response.blob() is using React Native's Blob",
  'Method readAsStringAsync imported from',
  'Could not reach Cloud Firestore backend',
  'WebChannelConnection RPC',
]);

SplashScreen.preventAutoHideAsync().catch(() => {});

function GlobalModals() {
  const { isAuthModalOpen, closeAuthModal, activeModalChatApp, closeModalChat } = usePet();
  return (
    <>
      <VideoPlayerModal />
      <Toast />
      <NewMessageNotificationBanner />
      <AuthModal visible={isAuthModalOpen} onClose={closeAuthModal} />
      <ApplicationChatModal
        visible={Boolean(activeModalChatApp)}
        application={activeModalChatApp}
        onClose={closeModalChat}
      />
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Hide splash screen smoothly
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <PetProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: PetConnectColors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="pet/[id]"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="apply/[id]"
            options={{
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="success"
            options={{
              headerShown: false,
              animation: 'fade',
            }}
          />
          <Stack.Screen
            name="saved-pets"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="my-applications"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="ai-match"
            options={{
              headerShown: false,
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="pet-care-ai"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
        </Stack>
        <GlobalModals />
      </PetProvider>
    </SafeAreaProvider>
  );
}
