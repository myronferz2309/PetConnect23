"""
PetConnect Multi-Algorithm Machine Learning Pipeline
Algorithms:
1. K-Nearest Neighbors (KNN) - Instance-based recommendation in 22D space
2. Random Forest Classifier - Non-linear ensemble supervised binary classification
3. Logistic Regression - Linear calibrated probability binary classification

Academic Note:
The compatibility labels are synthetic labels generated from defined adopter-pet compatibility
rules because historical adopter-pet outcome labels are not available.
"""

import os
import json
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any

from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import GroupKFold, StratifiedGroupKFold
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)
import joblib

# ==============================================================================
# 1. REPRODUCIBILITY & CONFIGURATION
# ==============================================================================
RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data", "ml")
os.makedirs(OUTPUT_DIR, exist_ok=True)

CSV_PATH = os.path.join(os.path.dirname(__file__), "data", "PetConnect_AIML_Dataset_49_Pets.csv")
if not os.path.exists(CSV_PATH):
    # Fallback to local file if run directly in Colab
    CSV_PATH = "PetConnect_AIML_Dataset_49_Pets.csv"

# ==============================================================================
# 2. DATASET INGESTION & AUDIT
# ==============================================================================
print("=" * 70)
print("PETCONNECT MULTI-ALGORITHM ML PIPELINE ENGINE")
print("=" * 70)

df_pets = pd.read_csv(CSV_PATH)
total_pets = len(df_pets)
real_pets = len(df_pets[df_pets['is_synthetic'] == False])
synthetic_pets = len(df_pets[df_pets['is_synthetic'] == True])

print(f"Loaded {total_pets} pets from {CSV_PATH}")
print(f"  - Real PetConnect Records: {real_pets}")
print(f"  - Synthetic Records:      {synthetic_pets}")

# ==============================================================================
# 3. FEATURE SCHEMA DEFINITIONS
# ==============================================================================
FEATURE_NAMES_25D = [
    "species_match",
    "age_preference_match",
    "size_preference_match",
    "activity_alignment",
    "time_energy_compatibility",
    "living_space_compatibility",
    "household_kid_compatibility",
    "household_senior_compatibility",
    "experience_competence_fit",
    "trait_preference_overlap",
    "location_proximity_score",
    "pet_age_normalized",
    "pet_size_ordinal",
    "pet_activity_ordinal",
    "adopter_activity_ordinal",
    "adopter_time_ordinal",
    "pet_trait_friendly",
    "pet_trait_calm",
    "pet_trait_playful",
    "pet_trait_active",
    "pet_trait_kid_friendly",
    "pet_trait_pet_friendly",
    "pet_trait_house_trained",
    "pet_trait_apartment_friendly",
    "pet_trait_special_needs"
]

SPECIES_MAP = {"dogs": 0, "cats": 1, "birds": 2, "rabbits": 3, "others": 4}
SIZE_ORDINAL = {"small": 1, "medium": 2, "large": 3}
ACTIVITY_ORDINAL = {"low": 1, "moderate": 2, "high": 3}
TIME_ORDINAL = {"under_1h": 1, "1_to_2h": 2, "2_to_3h": 3, "3h_plus": 4}
EXPERIENCE_ORDINAL = {"first_time": 1, "some_experience": 2, "experienced": 3}

# ==============================================================================
# 4. ADOPTER SYNTHESIS & PAIRWISE COMPATIBILITY GENERATOR
# ==============================================================================
# Academic Statement:
# "The compatibility labels are synthetic labels generated from defined adopter-pet compatibility
# rules because historical adopter-pet outcome labels are not available."

def parse_traits(traits_val) -> List[str]:
    if pd.isna(traits_val) or not traits_val:
        return []
    if isinstance(traits_val, list):
        return traits_val
    try:
        parsed = json.loads(traits_val)
        if isinstance(parsed, list):
            return parsed
    except Exception:
        pass
    return [t.strip().strip("'\"[]") for t in str(traits_val).split(",") if t.strip()]

