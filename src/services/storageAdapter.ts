import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pet, AdoptionApplication, UserProfile } from '../types';

const PETS_STORAGE_KEY = '@petconnect_pets_v1';
const SAVED_PETS_KEY = '@petconnect_saved_ids_v1';
const APPS_STORAGE_KEY = '@petconnect_apps_v1';
const USER_STORAGE_KEY = '@petconnect_user_v1';

export const storageAdapter = {
  loadPets: async (fallback: Pet[]): Promise<Pet[]> => {
    try {
      const jsonValue = await AsyncStorage.getItem(PETS_STORAGE_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : fallback;
    } catch (e) {
      console.warn('AsyncStorage loadPets error:', e);
      return fallback;
    }
  },

  savePets: async (pets: Pet[]): Promise<void> => {
    try {
      const jsonValue = JSON.stringify(pets);
      await AsyncStorage.setItem(PETS_STORAGE_KEY, jsonValue);
    } catch (e) {
      console.warn('AsyncStorage savePets error:', e);
    }
  },

  loadSavedIds: async (fallback: string[]): Promise<string[]> => {
    try {
      const jsonValue = await AsyncStorage.getItem(SAVED_PETS_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : fallback;
    } catch (e) {
      console.warn('AsyncStorage loadSavedIds error:', e);
      return fallback;
    }
  },

  saveSavedIds: async (ids: string[]): Promise<void> => {
    try {
      const jsonValue = JSON.stringify(ids);
      await AsyncStorage.setItem(SAVED_PETS_KEY, jsonValue);
    } catch (e) {
      console.warn('AsyncStorage saveSavedIds error:', e);
    }
  },

  loadApplications: async (fallback: AdoptionApplication[]): Promise<AdoptionApplication[]> => {
    try {
      const jsonValue = await AsyncStorage.getItem(APPS_STORAGE_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : fallback;
    } catch (e) {
      console.warn('AsyncStorage loadApplications error:', e);
      return fallback;
    }
  },

  saveApplications: async (apps: AdoptionApplication[]): Promise<void> => {
    try {
      const jsonValue = JSON.stringify(apps);
      await AsyncStorage.setItem(APPS_STORAGE_KEY, jsonValue);
    } catch (e) {
      console.warn('AsyncStorage saveApplications error:', e);
    }
  },

  loadUser: async (fallback: UserProfile): Promise<UserProfile> => {
    try {
      const jsonValue = await AsyncStorage.getItem(USER_STORAGE_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : fallback;
    } catch (e) {
      console.warn('AsyncStorage loadUser error:', e);
      return fallback;
    }
  },

  saveUser: async (user: UserProfile): Promise<void> => {
    try {
      const jsonValue = JSON.stringify(user);
      await AsyncStorage.setItem(USER_STORAGE_KEY, jsonValue);
    } catch (e) {
      console.warn('AsyncStorage saveUser error:', e);
    }
  },
};

