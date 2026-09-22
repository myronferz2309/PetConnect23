import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import {
  Auth,
  getAuth,
  initializeAuth,
} from 'firebase/auth';
import {
  Firestore,
  getFirestore,
  initializeFirestore,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Safe resolution of getReactNativePersistence for React Native environment
let reactNativePersistence: any = null;
try {
  // @ts-ignore
  const authModule = require('@firebase/auth');
  if (typeof authModule.getReactNativePersistence === 'function') {
    reactNativePersistence = authModule.getReactNativePersistence;
  }
} catch (e) {
  // Fallback if not resolvable as submodule
}

// Read Firebase configuration from environment
export const getFirebaseConfig = () => ({
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
});

export const firebaseConfig = getFirebaseConfig();

// Check whether Firebase credentials are configured with valid values
export const isFirebaseConfigured = (): boolean => {
  const cfg = getFirebaseConfig();
  return Boolean(
    cfg.apiKey &&
      cfg.projectId &&
      cfg.appId &&
      !cfg.apiKey.includes('your_api_key') &&
      !cfg.apiKey.includes('placeholder') &&
      !cfg.projectId.includes('your_project_id')
  );
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let initError: Error | null = null;

if (isFirebaseConfigured()) {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }

    // Initialize Auth with AsyncStorage persistence on mobile
    try {
      if (Platform.OS !== 'web' && reactNativePersistence && AsyncStorage) {
        auth = initializeAuth(app, {
          persistence: reactNativePersistence(AsyncStorage),
        });
      } else {
        auth = getAuth(app);
      }
    } catch (authErr) {
      console.log('ℹ️ Auth persistence fallback to getAuth(app):', (authErr as any)?.message);
      auth = getAuth(app);
    }

    // Initialize Firestore with robust long polling & auto-detection for React Native / Expo to prevent transport timeouts
    try {
      db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: true,
        ignoreUndefinedProperties: true,
      });
    } catch (firestoreErr) {
      db = getFirestore(app);
    }

    console.log(
      '✅ Firebase connected successfully for project:',
      firebaseConfig.projectId
    );
  } catch (error: any) {
    console.error('❌ Firebase initialization failed:', error);
    initError = error;
    app = null;
    auth = null;
    db = null;
  }
} else {
  console.log(
    'ℹ️ Firebase credentials not configured in .env.'
  );
}

export const isFirebaseInitialized = (): boolean => {
  return Boolean(app && auth && db && isFirebaseConfigured());
};

export const getFirebaseError = (): Error | null => initError;

export { app, auth, db };