def simulate_adopters_for_dataset(df: pd.DataFrame, num_profiles_per_pet: int = 30) -> pd.DataFrame:
    records = []
    adopter_id_counter = 1
    
    pet_species_list = ["dogs", "cats", "birds", "rabbits", "others"]
    housing_list = ["apartment", "house_no_yard", "house_yard"]
    household_list = ["alone", "couple", "family", "family_children", "seniors"]
    experience_list = ["first_time", "some_experience", "experienced"]
    activity_list = ["low", "moderate", "high"]
    time_list = ["under_1h", "1_to_2h", "2_to_3h", "3h_plus"]
    age_pref_list = ["any", "puppy_kitten", "young", "adult", "senior"]
    size_pref_list = ["any", "small", "medium", "large"]
    
    all_possible_traits = [
        "Friendly", "Playful", "Calm", "Active", "Kid-friendly",
        "Pet-friendly", "House-trained", "Apartment-friendly", "Special Needs"
    ]
    
    rng = np.random.RandomState(RANDOM_SEED)
    
    for _, pet in df.iterrows():
        pet_id = pet['pet_id']
        p_species = str(pet['species']).lower().strip()
        p_age = float(pet['age']) if not pd.isna(pet['age']) else 2.0
        p_size = str(pet['size']).lower().strip()
        p_activity = str(pet['activity_level']).lower().strip()
        p_location = str(pet['location']).strip()
        p_traits = [t.lower() for t in parse_traits(pet['traits'])]
        
        for _ in range(num_profiles_per_pet):
            # 50% chance matched species, 50% random species
            adopter_species = p_species if rng.rand() < 0.50 else rng.choice(pet_species_list)
            adopter_housing = rng.choice(housing_list)
            adopter_household = rng.choice(household_list)
            adopter_exp = rng.choice(experience_list)
            adopter_act = rng.choice(activity_list)
            adopter_time = rng.choice(time_list)
            adopter_age_pref = rng.choice(age_pref_list)
            adopter_size_pref = rng.choice(size_pref_list)
            
            # Adopter preferred traits (1 to 4 random traits)
            k_traits = rng.randint(1, 5)
            adopter_traits = list(rng.choice(all_possible_traits, size=k_traits, replace=False))
            
            # Proximity: 40% same location, 60% different
            adopter_location = p_location if rng.rand() < 0.40 else "Pune, Maharashtra"
            
            # --- COMPUTE 25D PAIRWISE FEATURES ---
            f_species_match = 1.0 if adopter_species == p_species else 0.0
            
            # Age preference match
            if adopter_age_pref == "any":
                f_age_match = 1.0
            elif adopter_age_pref == "puppy_kitten" and p_age < 1.0:
                f_age_match = 1.0
            elif adopter_age_pref == "young" and 1.0 <= p_age <= 3.0:
                f_age_match = 1.0
            elif adopter_age_pref == "adult" and 3.0 < p_age <= 7.0:
                f_age_match = 1.0
            elif adopter_age_pref == "senior" and p_age > 7.0:
                f_age_match = 1.0
            else:
                f_age_match = 0.0
                
            # Size preference match
            f_size_match = 1.0 if adopter_size_pref == "any" or adopter_size_pref == p_size else 0.0
            
            # Activity alignment
            pet_act_val = ACTIVITY_ORDINAL.get(p_activity, 2)
            adopter_act_val = ACTIVITY_ORDINAL.get(adopter_act, 2)
            act_diff = abs(pet_act_val - adopter_act_val)
            f_activity_align = 1.0 if act_diff == 0 else (0.5 if act_diff == 1 else 0.0)
            
            # Time energy compatibility
            adopter_time_val = TIME_ORDINAL.get(adopter_time, 2)
            if pet_act_val == 3 and adopter_time_val < 2:
                f_time_energy = 0.2
            elif pet_act_val == 1 and adopter_time_val >= 1:
                f_time_energy = 1.0
            else:
                f_time_energy = min(1.0, adopter_time_val / max(1, pet_act_val))
                
            # Living space compatibility
            pet_size_val = SIZE_ORDINAL.get(p_size, 2)
            if adopter_housing == "apartment":
                if "apartment-friendly" in p_traits:
                    f_living_space = 1.0
                elif pet_size_val == 3:
                    f_living_space = 0.2
                elif pet_size_val == 2:
                    f_living_space = 0.6
                else:
                    f_living_space = 0.9
            else:
                f_living_space = 1.0
                
            # Household kid compatibility
            has_kids = adopter_household == "family_children"
            f_household_kids = 1.0 if not has_kids else (1.0 if "kid-friendly" in p_traits else 0.1)
            
            # Household senior compatibility
            is_senior = adopter_household == "seniors"
            f_household_seniors = 1.0 if not is_senior else (1.0 if "calm" in p_traits and pet_act_val <= 2 else 0.3)
            
            # Experience competence fit
            exp_val = EXPERIENCE_ORDINAL.get(adopter_exp, 2)
            has_special_needs = "special needs" in p_traits
            if exp_val == 1 and (has_special_needs or pet_act_val == 3):
                f_exp_fit = 0.3
            elif exp_val >= 2:
                f_exp_fit = 1.0
            else:
                f_exp_fit = 0.8
                
            # Trait preference overlap (Jaccard similarity)
            pet_traits_set = set(p_traits)
            adopter_traits_set = {t.lower() for t in adopter_traits}
            overlap = len(pet_traits_set.intersection(adopter_traits_set))
            union = len(pet_traits_set.union(adopter_traits_set))
            f_trait_overlap = overlap / max(1, union)
            
            # Location proximity
            f_loc_prox = 1.0 if adopter_location.lower() == p_location.lower() else 0.5
            
            # Normalized & Ordinal Features
            f_pet_age_norm = min(1.0, p_age / 15.0)
            f_pet_size_ord = pet_size_val / 3.0
            f_pet_act_ord = pet_act_val / 3.0
            f_adopter_act_ord = adopter_act_val / 3.0
            f_adopter_time_ord = adopter_time_val / 4.0
            
            # Specific Pet Trait Flags
            f_t_friendly = 1.0 if "friendly" in p_traits else 0.0
            f_t_calm = 1.0 if "calm" in p_traits else 0.0
            f_t_playful = 1.0 if "playful" in p_traits else 0.0
            f_t_active = 1.0 if "active" in p_traits else 0.0
            f_t_kid_friendly = 1.0 if "kid-friendly" in p_traits else 0.0
            f_t_pet_friendly = 1.0 if "pet-friendly" in p_traits else 0.0
            f_t_house_trained = 1.0 if "house-trained" in p_traits else 0.0
            f_t_apt_friendly = 1.0 if "apartment-friendly" in p_traits else 0.0
            f_t_special_needs = 1.0 if "special needs" in p_traits else 0.0
            
            # --- TRANSPARENT COMPATIBILITY GROUND TRUTH FUNCTION ---
            # Rule: Species must match; Kid safety must not be violated; Space compatibility must be acceptable;
            # Overall compatibility score must exceed threshold.
            comp_score = (
                f_species_match * 0.35 +
                f_age_match * 0.10 +
                f_size_match * 0.10 +
                f_activity_align * 0.10 +
                f_living_space * 0.10 +
                f_household_kids * 0.10 +
                f_exp_fit * 0.05 +
                f_trait_overlap * 0.10
            )
            
            # Hard disqualifiers
            is_compatible = 1 if (
                f_species_match == 1.0 and
                f_household_kids >= 0.5 and
                f_living_space >= 0.4 and
                comp_score >= 0.45
            ) else 0
            
            record = {
                "pair_id": f"pair_{adopter_id_counter:04d}",
                "pet_id": pet_id,
                "is_synthetic_pet": bool(pet['is_synthetic']),
                "species_match": f_species_match,
                "age_preference_match": f_age_match,
                "size_preference_match": f_size_match,
                "activity_alignment": f_activity_align,
                "time_energy_compatibility": f_time_energy,
                "living_space_compatibility": f_living_space,
                "household_kid_compatibility": f_household_kids,
                "household_senior_compatibility": f_household_seniors,
                "experience_competence_fit": f_exp_fit,
                "trait_preference_overlap": f_trait_overlap,
                "location_proximity_score": f_loc_prox,
                "pet_age_normalized": f_pet_age_norm,
                "pet_size_ordinal": f_pet_size_ord,
                "pet_activity_ordinal": f_pet_act_ord,
                "adopter_activity_ordinal": f_adopter_act_ord,
                "adopter_time_ordinal": f_adopter_time_ord,
                "pet_trait_friendly": f_t_friendly,
                "pet_trait_calm": f_t_calm,
                "pet_trait_playful": f_t_playful,
                "pet_trait_active": f_t_active,
                "pet_trait_kid_friendly": f_t_kid_friendly,
                "pet_trait_pet_friendly": f_t_pet_friendly,
                "pet_trait_house_trained": f_t_house_trained,
                "pet_trait_apartment_friendly": f_t_apt_friendly,
                "pet_trait_special_needs": f_t_special_needs,
                "is_compatible": is_compatible
            }
            records.append(record)
            adopter_id_counter += 1
            
    return pd.DataFrame(records)

