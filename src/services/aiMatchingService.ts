import {
  Pet,
  AIMatchQuestionnaire,
  AIMatchResult,
  AIMatchScoreBreakdown,
  AIMatchDimensionScore,
  PreferredPetAge,
  PreferredPetSize,
  ActivityLevel,
} from '../types';

/**
 * ============================================================================
 * PETCONNECT K-NEAREST NEIGHBORS (KNN) RECOMMENDATION ENGINE
 * ============================================================================
 *
 * ACADEMIC PIPELINE:
 * 1. User Questionnaire & Pet Records
 *       │
 *       ▼
 * 2. Feature Encoding into Common Vector Space (ℝ¹⁸)
 *       │  - One-Hot Categorical Encoding (Species)
 *       │  - Min-Max Normalization (Age, Time, Size, Activity, Experience)
 *       │  - Multi-Hot Vocabulary Binary Vectors (Personality & Needs)
 *       ▼
 * 3. User Vector U ∈ ℝ¹⁸ and Pet Vectors P_i ∈ ℝ¹⁸
 *       │
 *       ▼
 * 4. Weighted Euclidean Distance Metric Calculation:
 *       d(U, P) = √( Σ w_j * (u_j - p_j)² )
 *       │
 *       ▼
 * 5. Nearest-Neighbor Selection & Sorting:
 *       Rank ascending by distance d(U, P) (smaller distance = higher compatibility)
 *       │
 *       ▼
 * 6. Top-K Selection:
 *       Select K nearest neighbors (Default K = 5, adjustable to K = 3)
 *       │
 *       ▼
 * 7. Distance-to-Similarity Score Mapping:
 *       Similarity = 1 - (distance / maxDistance)
 *       MatchPercentage = clamp(round(Similarity * 100), 15, 99)
 *       │
 *       ▼
 * 8. Grounded Explainability & Dimensional Breakdown
 * ============================================================================
 */

/**
 * Configurable number of nearest neighbors to retrieve (K parameter)
 * Can be configured to K=3 or K=5 for academic viva demonstrations.
 */
export const DEFAULT_K = 5;

/**
 * Ordered Feature Names in the 18-Dimensional Vector Space ℝ¹⁸
 */
export const KNN_FEATURE_NAMES = [
  'species_dog',          // Dim 0: One-Hot Dog
  'species_cat',          // Dim 1: One-Hot Cat
  'species_other',        // Dim 2: One-Hot Other
  'age_normalized',       // Dim 3: Min-Max Normalized Age [0, 1]
  'size',                 // Dim 4: Ordinal Size [0: Small, 0.5: Med, 1.0: Large]
  'activity_level',       // Dim 5: Ordinal Energy [0: Low, 0.5: Mod, 1.0: High]
  'time_commitment',      // Dim 6: Normalized Daily Time [0.125 to 1.0]
  'experience_level',     // Dim 7: Care Experience Difficulty [0 to 1.0]
  'living_space',         // Dim 8: Living Space Need [0: Apt, 0.5: Mod, 1.0: Yard]
  'location_proximity',   // Dim 9: Geo Compatibility [1.0: Same city, 0.7: State, 0.3: Distant]
  'trait_friendly',       // Dim 10: Multi-Hot Personality - Friendly
  'trait_calm',           // Dim 11: Multi-Hot Personality - Calm
  'trait_playful',        // Dim 12: Multi-Hot Personality - Playful
  'trait_active',         // Dim 13: Multi-Hot Personality - Active / Athletic
  'trait_kid_friendly',   // Dim 14: Multi-Hot Compatibility - Kid Safe
  'trait_pet_friendly',   // Dim 15: Multi-Hot Compatibility - Pet Friendly
  'trait_house_trained',  // Dim 16: Multi-Hot Trait - House / Litter Trained
  'trait_special_needs',  // Dim 17: Multi-Hot Trait - Special Care Friendly
] as const;

export type KNNFeatureName = typeof KNN_FEATURE_NAMES[number];

/**
 * Feature Metric Importance Weights in Euclidean Distance
 * d(U, P) = √( Σ w_j * (u_j - p_j)² )
 */
