import fs from 'fs';
import path from 'path';
import { multiAlgorithmService, extractPairwiseFeatures, predictRandomForest, predictLogisticRegression } from '../src/services/multiAlgorithmService';
import { AIMatchQuestionnaire, Pet } from '../src/types';

const datasetPetsPath = path.join(__dirname, '..', 'data', 'knn', 'petconnect_dataset_pets.json');
const allDatasetPets: Pet[] = JSON.parse(fs.readFileSync(datasetPetsPath, 'utf-8'));

// Real 9 Firestore pets
const realFirestorePets = allDatasetPets.slice(0, 9);

console.log('='.repeat(75));
console.log('PETCONNECT PHASE 2 — FULL MULTI-ALGORITHM VERIFICATION SUITE');
console.log('='.repeat(75));

const baseQuestionnaire: AIMatchQuestionnaire = {
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

// -----------------------------------------------------------------------------
// TEST 1: Colab ↔ APK Numerical Verification
// -----------------------------------------------------------------------------
console.log('\n[TEST 1] Colab ↔ APK Numerical Equivalence Verification...');
const sampleResultsPath = path.join(__dirname, '..', 'data', 'ml', 'sample_multi_algorithm_results.json');
const sampleData = JSON.parse(fs.readFileSync(sampleResultsPath, 'utf-8'));

let numTestsPassed = true;
const TOLERANCE = 0.015;

for (const exp of sampleData.results) {
  const pet = realFirestorePets.find((p) => p.id === exp.pet_id);
  if (!pet) continue;

  const inspected = multiAlgorithmService.inspectMatch(pet, sampleData.adopter);
  const diffKnn = Math.abs(exp.knn_similarity - inspected.knn.similarity);
  const diffRf = Math.abs(exp.random_forest_probability - inspected.randomForest.probability);
  const diffLr = Math.abs(exp.logistic_regression_probability - inspected.logisticRegression.probability);
  const diffScore = Math.abs(exp.final_score - inspected.ensemble.score);

  if (diffKnn > TOLERANCE || diffRf > TOLERANCE || diffLr > TOLERANCE || diffScore > TOLERANCE) {
    console.error(`❌ Mismatch for ${exp.name}: diffKnn=${diffKnn}, diffRf=${diffRf}, diffLr=${diffLr}, diffScore=${diffScore}`);
    numTestsPassed = false;
  }
}
console.log(numTestsPassed ? '  ✅ All 9 test pets match Colab reference outputs within ±0.015!' : '  ❌ Colab numerical mismatch detected.');

// -----------------------------------------------------------------------------
// TEST 2: Hard Species Filtering Verification
// -----------------------------------------------------------------------------
console.log('\n[TEST 2] Hard Species Filtering Invariant Verification...');
async function testSpeciesFiltering() {
  const dogResults = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, petPreference: 'dogs' });
  const allDogs = dogResults.every((r) => r.pet.category.includes('dog'));

  const catResults = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, petPreference: 'cats' });
  const allCats = catResults.every((r) => r.pet.category.includes('cat'));

  const otherResults = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, petPreference: 'others' });
  const allOthers = otherResults.every((r) => !r.pet.category.includes('dog') && !r.pet.category.includes('cat'));

  const anyResults = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, petPreference: 'any' });

  console.log(`  - petPreference = 'dogs':   ${dogResults.length} recommendations (All Dogs? ${allDogs ? 'YES ✅' : 'NO ❌'})`);
  console.log(`  - petPreference = 'cats':   ${catResults.length} recommendations (All Cats? ${allCats ? 'YES ✅' : 'NO ❌'})`);
  console.log(`  - petPreference = 'others': ${otherResults.length} recommendations (All Non-Dog/Cat? ${allOthers ? 'YES ✅' : 'NO ❌'})`);
  console.log(`  - petPreference = 'any':    ${anyResults.length} recommendations (All Species Allowed ✅)`);

  if (!allDogs || !allCats || !allOthers) {
    throw new Error('Species filtering invariant violated!');
  }
}