df_pairs = simulate_adopters_for_dataset(df_pets, num_profiles_per_pet=30)
print(f"\nGenerated {len(df_pairs)} reproducible adopter-pet training pairs (30 profiles / pet)")
print(f"  - Compatible (1):     {(df_pairs['is_compatible'] == 1).sum()} ({(df_pairs['is_compatible'] == 1).mean()*100:.1f}%)")
print(f"  - Not Compatible (0): {(df_pairs['is_compatible'] == 0).sum()} ({(df_pairs['is_compatible'] == 0).mean()*100:.1f}%)")

# ==============================================================================
# 5. DATA LEAKAGE PREVENTION (GROUP SPLIT BY PET_ID)
# ==============================================================================
# Group-split ensures NO pet appears in both train and test splits!
unique_pets = df_pets['pet_id'].values
rng_split = np.random.RandomState(RANDOM_SEED)
shuffled_pets = rng_split.permutation(unique_pets)

test_pets_count = 10
test_pet_ids = set(shuffled_pets[:test_pets_count])
train_pet_ids = set(shuffled_pets[test_pets_count:])

train_mask = df_pairs['pet_id'].isin(train_pet_ids)
test_mask = df_pairs['pet_id'].isin(test_pet_ids)

X_train = df_pairs.loc[train_mask, FEATURE_NAMES_25D].values
y_train = df_pairs.loc[train_mask, 'is_compatible'].values
groups_train = df_pairs.loc[train_mask, 'pet_id'].values