export const KNN_METRIC_WEIGHTS: number[] = [
  1.2, // species_dog
  1.2, // species_cat
  1.2, // species_other
  1.0, // age_normalized
  1.0, // size
  1.2, // activity_level
  1.0, // time_commitment
  0.8, // experience_level
  1.2, // living_space
  1.1, // location_proximity
  0.7, // trait_friendly
  0.7, // trait_calm
  0.7, // trait_playful
  0.7, // trait_active
  0.7, // trait_kid_friendly
  0.7, // trait_pet_friendly
  0.7, // trait_house_trained
  0.7, // trait_special_needs
];

/**
 * Theoretical Maximum Euclidean Distance for Normalizing Similarity
 * Computed as: √( Σ w_j * (1.0 - 0.0)² ) scaled by a distribution factor (0.75)
 * to map realistic distances onto an intuitive 0–100% human-readable range.
 */
const SUM_METRIC_WEIGHTS = KNN_METRIC_WEIGHTS.reduce((acc, w) => acc + w, 0); // 16.5
export const MAX_THEORETICAL_DISTANCE = Math.sqrt(SUM_METRIC_WEIGHTS); // ~4.062
export const NORMALIZATION_SCALE_DISTANCE = MAX_THEORETICAL_DISTANCE * 0.72; // ~2.92

// Maximum reference age in months (15 years) for min-max scaling
const MAX_REFERENCE_AGE_MONTHS = 180;

/**
 * Helper: Parse age string into numerical months
 */
export function parseAgeToMonths(ageStr: string): number {
  if (!ageStr) return 36; // Default 3 years
  const lower = ageStr.toLowerCase();
  const match = lower.match(/(\d+(\.\d+)?)/);
  const num = match ? parseFloat(match[1]) : 3;

  if (lower.includes('month') || lower.includes('mo')) {
    return Math.max(1, Math.round(num));
  }
  if (lower.includes('week') || lower.includes('wk')) {
    return Math.max(1, Math.round(num * 0.25));
  }
  // Default to years
  return Math.max(1, Math.round(num * 12));
}

/**
 * Helper: Infer age category from pet age string (preserves PetCare AI compatibility)
 */
export function inferPetAgeCategory(ageStr: string): PreferredPetAge {
  const months = parseAgeToMonths(ageStr);
  if (months <= 12) return 'puppy_kitten';
  if (months <= 35) return 'young';
  if (months <= 84) return 'adult';
  return 'senior';
}

/**
 * Helper: Infer pet size from category and breed
 */
export function inferPetSize(pet: Pet): PreferredPetSize {
  if (pet.category !== 'dogs') return 'small';
  const lowerBreed = (pet.breed || '').toLowerCase();
  const smallBreeds = ['french bulldog', 'pug', 'shih tzu', 'chihuahua', 'pomeranian', 'beagle', 'terrier', 'dachshund', 'maltese', 'corgi'];
  const largeBreeds = ['golden retriever', 'labrador', 'german shepherd', 'siberian husky', 'rottweiler', 'great dane', 'doberman', 'boxer'];

  if (smallBreeds.some((b) => lowerBreed.includes(b))) return 'small';
  if (largeBreeds.some((b) => lowerBreed.includes(b))) return 'large';
  return 'medium';
}

/**
 * Helper: Infer pet activity level
 */
export function inferPetActivityLevel(pet: Pet): ActivityLevel {
  const text = `${pet.breed || ''} ${pet.description || ''} ${(pet.tags || []).join(' ')}`.toLowerCase();
  if (text.includes('energetic') || text.includes('athletic') || text.includes('active') || text.includes('run') || text.includes('hiking') || text.includes('trail')) {
    return 'high';
  }
  if (text.includes('calm') || text.includes('quiet') || text.includes('cuddle') || text.includes('gentle') || text.includes('indoor') || text.includes('couch')) {
    return 'low';
  }
  return 'moderate';
}

/**
 * Helper: Calculate location proximity between user location and pet location
 * 1.0 = Same city (exact match)
 * 0.7 = Same state (regional match)
 * 0.3 = Different city/state
 */
