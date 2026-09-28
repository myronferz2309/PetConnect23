import {
  Pet,
  AIMatchQuestionnaire,
  AIMatchResult,
  AIMatchScoreBreakdown,
  AIMatchDimensionScore,
  PreferredPetAge,
  PreferredPetSize,
  ActivityLevel,
  PetCategory,
} from '../types';

import featureSchema from '../../data/knn/petconnect_feature_schema.json';
import recommendationConfig from '../../data/knn/petconnect_recommendation_config.json';
import referenceVectors from '../../data/knn/petconnect_recommendation_vectors.json';

/**
 * ============================================================================
 * PETCONNECT K-NEAREST NEIGHBORS (KNN) RECOMMENDATION ENGINE (ℝ²²)
 * ============================================================================
 * Authoritative deployment service implementing the Colab-trained 22-dimensional
 * unsupervised KNN recommendation model.
 *
 * PIPELINE:
 * 1. User Questionnaire & Pet Records
 *       │
 *       ▼
 * 2. Availability Constraint Filtering (status === 'available')
 *       │
 *       ▼
 * 3. Species Eligibility Rule (dogs -> dogs only, cats -> cats only, etc.)
 *       │
 *       ▼
 * 4. Adopter & Pet Feature Encoding into ℝ²² Canonical Space
 *       │  - Species One-Hot (Dims 0 - 4: dog, cat, bird, fish, other)
 *       │  - Normalized Age (Dim 5: Min-Max scaled over [1.0, 96.0] months)
 *       │  - Size One-Hot (Dims 6 - 8: small, medium, large)
 *       │  - Activity One-Hot (Dims 9 - 11: low, moderate, high + time boost)
 *       │  - 9 Binary Trait Flags (Dims 12 - 20: friendly, calm, playful, ...)
 *       │  - Location Normalized Index (Dim 21: normalized categorical index)
 *       ▼
 * 5. Runtime Dimension Validation (userVector.length === 22 === petVector.length)
 *       │
 *       ▼
 * 6. Euclidean Distance Metric Calculation:
 *       d(U, P) = √( Σ (u_i - p_i)² )
 *       │
 *       ▼
 * 7. Nearest Neighbor Sorting (Ascending by Euclidean distance)
 *       │
 *       ▼
 * 8. Top-K Selection (Default K = 5)
 *       │
 *       ▼
 * 9. Distance-to-Similarity Conversion:
 *       Similarity = 1 / (1 + distance)
 *       MatchScore = clamp(round(Similarity * 100), 15, 99)
 *       │
 *       ▼
 * 10. Grounded Explainability & Dimensional Breakdown for UI
 * ============================================================================
 */

export const KNN_CONFIG = {
  k: recommendationConfig.k || 5,
  distanceMetric: recommendationConfig.distance_metric || 'euclidean',
  vectorDimension: recommendationConfig.vector_dimension || 22,
  ageMin: recommendationConfig.age_min || 1.0,
  ageMax: recommendationConfig.age_max || 96.0,
};

export const KNN_FEATURE_NAMES: readonly string[] = recommendationConfig.feature_names;
export const SPECIES_CATEGORIES: readonly string[] = featureSchema.species_categories;
export const SIZE_CATEGORIES: readonly string[] = featureSchema.size_categories;
export const ACTIVITY_CATEGORIES: readonly string[] = featureSchema.activity_categories;
export const LOCATIONS_LIST: readonly string[] = recommendationConfig.locations;

const LOCATION_TO_INDEX: Record<string, number> = {};
LOCATIONS_LIST.forEach((loc, index) => {
  LOCATION_TO_INDEX[loc.toLowerCase().trim()] = index;
});

// Precomputed reference vectors dictionary for instantaneous O(1) lookup
const REFERENCE_VECTORS_MAP: Map<string, number[]> = new Map();
referenceVectors.forEach((entry) => {
  if (entry.pet_id && Array.isArray(entry.vector)) {
    REFERENCE_VECTORS_MAP.set(entry.pet_id, entry.vector);
  }
});


// Helper: Normalize string text
function normText(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
}

