import {
  Pet,
  AIMatchQuestionnaire,
  AIMatchResult,
  AIMatchScoreBreakdown,
  PreferredPetAge,
  PreferredPetSize,
  ActivityLevel,
} from '../types';

import rfMobileModel from '../../data/ml/random_forest_mobile_model.json';
import lrMobileModel from '../../data/ml/logistic_regression_mobile_model.json';
import multiAlgoConfig from '../../data/ml/multi_algorithm_config.json';
import featureNamesSchema from '../../data/ml/feature_names.json';
import petconnectMobileModel from '../../data/ml/petconnect_mobile_model.json';

import {
  KNN_CONFIG,
  KNN_FEATURE_NAMES,
  buildAdopterVector,
  encodePetToVector,
  calculateEuclideanDistance,
  buildScoreBreakdownFromVectors,
  generateAIExplanation,
  parseAgeToMonths,
  inferPetSize,
  inferPetActivityLevel,
} from './knnRecommendationService';

/**
 * ============================================================================
 * PETCONNECT MULTI-ALGORITHM ML RECOMMENDATION SYSTEM
 * ============================================================================
 *
 * Deployed On-Device Multi-Algorithm Inference Engine:
 * 1. K-Nearest Neighbors (KNN) - Instance-based nearest neighbor in ℝ²²
 * 2. Random Forest Classifier - Non-linear ensemble of decision trees
 * 3. Logistic Regression - Regularized linear model with calibrated probabilities
 *
 * Ensemble Formula:
 *   ensembleScore =
 *       0.40 * knnSimilarity
 *     + 0.35 * randomForestProbability
 *     + 0.25 * logisticRegressionProbability
 *
 *   finalMatchPercentage = ensembleScore * 100
 *
 * Academic & Dataset Notice:
 * "The compatibility labels are synthetic labels generated from defined
 * adopter-pet compatibility rules because historical adopter-pet outcome
 * labels are not available."
 * ============================================================================
 */

export const MULTI_ALGO_CONFIG = {
  version: multiAlgoConfig.version || '2.0.0-multi-algo',
  weights: {
    knn: multiAlgoConfig.weights?.knn ?? 0.40,
    randomForest: multiAlgoConfig.weights?.random_forest ?? 0.35,
    logisticRegression: multiAlgoConfig.weights?.logistic_regression ?? 0.25,
  },
  k: KNN_CONFIG.k || 5,
  academicDisclaimer: multiAlgoConfig.academic_disclaimer || '',
};

export const PAIRWISE_FEATURE_NAMES: readonly string[] = featureNamesSchema.features;

// Types for exported mobile models
interface FlatMobileTree {
  feature: number[];
  threshold: number[];
  children_left: number[];
  children_right: number[];
  value: number[];
}

interface MobileRandomForestModel {
  model_type: string;
  feature_names: string[];
  n_estimators: number;
  trees: FlatMobileTree[];
}

interface MobileLogisticRegressionModel {
  model_type: string;
  feature_names: string[];
  scaling: {
    means: number[];
    stds: number[];
  };
  weights: number[];
  intercept: number;
  formula: string;
}

const RF_MODEL = rfMobileModel as unknown as MobileRandomForestModel;
const LR_MODEL = lrMobileModel as unknown as MobileLogisticRegressionModel;

// Helper: normalize text
function normText(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
}

/**
 * 25-Dimensional Pairwise Feature Extractor
 * Encodes the relationship between an adopter questionnaire and a candidate pet
 * matching the exact feature order and semantics from Colab training.
 */