export function computeLocationProximity(userLoc: string, petLoc: string): number {
  if (!userLoc || !petLoc) return 0.5;
  const uCity = userLoc.toLowerCase().split(',')[0].trim();
  const pCity = petLoc.toLowerCase().split(',')[0].trim();
  const uState = userLoc.toLowerCase();
  const pState = petLoc.toLowerCase();

  if (uCity && pCity && (uCity === pCity || uCity.includes(pCity) || pCity.includes(uCity))) {
    return 1.0;
  }
  if ((uState.includes('maharashtra') && pState.includes('maharashtra')) ||
      (uState.includes('karnataka') && pState.includes('karnataka')) ||
      (uState.includes('delhi') && pState.includes('delhi'))) {
    return 0.7;
  }
  return 0.3;
}

/**
 * ============================================================================
 * VECTOR ENCODING PIPELINE
 * ============================================================================
 */

/**
 * Encodes a Pet into an 18-dimensional feature vector in ℝ¹⁸
 *
 * @param pet The pet record from Firestore
 * @param userLocation The user's location string for spatial proximity encoding
 */
export function encodePetToVector(pet: Pet, userLocation?: string): number[] {
  const vector: number[] = new Array(KNN_FEATURE_NAMES.length).fill(0);

  // 1. Species One-Hot Encoding (Indices 0, 1, 2)
  if (pet.category === 'dogs') {
    vector[0] = 1.0; vector[1] = 0.0; vector[2] = 0.0;
  } else if (pet.category === 'cats') {
    vector[0] = 0.0; vector[1] = 1.0; vector[2] = 0.0;
  } else {
    vector[0] = 0.0; vector[1] = 0.0; vector[2] = 1.0;
  }

  // 2. Age Normalization via Min-Max Scaling (Index 3)
  const ageMonths = parseAgeToMonths(pet.age);
  vector[3] = Math.min(1.0, Math.max(0.0, ageMonths / MAX_REFERENCE_AGE_MONTHS));

  // 3. Size Ordinal Encoding (Index 4)
  const size = inferPetSize(pet);
  vector[4] = size === 'small' ? 0.0 : size === 'medium' ? 0.5 : 1.0;

  // 4. Activity Level Ordinal Encoding (Index 5)
  const activity = inferPetActivityLevel(pet);
  vector[5] = activity === 'low' ? 0.0 : activity === 'moderate' ? 0.5 : 1.0;

  // 5. Time Commitment Requirement (Index 6)
  if (activity === 'low') vector[6] = 0.25;
  else if (activity === 'moderate') vector[6] = 0.50;
  else vector[6] = 0.85; // High energy requires significant daily care

  // 6. Care Experience Level Needed (Index 7)
  const reqsText = (pet.adoptionRequirements || []).join(' ').toLowerCase();
  const descText = (pet.description || '').toLowerCase();
  const tagsText = (pet.tags || []).join(' ').toLowerCase();
  const allText = `${reqsText} ${descText} ${tagsText}`;

  if (allText.includes('experienced') || allText.includes('trainer') || allText.includes('special needs')) {
    vector[7] = 1.0; // Needs experienced adopter
  } else if (allText.includes('friendly') || allText.includes('gentle') || allText.includes('trained') || allText.includes('first time')) {
    vector[7] = 0.0; // Beginner friendly
  } else {
    vector[7] = 0.5; // Standard companion
  }

  // 7. Living Space Requirement (Index 8)
  if (allText.includes('yard') || allText.includes('fenced yard') || (size === 'large' && activity === 'high')) {
    vector[8] = 1.0; // Yard / House required
  } else if (allText.includes('apartment') || (size === 'small' && activity !== 'high')) {
    vector[8] = 0.0; // Highly suited for apartment
  } else {
    vector[8] = 0.4; // Adaptable
  }

  // 8. Location Proximity (Index 9)
  vector[9] = userLocation ? computeLocationProximity(userLocation, pet.location || '') : 0.7;

  // 9. Multi-Hot Personality Traits (Indices 10 - 17)
  vector[10] = (allText.includes('friendly') || allText.includes('sweet') || allText.includes('affectionate')) ? 1.0 : 0.0;
  vector[11] = (allText.includes('calm') || allText.includes('quiet') || allText.includes('gentle')) ? 1.0 : 0.0;
  vector[12] = (allText.includes('playful') || allText.includes('curious') || allText.includes('fetch')) ? 1.0 : 0.0;
  vector[13] = (allText.includes('active') || allText.includes('energetic') || allText.includes('athletic')) ? 1.0 : 0.0;
  vector[14] = (allText.includes('kid') || allText.includes('children') || allText.includes('family')) ? 1.0 : 0.0;
  vector[15] = (allText.includes('other pets') || allText.includes('social') || allText.includes('dogs') || allText.includes('cats')) ? 1.0 : 0.0;
  vector[16] = (allText.includes('house-trained') || allText.includes('litter-trained') || allText.includes('trained')) ? 1.0 : 0.0;
  vector[17] = (allText.includes('special') || (pet.health && pet.health.notes && pet.health.notes.length > 0)) ? 1.0 : 0.0;

  return vector;
}

