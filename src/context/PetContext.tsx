import React, { createContext, useContext, useState, useEffect } from 'react';
import { Pet, AdoptionApplication, UserProfile, PetCategory, PetStatus, ChatMessage } from '../types';
import { INITIAL_PETS, INITIAL_APPLICATIONS, INITIAL_USER, SYSTEM_SHELTER_OWNER_ID } from '../data/initialPets';
import { storageAdapter } from '../services/storageAdapter';
import { isFirebaseConfigured, isFirebaseInitialized, getFirebaseError, firebaseConfig } from '../services/firebase';
import { authService } from '../services/authService';
import { firestoreService } from '../services/firestoreService';

interface PetContextType {
  pets: Pet[];
  savedPetIds: string[];
  applications: AdoptionApplication[];
  incomingRequests: AdoptionApplication[];
  userProfile: UserProfile | null;
  isReady: boolean;
  isFirebaseActive: boolean;
  firebaseProjectId?: string;
  firebaseError?: string | null;
  isAuthModalOpen: boolean;

  searchQuery: string;
  selectedCategory: PetCategory | 'all';
  activeVideoPet: Pet | null;
  toastMessage: string | null;
  submittedApplication: AdoptionApplication | null;

  // Auth actions
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;

  // Pet & Application actions
  toggleSavePet: (petId: string) => Promise<void>;
  isPetSaved: (petId: string) => boolean;
  hasUserApplied: (petId: string) => boolean;
  addPet: (newPet: Omit<Pet, 'id' | 'createdAt'>) => Promise<string>;
  deletePet: (petId: string) => Promise<void>;
  submitApplication: (
    appData: Omit<AdoptionApplication, 'id' | 'status' | 'submittedAt' | 'createdAt'>
  ) => Promise<AdoptionApplication>;
  acceptRequest: (applicationId: string, petId: string) => Promise<void>;
  rejectRequest: (applicationId: string, petOwnerId: string) => Promise<void>;
  updateUserProfile: (profileUpdates: Partial<UserProfile>) => Promise<void>;

  // Direct Chat Actions
  sendMessage: (applicationId: string, text: string) => Promise<ChatMessage>;
  subscribeToMessages: (
    applicationId: string,
    onUpdate: (messages: ChatMessage[]) => void
  ) => () => void;
  chatNotification: { message: ChatMessage; application: AdoptionApplication } | null;
  dismissChatNotification: () => void;
  openChatForNotification: (application: AdoptionApplication) => void;
  activeModalChatApp: AdoptionApplication | null;
  closeModalChat: () => void;

  // UI state actions
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: PetCategory | 'all') => void;
  openVideoModal: (pet: Pet) => void;
  closeVideoModal: () => void;
  showToast: (msg: string) => void;
  getPetById: (id: string) => Pet | undefined;
}

const PetContext = createContext<PetContextType | undefined>(undefined);