export function extractPairwiseFeatures(adopter: AIMatchQuestionnaire, pet: Pet): number[] {
  const petVector = encodePetToVector(pet);

  const cat = normText(pet.category);
  const isDog = cat.includes('dog');
  const isCat = cat.includes('cat');

  // 1. species_match
  let speciesMatch = 0.0;
  const pref = normText(adopter.petPreference || 'any');
  if (pref === 'any') {
    speciesMatch = 1.0;
  } else if (pref === 'dogs' && isDog) {
    speciesMatch = 1.0;
  } else if (pref === 'cats' && isCat) {
    speciesMatch = 1.0;
  } else if (pref === 'others' && !isDog && !isCat) {
    speciesMatch = 1.0;
  }

  // 2. age_preference_match
  const petAgeMonths = parseAgeToMonths(pet.age);
  const targetAgeMap: Record<string, number> = {
    puppy_kitten: 6,
    young: 24,
    adult: 60,
    senior: 120,
    any: 36,
  };
  const targetMo = targetAgeMap[normText(adopter.preferredAge || 'any')] ?? 36;
  const ageDiff = Math.abs(targetMo - petAgeMonths);
  const ageMatch = normText(adopter.preferredAge) === 'any' ? 1.0 : Math.max(0.0, 1.0 - ageDiff / 60.0);

  // 3. size_preference_match
  const sizeMap: Record<string, number> = { small: 0, medium: 1, large: 2 };
  const petSizeStr: PreferredPetSize = petVector[8] > 0.5 ? 'large' : petVector[7] > 0.5 ? 'medium' : 'small';
  const petSize = sizeMap[petSizeStr] ?? 1;
  let sizeMatch = 1.0;
  const userSizeStr = normText(adopter.preferredSize || 'any');
  if (userSizeStr !== 'any') {
    const userSize = sizeMap[userSizeStr] ?? 1;
    const diff = Math.abs(userSize - petSize);
    sizeMatch = diff === 0 ? 1.0 : diff === 1 ? 0.5 : 0.0;
  }

  // 4. activity_alignment
  const actMap: Record<string, number> = { low: 0, moderate: 1, high: 2 };
  const petActStr: ActivityLevel = petVector[11] > 0.5 ? 'high' : petVector[10] > 0.5 ? 'moderate' : 'low';
  const userAct = actMap[normText(adopter.activityLevel || 'moderate')] ?? 1;
  const petAct = actMap[petActStr] ?? 1;
  const actAlignment = 1.0 - Math.abs(userAct - petAct) / 2.0;

  // 5. time_energy_compatibility
  const timeLevelMap: Record<string, number> = { under_1h: 0, '1_to_2h': 1, '2_to_4h': 2, '4h_plus': 2 };
  const timeLevel = timeLevelMap[normText(adopter.timeAvailable || '1_to_2h')] ?? 1;
  const timeFit = timeLevel >= petAct ? 1.0 : 0.3;

  // Pet Traits from canonical 22D vector
  const tFriendly = Math.round(petVector[12]) || 0;
  const tCalm = Math.round(petVector[13]) || 0;
  const tPlayful = Math.round(petVector[14]) || 0;
  const tActive = Math.round(petVector[15]) || 0;
  const tKidFriendly = Math.round(petVector[16]) || 0;
  const tPetFriendly = Math.round(petVector[17]) || 0;
  const tHouseTrained = Math.round(petVector[18]) || 0;
  const tApartmentFriendly = Math.round(petVector[19]) || 0;
  const tSpecialNeeds = Math.round(petVector[20]) || 0;

  // 6. living_space_compatibility
  let livingFit = 1.0;
  const userLiving = normText(adopter.livingSituation || 'apartment');
  if (userLiving === 'apartment') {
    if (petSizeStr === 'large' && petActStr === 'high') livingFit = 0.2;
    else if (tApartmentFriendly === 1) livingFit = 1.0;
    else livingFit = 0.7;
  }

  // 7. household_kid_compatibility
  let kidFit = 1.0;
  const userHousehold = normText(adopter.household || 'alone');
  if (userHousehold === 'family_children') {
    kidFit = tKidFriendly === 1 ? 1.0 : 0.0;
  }

  // 8. household_senior_compatibility
  let seniorFit = 1.0;
  if (userHousehold === 'seniors') {
    seniorFit = (petActStr === 'high' || petSizeStr === 'large') ? 0.2 : (tCalm === 1 ? 1.0 : 0.6);
  }

  // 9. experience_competence_fit
  let expFit = 1.0;
  const userExp = normText(adopter.experience || 'first_time');
  if (userExp === 'first_time' && tSpecialNeeds === 1) {
    expFit = 0.2;
  }

  // 10. trait_preference_overlap
  const petTraits: string[] = [];
  if (tFriendly) petTraits.push('Friendly');
  if (tCalm) petTraits.push('Calm');
  if (tPlayful) petTraits.push('Playful');
  if (tActive) petTraits.push('Active');
  if (tKidFriendly) petTraits.push('Kid-friendly');
  if (tPetFriendly) petTraits.push('Pet-friendly');
  if (tHouseTrained) petTraits.push('House-trained');
  if (tApartmentFriendly) petTraits.push('Apartment friendly');
  if (tSpecialNeeds) petTraits.push('Special-needs friendly');

  let traitOverlap = 0.5;
  if (adopter.adoptionPreferences && adopter.adoptionPreferences.length > 0) {
    const normPrefs = adopter.adoptionPreferences.map((p) => {
      const lower = p.toLowerCase().trim();
      if (lower.includes('child') || lower.includes('kid')) return 'Kid-friendly';
      if (lower.includes('other pet') || lower.includes('pet-friendly')) return 'Pet-friendly';
      if (lower.includes('special')) return 'Special-needs friendly';
      if (lower.includes('apartment')) return 'Apartment friendly';
      if (lower.includes('house') || lower.includes('litter')) return 'House-trained';
      if (lower.includes('friendly')) return 'Friendly';
      if (lower.includes('calm')) return 'Calm';
      if (lower.includes('playful')) return 'Playful';
      if (lower.includes('active')) return 'Active';
      return p;
    });
    const matched = normPrefs.filter((p) => petTraits.includes(p)).length;
    traitOverlap = matched / adopter.adoptionPreferences.length;
  }

  // 11. location_proximity_score
  const uCity = normText(adopter.location).split(',')[0].trim();
  const pCity = normText(pet.location).split(',')[0].trim();
  const locMatch = uCity && pCity && (uCity.includes(pCity) || pCity.includes(uCity)) ? 1.0 : 0.4;

  // 12. pet_age_normalized
  const petAgeNorm = Math.max(0.0, Math.min(1.0, (petAgeMonths - 1.0) / (96.0 - 1.0)));

  // 13. pet_size_ordinal
  const petSizeOrd = petSize / 2.0;

  // 14. pet_activity_ordinal
  const petActOrd = petAct / 2.0;

  // 15. adopter_activity_ordinal
  const userActOrd = userAct / 2.0;

  // 16. adopter_time_ordinal
  const timeOrdMap: Record<string, number> = { under_1h: 0.25, '1_to_2h': 0.5, '2_to_4h': 0.75, '4h_plus': 1.0 };
  const userTimeOrd = timeOrdMap[normText(adopter.timeAvailable || '1_to_2h')] ?? 0.5;
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
    tFriendly,
    tCalm,
    tPlayful,
    tActive,
    tKidFriendly,
    tPetFriendly,
    tHouseTrained,
    tApartmentFriendly,
    tSpecialNeeds,
  ];
}