/**
 * Encodes a User's Questionnaire into an 18-dimensional feature vector in ℝ¹⁸
 *
 * @param answers The user's completed questionnaire
 */
export function encodeUserToVector(answers: AIMatchQuestionnaire): number[] {
  const vector: number[] = new Array(KNN_FEATURE_NAMES.length).fill(0);

  // 1. Species Preference One-Hot (Indices 0, 1, 2)
  if (answers.petPreference === 'dogs') {
    vector[0] = 1.0; vector[1] = 0.0; vector[2] = 0.0;
  } else if (answers.petPreference === 'cats') {
    vector[0] = 0.0; vector[1] = 1.0; vector[2] = 0.0;
  } else if (answers.petPreference === 'others') {
    vector[0] = 0.0; vector[1] = 0.0; vector[2] = 1.0;
  } else {
    // Neutral representation for 'any': equidistant to all three categories
    vector[0] = 0.333; vector[1] = 0.333; vector[2] = 0.333;
  }

  // 2. Target Age Normalization (Index 3)
  if (answers.preferredAge === 'puppy_kitten') {
    vector[3] = 6 / MAX_REFERENCE_AGE_MONTHS; // ~0.033
  } else if (answers.preferredAge === 'young') {
    vector[3] = 20 / MAX_REFERENCE_AGE_MONTHS; // ~0.111
  } else if (answers.preferredAge === 'adult') {
    vector[3] = 60 / MAX_REFERENCE_AGE_MONTHS; // ~0.333
  } else if (answers.preferredAge === 'senior') {
    vector[3] = 120 / MAX_REFERENCE_AGE_MONTHS; // ~0.667
  } else {
    vector[3] = 36 / MAX_REFERENCE_AGE_MONTHS; // Neutral median: 3 years
  }

  // 3. Preferred Size Ordinal Encoding (Index 4)
  if (answers.preferredSize === 'small') vector[4] = 0.0;
  else if (answers.preferredSize === 'medium') vector[4] = 0.5;
  else if (answers.preferredSize === 'large') vector[4] = 1.0;
  else vector[4] = 0.5; // Neutral

  // 4. Activity Level Ordinal Encoding (Index 5)
  if (answers.activityLevel === 'low') vector[5] = 0.0;
  else if (answers.activityLevel === 'moderate') vector[5] = 0.5;
  else vector[5] = 1.0;

  // 5. Daily Time Commitment (Index 6)
  if (answers.timeAvailable === 'under_1h') vector[6] = 0.125;
  else if (answers.timeAvailable === '1_to_2h') vector[6] = 0.375;
  else if (answers.timeAvailable === '2_to_4h') vector[6] = 0.75;
  else vector[6] = 1.0;

  // 6. User Pet Experience (Index 7)
  if (answers.experience === 'first_time') vector[7] = 0.0;
  else if (answers.experience === 'some_experience') vector[7] = 0.5;
  else vector[7] = 1.0;

  // 7. User Living Space (Index 8)
  // Maps livingSituation and Step 10 'Apartment friendly' preference
  const userPrefs = (answers.adoptionPreferences || []).map((p) => p.toLowerCase());
  const wantsApartmentFriendly = userPrefs.some((p) => p.includes('apartment'));
  if (answers.livingSituation === 'apartment' || wantsApartmentFriendly) {
    vector[8] = 0.0; // Apartment-friendly living space target
  } else if (answers.livingSituation === 'house') {
    vector[8] = 1.0; // House with yard
  } else {
    vector[8] = 0.5; // Adaptable / flexible
  }

  // 8. Location Proximity Target (Index 9)
  // Target is 1.0 (the user desires maximum proximity / nearest pet)
  vector[9] = 1.0;

  // 9. Multi-Hot Personality & Preference Targets (Indices 10 - 17)
  // Trait 10: Friendly (Explicit chip OR multi-member family household)
  vector[10] = (userPrefs.some((p) => p.includes('friendly')) || answers.household === 'family' || answers.household === 'family_children') ? 1.0 : 0.0;

  // Trait 11: Calm (Explicit chip OR senior household needing calm companion)
  vector[11] = (userPrefs.some((p) => p.includes('calm')) || answers.household === 'seniors') ? 1.0 : 0.0;

  // Trait 12: Playful (Explicit chip)
  vector[12] = userPrefs.some((p) => p.includes('playful')) ? 1.0 : 0.0;

  // Trait 13: Active (High activity lifestyle OR explicit chip)
  vector[13] = (answers.activityLevel === 'high' || userPrefs.some((p) => p.includes('active'))) ? 1.0 : 0.0;

  // Trait 14: Kid-Friendly (Family with young children OR explicit chip)
  vector[14] = (answers.household === 'family_children' || userPrefs.some((p) => p.includes('children') || p.includes('kid'))) ? 1.0 : 0.0;

  // Trait 15: Pet-Friendly (Explicit chip)
  vector[15] = userPrefs.some((p) => p.includes('other pets')) ? 1.0 : 0.0;

  // Trait 16: House-Trained (Strictly house/litter trained preference; 'Apartment friendly' maps to Index 8)
  vector[16] = userPrefs.some((p) => p.includes('house-trained') || p.includes('litter')) ? 1.0 : 0.0;

  // Trait 17: Special-Needs Friendly (Explicit chip)
  vector[17] = userPrefs.some((p) => p.includes('special')) ? 1.0 : 0.0;

  return vector;
}

