export type PetCategory = 'dogs' | 'cats' | 'rabbits' | 'birds' | 'others';
export type PetGender = 'male' | 'female';
export type PetStatus = 'available' | 'pending' | 'adopted';
export type ApplicationStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'Pending Review'
  | 'Under Shelter Review'
  | 'Approved'
  | 'Completed';

export interface Pet {
  id: string;
  name: string;
  breed: string;
  age: string;
  gender: PetGender;
  location: string;
  category: PetCategory;
  description: string;
  imageUrl: string;
  imageUrls?: string[];
  additionalImages?: string[];
  videoUrl?: string;
  videoThumbnail?: string;
  health?: {
    vaccinated: boolean;
    dewormed: boolean;
    spayedNeutered: boolean;
    notes?: string;
  };
  adoptionRequirements?: string[];
  adoptionFee?: number;
  tags?: string[];
  isFeatured?: boolean;
  shelterName?: string;
  shelterContact?: string;
  ownerId?: string;
  ownerName?: string;
  status?: PetStatus;
  createdAt: number;
}

export interface AdoptionApplication {
  id: string;
  petId: string;
  petName: string;
  petBreed: string;
  petImageUrl: string;
  petOwnerId?: string;
  applicantId?: string;
  applicantName: string;
  applicantEmail?: string;
  phoneNumber: string;
  address: string;
  experience: string;
  reason: string;
  status: ApplicationStatus;
  submittedAt: string;
  createdAt?: number;
  lastMessageText?: string;
  lastMessageTime?: number;
  lastSenderId?: string;
  lastSenderName?: string;
}

export interface ChatMessage {
  id: string;
  applicationId: string;
  senderId: string;
  senderName: string;
  senderPhotoUrl?: string;
  text: string;
  createdAt: number;
}

export interface UserProfile {
  uid?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  avatarUrl?: string;
  profilePhotoUrl?: string;
  savedPetIds?: string[];
  createdAt?: number;
  updatedAt?: number;
}

export type PetPreference = 'dogs' | 'cats' | 'others' | 'any';
export type LivingSituation = 'apartment' | 'house' | 'other';
export type HouseholdType = 'alone' | 'couple' | 'family' | 'family_children' | 'seniors';
export type PetExperience = 'first_time' | 'some_experience' | 'experienced';
export type ActivityLevel = 'low' | 'moderate' | 'high';
export type TimeAvailable = 'under_1h' | '1_to_2h' | '2_to_4h' | '4h_plus';
export type PreferredPetAge = 'puppy_kitten' | 'young' | 'adult' | 'senior' | 'any';
export type PreferredPetSize = 'small' | 'medium' | 'large' | 'any';

export interface AIMatchQuestionnaire {
  petPreference: PetPreference;
  livingSituation: LivingSituation;
  location: string;
  household: HouseholdType;
  experience: PetExperience;
  activityLevel: ActivityLevel;
  timeAvailable: TimeAvailable;
  preferredAge: PreferredPetAge;
  preferredSize: PreferredPetSize;
  adoptionPreferences: string[];
}

export interface AIMatchDimensionScore {
  score: number; // 0 to 1
  label: 'Excellent' | 'Good' | 'Compatible' | 'Needs Attention';
  detail: string;
}

export interface AIMatchScoreBreakdown {
  livingSituation: AIMatchDimensionScore;
  activityLevel: AIMatchDimensionScore;
  location: AIMatchDimensionScore;
  household: AIMatchDimensionScore;
  experience: AIMatchDimensionScore;
  personality: AIMatchDimensionScore;
}

export interface AIMatchResult {
  pet: Pet;
  score: number; // 0 to 100 (percentage derived from 1 - distance / maxDistance)
  scoreBreakdown: AIMatchScoreBreakdown;
  aiExplanation: string;
  aiConsideration?: string;
  // Formal KNN ML Metadata for viva demonstration & debugging
  distance?: number;
  similarity?: number;
  vectorCoordinates?: number[];
  userVectorCoordinates?: number[];
  neighborRank?: number;
  kValue?: number;
  featureNames?: string[];
  metricWeights?: number[];
  normalizationScaleDistance?: number;
}

export type PetCareCategory =
  | 'nutrition'
  | 'exercise'
  | 'behavior'
  | 'grooming'
  | 'health'
  | 'new_pet'
  | 'wellbeing'
  | 'general';

export interface PetCarePlanTask {
  time?: string;
  task: string;
  category: string;
  frequency?: string;
}

export interface PetCarePlan {
  petName: string;
  petBreed?: string;
  dailyRoutine: PetCarePlanTask[];
  weeklyRoutine: PetCarePlanTask[];
  importantNotes: string[];
  createdAt: number;
}

export interface PetCareMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  category?: PetCareCategory;
  tryThis?: string[];
  whenToGetHelp?: string;
  isEmergency?: boolean;
  carePlan?: PetCarePlan;
  relatedPetId?: string;
  createdAt: number;
}

declare module 'lucide-react-native' {
  export interface LucideProps {
    color?: string;
    fill?: string;
    strokeWidth?: string | number;
    style?: any;
  }
}
