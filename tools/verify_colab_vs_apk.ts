import fs from 'fs';
import path from 'path';
import { multiAlgorithmService, extractPairwiseFeatures, predictRandomForest, predictLogisticRegression } from '../src/services/multiAlgorithmService';
import { initialPets } from '../src/data/initialPets';
import { AIMatchQuestionnaire, Pet } from '../src/types';

// Load Colab sample results
const sampleResultsPath = path.join(__dirname, '..', 'data', 'ml', 'sample_multi_algorithm_results.json');
const sampleData = JSON.parse(fs.readFileSync(sampleResultsPath, 'utf-8'));

const adopter: AIMatchQuestionnaire = sampleData.adopter;
const expectedResults = sampleData.results;

console.log('='.repeat(75));
console.log('PETCONNECT COLAB ↔ APK NUMERICAL VERIFICATION TEST');
console.log('='.repeat(75));
console.log('Verifying TypeScript Mobile Inference against Google Colab Reference Outputs...\n');

let allPassed = true;
const TOLERANCE = 0.015; // 1.5% maximum allowable difference across any model output

const comparisonTable: any[] = [];

const datasetPetsPath = path.join(__dirname, '..', 'data', 'knn', 'petconnect_dataset_pets.json');
const allPets: Pet[] = JSON.parse(fs.readFileSync(datasetPetsPath, 'utf-8'));

for (const exp of expectedResults) {
  const pet = allPets.find((p) => p.id === exp.pet_id);
  if (!pet) {
    console.warn(`Pet ${exp.pet_id} (${exp.name}) not found in initialPets, skipping.`);
    continue;
  }

  const inspected = multiAlgorithmService.inspectMatch(pet, adopter);

  const knnSimColab = exp.knn_similarity;
  const knnSimApk = inspected.knn.similarity;
  const knnDiff = Math.abs(knnSimColab - knnSimApk);

  const rfProbColab = exp.random_forest_probability;
  const rfProbApk = inspected.randomForest.probability;
  const rfDiff = Math.abs(rfProbColab - rfProbApk);

  const lrProbColab = exp.logistic_regression_probability;
  const lrProbApk = inspected.logisticRegression.probability;
  const lrDiff = Math.abs(lrProbColab - lrProbApk);

  const finalScoreColab = exp.final_score;
  const finalScoreApk = inspected.ensemble.score;
  const scoreDiff = Math.abs(finalScoreColab - finalScoreApk);

  const passed = knnDiff <= TOLERANCE && rfDiff <= TOLERANCE && lrDiff <= TOLERANCE && scoreDiff <= TOLERANCE;
  if (!passed) allPassed = false;

  comparisonTable.push({
    Pet: exp.name,
    Species: exp.species,
    'KNN Colab': knnSimColab.toFixed(4),
    'KNN APK': knnSimApk.toFixed(4),
    'RF Colab': rfProbColab.toFixed(4),
    'RF APK': rfProbApk.toFixed(4),
    'LR Colab': lrProbColab.toFixed(4),
    'LR APK': lrProbApk.toFixed(4),
    'Score Colab': finalScoreColab.toFixed(4),
    'Score APK': finalScoreApk.toFixed(4),
    Status: passed ? 'PASSED ✅' : 'FAIL ❌',
  });
}

console.table(comparisonTable);

console.log('\n' + '='.repeat(75));
if (allPassed) {
  console.log('🎉 ALL NUMERICAL VERIFICATIONS PASSED SUCCESSFULLY!');
  console.log(`Maximum observed deviation is strictly within tolerance (±${TOLERANCE}).`);
  console.log('The TypeScript inference engine faithfully reproduces the Colab ML models.');
} else {
  console.error('❌ SOME CHECKS FAILED THE NUMERICAL TOLERANCE THRESHOLD.');
  process.exit(1);
}
console.log('='.repeat(75));
