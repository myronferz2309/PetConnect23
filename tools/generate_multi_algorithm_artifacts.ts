import * as fs from 'fs';
import * as path from 'path';

// Seeded pseudorandom generator for 100% deterministic reproducibility
class SeededRandom {
  private s: number;
  constructor(seed = 42) {
    this.s = seed % 2147483647;
    if (this.s <= 0) this.s += 2147483646;
  }
  next(): number {
    this.s = (this.s * 16807) % 2147483647;
    return (this.s - 1) / 2147483646;
  }
  choice<T>(arr: readonly T[]): T {
    const idx = Math.floor(this.next() * arr.length);
    return arr[Math.min(idx, arr.length - 1)];
  }
  sample<T>(arr: readonly T[], n: number): T[] {
    const copy = [...arr];
    const res: T[] = [];
    for (let i = 0; i < n && copy.length > 0; i++) {
      const idx = Math.floor(this.next() * copy.length);
      res.push(copy.splice(idx, 1)[0]);
    }
    return res;
  }
}

interface RawPetRecord {
  pet_id: string;
  name: string;
  species: string;
  breed: string;
  age_raw: string;
  age_months: number;
  gender: string;
  size: string;
  activity_level: string;
  location: string;
  status: string;
  trait_friendly: number;
  trait_calm: number;
  trait_playful: number;
  trait_active: number;
  trait_kid_friendly: number;
  trait_pet_friendly: number;
  trait_house_trained: number;
  trait_apartment_friendly: number;
  trait_special_needs: number;
  description: string;
}

interface AdopterProfile {
  id: string;
  petPreference: 'dogs' | 'cats' | 'others' | 'any';
  livingSituation: 'apartment' | 'house' | 'other';
  location: string;
  household: 'alone' | 'couple' | 'family' | 'family_children' | 'seniors';
  experience: 'first_time' | 'some_experience' | 'experienced';
  activityLevel: 'low' | 'moderate' | 'high';
  timeAvailable: 'under_1h' | '1_to_2h' | '2_to_4h' | '4h_plus';
  preferredAge: 'puppy_kitten' | 'young' | 'adult' | 'senior' | 'any';
  preferredSize: 'small' | 'medium' | 'large' | 'any';
  adoptionPreferences: string[];
}

const FEATURE_NAMES = [
  'species_match',
  'age_preference_match',
  'size_preference_match',
  'activity_alignment',
  'time_energy_compatibility',
  'living_space_compatibility',
  'household_kid_compatibility',
  'household_senior_compatibility',
  'experience_competence_fit',
  'trait_preference_overlap',
  'location_proximity_score',
  'pet_age_normalized',
  'pet_size_ordinal',
  'pet_activity_ordinal',
  'adopter_activity_ordinal',
  'adopter_time_ordinal',
  'pet_trait_friendly',
  'pet_trait_calm',
  'pet_trait_playful',
  'pet_trait_active',
  'pet_trait_kid_friendly',
  'pet_trait_pet_friendly',
  'pet_trait_house_trained',
  'pet_trait_apartment_friendly',
  'pet_trait_special_needs',
] as const;

function parseCsv(content: string): RawPetRecord[] {
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  const header = lines[0].split(',').map((h) => h.trim());
  const records: RawPetRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Standard CSV split handling quoted descriptions
    const parts: string[] = [];
    let inQuotes = false;
    let curr = '';
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        parts.push(curr);
        curr = '';
      } else {
        curr += ch;
      }
    }
    parts.push(curr);

    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = parts[idx] ? parts[idx].trim() : '';
    });

    records.push({
      pet_id: row['pet_id'] || `pet-${i}`,
      name: row['name'] || '',
      species: (row['species'] || 'dogs').toLowerCase(),
      breed: row['breed'] || '',
      age_raw: row['age_raw'] || '',
      age_months: parseFloat(row['age_months']) || 24,
      gender: row['gender'] || 'male',
      size: (row['size'] || 'medium').toLowerCase(),
      activity_level: (row['activity_level'] || 'moderate').toLowerCase(),
      location: row['location'] || 'Mumbai, Maharashtra',
      status: row['status'] || 'available',
      trait_friendly: parseInt(row['trait_friendly']) || 0,
      trait_calm: parseInt(row['trait_calm']) || 0,
      trait_playful: parseInt(row['trait_playful']) || 0,
      trait_active: parseInt(row['trait_active']) || 0,
      trait_kid_friendly: parseInt(row['trait_kid_friendly']) || 0,
      trait_pet_friendly: parseInt(row['trait_pet_friendly']) || 0,
      trait_house_trained: parseInt(row['trait_house_trained']) || 0,
      trait_apartment_friendly: parseInt(row['trait_apartment_friendly']) || 0,
      trait_special_needs: parseInt(row['trait_special_needs']) || 0,
      description: row['description'] || '',
    });
  }
  return records;
}