X_test = df_pairs.loc[test_mask, FEATURE_NAMES_25D].values
y_test = df_pairs.loc[test_mask, 'is_compatible'].values
groups_test = df_pairs.loc[test_mask, 'pet_id'].values

print("\nData Leakage Prevention (Group-Split by Pet ID):")
print(f"  - Train Pets: {len(train_pet_ids)} ({len(X_train)} pairs)")
print(f"  - Test Pets:  {len(test_pet_ids)} ({len(X_test)} pairs)")

# ==============================================================================
# 6. MODEL 1: LOGISTIC REGRESSION (WITH STANDARD SCALER)
# ==============================================================================
print("\n" + "=" * 50)
print("TRAINING MODEL 1: LOGISTIC REGRESSION")
print("=" * 50)

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

lr_model = LogisticRegression(C=1.0, max_iter=1000, random_state=RANDOM_SEED)
lr_model.fit(X_train_scaled, y_train)

y_pred_lr = lr_model.predict(X_test_scaled)
y_prob_lr = lr_model.predict_proba(X_test_scaled)[:, 1]

lr_acc = float(accuracy_score(y_test, y_pred_lr))
lr_prec = float(precision_score(y_test, y_pred_lr))
lr_rec = float(recall_score(y_test, y_pred_lr))
lr_f1 = float(f1_score(y_test, y_pred_lr))
lr_auc = float(roc_auc_score(y_test, y_prob_lr))
lr_cm = confusion_matrix(y_test, y_pred_lr)

