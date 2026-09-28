# PetConnect Training Dataset Mapping Report

This report documents the preparation of the training dataset extracted directly from the real PetConnect production database (Cloud Firestore & initial seed records) for the academic AIML recommendation pipeline.

---

## 1. Actual Source of the Pet Data

The records were extracted directly from the live **Cloud Firestore `pets` collection** (`petconnect-6e1f6`), which synchronizes with the PetConnect mobile application:
- **Seed Shelter Pets**: Pre-loaded shelter catalog pets defined in `src/data/initialPets.ts` and auto-seeded into Firestore (`bella-1`, `milo-2`, `oliver-3`).
- **User-Created Listings**: Real pets uploaded via the app's `AddPetScreen` (`src/app/(tabs)/add-pet.tsx`) stored with generated unique IDs (`pet-<timestamp>-<hash>`).

**Total Records Found**: **9 pet records**.
**Status Filter**: All 9 records have `status: "available"`. No pets are marked `"adopted"` or `"pending"`, so all 9 are valid, eligible recommendation candidates.

---

## 2. Dataset Dimensions

- **File Path**: `data/petconnect_training_dataset.csv`
- **Total Records (Rows)**: **9** (plus 1 header row)
- **Total Columns**: **27**

---

## 3. Dataset Columns & Source Mapping

| Column Name | Data Type | Source Field in Database | Questionnaire Dimension Supported | Notes on Missing Values & Inference |
|:---|:---:|:---|:---|:---|
| `pet_id` | String | `pet.id` | Identifier | 100% populated. Primary key. |
| `name` | String | `pet.name` | Display / Verification | 100% populated. |
| `species` | Categorical | `pet.category` | Step 1 (`petPreference`) | 100% populated ('dogs', 'cats', 'rabbits', 'birds', 'others'). |
| `breed` | String | `pet.breed` | Contextual attribute | 100% populated. |
| `age_raw` | String | `pet.age` | Step 8 (`preferredAge`) | 100% populated as human text (e.g., '2 years', '6 months'). |
| `age_months` | Integer | Parsed from `pet.age` | Step 8 (`preferredAge`) | Standardized numeric life stage in months. 100% parsed. |
| `gender` | Categorical | `pet.gender` | General profile filter | 100% populated ('male', 'female'). |
| `size` | Categorical | *Inferred from breed/category* | Step 9 (`preferredSize`) | **Not an explicit database column.** Derived at runtime via `inferPetSize(pet)` based on breed classification. |
| `activity_level` | Categorical | *Inferred from text/tags* | Step 6 (`activityLevel`) | **Not an explicit database column.** Derived at runtime via `inferPetActivityLevel(pet)` scanning keywords in description, tags, and requirements. |
| `location` | String | `pet.location` | Step 3 (`location`) | 100% populated (e.g. 'San Francisco, CA', 'Mumbai, Maharashtra', 'Kurla'). |
| `status` | Categorical | `pet.status` | Pre-filtering | 100% populated ('available'). |
| `adoption_fee` | Numeric | `pet.adoptionFee` | Filter / Metadata | Populated for user listings (e.g. 0, 2000, 5000, 6090, 23000, 89000). **Missing (blank)** for the 3 original seed shelter pets (`bella-1`, `milo-2`, `oliver-3`). |
| `vaccinated` | Binary (0/1) | `pet.health.vaccinated` | Health compatibility | Populated (1/0) for 6 user listings. **Missing (blank)** for seed pets without a nested health object. |
| `dewormed` | Binary (0/1) | `pet.health.dewormed` | Health compatibility | Populated (1/0) for 6 user listings. **Missing (blank)** for seed pets. |
| `spayed_neutered` | Binary (0/1) | `pet.health.spayedNeutered`| Health compatibility | Populated (1/0) for 6 user listings. **Missing (blank)** for seed pets. |
| `tags` | Text List | `pet.tags` | Heuristic trait extraction | Array of strings separated by semicolons. 100% populated. |
| `adoption_requirements` | Text List | `pet.adoptionRequirements` | Living space & experience | Array of strings separated by semicolons. Populated where shelter caregivers specified conditions (blank for 5 pets). |
| `trait_friendly` | Binary (0/1) | Extracted text keyword | Step 10 (`Friendly`) & Step 4 (`family`) | 1 if 'friendly', 'sweet', or 'affectionate' appears in tags/description/requirements; else 0. |
| `trait_calm` | Binary (0/1) | Extracted text keyword | Step 10 (`Calm`) & Step 4 (`seniors`) | 1 if 'calm', 'quiet', or 'gentle' appears; else 0. |
| `trait_playful` | Binary (0/1) | Extracted text keyword | Step 10 (`Playful`) | 1 if 'playful', 'curious', or 'fetch' appears; else 0. |
| `trait_active` | Binary (0/1) | Extracted text keyword | Step 6 (`activityLevel = high`) | 1 if 'active', 'athletic', or 'energetic' appears; else 0. |
| `trait_kid_friendly` | Binary (0/1) | Extracted text keyword | Step 10 (`Good with children`) & Step 4 (`family_children`) | 1 if 'kid', 'children', or 'family' appears; else 0. |
| `trait_pet_friendly` | Binary (0/1) | Extracted text keyword | Step 10 (`Good with other pets`) | 1 if 'other pets', 'social', 'dogs', or 'cats' appears; else 0. |
| `trait_house_trained` | Binary (0/1) | Extracted text keyword | Step 10 (`House-trained`) | 1 if 'house-trained', 'litter-trained', or 'trained' appears; else 0. |
| `trait_apartment_friendly` | Binary (0/1) | Extracted text keyword | Step 2 (`livingSituation`) & Step 10 (`Apartment friendly`) | 1 if 'apartment' appears or if small size & non-high energy; else 0. |
| `trait_special_needs` | Binary (0/1) | Extracted text keyword | Step 10 (`Special-needs friendly`)| 1 if 'special' or health notes exist; else 0. |
| `description` | Text | `pet.description` | Text feature mining / NLP | 100% populated. Freeform caregiver notes. |