/**
 * ============================================================================
 * EUCLIDEAN DISTANCE & SIMILARITY MATHEMATICS
 * ============================================================================
 */

/**
 * Computes the Weighted Euclidean Distance between User Vector U and Pet Vector P:
 *
 *   d(U, P) = √( Σ w_j * (u_j - p_j)² )
 *
 * @param u User feature vector in ℝ¹⁸
 * @param p Pet feature vector in ℝ¹⁸
 * @param weights Metric importance weights
 */
export function calculateEuclideanDistance(
  u: number[],
  p: number[],
  weights: number[] = KNN_METRIC_WEIGHTS
): number {
  let sumSquaredDiff = 0;
  const dimensions = Math.min(u.length, p.length, weights.length);

  for (let j = 0; j < dimensions; j++) {
    const diff = u[j] - p[j];
    sumSquaredDiff += weights[j] * diff * diff;
  }

  return Math.sqrt(sumSquaredDiff);
}

/**
 * Converts a Euclidean distance into a normalized percentage similarity score [15, 99]:
 *
 *   Similarity = max(0, 1 - (distance / NORMALIZATION_SCALE_DISTANCE))
 *   Score = clamp(round(Similarity * 100), 15, 99)
 *
 * Mathematically, smaller Euclidean distance yields higher similarity score.
 */
export function convertDistanceToSimilarity(distance: number): { similarity: number; score: number } {
  const rawSimilarity = Math.max(0, 1 - distance / NORMALIZATION_SCALE_DISTANCE);
  const percentage = Math.round(rawSimilarity * 100);
  const score = Math.min(99, Math.max(15, percentage));

  return {
    similarity: parseFloat(rawSimilarity.toFixed(4)),
    score,
  };
}

/**
 * Evaluates dimensional breakdown using the localized distance in that dimension
 */