/**
 * Executes on-device Random Forest inference on the exported tree ensemble.
 */
export function predictRandomForest(features25D: number[]): number {
  if (!RF_MODEL || !RF_MODEL.trees || RF_MODEL.trees.length === 0) {
    return 0.5;
  }

  let totalProb = 0;
  for (const tree of RF_MODEL.trees) {
    let curr = 0;
    while (
      curr >= 0 &&
      tree.children_left[curr] !== -1 &&
      tree.children_right[curr] !== -1
    ) {
      const fIdx = tree.feature[curr];
      const thresh = tree.threshold[curr];
      if (features25D[fIdx] <= thresh) {
        curr = tree.children_left[curr];
      } else {
        curr = tree.children_right[curr];
      }
    }
    const leafVal = curr >= 0 ? tree.value[curr] : 0.5;
    totalProb += leafVal;
  }

  const avgProb = totalProb / RF_MODEL.trees.length;
  return parseFloat(avgProb.toFixed(4));
}

/**
 * Executes on-device Logistic Regression inference using standardized features and sigmoid.
 */
export function predictLogisticRegression(features25D: number[]): number {
  if (!LR_MODEL || !LR_MODEL.weights) {
    return 0.5;
  }

  const { means, stds } = LR_MODEL.scaling;
  const weights = LR_MODEL.weights;
  let z = LR_MODEL.intercept;

  for (let i = 0; i < features25D.length; i++) {
    const rawVal = features25D[i];
    const mean = means[i] ?? 0.0;
    const std = stds[i] && stds[i] !== 0 ? stds[i] : 1.0;
    const scaledVal = (rawVal - mean) / std;
    z += weights[i] * scaledVal;
  }

  // Sigmoid activation: 1 / (1 + exp(-z))
  const prob = 1.0 / (1.0 + Math.exp(-z));
  return parseFloat(prob.toFixed(4));
}