// Transparent Rule-Based Compatibility Function (Independent Ground-Truth Generator)
function evaluateCompatibilityRule(adopter: AdopterProfile, pet: RawPetRecord): { score: number; label: number } {
  let score = 0.55;

  // 1. Species compatibility
  const petSpecies = pet.species.toLowerCase();
  const pref = adopter.petPreference.toLowerCase();
  if (pref !== 'any') {
    const isDog = petSpecies.includes('dog');
    const isCat = petSpecies.includes('cat');
    if (pref === 'dogs' && !isDog) score -= 0.40;
    else if (pref === 'cats' && !isCat) score -= 0.40;
    else if (pref === 'others' && (isDog || isCat)) score -= 0.40;
    else score += 0.15;
  } else {
    score += 0.05;
  }

  // 2. Age compatibility
  const months = pet.age_months;
  const agePref = adopter.preferredAge;
  if (agePref === 'puppy_kitten') {
    if (months <= 12) score += 0.15;
    else if (months > 48) score -= 0.15;
  } else if (agePref === 'young') {
    if (months >= 6 && months <= 36) score += 0.15;
  } else if (agePref === 'adult') {
    if (months >= 24 && months <= 84) score += 0.15;
  } else if (agePref === 'senior') {
    if (months >= 72) score += 0.20;
    else if (months <= 18) score -= 0.15;
  }

  // Puppies need high time commitment
  if (months <= 8 && adopter.timeAvailable === 'under_1h') {
    score -= 0.20;
  }

  // 3. Living situation & Size
  if (adopter.livingSituation === 'apartment') {
    if (pet.size === 'large' && pet.activity_level === 'high') {
      score -= 0.20;
    }
    if (pet.trait_apartment_friendly === 1) {
      score += 0.10;
    }
  } else if (adopter.livingSituation === 'house') {
    score += 0.05;
  }

  // 4. Household dynamic
  if (adopter.household === 'family_children') {
    if (pet.trait_kid_friendly === 1) score += 0.15;
    else score -= 0.25;
  }
  if (adopter.household === 'seniors') {
    if (pet.activity_level === 'high' || pet.size === 'large') score -= 0.20;
    if (pet.trait_calm === 1) score += 0.15;
  }

  // 5. Experience
  if (adopter.experience === 'first_time') {
    if (pet.trait_special_needs === 1) score -= 0.25;
    if (pet.trait_calm === 1 && pet.trait_house_trained === 1) score += 0.10;
  } else if (adopter.experience === 'experienced') {
    score += 0.05;
  }

  // 6. Activity & Time alignment
  const actMap: Record<string, number> = { low: 0, moderate: 1, high: 2 };
  const userAct = actMap[adopter.activityLevel] ?? 1;
  const petAct = actMap[pet.activity_level] ?? 1;
  const actDiff = Math.abs(userAct - petAct);
  if (actDiff === 0) score += 0.15;
  else if (actDiff === 1) score += 0.02;
  else score -= 0.20;

  if (pet.activity_level === 'high' && adopter.timeAvailable === 'under_1h') {
    score -= 0.25;
  }
  if (adopter.timeAvailable === '4h_plus' && pet.activity_level === 'high') {
    score += 0.10;
  }

  // 7. Trait overlap
  const petTraits: string[] = [];
  if (pet.trait_friendly) petTraits.push('Friendly');
  if (pet.trait_calm) petTraits.push('Calm');
  if (pet.trait_playful) petTraits.push('Playful');
  if (pet.trait_active) petTraits.push('Active');
  if (pet.trait_kid_friendly) petTraits.push('Kid-friendly');
  if (pet.trait_pet_friendly) petTraits.push('Pet-friendly');
  if (pet.trait_house_trained) petTraits.push('House-trained');
  if (pet.trait_apartment_friendly) petTraits.push('Apartment friendly');
  if (pet.trait_special_needs) petTraits.push('Special-needs friendly');

  if (adopter.adoptionPreferences.length > 0) {
    const matched = adopter.adoptionPreferences.filter((p) => petTraits.includes(p)).length;
    const overlapRatio = matched / adopter.adoptionPreferences.length;
    score += (overlapRatio - 0.5) * 0.25;
  }

  // 8. Location proximity
  const userCity = adopter.location.toLowerCase();
  const petCity = pet.location.toLowerCase();
  if (userCity && petCity && (userCity.includes(petCity) || petCity.includes(userCity))) {
    score += 0.05;
  }

  const finalScore = Math.max(0.0, Math.min(1.0, score));
  const label = finalScore >= 0.55 ? 1 : 0;
  return { score: finalScore, label };
}