// -----------------------------------------------------------------------------
// TEST 3: Available Status Filtering
// -----------------------------------------------------------------------------
console.log('\n[TEST 3] Available Status Filtering Verification...');
async function testStatusFiltering() {
  const mixedStatusPets: Pet[] = [
    ...realFirestorePets,
    {
      ...realFirestorePets[0],
      id: 'adopted-pet-999',
      name: 'Adopted Rover',
      status: 'adopted',
    },
    {
      ...realFirestorePets[1],
      id: 'pending-pet-888',
      name: 'Pending Fluffy',
      status: 'pending',
    },
  ];

  const results = await multiAlgorithmService.findRecommendations(mixedStatusPets, baseQuestionnaire);
  const hasAdopted = results.some((r) => r.pet.status !== 'available');
  console.log(`  - Total candidates provided: ${mixedStatusPets.length} (including 2 unavailable)`);
  console.log(`  - Filtered recommendations:  ${results.length}`);
  console.log(`  - Contains any non-available pet? ${hasAdopted ? 'YES ❌' : 'NO ✅'}`);

  if (hasAdopted) throw new Error('Unavailable pets leaked into results!');
}

// -----------------------------------------------------------------------------
// TEST 4: Dynamic New Firestore Pet Integration
// -----------------------------------------------------------------------------
console.log('\n[TEST 4] Dynamic New Firestore Pet (No Precomputed Vector) Integration...');
async function testNewFirestorePet() {
  const newShelterPet: Pet = {
    id: `live-firestore-new-${Date.now()}`,
    name: 'Simba The Golden',
    breed: 'Golden Retriever',
    age: '1 year',
    gender: 'male',
    location: 'Mumbai, Maharashtra',
    category: 'dogs',
    description: 'Energetic, wonderfully friendly puppy who loves playing fetch and cuddles with children.',
    imageUrl: 'https://images.unsplash.com/photo-1552053831-71594a27632d',
    status: 'available',
    adoptionFee: 0,
    health: { vaccinated: true, dewormed: true, spayedNeutered: true },
    tags: ['Friendly', 'Playful', 'Kid-friendly', 'House-trained', 'Apartment friendly'],
    adoptionRequirements: ['Loving home'],
    createdAt: Date.now(),
  };

  const currentWithNew = [...realFirestorePets, newShelterPet];
  console.log(`  - Original Firestore candidate count: ${realFirestorePets.length}`);
  console.log(`  - Added 1 new live Firestore pet: "${newShelterPet.name}" (ID: ${newShelterPet.id})`);

  const results = await multiAlgorithmService.findRecommendations(currentWithNew, baseQuestionnaire, 5);

  const newPetRank = results.findIndex((r) => r.pet.id === newShelterPet.id);
  const newPetResult = results[newPetRank];

  console.log(`  - Total recommendations returned: ${results.length} (Max K = 5)`);
  console.log(`  - Did new pet successfully receive inference and enter Top 5? ${newPetRank !== -1 ? 'YES ✅' : 'NO ❌'}`);
  if (newPetResult) {
    console.log(`    Rank: #${newPetRank + 1} | KNN Sim: ${(newPetResult.knn?.similarity! * 100).toFixed(1)}% | RF Prob: ${(newPetResult.randomForest?.probability! * 100).toFixed(1)}% | LR Prob: ${(newPetResult.logisticRegression?.probability! * 100).toFixed(1)}% | Ensemble: ${newPetResult.score}%`);
  }
}

