import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  arrayUnion,
  arrayRemove,
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { Pet, AdoptionApplication, PetStatus, ChatMessage } from '../types';
import { SYSTEM_SHELTER_OWNER_ID } from '../data/initialPets';

/**
 * Strips all undefined fields recursively so Firestore setDoc never throws.
 */
function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map(sanitizeForFirestore) as any;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj as any)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        cleaned[key] = sanitizeForFirestore(val);
      }
    }
    return cleaned;
  }
  return obj;
}

export const firestoreService = {
  /**
   * Listen to all adoptable pets in real-time
   */
  subscribeToPets(
    onUpdate: (pets: Pet[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!db || !isFirebaseConfigured()) {
      return () => {};
    }
    const firestoreDb = db;

    const petsCol = collection(firestoreDb, 'pets');
    return onSnapshot(
      petsCol,
      (snapshot) => {
        const pets: Pet[] = [];
        snapshot.forEach((docSnap) => {
          pets.push({ id: docSnap.id, ...(docSnap.data() as Omit<Pet, 'id'>) });
        });
        // Sort newest first
        pets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        onUpdate(pets);
      },
      (error) => {
        console.warn('Firestore pets subscription error:', error);
        if (onError) onError(error);
      }
    );
  },

  /**
   * Seed initial pets into Firestore once if collection is empty
   */
  async seedInitialPetsIfEmpty(initialPets: Pet[]): Promise<void> {
    if (!db || !isFirebaseConfigured()) return;
    const firestoreDb = db;

    try {
      const petsCol = collection(firestoreDb, 'pets');
      const snapshot = await getDocs(petsCol);
      if (!snapshot.empty) {
        return;
      }

      const existingIds = new Set(snapshot.docs.map((d) => d.id));
      const missingPets = initialPets.filter((pet) => !existingIds.has(pet.id));

      if (missingPets.length > 0) {
        const batch = writeBatch(firestoreDb);
        missingPets.forEach((pet) => {
          const petRef = doc(firestoreDb, 'pets', pet.id);
          batch.set(petRef, {
            ...pet,
            ownerId: pet.ownerId || SYSTEM_SHELTER_OWNER_ID,
            ownerName: pet.ownerName || 'Certified Shelter Partner',
            status: pet.status || 'available',
            createdAt: pet.createdAt || Date.now(),
          });
        });

        await batch.commit();
      }
    } catch {
      // Silently ignore if offline or unauthenticated on startup
    }
  },

  /**
   * Create a new pet listing in Firestore with ownerId
   */
  async createPet(
    petData: Omit<Pet, 'id' | 'createdAt'>,
    ownerId: string,
    ownerName?: string
  ): Promise<string> {
    if (!db || !isFirebaseConfigured()) {
      throw new Error('Firebase is not configured.');
    }
    const firestoreDb = db;

    const newId = `pet-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const petDocRef = doc(firestoreDb, 'pets', newId);

    const fullPetData: Pet = {
      ...petData,
      id: newId,
      ownerId,
      ownerName: ownerName || 'Community Member',
      status: 'available',
      createdAt: Date.now(),
    };

    await setDoc(petDocRef, sanitizeForFirestore(fullPetData));
    return newId;
  },

  /**
   * Update a pet's status (available | pending | adopted)
   */
  async updatePetStatus(petId: string, status: PetStatus): Promise<void> {
    if (!db || !isFirebaseConfigured()) return;
    const firestoreDb = db;
    const petDocRef = doc(firestoreDb, 'pets', petId);
    await updateDoc(petDocRef, { status });
  },

  /**
   * Delete a pet listing from Firestore
   */
  async deletePet(petId: string): Promise<void> {
    if (!db || !isFirebaseConfigured()) return;
    const firestoreDb = db;
    const petDocRef = doc(firestoreDb, 'pets', petId);
    await deleteDoc(petDocRef);
  },

  /**
   * Listen to applications submitted by the current user
   */
  subscribeToUserApplications(
    applicantId: string,
    onUpdate: (apps: AdoptionApplication[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!db || !isFirebaseConfigured() || !applicantId) {
      return () => {};
    }
    const firestoreDb = db;

    const q = query(
      collection(firestoreDb, 'applications'),
      where('applicantId', '==', applicantId)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const apps: AdoptionApplication[] = [];
        snapshot.forEach((d) => {
          apps.push({ id: d.id, ...(d.data() as Omit<AdoptionApplication, 'id'>) });
        });
        apps.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        onUpdate(apps);
      },
      (error) => {
        console.warn('User applications subscription note:', error.message);
        if (onError) onError(error);
      }
    );
  },

  /**
   * Listen to incoming adoption requests for pets owned by current user
   */
  subscribeToIncomingRequests(
    petOwnerId: string,
    onUpdate: (apps: AdoptionApplication[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!db || !isFirebaseConfigured() || !petOwnerId) {
      return () => {};
    }
    const firestoreDb = db;

    const q = query(
      collection(firestoreDb, 'applications'),
      where('petOwnerId', '==', petOwnerId)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const requests: AdoptionApplication[] = [];
        snapshot.forEach((d) => {
          requests.push({ id: d.id, ...(d.data() as Omit<AdoptionApplication, 'id'>) });
        });
        requests.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        onUpdate(requests);
      },
      (error) => {
        console.warn('Incoming requests subscription note:', error.message);
        if (onError) onError(error);
      }
    );
  },

  /**
   * Check if a user already has an active application for a pet
   */
  async checkUserAlreadyApplied(
    applicantId: string,
    petId: string
  ): Promise<boolean> {
    if (!db || !isFirebaseConfigured() || !applicantId || !petId) {
      return false;
    }
    const firestoreDb = db;

    const q = query(
      collection(firestoreDb, 'applications'),
      where('applicantId', '==', applicantId),
      where('petId', '==', petId)
    );

    const snap = await getDocs(q);
    const activeApp = snap.docs.find(
      (d) => d.data().status !== 'rejected'
    );
    return Boolean(activeApp);
  },

  /**
   * Submit a new adoption application
   */
  async createApplication(
    appData: Omit<AdoptionApplication, 'id' | 'status' | 'submittedAt' | 'createdAt'>,
    applicantId: string,
    petOwnerId: string,
    applicantEmail?: string
  ): Promise<AdoptionApplication> {
    if (!db || !isFirebaseConfigured()) {
      throw new Error('Firebase is not configured.');
    }
    const firestoreDb = db;

    // Verify pet is still available
    const petDocRef = doc(firestoreDb, 'pets', appData.petId);
    const petSnap = await getDoc(petDocRef);
    if (petSnap.exists() && petSnap.data().status === 'adopted') {
      throw new Error('This pet has already been adopted by another family.');
    }

    // Prevent duplicate application from same user for same pet
    const alreadyApplied = await this.checkUserAlreadyApplied(
      applicantId,
      appData.petId
    );
    if (alreadyApplied) {
      throw new Error('You have already submitted an adoption application for this pet.');
    }

    // Prevent applying to own pet
    if (petOwnerId && applicantId && petOwnerId === applicantId) {
      throw new Error('You cannot apply to adopt a pet that you listed.');
    }

    const appId = `app-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const appDocRef = doc(firestoreDb, 'applications', appId);

    const now = Date.now();
    const newApp: AdoptionApplication = {
      ...appData,
      id: appId,
      applicantId,
      petOwnerId: petOwnerId || SYSTEM_SHELTER_OWNER_ID,
      applicantEmail: applicantEmail || '',
      status: 'pending',
      submittedAt: 'Just now',
      createdAt: now,
    };

    await setDoc(appDocRef, sanitizeForFirestore(newApp));
    return newApp;
  },

  /**
   * Accept an adoption application:
   * 1. Validates ownership: only pet.ownerId === currentUserId can accept.
   * 2. Validates availability: pet status must still be 'available'.
   * 3. Atomically sets application status = 'accepted', pet status = 'adopted',
   *    and automatically rejects other pending applications for that pet.
   */
  async acceptApplication(
    applicationId: string,
    petId: string,
    currentUserId: string
  ): Promise<void> {
    if (!db || !isFirebaseConfigured()) {
      throw new Error('Firebase is not configured.');
    }
    const firestoreDb = db;

    const petDocRef = doc(firestoreDb, 'pets', petId);
    const petSnap = await getDoc(petDocRef);

    if (!petSnap.exists()) {
      throw new Error('Pet listing was not found.');
    }

    const petData = petSnap.data() as Pet;

    // Enforce Ownership Security
    if (petData.ownerId !== currentUserId) {
      throw new Error('Unauthorized: Only the pet owner can accept adoption applications.');
    }

    // Prevent duplicate adoption conflicts
    if (petData.status === 'adopted') {
      throw new Error('This pet has already been marked as adopted.');
    }

    const batch = writeBatch(firestoreDb);

    // 1. Accept the chosen application
    const appDocRef = doc(firestoreDb, 'applications', applicationId);
    batch.update(appDocRef, { status: 'accepted' });

    // 2. Mark pet as adopted
    batch.update(petDocRef, { status: 'adopted' });

    // 3. Reject any competing pending applications for the same pet
    const competingQuery = query(
      collection(firestoreDb, 'applications'),
      where('petId', '==', petId),
      where('petOwnerId', '==', currentUserId)
    );
    const competingSnap = await getDocs(competingQuery);

    competingSnap.forEach((docSnap) => {
      if (docSnap.id !== applicationId && docSnap.data().status === 'pending') {
        batch.update(docSnap.ref, { status: 'rejected' });
      }
    });

    await batch.commit();
  },

  /**
   * Decline / Reject an adoption application:
   * Validates pet ownership before updating.
   */
  async rejectApplication(
    applicationId: string,
    petOwnerId: string,
    currentUserId: string
  ): Promise<void> {
    if (!db || !isFirebaseConfigured()) {
      throw new Error('Firebase is not configured.');
    }
    const firestoreDb = db;

    if (petOwnerId !== currentUserId) {
      throw new Error('Unauthorized: Only the pet owner can decline adoption applications.');
    }

    const appDocRef = doc(firestoreDb, 'applications', applicationId);
    await updateDoc(appDocRef, { status: 'rejected' });
  },

  /**
   * Toggle saved pet ID in Firestore user document
   */
  async toggleSavedPet(
    userId: string,
    petId: string,
    isCurrentlySaved: boolean
  ): Promise<void> {
    if (!db || !isFirebaseConfigured() || !userId) return;
    const firestoreDb = db;

    const userDocRef = doc(firestoreDb, 'users', userId);
    await updateDoc(userDocRef, {
      savedPetIds: isCurrentlySaved ? arrayRemove(petId) : arrayUnion(petId),
    });
  },

  /**
   * Listen to real-time chat messages for an adoption application
   */
  subscribeToMessages(
    applicationId: string,
    onUpdate: (messages: ChatMessage[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!db || !isFirebaseConfigured() || !applicationId) {
      return () => {};
    }
    const firestoreDb = db;

    const messagesCol = collection(
      firestoreDb,
      'applications',
      applicationId,
      'messages'
    );
    const q = query(messagesCol, orderBy('createdAt', 'asc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((d) => {
          msgs.push({
            id: d.id,
            ...(d.data() as Omit<ChatMessage, 'id'>),
          });
        });
        onUpdate(msgs);
      },
      (error) => {
        // Forward error to callback to enable seamless local chat fallback
        if (onError) {
          onError(error);
        } else {
          console.warn('Firestore messages subscription note:', error.message);
        }
      }
    );
  },

  /**
   * Send a real-time message inside an adoption application chat
   */
  async sendMessage(
    applicationId: string,
    senderId: string,
    senderName: string,
    text: string,
    senderPhotoUrl?: string
  ): Promise<ChatMessage> {
    if (!db || !isFirebaseConfigured()) {
      throw new Error('Firebase is not configured.');
    }
    const firestoreDb = db;

    const now = Date.now();
    const msgId = `msg-${now}-${Math.random().toString(36).substring(2, 6)}`;
    const msgDocRef = doc(
      firestoreDb,
      'applications',
      applicationId,
      'messages',
      msgId
    );

    const newMsg: ChatMessage = {
      id: msgId,
      applicationId,
      senderId,
      senderName,
      senderPhotoUrl: senderPhotoUrl || '',
      text: text.trim(),
      createdAt: now,
    };

    // Save message doc
    await setDoc(msgDocRef, sanitizeForFirestore(newMsg));

    // Update parent application with lastMessage preview
    try {
      const appDocRef = doc(firestoreDb, 'applications', applicationId);
      await updateDoc(appDocRef, {
        lastMessageText: text.trim(),
        lastMessageTime: now,
        lastSenderId: senderId,
        lastSenderName: senderName,
      });
    } catch {
      // Non-blocking if application doc update fails
    }

    return newMsg;
  },
};