print(f"Logistic Regression Test Metrics:")
print(f"  - Accuracy:  {lr_acc:.4f}")
print(f"  - Precision: {lr_prec:.4f}")
print(f"  - Recall:    {lr_rec:.4f}")
print(f"  - F1-Score:  {lr_f1:.4f}")
print(f"  - ROC-AUC:   {lr_auc:.4f}")
print(f"  - Confusion Matrix:\n{lr_cm}")

# ==============================================================================
# 7. MODEL 2: RANDOM FOREST CLASSIFIER
# ==============================================================================
print("\n" + "=" * 50)
print("TRAINING MODEL 2: RANDOM FOREST CLASSIFIER")
print("=" * 50)

rf_model = RandomForestClassifier(
    n_estimators=30,
    max_depth=6,
    min_samples_split=4,
    random_state=RANDOM_SEED
)
rf_model.fit(X_train, y_train)

y_pred_rf = rf_model.predict(X_test)
y_prob_rf = rf_model.predict_proba(X_test)[:, 1]

rf_acc = float(accuracy_score(y_test, y_pred_rf))
rf_prec = float(precision_score(y_test, y_pred_rf))
rf_rec = float(recall_score(y_test, y_pred_rf))
rf_f1 = float(f1_score(y_test, y_pred_rf))
rf_auc = float(roc_auc_score(y_test, y_prob_rf))
rf_cm = confusion_matrix(y_test, y_pred_rf)

print(f"Random Forest Test Metrics:")
print(f"  - Accuracy:  {rf_acc:.4f}")
print(f"  - Precision: {rf_prec:.4f}")
print(f"  - Recall:    {rf_rec:.4f}")
print(f"  - F1-Score:  {rf_f1:.4f}")
print(f"  - ROC-AUC:   {rf_auc:.4f}")
print(f"  - Confusion Matrix:\n{rf_cm}")

# ==============================================================================
# 8. 5-FOLD STRATIFIED GROUP CROSS-VALIDATION
# ==============================================================================
print("\n" + "=" * 50)
print("5-FOLD STRATIFIED GROUP CROSS-VALIDATION")
print("=" * 50)

gkf = StratifiedGroupKFold(n_splits=5)
X_all = df_pairs[FEATURE_NAMES_25D].values
y_all = df_pairs['is_compatible'].values
groups_all = df_pairs['pet_id'].values

rf_cv_acc, rf_cv_prec, rf_cv_rec, rf_cv_f1, rf_cv_auc = [], [], [], [], []
lr_cv_acc, lr_cv_prec, lr_cv_rec, lr_cv_f1, lr_cv_auc = [], [], [], [], []