function evaluateSubDimension(
  dimDistance: number,
  goodThreshold = 0.25,
  compatibleThreshold = 0.50
): AIMatchDimensionScore['label'] {
  if (dimDistance <= 0.15) return 'Excellent';
  if (dimDistance <= goodThreshold) return 'Good';
  if (dimDistance <= compatibleThreshold) return 'Compatible';
  return 'Needs Attention';
}

/**
 * Builds the UI compatibility breakdown directly from vector feature distances
 */
export function buildScoreBreakdownFromVectors(
  u: number[],
  p: number[],
  pet: Pet,
  answers: AIMatchQuestionnaire
): AIMatchScoreBreakdown {
  const wantsApartmentFriendly = (answers.adoptionPreferences || []).some((p) =>
    p.toLowerCase().includes('apartment')
  );

  // Living space distance (Index 8)
  const livingDist = Math.abs(u[8] - p[8]);
  const livingScore = Math.max(0, 1 - livingDist);
  const livingLabel = evaluateSubDimension(livingDist);

  // Activity distance (Index 5 & 6)
  const activityDist = (Math.abs(u[5] - p[5]) + Math.abs(u[6] - p[6])) / 2;
  const activityScore = Math.max(0, 1 - activityDist);
  const activityLabel = evaluateSubDimension(activityDist);

  // Location distance (Index 9)
  const locDist = Math.abs(u[9] - p[9]);
  const locScore = Math.max(0, 1 - locDist);
  const locLabel = evaluateSubDimension(locDist, 0.35, 0.65);

  // Household / Experience distance (Index 7 & 14)
  const expDist = Math.abs(u[7] - p[7]);
  const expScore = Math.max(0, 1 - expDist);
  const expLabel = evaluateSubDimension(expDist);

  let householdDist = 0;
  if (answers.household === 'family_children') {
    householdDist = Math.abs(u[14] - p[14]);
  } else if (answers.household === 'seniors') {
    householdDist = Math.abs(u[11] - p[11]);
  } else if (answers.household === 'family') {
    householdDist = Math.abs(u[10] - p[10]);
  } else {
    // 'alone' or 'couple': general compatibility
    householdDist = (Math.abs(u[10] - p[10]) + Math.abs(u[11] - p[11])) / 2;
  }
  const householdScore = Math.max(0, 1 - householdDist);
  const householdLabel = evaluateSubDimension(householdDist, 0.30, 0.70);

  // Personality distance (Indices 10 - 17)
  let traitDiffSum = 0;
  for (let i = 10; i <= 17; i++) {
    traitDiffSum += Math.abs(u[i] - p[i]);
  }
  const traitDist = traitDiffSum / 8;
  const personalityScore = Math.max(0, 1 - traitDist);
  const personalityLabel = evaluateSubDimension(traitDist, 0.35, 0.60);

  const petActivity = inferPetActivityLevel(pet);

  return {
    livingSituation: {
      score: parseFloat(livingScore.toFixed(2)),
      label: livingLabel,
      detail: (answers.livingSituation === 'apartment' || wantsApartmentFriendly)
        ? (livingLabel === 'Excellent' ? 'Well suited for apartment living' : 'Prefers home with open yard space')
        : 'Ideal space for this pet',
    },
    activityLevel: {
      score: parseFloat(activityScore.toFixed(2)),
      label: activityLabel,
      detail: `${petActivity.charAt(0).toUpperCase() + petActivity.slice(1)} energy level matches your ${answers.activityLevel} routine`,
    },
    location: {
      score: parseFloat(locScore.toFixed(2)),
      label: locLabel,
      detail: locLabel === 'Excellent' ? `Nearby in ${pet.location.split(',')[0]}` : `Located in ${pet.location}`,
    },
    household: {
      score: parseFloat(householdScore.toFixed(2)),
      label: householdLabel,
      detail: answers.household === 'family_children'
        ? (householdLabel === 'Excellent' ? 'Gentle and friendly around children' : 'May need adult supervision')
        : answers.household === 'seniors'
        ? (householdLabel === 'Excellent' ? 'Calm and gentle demeanor suited for senior living' : 'May have higher energy than preferred')
        : answers.household === 'family'
        ? (householdLabel === 'Excellent' ? 'Social and welcoming for the whole family' : 'May prefer a quieter home')
        : 'Fits your household dynamic well',
    },
    experience: {
      score: parseFloat(expScore.toFixed(2)),
      label: expLabel,
      detail: expLabel === 'Excellent' ? 'Great temperament for your experience level' : 'May benefit from guided training',
    },
    personality: {
      score: parseFloat(personalityScore.toFixed(2)),
      label: personalityLabel,
      detail: `Matches ${pet.tags?.slice(0, 2).join(' & ') || 'your desired'} personality traits`,
    },
  };
}