export interface TreeTraceStep {
  featureName: string;
  featureValue: number;
  threshold: number;
  goesLeft: boolean;
}

export interface TreeTrace {
  treeIndex: number;
  leafProbability: number;
  steps: TreeTraceStep[];
}

export function traceRandomForestTrees(features25D: number[]): TreeTrace[] {
  if (!RF_MODEL || !RF_MODEL.trees) return [];
  const traces: TreeTrace[] = [];

  RF_MODEL.trees.forEach((tree, treeIdx) => {
    let node = 0;
    const steps: TreeTraceStep[] = [];
    while (tree.children_left && tree.children_left[node] !== -1 && tree.feature[node] !== undefined) {
      const featIdx = tree.feature[node];
      const threshold = tree.threshold[node];
      const val = features25D[featIdx] ?? 0;
      const goesLeft = val <= threshold;
      const featName = PAIRWISE_FEATURE_NAMES[featIdx] || `Feature ${featIdx}`;

      steps.push({
        featureName: featName,
        featureValue: val,
        threshold: threshold,
        goesLeft: goesLeft,
      });

      node = goesLeft ? tree.children_left[node] : tree.children_right[node];
    }

    const rawVal = tree.value[node];
    let leafProb = 0.5;
    if (Array.isArray(rawVal)) {
      if (rawVal.length === 2) {
        const total = rawVal[0] + rawVal[1];
        leafProb = total > 0 ? rawVal[1] / total : 0.5;
      } else if (rawVal.length === 1) {
        leafProb = rawVal[0];
      }
    } else if (typeof rawVal === 'number') {
      leafProb = rawVal;
    }

    traces.push({
      treeIndex: treeIdx + 1,
      leafProbability: parseFloat(leafProb.toFixed(4)),
      steps,
    });
  });

  return traces;
}

export interface LogisticRegressionFeatureContribution {
  index: number;
  name: string;
  rawValue: number;
  standardizedValue: number;
  weight: number;
  contribution: number;
}

export interface LogisticRegressionTrace {
  intercept: number;
  logit: number;
  probability: number;
  features: LogisticRegressionFeatureContribution[];
  topPositive: LogisticRegressionFeatureContribution[];
  topNegative: LogisticRegressionFeatureContribution[];
}