// Helper: Parse age string into numeric months
export function parseAgeToMonths(ageStr: string): number {
  if (!ageStr) return 24;
  const lower = normText(ageStr);
  const match = lower.match(/(\d+(\.\d+)?)/);
  const num = match ? parseFloat(match[1]) : 2;

  if (lower.includes('month') || lower.includes('mo')) {
    return Math.max(1, Math.round(num));
  }
  if (lower.includes('week') || lower.includes('wk')) {
    return Math.max(1, Math.round(num * 0.25));
  }
  return Math.max(1, Math.round(num * 12));
}

// Helper: Infer life stage for PetCare AI compatibility
export function inferPetAgeCategory(ageStr: string): PreferredPetAge {
  const months = parseAgeToMonths(ageStr);
  if (months <= 12) return 'puppy_kitten';
  if (months <= 35) return 'young';
  if (months <= 84) return 'adult';
  return 'senior';
}

// Helper: Infer size for canine companions
export function inferPetSize(pet: Pet): PreferredPetSize {
  if (pet.category !== 'dogs') return 'small';
  const lowerBreed = normText(pet.breed);
  const smallBreeds = ['french bulldog', 'pug', 'shih tzu', 'chihuahua', 'pomeranian', 'beagle', 'terrier', 'dachshund', 'maltese', 'corgi'];
  const largeBreeds = ['golden retriever', 'golden', 'labrador', 'german shepherd', 'siberian husky', 'rottweiler', 'great dane', 'doberman', 'boxer', 'husky'];

  if (smallBreeds.some((b) => lowerBreed.includes(b))) return 'small';
  if (largeBreeds.some((b) => lowerBreed.includes(b))) return 'large';
  return 'medium';
}

// Helper: Infer pet activity level
export function inferPetActivityLevel(pet: Pet): ActivityLevel {
  const text = `${pet.breed || ''} ${pet.description || ''} ${(pet.tags || []).join(' ')} ${(pet.adoptionRequirements || []).join(' ')}`.toLowerCase();
  if (text.includes('energetic') || text.includes('athletic') || text.includes('active') || text.includes('run') || text.includes('hiking') || text.includes('trail')) {
    return 'high';
  }
  if (text.includes('calm') || text.includes('quiet') || text.includes('cuddle') || text.includes('gentle') || text.includes('indoor') || text.includes('couch')) {
    return 'low';
  }
  return 'moderate';
}

// Helper: Normalize age to [0, 1] range using dataset bounds
export function normalizeAge(ageMonths: number): number {
  const age = Math.max(KNN_CONFIG.ageMin, ageMonths);
  return (age - KNN_CONFIG.ageMin) / (KNN_CONFIG.ageMax - KNN_CONFIG.ageMin);
}

// Helper: One-hot array generator
function oneHot(val: string, categories: readonly string[]): number[] {
  return categories.map((c) => (val === c ? 1.0 : 0.0));
}

// Map user pet preference string to canonical species group
function mapPreferenceSpecies(pref: string): string {
  const p = normText(pref);
  if (p === 'dogs' || p === 'dog') return 'dog';
  if (p === 'cats' || p === 'cat') return 'cat';
  if (p === 'others' || p === 'other') return 'other';
  return 'any';
}

// Canonical age target in months for user questionnaire
const AGE_TARGETS: Record<string, number> = {
  puppy_kitten: 6,
  young: 24,
  adult: 60,
  senior: 120,
};

// Activity target implied by daily available time
const TIME_ACTIVITY: Record<string, string> = {
  under_1h: 'low',
  '1_to_2h': 'moderate',
  '2_to_4h': 'high',
  '4h_plus': 'high',
};

const SIZE_MAP: Record<string, string> = {
  small: 'small',
  medium: 'medium',
  large: 'large',
};

/**
 * Robust normalized location encoding for ℝ²² vector space.
 * Maps known dataset cities to their exact Colab indices,
 * handles common city aliases, and deterministically hashes novel cities.
 */