/**
 * Generate Grounded AI Explanation based strictly on pet data and user answers
 */
export function generateAIExplanation(
  pet: Pet,
  answers: AIMatchQuestionnaire,
  score: number,
  breakdown: AIMatchScoreBreakdown
): { explanation: string; consideration?: string } {
  const petName = pet.name;
  const petCity = pet.location.split(',')[0].trim() || 'your region';
  const activity = inferPetActivityLevel(pet);
  const size = inferPetSize(pet);

  let explanation = '';
  let consideration: string | undefined = undefined;

  if (breakdown.livingSituation.label === 'Excellent' && breakdown.activityLevel.label === 'Excellent') {
    explanation = `${petName} is a strong match for you because their ${activity} activity level fits your daily routine, they are very comfortable with ${answers.livingSituation} living, and they are located in ${petCity}.`;
  } else if (answers.household === 'family_children' && breakdown.household.label === 'Excellent') {
    explanation = `${petName} is an ideal companion for your family. Their gentle demeanor and friendly nature make them wonderful around children in ${petCity}.`;
  } else if (answers.household === 'seniors' && breakdown.household.label === 'Excellent') {
    explanation = `${petName} is a wonderful match for your home. Their calm disposition and gentle companionship are ideal for a relaxed senior lifestyle.`;
  } else if (breakdown.activityLevel.label === 'Excellent') {
    explanation = `${petName}'s ${activity} energy level harmonizes with your schedule, giving you the perfect balance of companionship and play.`;
  } else {
    explanation = `${petName} matches your pet preferences with a compatible temperament, suitable age (${pet.age}), and great adaptability for your ${answers.livingSituation}.`;
  }

  if (activity === 'high' && (answers.activityLevel === 'low' || answers.timeAvailable === 'under_1h')) {
    consideration = `${petName} is naturally energetic and will flourish with regular daily walks and interactive playtime.`;
  } else if (parseAgeToMonths(pet.age) <= 12) {
    consideration = `As a young ${pet.category === 'cats' ? 'kitten' : 'puppy'}, ${petName} will need patient house-training and attention during the early months.`;
  } else if (pet.adoptionRequirements && pet.adoptionRequirements.length > 0) {
    consideration = `Caregiver notes mention: "${pet.adoptionRequirements[0]}".`;
  } else if (answers.livingSituation === 'apartment' && pet.category === 'dogs' && size === 'large') {
    consideration = `${petName} is a larger dog, so setting aside dedicated outdoor park visits will keep them happy and healthy.`;
  }

  return {
    explanation,
    consideration,
  };
}

/**
 * ============================================================================
 * MAIN AI MATCHING SERVICE (K-NEAREST NEIGHBORS IMPLEMENTATION)
 * ============================================================================
 */