---

## 4. Missing & Unavailable Features in the Real Database

In accordance with strict academic integrity standards:

1. **Size (`size`)**:
   - **Status in Database**: **UNAVAILABLE AS A DIRECT STORED FIELD**.
   - **Handling**: There is no `pet.size` column in Firestore or the `AddPet` screen. The PetConnect mobile app dynamically infers size based on the pet's species and known breed traits (`inferPetSize`). In the dataset, `size` reflects this explicit heuristic mapping rather than fabricated data.
2. **Activity Level (`activity_level`)**:
   - **Status in Database**: **UNAVAILABLE AS A DIRECT STORED FIELD**.
   - **Handling**: The pet upload form does not have an activity slider. The mobile app scans caregiver text descriptions and tags for keywords ('energetic', 'calm', etc.) via `inferPetActivityLevel`. In the dataset, `activity_level` represents this extracted property.
3. **Health Details (`vaccinated`, `dewormed`, `spayed_neutered`)**:
   - **Status in Database**: **PARTIALLY POPULATED**.
   - The 3 initial seed pets (`bella-1`, `milo-2`, `oliver-3`) did not store a structured `health` object (their vaccination status was written in unstructured prose in `description`). The 6 newer user-created pets have explicit boolean flags. No values were fabricated for the seed pets; they remain unpopulated/blank.
4. **Adoption Requirements**:
   - **Status in Database**: Populated for 4 pets who had specific caregiver requirements selected ('Yard Required', 'Active Home', etc.); blank for the remaining 5.

---

## 5. Questionnaire Feature Support Mapping

| Questionnaire Step & Dimension | Dataset Column(s) Supporting It | Derivation / Mapping Logic |
|:---|:---|:---|
| **Step 1: Pet Preference** | `species` | Exact match on category ('dogs', 'cats', 'others'). |
| **Step 2: Living Situation** | `trait_apartment_friendly`, `adoption_requirements` | Flags apartment compatibility or yard requirements. |
| **Step 3: Location** | `location` | Geographic distance and city matching. |
| **Step 4: Household Composition** | `trait_kid_friendly`, `trait_calm`, `trait_friendly` | Maps to gentle, calm, or child-safe pet traits. |
| **Step 5: Pet Experience** | `adoption_requirements`, `breed` | Checks if 'Experienced Owner' is required. |
| **Step 6: Activity Level** | `activity_level`, `trait_active` | Compares low, moderate, and high energy. |
| **Step 7: Daily Time** | `activity_level`, `age_months` | Correlates with pet exercise and puppy care needs. |
| **Step 8: Preferred Age** | `age_months`, `age_raw` | Numeric life stage distance. |
| **Step 9: Preferred Size** | `size`, `breed` | Small, Medium, Large ordinal distance. |
| **Step 10: Special Preferences** | `trait_friendly`, `trait_calm`, `trait_playful`, `trait_active`, `trait_kid_friendly`, `trait_pet_friendly`, `trait_house_trained`, `trait_apartment_friendly`, `trait_special_needs` | Multi-hot binary trait vector indices. |

---

## 6. Suitability for Google Colab Step

- **Suitability**: **YES — SUITABLE FOR PROTOTYPING & DISTANCE-BASED KNN TRAINING**.
- **Sample Size Consideration**: The current database contains **9 real, authentic records** covering all 5 supported pet categories (`dogs`, `cats`, `rabbits`, `birds`, `others`), varying age groups (1 month to 2 years), and diverse locations.
- **For Google Colab**:
  - The dataset provides the exact ground-truth schema needed to write the Python preprocessing pipeline, encode feature vectors in $\mathbb{R}^{18}$ via `scikit-learn` or NumPy, and verify that the Colab KNN model produces outputs consistent with PetConnect's recommendation engine.