export function getLogisticRegressionTrace(features25D: number[]): LogisticRegressionTrace {
  if (!LR_MODEL || !LR_MODEL.weights) {
    return {
      intercept: 0,
      logit: 0,
      probability: 0.5,
      features: [],
      topPositive: [],
      topNegative: [],
    };
  }

  const { means, stds } = LR_MODEL.scaling;
  const weights = LR_MODEL.weights;
  let logit = LR_MODEL.intercept;
  const allFeatures: LogisticRegressionFeatureContribution[] = [];

  for (let i = 0; i < features25D.length; i++) {
    const rawVal = features25D[i] ?? 0;
    const mean = means[i] ?? 0.0;
    const std = stds[i] && stds[i] !== 0 ? stds[i] : 1.0;
    const standardizedValue = (rawVal - mean) / std;
    const weight = weights[i] ?? 0.0;
    const contribution = parseFloat((weight * standardizedValue).toFixed(4));
    logit += weight * standardizedValue;

    allFeatures.push({
      index: i,
      name: LR_MODEL.feature_names?.[i] || PAIRWISE_FEATURE_NAMES[i] || `Feature ${i}`,
      rawValue: rawVal,
      standardizedValue: parseFloat(standardizedValue.toFixed(4)),
      weight: parseFloat(weight.toFixed(4)),
      contribution: contribution,
    });
  }

  const probability = parseFloat((1.0 / (1.0 + Math.exp(-logit))).toFixed(4));
  const topPositive = [...allFeatures]
    .filter((f) => f.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3);
  const topNegative = [...allFeatures]
    .filter((f) => f.contribution < 0)
    .sort((a, b) => a.contribution - b.contribution)
    .slice(0, 3);

  return {
    intercept: parseFloat(LR_MODEL.intercept.toFixed(4)),
    logit: parseFloat(logit.toFixed(4)),
    probability,
    features: allFeatures,
    topPositive,
    topNegative,
  };
}

export function predictKNNFromModel(vector21D: number[]): number {
  const model = petconnectMobileModel as any;
  const zVec = vector21D.map((val, i) => (val - model.knn.scaler_mean[i]) / model.knn.scaler_scale[i]);
  const dists = model.knn.training_vectors.map((vec: number[], i: number) => {
    let s = 0;
    for (let d = 0; d < 21; d++) {
      const diff = zVec[d] - vec[d];
      s += diff * diff;
    }
    return { d: Math.sqrt(s), label: model.knn.training_labels[i] };
  });
  dists.sort((a: any, b: any) => a.d - b.d);
  const topK = dists.slice(0, model.knn.n_neighbors || 5);
  const prob = topK.reduce((acc: number, n: any) => acc + n.label, 0) / topK.length;
  return parseFloat(prob.toFixed(4));
}

export function evaluateModelOnVector(x: number[]) {
  const model = petconnectMobileModel as any;

  // 1. RF
  let rfSum = 0;
  for (const tree of model.random_forest.trees) {
    let node = 0;
    while (tree.children_left[node] !== -1) {
      const f = tree.feature[node];
      const th = tree.threshold[node];
      node = x[f] <= th ? tree.children_left[node] : tree.children_right[node];
    }
    const val = tree.value[node];
    rfSum += Array.isArray(val[0]) ? val[0][1] : (val as any)[1];
  }
  const randomForestProbability = parseFloat((rfSum / model.random_forest.trees.length).toFixed(4));

  // 2. LR
  let logit = model.logistic_regression.intercept[0];
  for (let i = 0; i < 21; i++) {
    const mean = model.logistic_regression.scaler_mean[i];
    const scale = model.logistic_regression.scaler_scale[i];
    const z = (x[i] - mean) / scale;
    logit += model.logistic_regression.coefficients[0][i] * z;
  }
  const logisticRegressionProbability = parseFloat((1 / (1 + Math.exp(-logit))).toFixed(4));

  // 3. KNN
  const knnProbability = predictKNNFromModel(x);

  // 4. Ensemble
  const ensembleScore = parseFloat((0.40 * knnProbability + 0.35 * randomForestProbability + 0.25 * logisticRegressionProbability).toFixed(4));

  return {
    randomForestProbability,
    logisticRegressionProbability,
    knnProbability,
    ensembleScore,
  };
}

/**
 * Multi-Algorithm Recommendation Service
 */