for fold, (train_idx, val_idx) in enumerate(gkf.split(X_all, y_all, groups_all)):
    X_f_train, X_f_val = X_all[train_idx], X_all[val_idx]
    y_f_train, y_f_val = y_all[train_idx], y_all[val_idx]
    
    # RF
    rf_fold = RandomForestClassifier(n_estimators=30, max_depth=6, random_state=RANDOM_SEED + fold)
    rf_fold.fit(X_f_train, y_f_train)
    y_p_rf = rf_fold.predict(X_f_val)
    y_pb_rf = rf_fold.predict_proba(X_f_val)[:, 1]
    
    rf_cv_acc.append(accuracy_score(y_f_val, y_p_rf))
    rf_cv_prec.append(precision_score(y_f_val, y_p_rf))
    rf_cv_rec.append(recall_score(y_f_val, y_p_rf))
    rf_cv_f1.append(f1_score(y_f_val, y_p_rf))
    rf_cv_auc.append(roc_auc_score(y_f_val, y_pb_rf))
    
    # LR
    scaler_f = StandardScaler()
    X_f_train_s = scaler_f.fit_transform(X_f_train)
    X_f_val_s = scaler_f.transform(X_f_val)
    lr_fold = LogisticRegression(C=1.0, max_iter=1000, random_state=RANDOM_SEED + fold)
    lr_fold.fit(X_f_train_s, y_f_train)
    y_p_lr = lr_fold.predict(X_f_val_s)
    y_pb_lr = lr_fold.predict_proba(X_f_val_s)[:, 1]
    
    lr_cv_acc.append(accuracy_score(y_f_val, y_p_lr))
    lr_cv_prec.append(precision_score(y_f_val, y_p_lr))
    lr_cv_rec.append(recall_score(y_f_val, y_p_lr))
    lr_cv_f1.append(f1_score(y_f_val, y_p_lr))
    lr_cv_auc.append(roc_auc_score(y_f_val, y_pb_lr))

print(f"5-Fold CV Mean Results:")
print(f"  - Random Forest:      Acc={np.mean(rf_cv_acc):.4f}, F1={np.mean(rf_cv_f1):.4f}, ROC-AUC={np.mean(rf_cv_auc):.4f}")
print(f"  - Logistic Regression: Acc={np.mean(lr_cv_acc):.4f}, F1={np.mean(lr_cv_f1):.4f}, ROC-AUC={np.mean(lr_cv_auc):.4f}")

# ==============================================================================
# 9. EXPORT JOBLIB & MOBILE JSON MODELS
# ==============================================================================
print("\n" + "=" * 50)
print("EXPORTING PRODUCTION ARTIFACTS")
print("=" * 50)

# 1. Joblib Model Exports
joblib.dump(rf_model, os.path.join(OUTPUT_DIR, "random_forest_model.joblib"))
joblib.dump(scaler, os.path.join(OUTPUT_DIR, "random_forest_preprocessor.joblib"))
joblib.dump(lr_model, os.path.join(OUTPUT_DIR, "logistic_regression_model.joblib"))
joblib.dump(scaler, os.path.join(OUTPUT_DIR, "logistic_regression_preprocessor.joblib"))

# 2. Logistic Regression Mobile Model JSON
lr_mobile = {
    "model_name": "LogisticRegressionMobile",
    "version": "2.0.0",
    "feature_names": FEATURE_NAMES_25D,
    "intercept": float(lr_model.intercept_[0]),
    "coefficients": [float(c) for c in lr_model.coef_[0]],
    "feature_means": [float(m) for m in scaler.mean_],
    "feature_stds": [float(s) for s in scaler.scale_]
}
with open(os.path.join(OUTPUT_DIR, "logistic_regression_mobile_model.json"), "w") as f:
    json.dump(lr_mobile, f, indent=2)

# 3. Random Forest Mobile Model JSON
def export_tree(tree):
    t = tree.tree_
    nodes = []
    for i in range(t.node_count):
        is_leaf = (t.children_left[i] == -1 and t.children_right[i] == -1)
        prob_val = 0.5
        if is_leaf:
            val = t.value[i][0]
            tot = val.sum()
            prob_val = float(val[1] / tot) if tot > 0 else 0.5
        nodes.append({
            "node_id": i,
            "feature": int(t.feature[i]),
            "threshold": float(t.threshold[i]),
            "left_child": int(t.children_left[i]),
            "right_child": int(t.children_right[i]),
            "is_leaf": bool(is_leaf),
            "probability": prob_val
        })
    return {"nodes": nodes}

rf_trees = [export_tree(estimator) for estimator in rf_model.estimators_]
rf_mobile = {
    "model_name": "RandomForestMobile",
    "version": "2.0.0",
    "feature_names": FEATURE_NAMES_25D,
    "num_trees": len(rf_trees),
    "max_depth": 6,
    "trees": rf_trees
}
with open(os.path.join(OUTPUT_DIR, "random_forest_mobile_model.json"), "w") as f:
    json.dump(rf_mobile, f, indent=2)

