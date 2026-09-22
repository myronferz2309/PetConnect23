import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile as updateAuthProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';
import { UserProfile } from '../types';

/**
 * Normalizes user profile loaded from Firestore or fallback,
 * ensuring no legacy hardcoded demo photo leaks into real accounts.
 */
const normalizeUserProfile = (raw: any, firebaseUser?: FirebaseUser | null): UserProfile => {
  const isOldHardcodedDemo =
    raw?.avatarUrl?.includes('photo-1535713875002-d1d0cf377fde') ||
    raw?.profilePhotoUrl?.includes('photo-1535713875002-d1d0cf377fde');

  const photo = isOldHardcodedDemo
    ? ''
    : raw?.profilePhotoUrl || raw?.avatarUrl || '';

  return {
    uid: raw?.uid || firebaseUser?.uid || '',
    name: raw?.name || firebaseUser?.displayName || 'Pet Parent',
    email: raw?.email || firebaseUser?.email || '',
    phone: raw?.phone || '',
    address: raw?.address || '',
    profilePhotoUrl: photo,
    avatarUrl: photo,
    savedPetIds: Array.isArray(raw?.savedPetIds) ? raw.savedPetIds : [],
    createdAt: raw?.createdAt || Date.now(),
    updatedAt: raw?.updatedAt || Date.now(),
  };
};

export const authService = {
  /**
   * Register a new user with Email, Password, and Display Name
   */
  async signUp(name: string, email: string, password: string): Promise<UserProfile> {
    if (!auth || !db || !isFirebaseConfigured()) {
      throw new Error('Firebase is not configured. Please set credentials in .env');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update Firebase Auth profile displayName
    await updateAuthProfile(user, {
      displayName: name.trim(),
    });

    const newProfile: UserProfile = {
      uid: user.uid,
      name: name.trim(),
      email: user.email || email.trim(),
      phone: '',
      address: '',
      profilePhotoUrl: '',
      avatarUrl: '',
      savedPetIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Save user profile in Firestore
    await setDoc(doc(db, 'users', user.uid), newProfile);

    return newProfile;
  },

  /**
   * Sign in an existing user with Email and Password
   */
  async signIn(email: string, password: string): Promise<UserProfile> {
    if (!auth || !db || !isFirebaseConfigured()) {
      throw new Error('Firebase is not configured. Please set credentials in .env');
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Fetch user document from Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      return normalizeUserProfile(userDocSnap.data(), user);
    } else {
      // Fallback create if doc missing
      const profile: UserProfile = {
        uid: user.uid,
        name: user.displayName || email.split('@')[0],
        email: user.email || email,
        phone: '',
        address: '',
        profilePhotoUrl: '',
        avatarUrl: '',
        savedPetIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await setDoc(userDocRef, profile);
      return profile;
    }
  },

  /**
   * Sign out the currently authenticated user
   */
  async signOut(): Promise<void> {
    if (auth && isFirebaseConfigured()) {
      await signOut(auth);
    }
  },

  /**
   * Subscribe to Firebase Auth state changes
   */
  onAuthChange(callback: (profile: UserProfile | null) => void): () => void {
    if (!auth || !db || !isFirebaseConfigured()) {
      callback(null);
      return () => {};
    }

    const firestoreDb = db;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (!firebaseUser) {
        callback(null);
        return;
      }

      try {
        const userDocRef = doc(firestoreDb, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          callback(normalizeUserProfile(userDocSnap.data(), firebaseUser));
        } else {
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'Pet Parent',
            email: firebaseUser.email || '',
            phone: '',
            address: '',
            profilePhotoUrl: '',
            avatarUrl: '',
            savedPetIds: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await setDoc(userDocRef, newProfile);
          callback(newProfile);
        }
      } catch {
        // Smoothly fallback to basic profile from Firebase Auth user if offline on startup
        callback({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Pet Parent',
          email: firebaseUser.email || '',
          phone: '',
          address: '',
          profilePhotoUrl: '',
          avatarUrl: '',
          savedPetIds: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    });

    return unsubscribe;
  },

  /**
   * Update user profile fields in Firestore
   */
  async updateProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
    if (!db || !isFirebaseConfigured() || !uid) {
      return;
    }

    // Clean undefined and prepare payload
    const payload: any = {
      ...updates,
      updatedAt: Date.now(),
    };

    // Keep avatarUrl in sync with profilePhotoUrl for compatibility
    if (updates.profilePhotoUrl !== undefined) {
      payload.avatarUrl = updates.profilePhotoUrl;
    } else if (updates.avatarUrl !== undefined) {
      payload.profilePhotoUrl = updates.avatarUrl;
    }

    // Strip undefined keys
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, payload);
  },
};