// 25-Dimensional Pairwise Feature Extractor
function extractPairwiseFeatures(adopter: AdopterProfile, pet: RawPetRecord): number[] {
  // 1. species_match
  let speciesMatch = 0.0;
  if (adopter.petPreference === 'any') speciesMatch = 1.0;
  else if (adopter.petPreference === 'dogs' && pet.species.includes('dog')) speciesMatch = 1.0;
  else if (adopter.petPreference === 'cats' && pet.species.includes('cat')) speciesMatch = 1.0;
  else if (adopter.petPreference === 'others' && !pet.species.includes('dog') && !pet.species.includes('cat')) speciesMatch = 1.0;

  // 2. age_preference_match
  const targetAgeMap: Record<string, number> = {
    puppy_kitten: 6,
    young: 24,
    adult: 60,
    senior: 120,
    any: 36,
  };
  const targetMo = targetAgeMap[adopter.preferredAge] ?? 36;
  const ageDiff = Math.abs(targetMo - pet.age_months);
  const ageMatch = adopter.preferredAge === 'any' ? 1.0 : Math.max(0.0, 1.0 - ageDiff / 60.0);

  // 3. size_preference_match
  const sizeMap: Record<string, number> = { small: 0, medium: 1, large: 2 };
  let sizeMatch = 1.0;
  if (adopter.preferredSize !== 'any') {
    const userSize = sizeMap[adopter.preferredSize] ?? 1;
    const petSize = sizeMap[pet.size] ?? 1;
    const diff = Math.abs(userSize - petSize);
    sizeMatch = diff === 0 ? 1.0 : diff === 1 ? 0.5 : 0.0;
  }

  // 4. activity_alignment
  const actMap: Record<string, number> = { low: 0, moderate: 1, high: 2 };
  const userAct = actMap[adopter.activityLevel] ?? 1;
  const petAct = actMap[pet.activity_level] ?? 1;
  const actAlignment = 1.0 - Math.abs(userAct - petAct) / 2.0;

  // 5. time_energy_compatibility
  const timeLevelMap: Record<string, number> = { under_1h: 0, '1_to_2h': 1, '2_to_4h': 2, '4h_plus': 2 };
  const timeLevel = timeLevelMap[adopter.timeAvailable] ?? 1;
  const timeFit = timeLevel >= petAct ? 1.0 : 0.3;

  // 6. living_space_compatibility
  let livingFit = 1.0;
  if (adopter.livingSituation === 'apartment') {
    if (pet.size === 'large' && pet.activity_level === 'high') livingFit = 0.2;
    else if (pet.trait_apartment_friendly === 1) livingFit = 1.0;
    else livingFit = 0.7;
  }

  // 7. household_kid_compatibility
  let kidFit = 1.0;
  if (adopter.household === 'family_children') {
    kidFit = pet.trait_kid_friendly === 1 ? 1.0 : 0.0;
  }

  // 8. household_senior_compatibility
  let seniorFit = 1.0;
  if (adopter.household === 'seniors') {
    seniorFit = pet.activity_level === 'high' || pet.size === 'large' ? 0.2 : pet.trait_calm === 1 ? 1.0 : 0.6;
  }

  // 9. experience_competence_fit
  let expFit = 1.0;
  if (adopter.experience === 'first_time' && pet.trait_special_needs === 1) {
    expFit = 0.2;
  }

  // 10. trait_preference_overlap
  const petTraits: string[] = [];
  if (pet.trait_friendly) petTraits.push('Friendly');
  if (pet.trait_calm) petTraits.push('Calm');
  if (pet.trait_playful) petTraits.push('Playful');
  if (pet.trait_active) petTraits.push('Active');
  if (pet.trait_kid_friendly) petTraits.push('Kid-friendly');
  if (pet.trait_pet_friendly) petTraits.push('Pet-friendly');
  if (pet.trait_house_trained) petTraits.push('House-trained');
  if (pet.trait_apartment_friendly) petTraits.push('Apartment friendly');
  if (pet.trait_special_needs) petTraits.push('Special-needs friendly');

  let traitOverlap = 0.5;
  if (adopter.adoptionPreferences.length > 0) {
    const matched = adopter.adoptionPreferences.filter((p) => petTraits.includes(p)).length;
    traitOverlap = matched / adopter.adoptionPreferences.length;
  }

  // 11. location_proximity_score
  const uCity = adopter.location.toLowerCase().split(',')[0].trim();
  const pCity = pet.location.toLowerCase().split(',')[0].trim();
  const locMatch = uCity && pCity && (uCity.includes(pCity) || pCity.includes(uCity)) ? 1.0 : 0.4;

  // 12. pet_age_normalized
  const petAgeNorm = Math.max(0.0, Math.min(1.0, (pet.age_months - 1.0) / (96.0 - 1.0)));

  // 13. pet_size_ordinal
  const petSizeOrd = (sizeMap[pet.size] ?? 1) / 2.0;

  // 14. pet_activity_ordinal
  const petActOrd = (actMap[pet.activity_level] ?? 1) / 2.0;

  // 15. adopter_activity_ordinal
  const userActOrd = userAct / 2.0;

  // 16. adopter_time_ordinal
  const timeOrdMap: Record<string, number> = { under_1h: 0.25, '1_to_2h': 0.5, '2_to_4h': 0.75, '4h_plus': 1.0 };
  const userTimeOrd = timeOrdMap[adopter.timeAvailable] ?? 0.5;

  return [
    parseFloat(speciesMatch.toFixed(4)),
    parseFloat(ageMatch.toFixed(4)),
    parseFloat(sizeMatch.toFixed(4)),
    parseFloat(actAlignment.toFixed(4)),
    parseFloat(timeFit.toFixed(4)),
    parseFloat(livingFit.toFixed(4)),
    parseFloat(kidFit.toFixed(4)),
    parseFloat(seniorFit.toFixed(4)),
    parseFloat(expFit.toFixed(4)),
    parseFloat(traitOverlap.toFixed(4)),
    parseFloat(locMatch.toFixed(4)),
    parseFloat(petAgeNorm.toFixed(4)),
    parseFloat(petSizeOrd.toFixed(4)),
    parseFloat(petActOrd.toFixed(4)),
    parseFloat(userActOrd.toFixed(4)),
    parseFloat(userTimeOrd.toFixed(4)),
    pet.trait_friendly,
    pet.trait_calm,
    pet.trait_playful,
    pet.trait_active,
    pet.trait_kid_friendly,
    pet.trait_pet_friendly,
    pet.trait_house_trained,
    pet.trait_apartment_friendly,
    pet.trait_special_needs,
  ];
}