export function encodeLocationRepresentation(locText: string): number {
  const norm = normText(locText);
  if (!norm || LOCATIONS_LIST.length <= 1) return 0.0;

  // Direct exact match in dataset location dictionary
  if (norm in LOCATION_TO_INDEX) {
    return LOCATION_TO_INDEX[norm] / (LOCATIONS_LIST.length - 1);
  }

  // Exact city prefix match (e.g., 'mumbai' -> 'mumbai, maharashtra')
  const prefixMatch = LOCATIONS_LIST.find(
    (l) => l.startsWith(norm + ',') || l.startsWith(norm + ' ')
  );
  if (prefixMatch) {
    return LOCATION_TO_INDEX[prefixMatch] / (LOCATIONS_LIST.length - 1);
  }

  // City component in comma-separated list
  const compMatch = LOCATIONS_LIST.find((l) => {
    const parts = l.split(',').map((p) => p.trim());
    return parts.includes(norm);
  });
  if (compMatch) {
    return LOCATION_TO_INDEX[compMatch] / (LOCATIONS_LIST.length - 1);
  }

  // General substring match
  const subMatch = LOCATIONS_LIST.find((l) => l.includes(norm) || norm.includes(l));
  if (subMatch) {
    return LOCATION_TO_INDEX[subMatch] / (LOCATIONS_LIST.length - 1);
  }

  // Known Indian major metropolitan cities mapping
  const cityIndexMap: Record<string, number> = {
    delhi: 3,
    bengaluru: 5,
    bangalore: 5,
    hyderabad: 7,
    chennai: 8,
    kolkata: 10,
    ahmedabad: 11,
  };
  for (const [c, idx] of Object.entries(cityIndexMap)) {
    if (norm.includes(c)) {
      return idx / (LOCATIONS_LIST.length - 1);
    }
  }

  // Deterministic pseudo-index for any novel/unseen city
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = (hash * 31 + norm.charCodeAt(i)) >>> 0;
  }
  const pseudoIdx = 1 + (hash % (LOCATIONS_LIST.length - 1));
  return pseudoIdx / (LOCATIONS_LIST.length - 1);
}

/**
 * Encodes an Adopter's Questionnaire answers into the canonical 22-dimensional
 * vector space ℝ²² matching the deployment schema.
 */
export function buildAdopterVector(q: AIMatchQuestionnaire): number[] {
  const vector: number[] = [];

  // 1. Species Preferences (Dims 0 - 4: dog, cat, bird, fish, other)
  const pref = mapPreferenceSpecies(q.petPreference || 'any');
  if (pref === 'any') {
    vector.push(...new Array(SPECIES_CATEGORIES.length).fill(0.0));
  } else {
    vector.push(...oneHot(pref, SPECIES_CATEGORIES));
  }

  // 2. Preferred Age (Dim 5: Normalized target age)
  const agePref = normText(q.preferredAge || 'any');
  if (agePref === 'any') {
    vector.push(0.5);
  } else {
    const targetAge = AGE_TARGETS[agePref] || 24;
    vector.push(normalizeAge(targetAge));
  }

  // 3. Preferred Size (Dims 6 - 8: small, medium, large)
  const sizePref = normText(q.preferredSize || 'any');
  if (sizePref === 'any') {
    vector.push(...new Array(SIZE_CATEGORIES.length).fill(0.0));
  } else {
    vector.push(...oneHot(SIZE_MAP[sizePref] || 'medium', SIZE_CATEGORIES));
  }

  // 4. Activity Level & Available Time (Dims 9 - 11: low, moderate, high)
  let activityPref = normText(q.activityLevel || 'moderate');
  const timePref = normText(q.timeAvailable || '1_to_2h');
  if (!ACTIVITY_CATEGORIES.includes(activityPref)) {
    activityPref = 'moderate';
  }
  const timeActivity = TIME_ACTIVITY[timePref] || 'moderate';

  const actVec = [0.0, 0.0, 0.0];
  actVec[ACTIVITY_CATEGORIES.indexOf(activityPref)] = 1.0;
  if (timeActivity !== activityPref) {
    const timeIdx = ACTIVITY_CATEGORIES.indexOf(timeActivity);
    actVec[timeIdx] = Math.max(actVec[timeIdx], 0.5);
  }
  vector.push(...actVec);

  // 5. Multi-Hot Personality & Care Compatibility Traits (Dims 12 - 20)
  const household = normText(q.household || 'alone');
  const experience = normText(q.experience || 'first_time');
  const rawPrefs = (q.adoptionPreferences || []).map((p: string) =>
    normText(p).replace(/ /g, '_').replace(/-/g, '_')
  );
  const prefSet = new Set(rawPrefs);

  const friendly = (
    prefSet.has('friendly') ||
    ['couple', 'family', 'family_children', 'seniors'].includes(household)
  ) ? 1.0 : 0.0;

  const calm = (
    prefSet.has('calm') ||
    household === 'seniors' ||
    experience === 'first_time'
  ) ? 1.0 : 0.0;

  const playful = prefSet.has('playful') ? 1.0 : 0.0;
  const active = (activityPref === 'high' || ['2_to_4h', '4h_plus'].includes(timePref)) ? 1.0 : 0.0;

  const kidFriendly = (
    ['family', 'family_children'].includes(household) ||
    prefSet.has('kid_friendly') ||
    prefSet.has('good_with_children')
  ) ? 1.0 : 0.0;

  const petFriendly = (
    prefSet.has('pet_friendly') ||
    prefSet.has('good_with_other_pets')
  ) ? 1.0 : 0.0;

  const houseTrained = (
    prefSet.has('house_trained') ||
    prefSet.has('litter_trained')
  ) ? 1.0 : 0.0;

  const apartmentFriendly = (
    q.livingSituation === 'apartment' ||
    prefSet.has('apartment_friendly')
  ) ? 1.0 : 0.0;

  const specialNeeds = (
    prefSet.has('special_needs') ||
    prefSet.has('special_needs_friendly')
  ) ? 1.0 : 0.0;

  vector.push(
    friendly,
    calm,
    playful,
    active,
    kidFriendly,
    petFriendly,
    houseTrained,
    apartmentFriendly,
    specialNeeds
  );

  // 6. Location Representation (Dim 21)
  vector.push(encodeLocationRepresentation(q.location || ''));

  // Runtime assertion
  if (vector.length !== KNN_CONFIG.vectorDimension) {
    throw new Error(
      `[KNN] Adopter vector dimension mismatch: expected ${KNN_CONFIG.vectorDimension}, got ${vector.length}`
    );
  }

  return vector;
}