export const multiAlgorithmService = {
  /**
   * Run the complete Multi-Algorithm pipeline on live candidate pets
   */
  async findRecommendations(
    candidatePets: Pet[],
    questionnaire: AIMatchQuestionnaire,
    k: number = MULTI_ALGO_CONFIG.k
  ): Promise<AIMatchResult[]> {
    if (!candidatePets || !Array.isArray(candidatePets) || candidatePets.length === 0) {
      return [];
    }

    // ------------------------------------------------------------------------
    // Step 1: Filter Available Production Pets
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

    const currentAvailableFirestorePetIds = new Set<string>(availablePets.map((p) => p.id));

    // ------------------------------------------------------------------------
    // Step 2: Strict Species Eligibility Rule (Hard Constraint)
    // ------------------------------------------------------------------------
    const pref = normText(questionnaire.petPreference || 'any');
    const eligiblePets = availablePets.filter((p) => {
      if (pref === 'any') return true;

      const cat = normText(p.category);
      const isDog = cat.includes('dog');
      const isCat = cat.includes('cat');

      if (pref === 'dogs') return isDog;
      if (pref === 'cats') return isCat;
      if (pref === 'birds') return cat.includes('bird');
      if (pref === 'fish') return cat.includes('fish');
      if (pref === 'others') return !isDog && !isCat;
      return true;
    });

    if (eligiblePets.length === 0) {
      return [];
    }

    // Effective K: maximum eligible pets, at most 5
    const effectiveK = Math.min(Math.max(1, k), eligiblePets.length);

    // ------------------------------------------------------------------------
    // Step 3: Compute User 22D Adopter Vector (KNN)
    // ------------------------------------------------------------------------
    const userVector = buildAdopterVector(questionnaire);

    // ------------------------------------------------------------------------
    // Step 4: Evaluate Each Eligible Candidate across ALL THREE ALGORITHMS
    // ------------------------------------------------------------------------
    interface ScoredCandidate {
      pet: Pet;
      petVector: number[];
      pairwiseFeatures: number[];
      // KNN
      distance: number;
      knnSimilarity: number;
      knnContribution: number;
      // Random Forest
      rfProb: number;
      rfContribution: number;
      // Logistic Regression
      lrProb: number;
      lrContribution: number;
      // Ensemble
      ensembleScore: number;
      finalPercentage: number;
    }

    const scoredCandidates: ScoredCandidate[] = [];

    const wKNN = MULTI_ALGO_CONFIG.weights.knn;
    const wRF = MULTI_ALGO_CONFIG.weights.randomForest;
    const wLR = MULTI_ALGO_CONFIG.weights.logisticRegression;

    for (const pet of eligiblePets) {
      try {
        // Algorithm 1: KNN (22D vector space)
        const petVector = encodePetToVector(pet);
        const distance = calculateEuclideanDistance(userVector, petVector);
        // KNN similarity = 1 / (1 + distance) (no artificial clamp)
        const knnSimilarity = parseFloat((1.0 / (1.0 + Math.max(0, distance))).toFixed(4));
        const knnContribution = parseFloat((wKNN * knnSimilarity).toFixed(4));

        // Algorithm 2 & 3: 25D Pairwise Features -> RF + LR
        const pairwiseFeatures = extractPairwiseFeatures(questionnaire, pet);
        const rfProb = predictRandomForest(pairwiseFeatures);
        const rfContribution = parseFloat((wRF * rfProb).toFixed(4));

        const lrProb = predictLogisticRegression(pairwiseFeatures);
        const lrContribution = parseFloat((wLR * lrProb).toFixed(4));

        // Ensemble Formula
        const ensembleScore = parseFloat((knnContribution + rfContribution + lrContribution).toFixed(4));
        const finalPercentage = Math.round(ensembleScore * 100);

        scoredCandidates.push({
          pet,
          petVector,
          pairwiseFeatures,
          distance: parseFloat(distance.toFixed(4)),
          knnSimilarity,
          knnContribution,
          rfProb,
          rfContribution,
          lrProb,
          lrContribution,
          ensembleScore,
          finalPercentage,
        });
      } catch (err) {
        console.warn(`[MultiAlgo] Error scoring pet ${pet.id}:`, err);
      }
    }

    if (scoredCandidates.length === 0) {
      return [];
    }

    // ------------------------------------------------------------------------
    // Step 5: Rank Candidates Descending by ensembleScore
    // ------------------------------------------------------------------------
    scoredCandidates.sort((a, b) => b.ensembleScore - a.ensembleScore);

    // Top-K selection
    const topCandidates = scoredCandidates.slice(0, effectiveK);

    // ------------------------------------------------------------------------
    // Step 6: Construct AIMatchResult with Full Multi-Algorithm Metadata
    // ------------------------------------------------------------------------
    const results: AIMatchResult[] = topCandidates.map((cand, index) => {
      const breakdown = buildScoreBreakdownFromVectors(
        userVector,
        cand.petVector,
        cand.pet,
        questionnaire
      );

      const { explanation, consideration } = generateAIExplanation(
        cand.pet,
        questionnaire,
        cand.finalPercentage,
        breakdown
      );

      return {
        pet: cand.pet,
        score: cand.finalPercentage,
        scoreBreakdown: breakdown,
        aiExplanation: explanation,
        aiConsideration: consideration,
        // KNN Metadata
        distance: cand.distance,
        similarity: cand.knnSimilarity,
        vectorCoordinates: cand.petVector,
        userVectorCoordinates: userVector,
        neighborRank: index + 1,
        kValue: effectiveK,
        featureNames: [...KNN_FEATURE_NAMES],
        metricWeights: new Array(KNN_CONFIG.vectorDimension).fill(1.0),
        normalizationScaleDistance: 1.0,

        // Multi-Algorithm Breakdown Metadata
        knn: {
          distance: cand.distance,
          similarity: cand.knnSimilarity,
          contribution: cand.knnContribution,
        },
        randomForest: {
          probability: cand.rfProb,
          contribution: cand.rfContribution,
        },
        logisticRegression: {
          probability: cand.lrProb,
          contribution: cand.lrContribution,
        },
        ensemble: {
          score: cand.ensembleScore,
          percentage: cand.finalPercentage,
        },
        pairwiseFeatures: cand.pairwiseFeatures,
      };
    });

    // Invariant: strict subset of current available Firestore pets
    return results.filter((r) => currentAvailableFirestorePetIds.has(r.pet.id));
  },

  /**
   * Helper for viva / inspection of a single pet match
   */
  inspectMatch(pet: Pet, questionnaire: AIMatchQuestionnaire) {
    const userVector = buildAdopterVector(questionnaire);
    const petVector = encodePetToVector(pet);
    const distance = calculateEuclideanDistance(userVector, petVector);
    const knnSimilarity = parseFloat((1.0 / (1.0 + Math.max(0, distance))).toFixed(4));

    const pairwiseFeatures = extractPairwiseFeatures(questionnaire, pet);
    const rfProb = predictRandomForest(pairwiseFeatures);
    const lrProb = predictLogisticRegression(pairwiseFeatures);

    const knnCont = parseFloat((MULTI_ALGO_CONFIG.weights.knn * knnSimilarity).toFixed(4));
    const rfCont = parseFloat((MULTI_ALGO_CONFIG.weights.randomForest * rfProb).toFixed(4));
    const lrCont = parseFloat((MULTI_ALGO_CONFIG.weights.logisticRegression * lrProb).toFixed(4));

    const ensembleScore = parseFloat((knnCont + rfCont + lrCont).toFixed(4));
    const finalPercentage = Math.round(ensembleScore * 100);

    return {
      knn: {
        distance: parseFloat(distance.toFixed(4)),
        similarity: knnSimilarity,
        contribution: knnCont,
      },
      randomForest: {
        probability: rfProb,
        contribution: rfCont,
      },
      logisticRegression: {
        probability: lrProb,
        contribution: lrCont,
      },
      ensemble: {
        score: ensembleScore,
        percentage: finalPercentage,
      },
      pairwiseFeatures,
      userVector,
      petVector,
    };
  },
};