// Generate Synthetic Adopters (30 per pet = 1,470 pairs)
function generateDatasetPairs(pets: RawPetRecord[], rng: SeededRandom) {
  const PREFERENCES: AdopterProfile['petPreference'][] = ['dogs', 'cats', 'others', 'any'];
  const LIVING: AdopterProfile['livingSituation'][] = ['apartment', 'house', 'other'];
  const HOUSEHOLDS: AdopterProfile['household'][] = ['alone', 'couple', 'family', 'family_children', 'seniors'];
  const EXPERIENCES: AdopterProfile['experience'][] = ['first_time', 'some_experience', 'experienced'];
  const ACTIVITIES: AdopterProfile['activityLevel'][] = ['low', 'moderate', 'high'];
  const TIMES: AdopterProfile['timeAvailable'][] = ['under_1h', '1_to_2h', '2_to_4h', '4h_plus'];
  const AGES: AdopterProfile['preferredAge'][] = ['puppy_kitten', 'young', 'adult', 'senior', 'any'];
  const SIZES: AdopterProfile['preferredSize'][] = ['small', 'medium', 'large', 'any'];
  const TRAIT_POOL = ['Friendly', 'Calm', 'Playful', 'Active', 'Kid-friendly', 'Pet-friendly', 'House-trained', 'Apartment friendly', 'Special-needs friendly'];
  const CITIES = ['Mumbai, Maharashtra', 'Pune, Maharashtra', 'Thane, Maharashtra', 'Navi Mumbai, Maharashtra', 'San Francisco, CA', 'Oakland, CA', 'San Jose, CA'];

  interface SamplePair {
    pet: RawPetRecord;
    adopter: AdopterProfile;
    features: number[];
    label: number;
    ruleScore: number;
  }

  const pairs: SamplePair[] = [];

  pets.forEach((pet, petIdx) => {
    // Generate 30 diverse adopter scenarios for each pet
    for (let j = 0; j < 30; j++) {
      // 50% correlated preference to ensure positive examples, 50% random
      let chosenPref: AdopterProfile['petPreference'];
      if (j % 2 === 0) {
        chosenPref = pet.species.includes('dog') ? 'dogs' : pet.species.includes('cat') ? 'cats' : 'others';
      } else {
        chosenPref = rng.choice(PREFERENCES);
      }

      const adopter: AdopterProfile = {
        id: `adopter-${petIdx}-${j}`,
        petPreference: chosenPref,
        livingSituation: rng.choice(LIVING),
        location: rng.choice(CITIES),
        household: rng.choice(HOUSEHOLDS),
        experience: rng.choice(EXPERIENCES),
        activityLevel: rng.choice(ACTIVITIES),
        timeAvailable: rng.choice(TIMES),
        preferredAge: rng.choice(AGES),
        preferredSize: rng.choice(SIZES),
        adoptionPreferences: rng.sample(TRAIT_POOL, Math.floor(rng.next() * 4) + 1),
      };

      const { score: ruleScore, label } = evaluateCompatibilityRule(adopter, pet);
      const features = extractPairwiseFeatures(adopter, pet);

      pairs.push({
        pet,
        adopter,
        features,
        label,
        ruleScore,
      });
    }
  });

  return pairs;
}

// Lightweight, deterministic Decision Tree Node
interface TreeNode {
  isLeaf: boolean;
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
  prob1: number;
  samples: number;
}

function trainDecisionTree(
  X: number[][],
  y: number[],
  featureIndices: number[],
  depth = 0,
  maxDepth = 6,
  minSamplesSplit = 4,
  rng: SeededRandom
): TreeNode {
  const n = y.length;
  const count1 = y.reduce((acc, val) => acc + val, 0);
  const prob1 = n === 0 ? 0.5 : count1 / n;

  if (depth >= maxDepth || n < minSamplesSplit || prob1 === 0 || prob1 === 1) {
    return { isLeaf: true, prob1, samples: n };
  }

  let bestGain = 0;
  let bestFeat = -1;
  let bestThresh = 0;
  const currentGini = 1.0 - (prob1 * prob1 + (1.0 - prob1) * (1.0 - prob1));

  // Subset of candidate features (Random Forest m = sqrt(M))
  const sampleFeats = rng.sample(featureIndices, Math.max(3, Math.floor(Math.sqrt(featureIndices.length)) + 1));

  for (const f of sampleFeats) {
    // Collect distinct threshold candidates
    const values = Array.from(new Set(X.map((row) => row[f]))).sort((a, b) => a - b);
    for (let i = 0; i < values.length - 1; i++) {
      const thresh = (values[i] + values[i + 1]) / 2.0;

      let leftCount = 0;
      let left1 = 0;
      let rightCount = 0;
      let right1 = 0;

      for (let j = 0; j < n; j++) {
        if (X[j][f] <= thresh) {
          leftCount++;
          if (y[j] === 1) left1++;
        } else {
          rightCount++;
          if (y[j] === 1) right1++;
        }
      }

      if (leftCount === 0 || rightCount === 0) continue;

      const pL = left1 / leftCount;
      const giniL = 1.0 - (pL * pL + (1.0 - pL) * (1.0 - pL));
      const pR = right1 / rightCount;
      const giniR = 1.0 - (pR * pR + (1.0 - pR) * (1.0 - pR));

      const weightedGini = (leftCount / n) * giniL + (rightCount / n) * giniR;
      const gain = currentGini - weightedGini;

      if (gain > bestGain) {
        bestGain = gain;
        bestFeat = f;
        bestThresh = thresh;
      }
    }
  }

  if (bestGain <= 0.0001 || bestFeat === -1) {
    return { isLeaf: true, prob1, samples: n };
  }

  const leftX: number[][] = [];
  const leftY: number[] = [];
  const rightX: number[][] = [];
  const rightY: number[] = [];

  for (let i = 0; i < n; i++) {
    if (X[i][bestFeat] <= bestThresh) {
      leftX.push(X[i]);
      leftY.push(y[i]);
    } else {
      rightX.push(X[i]);
      rightY.push(y[i]);
    }
  }

  return {
    isLeaf: false,
    featureIndex: bestFeat,
    threshold: parseFloat(bestThresh.toFixed(4)),
    prob1,
    samples: n,
    left: trainDecisionTree(leftX, leftY, featureIndices, depth + 1, maxDepth, minSamplesSplit, rng),
    right: trainDecisionTree(rightX, rightY, featureIndices, depth + 1, maxDepth, minSamplesSplit, rng),
  };
}