/**
 * Encodes a Pet into the canonical 22-dimensional feature vector in ℝ²².
 * Uses precomputed reference vectors from Colab whenever available;
 * otherwise performs dynamic feature extraction for new Firestore pets.
 */
export function encodePetToVector(pet: Pet): number[] {
  // 1. Direct O(1) retrieval from Colab precomputed vectors
  if (REFERENCE_VECTORS_MAP.has(pet.id)) {
    const vec = REFERENCE_VECTORS_MAP.get(pet.id)!;
    if (vec.length === KNN_CONFIG.vectorDimension) {
      return [...vec];
    }
  }

  // 2. Dynamic encoding for new pets created in Firestore
  const vector: number[] = [];

  // Species
  const cat = normText(pet.category);
  let speciesGroup = 'other';
  if (cat.includes('dog') || cat.includes('puppy')) speciesGroup = 'dog';
  else if (cat.includes('cat') || cat.includes('kitten')) speciesGroup = 'cat';
  else if (cat.includes('bird')) speciesGroup = 'bird';
  else if (cat.includes('fish')) speciesGroup = 'fish';
  vector.push(...oneHot(speciesGroup, SPECIES_CATEGORIES));

  // Age
  const ageMonths = parseAgeToMonths(pet.age);
  vector.push(normalizeAge(ageMonths));

  // Size
  const size = inferPetSize(pet);
  vector.push(...oneHot(size, SIZE_CATEGORIES));

  // Activity
  const activity = inferPetActivityLevel(pet);
  vector.push(...oneHot(activity, ACTIVITY_CATEGORIES));

  // Traits
  const allText = `${pet.description || ''} ${(pet.tags || []).join(' ')} ${(pet.adoptionRequirements || []).join(' ')}`.toLowerCase();
  const friendly = (allText.includes('friendly') || allText.includes('sweet') || allText.includes('affectionate')) ? 1.0 : 0.0;
  const calm = (allText.includes('calm') || allText.includes('quiet') || allText.includes('gentle')) ? 1.0 : 0.0;
  const playful = (allText.includes('playful') || allText.includes('curious') || allText.includes('fetch')) ? 1.0 : 0.0;
  const active = (allText.includes('active') || allText.includes('energetic') || allText.includes('athletic')) ? 1.0 : 0.0;
  const kidFriendly = (allText.includes('kid') || allText.includes('children') || allText.includes('family')) ? 1.0 : 0.0;
  const petFriendly = (allText.includes('other pets') || allText.includes('social') || allText.includes('dogs') || allText.includes('cats')) ? 1.0 : 0.0;
  const houseTrained = (allText.includes('house-trained') || allText.includes('litter-trained') || allText.includes('trained')) ? 1.0 : 0.0;
  const apartmentFriendly = (allText.includes('apartment') || (size === 'small' && activity !== 'high')) ? 1.0 : 0.0;
  const specialNeeds = (allText.includes('special') || Boolean(pet.health?.notes && pet.health.notes.length > 0)) ? 1.0 : 0.0;

  vector.push(
    friendly, calm, playful, active,
    kidFriendly, petFriendly, houseTrained,
    apartmentFriendly, specialNeeds
  );

  // Location index
  vector.push(encodeLocationRepresentation(pet.location || ''));

  if (vector.length !== KNN_CONFIG.vectorDimension) {
    throw new Error(
      `[KNN] Pet vector dimension mismatch for ${pet.id}: expected ${KNN_CONFIG.vectorDimension}, got ${vector.length}`
    );
  }

  return vector;
}