# 4. Multi-Algorithm Config JSON
multi_algo_config = {
    "version": "2.0.0-multi-algo",
    "dataset_records": total_pets,
    "real_records": real_pets,
    "synthetic_records": synthetic_pets,
    "training_pairs": len(df_pairs),
    "features_count": len(FEATURE_NAMES_25D),
    "random_seed": RANDOM_SEED,
    "algorithms": ["KNN", "Random Forest", "Logistic Regression"],
    "weights": {
        "knn": 0.40,
        "random_forest": 0.35,
        "logistic_regression": 0.25
    },
    "ensemble_formula": "final_score = 0.40 * knn_similarity + 0.35 * random_forest_probability + 0.25 * logistic_regression_probability",
    "academic_disclaimer": "The current system demonstrates ML-based compatibility prediction using synthetic compatibility labels. These labels should not be interpreted as real adoption outcomes."
}
with open(os.path.join(OUTPUT_DIR, "multi_algorithm_config.json"), "w") as f:
    json.dump(multi_algo_config, f, indent=2)

# 5. Validation Results JSON
val_results = {
    "random_seed": RANDOM_SEED,
    "dataset": {
        "total_pets": total_pets,
        "real_pets": real_pets,
        "synthetic_pets": synthetic_pets,
        "total_pairs": len(df_pairs),
        "train_pairs": len(X_train),
        "test_pairs": len(X_test)
    },
    "data_leakage_prevention": "Group-based split by pet_id (no pet appears in both train and test splits)",
    "models": {
        "logistic_regression": {
            "test_metrics": {
                "accuracy": round(lr_acc, 4),
                "precision": round(lr_prec, 4),
                "recall": round(lr_rec, 4),
                "f1": round(lr_f1, 4),
                "roc_auc": round(lr_auc, 4),
                "confusion_matrix": {
                    "tp": int(lr_cm[1, 1]), "fp": int(lr_cm[0, 1]),
                    "tn": int(lr_cm[0, 0]), "fn": int(lr_cm[1, 0])
                }
            },
            "cv_5fold_metrics": {
                "accuracy": round(float(np.mean(lr_cv_acc)), 4),
                "precision": round(float(np.mean(lr_cv_prec)), 4),
                "recall": round(float(np.mean(lr_cv_rec)), 4),
                "f1": round(float(np.mean(lr_cv_f1)), 4),
                "roc_auc": round(float(np.mean(lr_cv_auc)), 4)
            }
        },
        "random_forest": {
            "test_metrics": {
                "accuracy": round(rf_acc, 4),
                "precision": round(rf_prec, 4),
                "recall": round(rf_rec, 4),
                "f1": round(rf_f1, 4),
                "roc_auc": round(rf_auc, 4),
                "confusion_matrix": {
                    "tp": int(rf_cm[1, 1]), "fp": int(rf_cm[0, 1]),
                    "tn": int(rf_cm[0, 0]), "fn": int(rf_cm[1, 0])
                }
            },
            "cv_5fold_metrics": {
                "accuracy": round(float(np.mean(rf_cv_acc)), 4),
                "precision": round(float(np.mean(rf_cv_prec)), 4),
                "recall": round(float(np.mean(rf_cv_rec)), 4),
                "f1": round(float(np.mean(rf_cv_f1)), 4),
                "roc_auc": round(float(np.mean(rf_cv_auc)), 4)
            }
        }
    }
}
with open(os.path.join(OUTPUT_DIR, "model_validation_results.json"), "w") as f:
    json.dump(val_results, f, indent=2)

with open(os.path.join(OUTPUT_DIR, "feature_names.json"), "w") as f:
    json.dump(FEATURE_NAMES_25D, f, indent=2)

print("Export completed successfully.")