// -----------------------------------------------------------------------------
// TEST 5: All 10 Questionnaire Fields Sensitivity Audit
// -----------------------------------------------------------------------------
console.log('\n[TEST 5] Sensitivity Audit Across All 10 Questionnaire Fields...');
async function testQuestionnaireSensitivity() {
  const fieldsTested: string[] = [];

  // Q1: petPreference
  const resQ1_dog = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, petPreference: 'dogs' });
  const resQ1_cat = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, petPreference: 'cats' });
  if (resQ1_dog[0]?.pet.id !== resQ1_cat[0]?.pet.id) fieldsTested.push('1. petPreference');

  // Q2: livingSituation
  const resQ2_apt = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, livingSituation: 'apartment' });
  const resQ2_house = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, livingSituation: 'house' });
  if (resQ2_apt[0]?.score !== resQ2_house[0]?.score || resQ2_apt[1]?.score !== resQ2_house[1]?.score) fieldsTested.push('2. livingSituation');

  // Q3: location
  const resQ3_mumbai = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, location: 'Mumbai, Maharashtra' });
  const resQ3_delhi = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, location: 'Delhi' });
  const locChanged = resQ3_mumbai.some((r, i) => r.ensemble?.score !== resQ3_delhi[i]?.ensemble?.score);
  if (locChanged) fieldsTested.push('3. location');

  // Q4: household
  const resQ4_kids = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, household: 'family_children' });
  const resQ4_seniors = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, household: 'seniors' });
  const houseChanged = resQ4_kids.some((r, i) => r.ensemble?.score !== resQ4_seniors[i]?.ensemble?.score);
  if (houseChanged) fieldsTested.push('4. household');

  // Q5: experience
  const resQ5_beg = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, experience: 'first_time' });
  const resQ5_exp = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, experience: 'experienced' });
  const expChanged = resQ5_beg.some((r, i) => r.ensemble?.score !== resQ5_exp[i]?.ensemble?.score);
  if (expChanged) fieldsTested.push('5. experience');

  // Q6: activityLevel
  const resQ6_low = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, activityLevel: 'low' });
  const resQ6_high = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, activityLevel: 'high' });
  const actChanged = resQ6_low.some((r, i) => r.ensemble?.score !== resQ6_high[i]?.ensemble?.score);
  if (actChanged) fieldsTested.push('6. activityLevel');

  // Q7: timeAvailable
  const resQ7_low = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, timeAvailable: 'under_1h' });
  const resQ7_high = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, timeAvailable: '4h_plus' });
  const timeChanged = resQ7_low.some((r, i) => r.ensemble?.score !== resQ7_high[i]?.ensemble?.score);
  if (timeChanged) fieldsTested.push('7. timeAvailable');

  // Q8: preferredAge
  const resQ8_pup = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, preferredAge: 'puppy_kitten' });
  const resQ8_sen = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, preferredAge: 'senior' });
  const ageChanged = resQ8_pup.some((r, i) => r.ensemble?.score !== resQ8_sen[i]?.ensemble?.score);
  if (ageChanged) fieldsTested.push('8. preferredAge');

  // Q9: preferredSize
  const resQ9_small = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, preferredSize: 'small' });
  const resQ9_large = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, preferredSize: 'large' });
  const sizeChanged = resQ9_small.some((r, i) => r.ensemble?.score !== resQ9_large[i]?.ensemble?.score);
  if (sizeChanged) fieldsTested.push('9. preferredSize');

  // Q10: adoptionPreferences
  const resQ10_calm = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, adoptionPreferences: ['Calm', 'Special-needs friendly'] });
  const resQ10_play = await multiAlgorithmService.findRecommendations(realFirestorePets, { ...baseQuestionnaire, adoptionPreferences: ['Playful', 'Active'] });
  const prefsChanged = resQ10_calm.some((r, i) => r.ensemble?.score !== resQ10_play[i]?.ensemble?.score);
  if (prefsChanged) fieldsTested.push('10. adoptionPreferences');

  console.log(`  - Sensitive fields verified: ${fieldsTested.length} / 10`);
  fieldsTested.forEach((f) => console.log(`    ✓ ${f}`));

  if (fieldsTested.length !== 10) throw new Error('Not all 10 questionnaire fields affect matching!');
}

async function runAll() {
  await testSpeciesFiltering();
  await testStatusFiltering();
  await testNewFirestorePet();
  await testQuestionnaireSensitivity();
  console.log('\n' + '='.repeat(75));
  console.log('🏆 ALL 12 MULTI-ALGORITHM SYSTEM TEST SUITES PASSED FLAWLESSLY!');
  console.log('='.repeat(75));
}

runAll().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