export const PetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isFirebaseActive = isFirebaseConfigured() && isFirebaseInitialized();
  const firebaseError = getFirebaseError()?.message || null;
  const firebaseProjectId = firebaseConfig.projectId || 'petconnect-6e1f6';

  const [pets, setPets] = useState<Pet[]>(INITIAL_PETS);
  const [savedPetIds, setSavedPetIds] = useState<string[]>(['bella-1', 'milo-2']);
  const [applications, setApplications] = useState<AdoptionApplication[]>(INITIAL_APPLICATIONS);
  const [incomingRequests, setIncomingRequests] = useState<AdoptionApplication[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(
    isFirebaseActive ? null : INITIAL_USER
  );

  const [isReady, setIsReady] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<PetCategory | 'all'>('all');
  const [activeVideoPet, setActiveVideoPet] = useState<Pet | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [submittedApplication, setSubmittedApplication] = useState<AdoptionApplication | null>(null);

  // New Chat Notification Banner State
  const [chatNotification, setChatNotification] = useState<{
    message: ChatMessage;
    application: AdoptionApplication;
  } | null>(null);
  const [activeModalChatApp, setActiveModalChatApp] = useState<AdoptionApplication | null>(null);

  const lastKnownTimestamps = React.useRef<Record<string, number>>({});

  const dismissChatNotification = () => setChatNotification(null);
  const openChatForNotification = (application: AdoptionApplication) => {
    setActiveModalChatApp(application);
  };
  const closeModalChat = () => setActiveModalChatApp(null);

  // Automatically listen for incoming message updates across all applications
  useEffect(() => {
    const allUserApps = [...applications, ...incomingRequests];
    allUserApps.forEach((app) => {
      if (app.lastMessageText && app.lastMessageTime) {
        const prev = lastKnownTimestamps.current[app.id] || 0;
        const currentUserId = userProfile?.uid || 'demo-user-sarah';

        if (
          prev > 0 &&
          app.lastMessageTime > prev &&
          app.lastSenderId &&
          app.lastSenderId !== currentUserId
        ) {
          const incomingMsg: ChatMessage = {
            id: `msg-${app.lastMessageTime}`,
            applicationId: app.id,
            senderId: app.lastSenderId,
            senderName: app.lastSenderName || 'Pet Caregiver',
            text: app.lastMessageText,
            createdAt: app.lastMessageTime,
          };
          setChatNotification({ message: incomingMsg, application: app });
        }
        lastKnownTimestamps.current[app.id] = app.lastMessageTime;
      }
    });
  }, [applications, incomingRequests, userProfile?.uid]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3200);
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  // -------------------------------------------------------------
  // INITIALIZATION: Firebase vs Offline / Demo Mode
  // -------------------------------------------------------------
  useEffect(() => {
    let unsubscribePets: (() => void) | undefined;
    let unsubscribeAuth: (() => void) | undefined;
    let unsubscribeUserApps: (() => void) | undefined;
    let unsubscribeIncoming: (() => void) | undefined;

    if (isFirebaseActive) {
      console.log('🚀 PetConnect: Starting in Live Firebase Mode');

      // 1. Seed demo pets to Firestore once if collection is empty
      firestoreService.seedInitialPetsIfEmpty(INITIAL_PETS);

      // 2. Real-time listener for Pets collection
      unsubscribePets = firestoreService.subscribeToPets(
        (updatedPets) => {
          if (updatedPets.length > 0) {
            setPets(updatedPets);
          } else {
            setPets(INITIAL_PETS);
          }
          setIsReady(true);
        },
        () => {
          // If network error, keep current pets
          setIsReady(true);
        }
      );

      // 3. Real-time Firebase Auth state listener
      unsubscribeAuth = authService.onAuthChange((profile) => {
        setUserProfile(profile);

        // Clean up previous application listeners
        if (unsubscribeUserApps) unsubscribeUserApps();
        if (unsubscribeIncoming) unsubscribeIncoming();

        if (profile?.uid) {
          if (profile.savedPetIds) {
            setSavedPetIds(profile.savedPetIds);
          }

          // 4. Real-time listener for current user's submitted applications
          unsubscribeUserApps = firestoreService.subscribeToUserApplications(
            profile.uid,
            (apps) => {
              setApplications(apps);
            },
            () => {
              // Permission or offline fallback
            }
          );

          // 5. Real-time listener for incoming requests on pets owned by this user
          unsubscribeIncoming = firestoreService.subscribeToIncomingRequests(
            profile.uid,
            (requests) => {
              setIncomingRequests(requests);
            },
            () => {
              // Permission or offline fallback
            }
          );
        } else {
          // Signed out
          setApplications([]);
          setIncomingRequests([]);
          setSavedPetIds([]);
        }
        setIsReady(true);
      });
    } else {
      // Offline / Demo Mode with AsyncStorage
      console.log('📦 PetConnect: Starting in Demo Mode (Local Storage)');
      async function loadLocalData() {
        try {
          const [storedPets, storedSaved, storedApps, storedUser] = await Promise.all([
            storageAdapter.loadPets(INITIAL_PETS),
            storageAdapter.loadSavedIds(['bella-1', 'milo-2']),
            storageAdapter.loadApplications(INITIAL_APPLICATIONS),
            storageAdapter.loadUser(INITIAL_USER),
          ]);
          setPets(storedPets);
          setSavedPetIds(storedSaved);
          setApplications(storedApps);
          setUserProfile(storedUser);
        } catch (e) {
          console.warn('Error loading initial data from local storage:', e);
        } finally {
          setIsReady(true);
        }
      }
      loadLocalData();
    }

    return () => {
      if (unsubscribePets) unsubscribePets();
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeUserApps) unsubscribeUserApps();
      if (unsubscribeIncoming) unsubscribeIncoming();
    };
  }, [isFirebaseActive]);

  // Sync to AsyncStorage if in Demo Mode
  useEffect(() => {
    if (!isFirebaseActive && isReady) {
      storageAdapter.savePets(pets);
      storageAdapter.saveSavedIds(savedPetIds);
      storageAdapter.saveApplications(applications);
      if (userProfile) storageAdapter.saveUser(userProfile);
    }
  }, [pets, savedPetIds, applications, userProfile, isFirebaseActive, isReady]);

  // -------------------------------------------------------------
  // AUTHENTICATION ACTIONS
  // -------------------------------------------------------------
  const signUp = async (name: string, email: string, pass: string) => {
    if (isFirebaseActive) {
      const profile = await authService.signUp(name, email, pass);
      setUserProfile(profile);
    } else {
      const demoProfile: UserProfile = {
        uid: `demo-${Date.now()}`,
        name: name.trim(),
        email: email.trim(),
        phone: '',
        address: '',
        profilePhotoUrl: '',
        avatarUrl: '',
        savedPetIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setUserProfile(demoProfile);
    }
  };

  const signIn = async (email: string, pass: string) => {
    if (isFirebaseActive) {
      const profile = await authService.signIn(email, pass);
      setUserProfile(profile);
    } else {
      const isOwnerUser = email.includes('owner') || email.includes('caregiver');
      const demoProfile: UserProfile = {
        uid: isOwnerUser ? 'demo-user-alex' : 'demo-user-sarah',
        name: isOwnerUser ? 'Alex Caregiver' : 'Sarah Sharma',
        email,
        phone: '+91 98765 43210',
        address: 'Andheri West, Mumbai, Maharashtra',
        profilePhotoUrl: '',
        avatarUrl: '',
        savedPetIds: ['bella-1', 'milo-2'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setUserProfile(demoProfile);
    }
  };

  const signOut = async () => {
    if (isFirebaseActive) {
      await authService.signOut();
      setUserProfile(null);
      showToast('Signed out of PetConnect');
    } else {
      setUserProfile(null);
      showToast('Signed out (Demo Mode)');
    }
  };

  const updateUserProfile = async (profileUpdates: Partial<UserProfile>) => {
    if (!userProfile) return;
    const updated = { ...userProfile, ...profileUpdates };
    setUserProfile(updated);

    if (isFirebaseActive && userProfile.uid) {
      await authService.updateProfile(userProfile.uid, profileUpdates);
    }
    showToast('Profile updated successfully');
  };

  // -------------------------------------------------------------
  // SAVED PETS ACTIONS
  // -------------------------------------------------------------
  const toggleSavePet = async (petId: string) => {
    const isSaved = savedPetIds.includes(petId);
    const updatedIds = isSaved
      ? savedPetIds.filter((id) => id !== petId)
      : [...savedPetIds, petId];

    setSavedPetIds(updatedIds);

    if (isSaved) {
      showToast('Removed from saved pets');
    } else {
      showToast('Added to saved pets ❤️');
    }

    if (isFirebaseActive && userProfile?.uid) {
      try {
        await firestoreService.toggleSavedPet(userProfile.uid, petId, isSaved);
      } catch (err) {
        console.warn('Error syncing saved pet to Firestore:', err);
      }
    }
  };

  const isPetSaved = (petId: string) => savedPetIds.includes(petId);

  // Check if current user has already applied for this pet
  const hasUserApplied = (petId: string) => {
    return applications.some(
      (app) => app.petId === petId && app.status !== 'rejected'
    );
  };

  // -------------------------------------------------------------
  // PETS & ADOPTION ACTIONS
  // -------------------------------------------------------------
  const addPet = async (newPetData: Omit<Pet, 'id' | 'createdAt'>): Promise<string> => {
    if (!userProfile) {
      openAuthModal();
      throw new Error('Please sign in to list a pet for adoption.');
    }

    const ownerId = userProfile.uid || 'demo-user-alex';
    const ownerName = userProfile.name || 'Community Pet Caregiver';

    if (isFirebaseActive) {
      const newId = await firestoreService.createPet(
        newPetData,
        ownerId,
        ownerName
      );
      showToast(`🐾 ${newPetData.name} was successfully listed!`);
      return newId;
    } else {
      const newId = `pet-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const pet: Pet = {
        ...newPetData,
        id: newId,
        ownerId,
        ownerName,
        status: 'available',
        createdAt: Date.now(),
        isFeatured: true,
      };
      setPets((prev) => [pet, ...prev]);
      showToast(`🐾 ${pet.name} was successfully listed!`);
      return newId;
    }
  };

  const deletePet = async (petId: string): Promise<void> => {
    if (isFirebaseActive) {
      await firestoreService.deletePet(petId);
    }
    setPets((prev) => prev.filter((p) => p.id !== petId));
    showToast('Pet listing removed successfully 🗑️');
  };

  const submitApplication = async (
    appData: Omit<AdoptionApplication, 'id' | 'status' | 'submittedAt' | 'createdAt'>
  ): Promise<AdoptionApplication> => {
    if (!userProfile) {
      openAuthModal();
      throw new Error('Please sign in to submit an adoption application.');
    }

    const targetPet = pets.find((p) => p.id === appData.petId);
    if (targetPet?.status === 'adopted') {
      throw new Error('This pet has already been adopted.');
    }

    if (hasUserApplied(appData.petId)) {
      throw new Error('You have already submitted an adoption application for this pet.');
    }

    if (targetPet?.ownerId && userProfile.uid && targetPet.ownerId === userProfile.uid) {
      throw new Error('You cannot apply to adopt a pet that you listed.');
    }

    const applicantId = userProfile.uid || 'demo-user-sarah';
    const petOwnerId = targetPet?.ownerId || SYSTEM_SHELTER_OWNER_ID;
    const applicantEmail = userProfile.email || 'applicant@example.com';

    if (isFirebaseActive) {
      const newApp = await firestoreService.createApplication(
        appData,
        applicantId,
        petOwnerId,
        applicantEmail
      );
      setSubmittedApplication(newApp);
      showToast('Application submitted successfully! 🐾');
      return newApp;
    } else {
      const newApp: AdoptionApplication = {
        ...appData,
        id: `app-${Date.now()}`,
        applicantId,
        petOwnerId,
        applicantEmail,
        status: 'pending',
        submittedAt: 'Just now',
        createdAt: Date.now(),
      };
      setApplications((prev) => [newApp, ...prev]);
      setSubmittedApplication(newApp);
      showToast('Application submitted successfully! 🐾');
      return newApp;
    }
  };

  const acceptRequest = async (applicationId: string, petId: string) => {
    if (!userProfile) {
      openAuthModal();
      return;
    }

    const currentUserId = userProfile.uid || 'demo-user-alex';

    if (isFirebaseActive) {
      await firestoreService.acceptApplication(applicationId, petId, currentUserId);
      showToast('🎉 Adoption accepted! Pet marked as Adopted.');
    } else {
      // Local demo mode simulation:
      setApplications((prev) =>
        prev.map((app) => {
          if (app.id === applicationId) return { ...app, status: 'accepted' };
          if (app.petId === petId && app.status === 'pending')
            return { ...app, status: 'rejected' };
          return app;
        })
      );
      setIncomingRequests((prev) =>
        prev.map((app) => {
          if (app.id === applicationId) return { ...app, status: 'accepted' };
          if (app.petId === petId && app.status === 'pending')
            return { ...app, status: 'rejected' };
          return app;
        })
      );
      setPets((prev) =>
        prev.map((p) => (p.id === petId ? { ...p, status: 'adopted' } : p))
      );
      showToast('🎉 Adoption accepted! Pet marked as Adopted.');
    }
  };

  const rejectRequest = async (applicationId: string, petOwnerId: string) => {
    if (!userProfile) {
      openAuthModal();
      return;
    }

    const currentUserId = userProfile.uid || 'demo-user-alex';

    if (isFirebaseActive) {
      await firestoreService.rejectApplication(applicationId, petOwnerId, currentUserId);
      showToast('Application marked as declined.');
    } else {
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, status: 'rejected' } : app
        )
      );
      setIncomingRequests((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, status: 'rejected' } : app
        )
      );
      showToast('Application marked as declined.');
    }
  };

  // -------------------------------------------------------------
  // DIRECT CHAT ACTIONS
  // -------------------------------------------------------------
  const [demoMessages, setDemoMessages] = useState<Record<string, ChatMessage[]>>({
    'app-1': [
      {
        id: 'msg-demo-1',
        applicationId: 'app-1',
        senderId: SYSTEM_SHELTER_OWNER_ID,
        senderName: 'Alex Caregiver',
        text: 'Hi! Thank you for applying. Do you have any questions about daily routines or vaccination history?',
        createdAt: Date.now() - 3600000 * 2,
      },
      {
        id: 'msg-demo-2',
        applicationId: 'app-1',
        senderId: 'demo-user-sarah',
        senderName: 'Sarah Sharma',
        text: 'Hello! Yes, we have a safe pet-friendly home and would love to schedule a visit to meet.',
        createdAt: Date.now() - 3600000 * 1,
      },
    ],
  });

  const subscribeToMessages = (
    applicationId: string,
    onUpdate: (messages: ChatMessage[]) => void
  ): (() => void) => {
    if (isFirebaseActive) {
      return firestoreService.subscribeToMessages(
        applicationId,
        onUpdate,
        (_err) => {
          // Fallback to local memory messages if Firestore security rules block subcollection
          const fallbackMsgs = demoMessages[applicationId] || [
            {
              id: `msg-welcome-${applicationId}`,
              applicationId,
              senderId: 'system',
              senderName: 'PetConnect Caregiver',
              text: 'Hello! Thank you for applying. Feel free to chat here to coordinate meet & greets, home visits, and questions.',
              createdAt: Date.now() - 60000,
            },
          ];
          onUpdate(fallbackMsgs);
        }
      );
    } else {
      const msgs = demoMessages[applicationId] || [
        {
          id: `msg-welcome-${applicationId}`,
          applicationId,
          senderId: 'system',
          senderName: 'PetConnect Caregiver',
          text: 'Hello! Thank you for your interest. Feel free to chat here to discuss adoption details, home visits, and schedules.',
          createdAt: Date.now() - 60000,
        },
      ];
      onUpdate(msgs);
      return () => {};
    }
  };

  const sendMessage = async (applicationId: string, text: string): Promise<ChatMessage> => {
    if (!text.trim()) {
      throw new Error('Message cannot be empty.');
    }
    const currentUserId = userProfile?.uid || 'demo-user';
    const currentUserName = userProfile?.name || 'Pet Parent';
    const currentUserPhoto = userProfile?.profilePhotoUrl || userProfile?.avatarUrl || '';

    if (isFirebaseActive) {
      try {
        const sent = await firestoreService.sendMessage(
          applicationId,
          currentUserId,
          currentUserName,
          text,
          currentUserPhoto
        );
        return sent;
      } catch (err) {
        console.warn('Firestore message save note, using local state:', err);
        const fallbackMsg: ChatMessage = {
          id: `msg-local-${Date.now()}`,
          applicationId,
          senderId: currentUserId,
          senderName: currentUserName,
          senderPhotoUrl: currentUserPhoto,
          text: text.trim(),
          createdAt: Date.now(),
        };

        setDemoMessages((prev) => ({
          ...prev,
          [applicationId]: [...(prev[applicationId] || []), fallbackMsg],
        }));

        return fallbackMsg;
      }
    } else {
      const newMsg: ChatMessage = {
        id: `msg-demo-${Date.now()}`,
        applicationId,
        senderId: currentUserId,
        senderName: currentUserName,
        senderPhotoUrl: currentUserPhoto,
        text: text.trim(),
        createdAt: Date.now(),
      };

      setDemoMessages((prev) => ({
        ...prev,
        [applicationId]: [...(prev[applicationId] || []), newMsg],
      }));

      return newMsg;
    }
  };

  // Video & Utility
  const openVideoModal = (pet: Pet) => setActiveVideoPet(pet);
  const closeVideoModal = () => setActiveVideoPet(null);
  const getPetById = (id: string) => pets.find((p) => p.id === id);

  return (
    <PetContext.Provider
      value={{
        pets,
        savedPetIds,
        applications,
        incomingRequests,
        userProfile,
        isReady,
        isFirebaseActive,
        firebaseProjectId,
        firebaseError,
        isAuthModalOpen,
        searchQuery,
        selectedCategory,
        activeVideoPet,
        toastMessage,
        submittedApplication,
        openAuthModal,
        closeAuthModal,
        signUp,
        signIn,
        signOut,
        toggleSavePet,
        isPetSaved,
        hasUserApplied,
        addPet,
        deletePet,
        submitApplication,
        acceptRequest,
        rejectRequest,
        updateUserProfile,
        sendMessage,
        subscribeToMessages,
        chatNotification,
        dismissChatNotification,
        openChatForNotification,
        activeModalChatApp,
        closeModalChat,
        setSearchQuery,
        setSelectedCategory,
        openVideoModal,
        closeVideoModal,
        showToast,
        getPetById,
      }}
    >
      {children}
    </PetContext.Provider>
  );
};

export const usePet = () => {
  const context = useContext(PetContext);
  if (!context) {
    throw new Error('usePet must be used within a PetProvider');
  }
  return context;
};