/**
 * ============================================================================
 * DISTANCE & SIMILARITY MATHEMATICS
 * ============================================================================
 */

/**
 * Computes standard Euclidean Distance in ℝ²²:
 *   d(U, P) = √( Σ (u_i - p_i)² )
 */
export function calculateEuclideanDistance(u: number[], p: number[]): number {
  if (u.length !== p.length) {
    throw new Error(`[KNN] Dimension mismatch: user vector ${u.length} vs pet vector ${p.length}`);
  }
  let sumSquaredDiff = 0;
  for (let i = 0; i < u.length; i++) {
    const diff = u[i] - p[i];
    sumSquaredDiff += diff * diff;
  }
  return Math.sqrt(sumSquaredDiff);
}

/**
 * Converts Euclidean Distance into Normalized Similarity Score:
 *   Similarity = 1 / (1 + distance)
 *   MatchPercentage = clamp(round(Similarity * 100), 15, 99)
 */
export function convertDistanceToSimilarity(distance: number): { similarity: number; score: number } {
  const rawSimilarity = 1.0 / (1.0 + Math.max(0, distance));
  const percentage = Math.round(rawSimilarity * 100);
  const score = Math.min(99, Math.max(15, percentage));

  return {
    similarity: parseFloat(rawSimilarity.toFixed(6)),
    score,
  };
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
  // Living space: Index 19 (trait_apartment_friendly)
  const livingDist = Math.abs(u[19] - p[19]);
  const livingScore = Math.max(0, 1 - livingDist);
  const livingLabel: AIMatchDimensionScore['label'] =
    livingDist <= 0.15 ? 'Excellent' : livingDist <= 0.35 ? 'Good' : livingDist <= 0.5 ? 'Compatible' : 'Needs Attention';

  // Activity distance: Indices 9, 10, 11 (activity_low, moderate, high)
  const actDiff = (Math.abs(u[9] - p[9]) + Math.abs(u[10] - p[10]) + Math.abs(u[11] - p[11])) / 2;
  const activityScore = Math.max(0, 1 - actDiff);
  const activityLabel: AIMatchDimensionScore['label'] =
    actDiff <= 0.25 ? 'Excellent' : actDiff <= 0.5 ? 'Good' : 'Needs Attention';

  // Location: exact/same city string comparison
  const uCity = normText(answers.location).split(',')[0].trim();
  const pCity = normText(pet.location).split(',')[0].trim();
  const isSameCity = uCity.length > 0 && pCity.length > 0 && (uCity === pCity || uCity.includes(pCity) || pCity.includes(uCity));
  const locScore = isSameCity ? 1.0 : normText(answers.location).includes('maharashtra') && normText(pet.location).includes('maharashtra') ? 0.7 : 0.4;
  const locLabel: AIMatchDimensionScore['label'] = locScore >= 0.9 ? 'Excellent' : locScore >= 0.6 ? 'Good' : 'Compatible';

  // Household distance: based on relevant traits (Kid-friendly: 16, Calm: 13, Friendly: 12)
  let householdDist = 0;
  if (answers.household === 'family_children') {
    householdDist = Math.abs(u[16] - p[16]);
  } else if (answers.household === 'seniors') {
    householdDist = Math.abs(u[13] - p[13]);
  } else if (answers.household === 'family') {
    householdDist = Math.abs(u[12] - p[12]);
  } else {
    householdDist = (Math.abs(u[12] - p[12]) + Math.abs(u[13] - p[13])) / 2;
  }
  const householdScore = Math.max(0, 1 - householdDist);
  const householdLabel: AIMatchDimensionScore['label'] =
    householdDist <= 0.2 ? 'Excellent' : householdDist <= 0.5 ? 'Good' : 'Needs Attention';

  // Experience: beginner suitability
  const expDist = answers.experience === 'first_time' ? Math.abs(u[13] - p[13]) : 0.0;
  const expScore = Math.max(0, 1 - expDist);
  const expLabel: AIMatchDimensionScore['label'] = expDist <= 0.25 ? 'Excellent' : 'Good';

  // Personality: average difference across all 9 trait dimensions (12 - 20)
  let traitDiffSum = 0;
  for (let i = 12; i <= 20; i++) {
    traitDiffSum += Math.abs(u[i] - p[i]);
  }
  const traitDist = traitDiffSum / 9;
  const personalityScore = Math.max(0, 1 - traitDist);
  const personalityLabel: AIMatchDimensionScore['label'] =
    traitDist <= 0.25 ? 'Excellent' : traitDist <= 0.45 ? 'Good' : 'Compatible';

  const petActivity = inferPetActivityLevel(pet);

  return {
    livingSituation: {
      score: parseFloat(livingScore.toFixed(2)),
      label: livingLabel,
      detail: answers.livingSituation === 'apartment'
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
    consideration = `As a young ${pet.category === 'cats' ? 'kitten' : pet.category === 'dogs' ? 'puppy' : 'pet'}, ${petName} will need patient care and attention during early months.`;
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
 * MAIN RECOMMENDATION ENGINE INFERENCE
 * ============================================================================
 */

export const knnRecommendationService = {
  /**
   * Run the K-Nearest Neighbors recommendation engine
   *
   * @param candidatePets List of pets from Firestore (live state)
   * @param questionnaire User responses from the 10-step questionnaire
   * @param k Number of nearest neighbors to retrieve (default 5)
   */
  async findRecommendations(
    candidatePets: Pet[],
    questionnaire: AIMatchQuestionnaire,
    k: number = KNN_CONFIG.k
  ): Promise<AIMatchResult[]> {
    if (!candidatePets || !Array.isArray(candidatePets) || candidatePets.length === 0) {
      return [];
    }

    // ------------------------------------------------------------------------
    // Step 1: Filter Available Production Pets from Current Database Only
    // Exclude pets that are adopted, pending review, or inactive.
    // ------------------------------------------------------------------------
    const availablePets: Pet[] = [];
    const seenIds = new Set<string>();

    for (const pet of candidatePets) {
      if (!pet || !pet.id) continue;
      if (seenIds.has(pet.id)) continue;
      seenIds.add(pet.id);

      const status = normText(pet.status || 'available');
      if (status === 'available') {
        availablePets.push(pet);
      }
    }

    if (availablePets.length === 0) {
      return [];
    }

    // Capture valid current available Firestore pet IDs for final safety invariant
    const currentAvailableFirestorePetIds = new Set<string>(availablePets.map((p) => p.id));

    // ------------------------------------------------------------------------
    // Step 2: Explicit Species Eligibility Rule
    // IF petPreference = 'dogs' -> only dog pets
    // IF petPreference = 'cats' -> only cat pets
    // IF petPreference = 'others' -> non-dog, non-cat pets (birds, rabbits, etc.)
    // IF petPreference = 'any' -> all species eligible
    // ------------------------------------------------------------------------
    const eligiblePets = availablePets.filter((p) => {
      const pref = questionnaire.petPreference || 'any';
      if (pref === 'any') return true;

      const cat = normText(p.category);
      const isDog = cat.includes('dog');
      const isCat = cat.includes('cat');

      if (pref === 'dogs') return isDog;
      if (pref === 'cats') return isCat;
      if (pref === 'others') return !isDog && !isCat;
      return true;
    });

    if (eligiblePets.length === 0) {
      return [];
    }

    // ------------------------------------------------------------------------
    // Step 3: Determine Effective K
    // K = min(5, numberOfEligibleCurrentPets)
    // Never fill missing slots with synthetic pets!
    // ------------------------------------------------------------------------
    const effectiveK = Math.min(Math.max(1, k), eligiblePets.length);

    // ------------------------------------------------------------------------
    // Step 4: Adopter Vector Construction in ℝ²²
    // ------------------------------------------------------------------------
    const userVector = buildAdopterVector(questionnaire);

    interface CandidateNeighbor {
      pet: Pet;
      petVector: number[];
      distance: number;
      similarity: number;
      score: number;
    }

    // ------------------------------------------------------------------------
    // Step 5: Encode Current Production Pets & Calculate Euclidean Distance
    // CASE A: If current pet ID exists in referenceVectors -> reuse vector
    // CASE B: If current pet is newly created/uploaded -> dynamic 22D encoder
    // ------------------------------------------------------------------------
    const candidateNeighbors: CandidateNeighbor[] = [];

    for (const pet of eligiblePets) {
      try {
        const petVector = encodePetToVector(pet);
        if (petVector.length !== KNN_CONFIG.vectorDimension) {
          console.warn(`[KNN] Skipping malformed vector for pet ${pet.id}`);
          continue;
        }

        const distance = calculateEuclideanDistance(userVector, petVector);
        const { similarity, score } = convertDistanceToSimilarity(distance);

        candidateNeighbors.push({
          pet,
          petVector,
          distance: parseFloat(distance.toFixed(6)),
          similarity,
          score,
        });
      } catch (err) {
        console.warn(`[KNN] Error encoding pet ${pet.id}:`, err);
      }
    }

    if (candidateNeighbors.length === 0) {
      return [];
    }

    // ------------------------------------------------------------------------
    // Step 6: Sort Ascending by Euclidean Distance
    // (Nearest neighbors in ℝ²² have the smallest distance)
    // ------------------------------------------------------------------------
    candidateNeighbors.sort((a, b) => a.distance - b.distance);

    // ------------------------------------------------------------------------
    // Step 7: Select Top-K (Effective K) Nearest Neighbors
    // ------------------------------------------------------------------------
    const topKNeighbors = candidateNeighbors.slice(0, effectiveK);

    // ------------------------------------------------------------------------
    // Step 8: Build Final Results with Full ML Metadata for Match Breakdown
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
        distance: neighbor.distance,
        similarity: neighbor.similarity,
        vectorCoordinates: neighbor.petVector,
        userVectorCoordinates: userVector,
        neighborRank: index + 1,
        kValue: effectiveK,
        featureNames: [...KNN_FEATURE_NAMES],
        metricWeights: new Array(KNN_CONFIG.vectorDimension).fill(1.0),
        normalizationScaleDistance: 1.0,
      };
    });

    // ------------------------------------------------------------------------
    // Step 9: Final Safety Validation Invariant
    // recommendedPetIds MUST be a strict subset of currentAvailableFirestorePetIds
    // Any nonexistent or synthetic pet ID is rejected.
    // ------------------------------------------------------------------------
    const safeResults = results.filter((r) => currentAvailableFirestorePetIds.has(r.pet.id));

    return safeResults;
  },

  /**
   * Helper for development / viva debugging inspection
   */
  inspectMatch(pet: Pet, questionnaire: AIMatchQuestionnaire) {
    const userVector = buildAdopterVector(questionnaire);
    const petVector = encodePetToVector(pet);
    const distance = calculateEuclideanDistance(userVector, petVector);
    const { similarity, score } = convertDistanceToSimilarity(distance);

    return {
      featureNames: [...KNN_FEATURE_NAMES],
      userVector,
      petVector,
      distance: parseFloat(distance.toFixed(6)),
      similarity,
      score,
    };
  },
};