export const aiMatchingService = {
  /**
   * Run the K-Nearest Neighbors (KNN) algorithm on candidate pets
   *
   * @param candidatePets List of pets from Firestore
   * @param questionnaire User responses from the 10-step questionnaire
   * @param k Number of nearest neighbors to select (Defaults to DEFAULT_K = 5)
   */
  async findMatches(
    candidatePets: Pet[],
    questionnaire: AIMatchQuestionnaire,
    k: number = DEFAULT_K
  ): Promise<AIMatchResult[]> {
    if (!candidatePets || candidatePets.length === 0) {
      return [];
    }

    // ------------------------------------------------------------------------
    // Step 1: Availability Constraint Filtering
    // (Prune pets already adopted or pending review)
    // ------------------------------------------------------------------------
    const availablePets = candidatePets.filter(
      (p) => p.status !== 'adopted' && p.status !== 'pending'
    );

    // Hard filter on explicit species selection if user specified a single category
    const eligiblePets = availablePets.filter((p) => {
      if (questionnaire.petPreference === 'any') return true;
      if (questionnaire.petPreference === 'dogs') return p.category === 'dogs';
      if (questionnaire.petPreference === 'cats') return p.category === 'cats';
      if (questionnaire.petPreference === 'others') return p.category !== 'dogs' && p.category !== 'cats';
      return true;
    });

    if (eligiblePets.length === 0) {
      return [];
    }

    // ------------------------------------------------------------------------
    // Step 2: Vector Encoding
    // Transform user questionnaire & candidate pets into ℝ¹⁸ vector space
    // ------------------------------------------------------------------------
    const userVector = encodeUserToVector(questionnaire);

    interface CandidateNeighbor {
      pet: Pet;
      petVector: number[];
      distance: number;
      similarity: number;
      score: number;
    }

    // ------------------------------------------------------------------------
    // Step 3: Compute Euclidean Distance for each candidate pet
    // d(U, P_i) = √( Σ w_j * (u_j - p_ij)² )
    // ------------------------------------------------------------------------
    const candidateNeighbors: CandidateNeighbor[] = eligiblePets.map((pet) => {
      const petVector = encodePetToVector(pet, questionnaire.location);
      const distance = calculateEuclideanDistance(userVector, petVector, KNN_METRIC_WEIGHTS);
      const { similarity, score } = convertDistanceToSimilarity(distance);

      return {
        pet,
        petVector,
        distance: parseFloat(distance.toFixed(4)),
        similarity,
        score,
      };
    });

    // ------------------------------------------------------------------------
    // Step 4: Sort Ascending by Euclidean Distance
    // (The closest pets in vector space are ranked first)
    // ------------------------------------------------------------------------
    candidateNeighbors.sort((a, b) => a.distance - b.distance);

    // ------------------------------------------------------------------------
    // Step 5: Select Top-K Nearest Neighbors
    // ------------------------------------------------------------------------
    const topKNeighbors = candidateNeighbors.slice(0, Math.max(1, k));

    // ------------------------------------------------------------------------
    // Step 6: Construct Final Results with ML Metadata
    // ------------------------------------------------------------------------
    const results: AIMatchResult[] = topKNeighbors.map((neighbor, index) => {
      const breakdown = buildScoreBreakdownFromVectors(
        userVector,
        neighbor.petVector,
        neighbor.pet,
        questionnaire
      );

      const { explanation, consideration } = generateAIExplanation(
        neighbor.pet,
        questionnaire,
        neighbor.score,
        breakdown
      );

      return {
        pet: neighbor.pet,
        score: neighbor.score,
        scoreBreakdown: breakdown,
        aiExplanation: explanation,
        aiConsideration: consideration,
        // KNN ML Metadata for viva demonstration & debugging
        distance: neighbor.distance,
        similarity: neighbor.similarity,
        vectorCoordinates: neighbor.petVector,
        userVectorCoordinates: userVector,
        neighborRank: index + 1,
        kValue: k,
        featureNames: [...KNN_FEATURE_NAMES],
        metricWeights: [...KNN_METRIC_WEIGHTS],
        normalizationScaleDistance: NORMALIZATION_SCALE_DISTANCE,
      };
    });

    return results;
  },

  /**
   * Helper for viva demonstration / debugging:
   * Returns feature encoding and distance calculation between a user and a pet
   */
  inspectMatch(pet: Pet, questionnaire: AIMatchQuestionnaire) {
    const userVector = encodeUserToVector(questionnaire);
    const petVector = encodePetToVector(pet, questionnaire.location);
    const distance = calculateEuclideanDistance(userVector, petVector, KNN_METRIC_WEIGHTS);
    const { similarity, score } = convertDistanceToSimilarity(distance);

    return {
      featureNames: [...KNN_FEATURE_NAMES],
      metricWeights: [...KNN_METRIC_WEIGHTS],
      userVector,
      petVector,
      distance: parseFloat(distance.toFixed(4)),
      similarity,
      score,
    };
  },
};