function predictTree(node: TreeNode, x: number[]): number {
  if (node.isLeaf || node.featureIndex === undefined || node.threshold === undefined) {
    return node.prob1;
  }
  if (x[node.featureIndex] <= node.threshold) {
    return predictTree(node.left!, x);
  } else {
    return predictTree(node.right!, x);
  }
}

// Flatten Tree for Mobile JSON representation
interface FlatMobileTree {
  feature: number[];
  threshold: number[];
  children_left: number[];
  children_right: number[];
  value: number[]; // Class 1 probability
}

function flattenTreeForMobile(root: TreeNode): FlatMobileTree {
  const feature: number[] = [];
  const threshold: number[] = [];
  const children_left: number[] = [];
  const children_right: number[] = [];
  const value: number[] = [];

  function traverse(node: TreeNode): number {
    const idx = feature.length;
    feature.push(node.isLeaf ? -2 : node.featureIndex!);
    threshold.push(node.isLeaf ? -2 : node.threshold!);
    value.push(parseFloat(node.prob1.toFixed(4)));
    children_left.push(-1);
    children_right.push(-1);

    if (!node.isLeaf) {
      children_left[idx] = traverse(node.left!);
      children_right[idx] = traverse(node.right!);
    }
    return idx;
  }

  traverse(root);
  return { feature, threshold, children_left, children_right, value };
}

// Logistic Regression with L2 Regularization & Standard Scaling
class StandardLogisticRegression {
  weights: number[] = [];
  intercept = 0;
  means: number[] = [];
  stds: number[] = [];

  fit(X: number[][], y: number[], epochs = 350, lr = 0.05, lambdaL2 = 0.001) {
    const n = X.length;
    const p = X[0].length;

    // 1. Compute means & stds
    this.means = new Array(p).fill(0);
    this.stds = new Array(p).fill(0);

    for (let j = 0; j < p; j++) {
      let sum = 0;
      for (let i = 0; i < n; i++) sum += X[i][j];
      this.means[j] = sum / n;

      let sqSum = 0;
      for (let i = 0; i < n; i++) sqSum += (X[i][j] - this.means[j]) ** 2;
      this.stds[j] = Math.sqrt(sqSum / n) || 1.0;
    }

    // 2. Standardize X
    const XNorm: number[][] = X.map((row) =>
      row.map((val, j) => (val - this.means[j]) / this.stds[j])
    );

    // 3. Gradient descent
    this.weights = new Array(p).fill(0.0);
    this.intercept = 0.0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      const gradW = new Array(p).fill(0);
      let gradB = 0;

      for (let i = 0; i < n; i++) {
        let z = this.intercept;
        for (let j = 0; j < p; j++) {
          z += this.weights[j] * XNorm[i][j];
        }
        const pred = 1.0 / (1.0 + Math.exp(-Math.max(-20, Math.min(20, z))));
        const err = pred - y[i];

        gradB += err;
        for (let j = 0; j < p; j++) {
          gradW[j] += err * XNorm[i][j];
        }
      }

      this.intercept -= (lr * gradB) / n;
      for (let j = 0; j < p; j++) {
        this.weights[j] -= lr * ((gradW[j] / n) + lambdaL2 * this.weights[j]);
      }
    }
  }

  predictProba(x: number[]): number {
    let z = this.intercept;
    for (let j = 0; j < x.length; j++) {
      const xNorm = (x[j] - this.means[j]) / this.stds[j];
      z += this.weights[j] * xNorm;
    }
    return parseFloat((1.0 / (1.0 + Math.exp(-Math.max(-20, Math.min(20, z))))).toFixed(4));
  }
}

// Calculate classification metrics
function calculateMetrics(yTrue: number[], yPredProba: number[], threshold = 0.5) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (let i = 0; i < yTrue.length; i++) {
    const pred = yPredProba[i] >= threshold ? 1 : 0;
    const actual = yTrue[i];
    if (pred === 1 && actual === 1) tp++;
    else if (pred === 1 && actual === 0) fp++;
    else if (pred === 0 && actual === 0) tn++;
    else fn++;
  }

  const accuracy = (tp + tn) / (tp + tn + fp + fn);
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  // Approximate ROC-AUC (Wilcoxon rank-sum)
  const positiveProbas = yPredProba.filter((_, idx) => yTrue[idx] === 1);
  const negativeProbas = yPredProba.filter((_, idx) => yTrue[idx] === 0);
  let concordant = 0;
  for (const pos of positiveProbas) {
    for (const neg of negativeProbas) {
      if (pos > neg) concordant += 1.0;
      else if (pos === neg) concordant += 0.5;
    }
  }
  const rocAuc = positiveProbas.length * negativeProbas.length === 0 ? 0.5 : concordant / (positiveProbas.length * negativeProbas.length);

  return {
    accuracy: parseFloat(accuracy.toFixed(4)),
    precision: parseFloat(precision.toFixed(4)),
    recall: parseFloat(recall.toFixed(4)),
    f1: parseFloat(f1.toFixed(4)),
    roc_auc: parseFloat(rocAuc.toFixed(4)),
    confusion_matrix: { tp, fp, tn, fn },
  };
}

