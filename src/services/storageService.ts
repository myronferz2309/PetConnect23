import 'expo-blob';
import { createClient } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';
import { getCategoryFallbackImage } from '../utils/imageHelper';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mtabtkllvrimnkfjmdvy.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YWJ0a2xsdnJpbW5rZmptZHZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTMwMjYsImV4cCI6MjEwMzU4OTAyNn0.z4KwfLot-ZiI9m94zofnlkBWY8ufl2fpNl9-VhaEiig';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const cleanLocalUri = (uri: string): string => {
  if (!uri) return uri;
  try {
    if (uri.includes('%')) {
      return decodeURIComponent(uri);
    }
  } catch {}
  return uri;
};

export const storageService = {
  /**
   * Upload an image to Supabase Storage.
   */
  async uploadPetImage(localUri: string, category?: string): Promise<string> {
    const fallback = getCategoryFallbackImage(category);

    if (!localUri || typeof localUri !== 'string') {
      return fallback;
    }

    const trimmedUri = localUri.trim();

    // Already a remote HTTPS URL
    if (trimmedUri.startsWith('https://') || trimmedUri.startsWith('http://')) {
      return trimmedUri;
    }

    const extension = trimmedUri.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
    const contentType = extension === 'png' ? 'image/png' : 'image/jpeg';
    const fileName = `images/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extension}`;

    try {
      console.log('[SUPABASE] Uploading pet photo to Supabase Storage...');

      if (trimmedUri.startsWith('data:image/')) {
        const commaIdx = trimmedUri.indexOf(',');
        const rawBase64 = commaIdx !== -1 ? trimmedUri.substring(commaIdx + 1) : trimmedUri;
        const arrayBuffer = decode(rawBase64);

        const { data, error } = await supabase.storage
          .from('pets')
          .upload(fileName, arrayBuffer, {
            contentType,
            upsert: true,
          });

        if (!error && data?.path) {
          const { data: urlData } = supabase.storage.from('pets').getPublicUrl(data.path);
          if (urlData?.publicUrl) {
            console.log('[SUPABASE] ✅ Photo uploaded successfully:', urlData.publicUrl);
            return urlData.publicUrl;
          }
        }
        return trimmedUri;
      }

      // Fetch blob stream upload
      const cleanUri = cleanLocalUri(trimmedUri);
      const res = await fetch(cleanUri);
      const rawBlob = await res.blob();
      const imageBlob = rawBlob.slice(0, rawBlob.size, contentType);

      const { data, error } = await supabase.storage
        .from('pets')
        .upload(fileName, imageBlob, {
          contentType,
          upsert: true,
        });

      if (!error && data?.path) {
        const { data: urlData } = supabase.storage.from('pets').getPublicUrl(data.path);
        if (urlData?.publicUrl) {
          console.log('[SUPABASE] ✅ Photo uploaded successfully:', urlData.publicUrl);
          return urlData.publicUrl;
        }
      }

      if (error) {
        console.warn('[SUPABASE] Supabase storage upload error:', error);
        throw new Error(`Photo upload failed: ${error.message}`);
      }

      return trimmedUri;
    } catch (err: any) {
      console.warn('[SUPABASE] Photo upload warning:', err);
      if (trimmedUri.startsWith('data:image/') || trimmedUri.startsWith('file:') || trimmedUri.startsWith('content:')) {
        throw new Error(err?.message || 'Failed to upload photo to Supabase storage.');
      }
      return fallback;
    }
  },

  /**
   * Upload a user's profile photo to Supabase Storage.
   * Path: profiles/{userId}/profile_{timestamp}.jpg
   */
  async uploadProfilePhoto(localUri: string, userId: string): Promise<string> {
    if (!localUri || typeof localUri !== 'string') {
      throw new Error('No profile image provided.');
    }

    const trimmedUri = localUri.trim();

    // Already a remote HTTPS URL
    if (trimmedUri.startsWith('https://') || trimmedUri.startsWith('http://')) {
      return trimmedUri;
    }

    const cleanUid = userId ? userId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'user';
    const extension = trimmedUri.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
    const contentType = extension === 'png' ? 'image/png' : 'image/jpeg';
    const fileName = `profiles/${cleanUid}/profile_${Date.now()}.${extension}`;

    try {
      console.log(`[SUPABASE] Uploading profile photo for user ${cleanUid}...`);

      if (trimmedUri.startsWith('data:image/')) {
        const commaIdx = trimmedUri.indexOf(',');
        const rawBase64 = commaIdx !== -1 ? trimmedUri.substring(commaIdx + 1) : trimmedUri;
        const arrayBuffer = decode(rawBase64);

        const { data, error } = await supabase.storage
          .from('pets')
          .upload(fileName, arrayBuffer, {
            contentType,
            upsert: true,
          });

        if (error) {
          console.warn('[SUPABASE] Profile photo upload base64 error:', error);
          throw new Error(`Profile upload failed: ${error.message}`);
        }

        if (data?.path) {
          const { data: urlData } = supabase.storage.from('pets').getPublicUrl(data.path);
          if (urlData?.publicUrl) {
            console.log('[SUPABASE] ✅ Profile photo uploaded:', urlData.publicUrl);
            return urlData.publicUrl;
          }
        }
      }

      // Fetch blob upload
      const cleanUri = cleanLocalUri(trimmedUri);
      const res = await fetch(cleanUri);
      const rawBlob = await res.blob();
      const imageBlob = rawBlob.slice(0, rawBlob.size, contentType);

      const { data, error } = await supabase.storage
        .from('pets')
        .upload(fileName, imageBlob, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.warn('[SUPABASE] Profile photo upload blob error:', error);
        throw new Error(`Profile upload failed: ${error.message}`);
      }

      if (data?.path) {
        const { data: urlData } = supabase.storage.from('pets').getPublicUrl(data.path);
        if (urlData?.publicUrl) {
          console.log('[SUPABASE] ✅ Profile photo uploaded:', urlData.publicUrl);
          return urlData.publicUrl;
        }
      }

      throw new Error('Failed to retrieve public download URL for profile photo.');
    } catch (err: any) {
      console.warn('[SUPABASE] Profile photo upload error:', err);
      throw new Error(err?.message || 'Failed to upload profile photo to Supabase storage.');
    }
  },

  /**
   * Upload a pet video to Supabase Storage with guaranteed MP4 content-type.
   */
  async uploadPetVideo(localUri?: string | null): Promise<string | undefined> {
    if (!localUri || typeof localUri !== 'string') {
      return undefined;
    }

    const trimmedUri = localUri.trim();

    // Already a remote HTTPS URL
    if (trimmedUri.startsWith('https://') || trimmedUri.startsWith('http://')) {
      return trimmedUri;
    }

    try {
      console.log('[SUPABASE] Uploading pet video to Supabase Storage...');
      const cleanUri = cleanLocalUri(trimmedUri);
      const fileName = `videos/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.mp4`;

      const res = await fetch(cleanUri);
      const rawBlob = await res.blob();
      const videoBlob = rawBlob.slice(0, rawBlob.size, 'video/mp4');

      const { data, error } = await supabase.storage
        .from('pets')
        .upload(fileName, videoBlob, {
          contentType: 'video/mp4',
          upsert: true,
        });

      if (!error && data?.path) {
        const { data: urlData } = supabase.storage.from('pets').getPublicUrl(data.path);
        if (urlData?.publicUrl) {
          console.log('[SUPABASE] ✅ Video uploaded successfully to Supabase CDN:', urlData.publicUrl);
          return urlData.publicUrl;
        }
      }

      console.warn('[SUPABASE] Video upload error:', error);
      return trimmedUri;
    } catch (err) {
      console.warn('[SUPABASE] Video upload error:', err);
      return trimmedUri;
    }
  },

  /**
   * Upload user profile avatar to Supabase Storage.
   */
  async uploadUserAvatar(userId: string, localUri: string): Promise<string> {
    const defaultAvatar =
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80';

    if (!localUri || typeof localUri !== 'string') {
      return defaultAvatar;
    }

    const trimmedUri = localUri.trim();
    if (trimmedUri.startsWith('https://') || trimmedUri.startsWith('http://')) {
      return trimmedUri;
    }

    try {
      const cleanUri = cleanLocalUri(trimmedUri);
      const fileName = `avatars/${userId}_${Date.now()}.jpg`;

      const res = await fetch(cleanUri);
      const rawBlob = await res.blob();
      const imageBlob = rawBlob.slice(0, rawBlob.size, 'image/jpeg');

      const { data, error } = await supabase.storage
        .from('pets')
        .upload(fileName, imageBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (!error && data?.path) {
        const { data: urlData } = supabase.storage.from('pets').getPublicUrl(data.path);
        if (urlData?.publicUrl) {
          return urlData.publicUrl;
        }
      }

      return defaultAvatar;
    } catch (err) {
      return defaultAvatar;
    }
  },
};