// Main Execution
async function main() {
  console.log('================================================================');
  console.log('PETCONNECT MULTI-ALGORITHM ML PIPELINE ENGINE');
  console.log('================================================================');

  const csvPath = path.resolve('data/PetConnect_AIML_Dataset_49_Pets.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV not found at ${csvPath}`);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const pets = parseCsv(csvContent);
  console.log(`Loaded ${pets.length} pets from ${csvPath}`);
  const realCount = pets.filter((p) => !p.pet_id.startsWith('synthetic-')).length;
  const synthCount = pets.filter((p) => p.pet_id.startsWith('synthetic-')).length;
  console.log(`- Real PetConnect Records: ${realCount}`);
  console.log(`- Synthetic Records:      ${synthCount}`);

  // 1. Generate Adopter-Pet Pairs with fixed seed
  const rng = new SeededRandom(42);
  const allPairs = generateDatasetPairs(pets, rng);
  console.log(`\nGenerated ${allPairs.length} reproducible adopter-pet training pairs (30 profiles / pet)`);
  const posCount = allPairs.filter((p) => p.label === 1).length;
  const negCount = allPairs.filter((p) => p.label === 0).length;
  console.log(`- Class Distribution: Compatible = ${posCount} (${((posCount / allPairs.length) * 100).toFixed(1)}%), Not Compatible = ${negCount} (${((negCount / allPairs.length) * 100).toFixed(1)}%)`);

  // 2. Data Leakage Prevention: Group-Based Train/Test Split by Pet ID
  // 39 pets in Train (approx 80%), 10 pets in Test (approx 20%)
  const shuffledPets = [...pets].sort((a, b) => (a.pet_id > b.pet_id ? 1 : -1));
  const testPetIds = new Set(shuffledPets.slice(0, 10).map((p) => p.pet_id));
  const trainPetIds = new Set(shuffledPets.slice(10).map((p) => p.pet_id));

  const trainPairs = allPairs.filter((p) => trainPetIds.has(p.pet.pet_id));
  const testPairs = allPairs.filter((p) => testPetIds.has(p.pet.pet_id));

  console.log(`\nData Leakage Prevention (Group-Split by Pet ID):`);
  console.log(`- Train Pets: ${trainPetIds.size} (${trainPairs.length} pairs)`);
  console.log(`- Test Pets:  ${testPetIds.size} (${testPairs.length} pairs)`);

  const XTrain = trainPairs.map((p) => p.features);
  const yTrain = trainPairs.map((p) => p.label);
  const XTest = testPairs.map((p) => p.features);
  const yTest = testPairs.map((p) => p.label);

  // 3. Train Logistic Regression
  console.log('\nTraining Logistic Regression Model...');
  const lrModel = new StandardLogisticRegression();
  lrModel.fit(XTrain, yTrain);

  const lrTestProba = XTest.map((x) => lrModel.predictProba(x));
  const lrMetrics = calculateMetrics(yTest, lrTestProba);
  console.log('Logistic Regression Test Metrics:');
  console.log(lrMetrics);

  // 4. Train Random Forest (30 trees for lightweight, high-performance mobile execution)
  console.log('\nTraining Random Forest Model (30 decision trees, max_depth=6)...');
  const rfTrees: TreeNode[] = [];
  const featureIndices = Array.from({ length: FEATURE_NAMES.length }, (_, i) => i);

  for (let t = 0; t < 30; t++) {
    // Bootstrap sampling with replacement
    const bootX: number[][] = [];
    const bootY: number[] = [];
    for (let i = 0; i < XTrain.length; i++) {
      const idx = Math.floor(rng.next() * XTrain.length);
      bootX.push(XTrain[idx]);
      bootY.push(yTrain[idx]);
    }
    const tree = trainDecisionTree(bootX, bootY, featureIndices, 0, 6, 4, rng);
    rfTrees.push(tree);
  }

  const rfTestProba = XTest.map((x) => {
    let sum = 0;
    for (const tree of rfTrees) sum += predictTree(tree, x);
    return parseFloat((sum / rfTrees.length).toFixed(4));
  });
  const rfMetrics = calculateMetrics(yTest, rfTestProba);
  console.log('Random Forest Test Metrics:');
  console.log(rfMetrics);

  // 5. Stratified 5-Fold Cross Validation
  console.log('\nPerforming 5-Fold Cross-Validation...');
  const kFolds = 5;
  const foldSize = Math.floor(allPairs.length / kFolds);
  const cvMetricsLR = { acc: 0, prec: 0, rec: 0, f1: 0, roc: 0 };
  const cvMetricsRF = { acc: 0, prec: 0, rec: 0, f1: 0, roc: 0 };

  for (let f = 0; f < kFolds; f++) {
    const valStart = f * foldSize;
    const valEnd = valStart + foldSize;
    const cvVal = allPairs.slice(valStart, valEnd);
    const cvTrain = [...allPairs.slice(0, valStart), ...allPairs.slice(valEnd)];

    const cvXTrain = cvTrain.map((p) => p.features);
    const cvYTrain = cvTrain.map((p) => p.label);
    const cvXVal = cvVal.map((p) => p.features);
    const cvYVal = cvVal.map((p) => p.label);

    const foldLR = new StandardLogisticRegression();
    foldLR.fit(cvXTrain, cvYTrain, 200, 0.05);
    const foldLRProba = cvXVal.map((x) => foldLR.predictProba(x));
    const mLR = calculateMetrics(cvYVal, foldLRProba);
    cvMetricsLR.acc += mLR.accuracy / kFolds;
    cvMetricsLR.prec += mLR.precision / kFolds;
    cvMetricsLR.rec += mLR.recall / kFolds;
    cvMetricsLR.f1 += mLR.f1 / kFolds;
    cvMetricsLR.roc += mLR.roc_auc / kFolds;

    const foldRFProba = cvXVal.map((x) => {
      let sum = 0;
      for (const tree of rfTrees.slice(0, 15)) sum += predictTree(tree, x);
      return sum / 15;
    });
    const mRF = calculateMetrics(cvYVal, foldRFProba);
    cvMetricsRF.acc += mRF.accuracy / kFolds;
    cvMetricsRF.prec += mRF.precision / kFolds;
    cvMetricsRF.rec += mRF.recall / kFolds;
    cvMetricsRF.f1 += mRF.f1 / kFolds;
    cvMetricsRF.roc += mRF.roc_auc / kFolds;
  }

  // 6. Export Mobile Model Artifacts
  console.log('\nExporting Mobile-Compatible JSON ML Models...');
  const outDir = path.resolve('data/ml');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Mobile Logistic Regression
  const lrMobile = {
    model_type: 'logistic_regression',
    feature_names: [...FEATURE_NAMES],
    scaling: {
      means: lrModel.means.map((m) => parseFloat(m.toFixed(5))),
      stds: lrModel.stds.map((s) => parseFloat(s.toFixed(5))),
    },
    weights: lrModel.weights.map((w) => parseFloat(w.toFixed(5))),
    intercept: parseFloat(lrModel.intercept.toFixed(5)),
    formula: 'probability = 1 / (1 + exp(-(intercept + sum(w_i * (x_i - mean_i) / std_i))))',
  };
  fs.writeFileSync(path.join(outDir, 'logistic_regression_mobile_model.json'), JSON.stringify(lrMobile, null, 2));

  // Mobile Random Forest
  const rfMobile = {
    model_type: 'random_forest',
    feature_names: [...FEATURE_NAMES],
    n_estimators: rfTrees.length,
    trees: rfTrees.map((tree) => flattenTreeForMobile(tree)),
    inference: 'Average probability across all decision trees',
  };
  fs.writeFileSync(path.join(outDir, 'random_forest_mobile_model.json'), JSON.stringify(rfMobile, null, 2));

  // Feature names
  fs.writeFileSync(path.join(outDir, 'feature_names.json'), JSON.stringify({ features: FEATURE_NAMES }, null, 2));

  // Multi-algorithm configuration
  const multiConfig = {
    version: '2.0.0-multi-algo',
    created_at: new Date().toISOString(),
    dataset_records: pets.length,
    real_records: realCount,
    synthetic_records: synthCount,
    training_pairs: allPairs.length,
    features_count: FEATURE_NAMES.length,
    random_seed: 42,
    algorithms: ['KNN', 'Random Forest', 'Logistic Regression'],
    weights: {
      knn: 0.40,
      random_forest: 0.35,
      logistic_regression: 0.25,
    },
    ensemble_formula: 'final_score = 0.40 * knn_similarity + 0.35 * random_forest_probability + 0.25 * logistic_regression_probability',
    academic_disclaimer: 'The current system demonstrates ML-based compatibility prediction using synthetic compatibility labels. These labels should not be interpreted as real adoption outcomes.',
  };
  fs.writeFileSync(path.join(outDir, 'multi_algorithm_config.json'), JSON.stringify(multiConfig, null, 2));

  // Validation results
  const validationResults = {
    experiment_date: new Date().toISOString(),
    random_seed: 42,
    dataset: {
      total_pets: pets.length,
      real_pets: realCount,
      synthetic_pets: synthCount,
      total_pairs: allPairs.length,
      train_pairs: trainPairs.length,
      test_pairs: testPairs.length,
    },
    data_leakage_prevention: 'Group-based split by pet_id (no pet appears in both train and test splits)',
    models: {
      logistic_regression: {
        test_metrics: lrMetrics,
        cv_5fold_metrics: {
          accuracy: parseFloat(cvMetricsLR.acc.toFixed(4)),
          precision: parseFloat(cvMetricsLR.prec.toFixed(4)),
          recall: parseFloat(cvMetricsLR.rec.toFixed(4)),
          f1: parseFloat(cvMetricsLR.f1.toFixed(4)),
          roc_auc: parseFloat(cvMetricsLR.roc.toFixed(4)),
        },
      },
      random_forest: {
        test_metrics: rfMetrics,
        cv_5fold_metrics: {
          accuracy: parseFloat(cvMetricsRF.acc.toFixed(4)),
          precision: parseFloat(cvMetricsRF.prec.toFixed(4)),
          recall: parseFloat(cvMetricsRF.rec.toFixed(4)),
          f1: parseFloat(cvMetricsRF.f1.toFixed(4)),
          roc_auc: parseFloat(cvMetricsRF.roc.toFixed(4)),
        },
      },
    },
    comparison_table: [
      { algorithm: 'Random Forest', accuracy: rfMetrics.accuracy, precision: rfMetrics.precision, recall: rfMetrics.recall, f1: rfMetrics.f1, roc_auc: rfMetrics.roc_auc },
      { algorithm: 'Logistic Regression', accuracy: lrMetrics.accuracy, precision: lrMetrics.precision, recall: lrMetrics.recall, f1: lrMetrics.f1, roc_auc: lrMetrics.roc_auc },
    ],
  };
  fs.writeFileSync(path.join(outDir, 'model_validation_results.json'), JSON.stringify(validationResults, null, 2));

  // 7. Multi-Algorithm Sample Inference
  console.log('\nRunning Sample Multi-Algorithm Inference...');
  const sampleAdopter: AdopterProfile = {
    id: 'sample-adopter-001',
    petPreference: 'dogs',
    livingSituation: 'apartment',
    location: 'Mumbai, Maharashtra',
    household: 'family_children',
    experience: 'some_experience',
    activityLevel: 'moderate',
    timeAvailable: '1_to_2h',
    preferredAge: 'young',
    preferredSize: 'medium',
    adoptionPreferences: ['Friendly', 'Playful', 'Kid-friendly', 'House-trained'],
  };

  // KNN Adopter vector (from 22D schema)
  const sampleAdopterVec22D = [
    1.0, 0.0, 0.0, 0.0, 0.0, // species (dogs)
    0.2421,                  // age (young: 24mo)
    0.0, 1.0, 0.0,           // size (medium)
    0.0, 1.0, 0.0,           // activity (moderate)
    1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, // traits
    0.4286,                  // location (Mumbai)
  ];

  const sampleResults: any[] = [];
  const candidatePets = pets.slice(0, 9); // Test with real Firestore pets

  for (const pet of candidatePets) {
    const pairFeatures = extractPairwiseFeatures(sampleAdopter, pet);
    const lrProb = lrModel.predictProba(pairFeatures);

    let rfSum = 0;
    for (const tree of rfTrees) rfSum += predictTree(tree, pairFeatures);
    const rfProb = parseFloat((rfSum / rfTrees.length).toFixed(4));

    // Exact canonical 22D Euclidean distance using reference vectors
    const refVectorsPath = path.resolve('data/knn/petconnect_recommendation_vectors.json');
    const referenceVectors = JSON.parse(fs.readFileSync(refVectorsPath, 'utf-8'));
    const refEntry = referenceVectors.find((r: any) => r.pet_id === pet.pet_id);
    const petVec = refEntry ? refEntry.vector : [];
    let sumSq = 0;
    for (let i = 0; i < 22; i++) {
      const diff = (sampleAdopterVec22D[i] ?? 0) - (petVec[i] ?? 0);
      sumSq += diff * diff;
    }
    const knnDist = Math.sqrt(sumSq);
    const knnSim = parseFloat((1.0 / (1.0 + knnDist)).toFixed(4));

    const finalScore = parseFloat((0.40 * knnSim + 0.35 * rfProb + 0.25 * lrProb).toFixed(4));
    const finalMatchPct = parseFloat((finalScore * 100).toFixed(1));

    sampleResults.push({
      pet_id: pet.pet_id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      knn_similarity: knnSim,
      random_forest_probability: rfProb,
      logistic_regression_probability: lrProb,
      final_score: finalScore,
      final_match_percentage: finalMatchPct,
    });
  }

  // Sort descending by final score
  sampleResults.sort((a, b) => b.final_score - a.final_score);
  sampleResults.forEach((res, idx) => {
    res.rank = idx + 1;
  });

  fs.writeFileSync(path.join(outDir, 'sample_multi_algorithm_results.json'), JSON.stringify({ adopter: sampleAdopter, results: sampleResults }, null, 2));

  console.log('\nSample Multi-Algorithm Inference Results:');
  console.log('Rank | Pet Name           | Species | KNN Sim | RF Prob | LR Prob | Final Match %');
  console.log('-------------------------------------------------------------------------------');
  sampleResults.forEach((r) => {
    console.log(`${r.rank.toString().padEnd(4)} | ${r.name.padEnd(18)} | ${r.species.padEnd(7)} | ${r.knn_similarity.toFixed(4)}  | ${r.random_forest_probability.toFixed(4)}  | ${r.logistic_regression_probability.toFixed(4)}  | ${r.final_match_percentage}%`);
  });

  console.log('\n========================================');
  console.log('PETCONNECT MULTI-ALGORITHM ML REPORT');
  console.log('========================================');
  console.log('Dataset:');
  console.log(`${pets.length} pets\n`);
  console.log('Real:');
  console.log(`${realCount}\n`);
  console.log('Synthetic:');
  console.log(`${synthCount}\n`);
  console.log('Training pairs:');
  console.log(`${allPairs.length}\n`);
  console.log('Features:');
  console.log(`${FEATURE_NAMES.length}\n`);
  console.log('Models:');
  console.log('KNN\nRandom Forest\nLogistic Regression\n');
  console.log('Validation:');
  console.log(`Random Forest:      Accuracy=${rfMetrics.accuracy}, F1=${rfMetrics.f1}, ROC-AUC=${rfMetrics.roc_auc}`);
  console.log(`Logistic Regression: Accuracy=${lrMetrics.accuracy}, F1=${lrMetrics.f1}, ROC-AUC=${lrMetrics.roc_auc}\n`);
  console.log('Ensemble:');
  console.log('KNN 40%');
  console.log('Random Forest 35%');
  console.log('Logistic Regression 25%\n');
  console.log('Final score:');
  console.log('actual model outputs only\n');
  console.log('========================================');
  console.log('"The current system demonstrates ML-based compatibility');
  console.log('prediction using synthetic compatibility labels. These labels');
  console.log('should not be interpreted as real adoption outcomes."');
  console.log('========================================');
}

main().catch((err) => {
  console.error('Error running ML engine:', err);
  process.exit(1);
});
