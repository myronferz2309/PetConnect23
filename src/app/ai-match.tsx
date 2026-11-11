import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  X,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
  Heart,
  MapPin,
  Home,
  Users,
  Activity,
  Clock,
  Award,
  Calendar,
  Maximize2,
  Smile,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react-native';
import { usePet } from '../context/PetContext';
import { PetConnectColors } from '../constants/colors';
import { PetImage } from '../components/PetImage';
import {
  AIMatchQuestionnaire,
  AIMatchResult,
  PetPreference,
  LivingSituation,
  HouseholdType,
  PetExperience,
  ActivityLevel,
  TimeAvailable,
  PreferredPetAge,
  PreferredPetSize,
} from '../types';
import { aiMatchingService } from '../services/aiMatchingService';
import {
  traceRandomForestTrees,
  getLogisticRegressionTrace,
  extractPairwiseFeatures,
} from '../services/multiAlgorithmService';

const { width } = Dimensions.get('window');

const TOTAL_STEPS = 10;

const POPULAR_CITIES = ['Mumbai', 'Pune', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai'];

const ADOPTION_PREFERENCES_OPTIONS = [
  'Friendly',
  'Playful',
  'Calm',
  'Good with children',
  'Good with other pets',
  'Special-needs friendly',
  'House-trained',
  'Apartment friendly',
];

const FEATURE_DISPLAY_NAMES: Record<string, string> = {
  // Colab 22-Dimensional Feature Space
  species_dog: 'Species: Dog',
  species_cat: 'Species: Cat',
  species_bird: 'Species: Bird',
  species_fish: 'Species: Fish',
  species_other: 'Species: Other',
  age_normalized: 'Normalized Age',
  size_small: 'Size: Small',
  size_medium: 'Size: Medium',
  size_large: 'Size: Large',
  activity_low: 'Energy: Low',
  activity_moderate: 'Energy: Moderate',
  activity_high: 'Energy: High',
  trait_friendly: 'Trait: Friendly',
  trait_calm: 'Trait: Calm',
  trait_playful: 'Trait: Playful',
  trait_active: 'Trait: Active',
  trait_kid_friendly: 'Trait: Kid-Friendly',
  trait_pet_friendly: 'Trait: Pet-Friendly',
  trait_house_trained: 'Trait: House-Trained',
  trait_apartment_friendly: 'Trait: Apt-Friendly',
  trait_special_needs: 'Trait: Special Needs',
  location_index: 'Location Proximity',
  // Fallbacks
  size: 'Pet Size',
  activity_level: 'Activity Level',
  time_commitment: 'Time Commitment',
  experience_level: 'Experience Level',
  living_space: 'Living Space',
  location_proximity: 'Location Proximity',
};

function toSuperscript(num: number): string {
  const map: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  };
  return num.toString().split('').map((char) => map[char] || char).join('');
}

function formatVectorLines(vec: number[] | undefined, prefix: string): string {
  if (!vec || vec.length === 0) return `${prefix} = []`;
  const chunks: string[] = [];
  for (let i = 0; i < vec.length; i += 4) {
    const chunk = vec.slice(i, i + 4).map((n) => n.toFixed(2)).join(', ');
    chunks.push(`  ${chunk}${i + 4 < vec.length ? ',' : ''}`);
  }
  return `${prefix} = [\n${chunks.join('\n')}\n]`;
}

export default function AIMatchScreen() {
  const router = useRouter();
  const { pets, userProfile, isPetSaved, toggleSavePet, showToast } = usePet();

  // Screen Mode: 'questionnaire' | 'loading' | 'results'
  const [screenState, setScreenState] = useState<'questionnaire' | 'loading' | 'results'>('questionnaire');

  // Questionnaire state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [petPreference, setPetPreference] = useState<PetPreference>('any');
  const [livingSituation, setLivingSituation] = useState<LivingSituation>('apartment');
  const [location, setLocation] = useState<string>(
    userProfile?.address ? userProfile.address.split(',')[0].trim() : 'Mumbai, Maharashtra'
  );
  const [household, setHousehold] = useState<HouseholdType>('family_children');
  const [experience, setExperience] = useState<PetExperience>('some_experience');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [timeAvailable, setTimeAvailable] = useState<TimeAvailable>('2_to_4h');
  const [preferredAge, setPreferredAge] = useState<PreferredPetAge>('any');
  const [preferredSize, setPreferredSize] = useState<PreferredPetSize>('any');
  const [adoptionPreferences, setAdoptionPreferences] = useState<string[]>([
    'Friendly',
    'Good with children',
  ]);

  const currentQuestionnaire: AIMatchQuestionnaire = {
    petPreference,
    livingSituation,
    location,
    household,
    experience,
    activityLevel,
    timeAvailable,
    preferredAge,
    preferredSize,
    adoptionPreferences,
  };

  // Results state
  const [matchResults, setMatchResults] = useState<AIMatchResult[]>([]);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [expandedVectorPetId, setExpandedVectorPetId] = useState<string | null>(null);
  const [expandedMlDebugPetId, setExpandedMlDebugPetId] = useState<string | null>(null);
  const [expandedKnnCalcId, setExpandedKnnCalcId] = useState<string | null>(null);
  const [showAllKnnFeaturesId, setShowAllKnnFeaturesId] = useState<string | null>(null);
  const [expandedRfCalcId, setExpandedRfCalcId] = useState<string | null>(null);
  const [showAllRfTreesId, setShowAllRfTreesId] = useState<string | null>(null);
  const [expandedLrCalcId, setExpandedLrCalcId] = useState<string | null>(null);
  const [showAllLrFeaturesId, setShowAllLrFeaturesId] = useState<string | null>(null);

  // Sync location with profile if updated
  useEffect(() => {
    if (userProfile?.address && !location) {
      setLocation(userProfile.address.split(',')[0].trim());
    }
  }, [userProfile]);

  const handleNextStep = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleRunMatching();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      router.back();
    }
  };

  const handleTogglePref = (pref: string) => {
    if (adoptionPreferences.includes(pref)) {
      setAdoptionPreferences((prev) => prev.filter((p) => p !== pref));
    } else {
      setAdoptionPreferences((prev) => [...prev, pref]);
    }
  };

  const handleRunMatching = async () => {
    setScreenState('loading');

    const questionnaire: AIMatchQuestionnaire = {
      petPreference,
      livingSituation,
      location,
      household,
      experience,
      activityLevel,
      timeAvailable,
      preferredAge,
      preferredSize,
      adoptionPreferences,
    };

    try {
      // Simulate intelligent evaluation with minimum 1.2s delay for seamless UX
      const [results] = await Promise.all([
        aiMatchingService.findMatches(pets, questionnaire),
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]);

      setMatchResults(results);
      setScreenState('results');
    } catch (e) {
      console.warn('AI matching error:', e);
      // Fallback matching
      const fallbackResults = await aiMatchingService.findMatches(pets, questionnaire);
      setMatchResults(fallbackResults);
      setScreenState('results');
    }
  };

  const handleRetake = () => {
    setScreenState('questionnaire');
    setCurrentStep(1);
  };

  const toggleExpandMatch = (id: string) => {
    setExpandedMatchId((prev) => (prev === id ? null : id));
  };

  // Progress percentage
  const progressPercent = Math.round((currentStep / TOTAL_STEPS) * 100);

  // =========================================================================
  // RENDER QUESTIONNAIRE STEP
  // =========================================================================
  const renderQuestionStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepIconCircle}>
              <Smile size={28} color={PetConnectColors.primary} />
            </View>
            <Text style={styles.stepTitle}>What kind of pet are you looking for?</Text>
            <Text style={styles.stepSubtitle}>Choose your preferred companion species</Text>

            <View style={styles.optionsList}>
              {[
                { id: 'dogs' as PetPreference, title: '🐶 Dog', desc: 'Loyal, energetic, loving companion' },
                { id: 'cats' as PetPreference, title: '🐱 Cat', desc: 'Independent, gentle, cozy lap friend' },
                { id: 'others' as PetPreference, title: '🐰 Rabbits & Birds', desc: 'Pocket pets, gentle small animals' },
                { id: 'any' as PetPreference, title: '❤️ No Preference', desc: 'Open to meeting any wonderful pet' },
              ].map((opt) => {
                const isSelected = petPreference === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => setPetPreference(opt.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                        {opt.title}
                      </Text>
                      <Text style={[styles.optionDesc, isSelected && styles.optionDescSelected]}>{opt.desc}</Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepIconCircle}>
              <Home size={28} color={PetConnectColors.primary} />
            </View>
            <Text style={styles.stepTitle}>What is your living situation?</Text>
            <Text style={styles.stepSubtitle}>Helps match pets that thrive in your space</Text>

            <View style={styles.optionsList}>
              {[
                { id: 'apartment' as LivingSituation, title: '🏢 Apartment / Flat', desc: 'Cozy indoor space with balcony or nearby parks' },
                { id: 'house' as LivingSituation, title: '🏡 Independent House', desc: 'Spacious home with yard, lawn, or open areas' },
                { id: 'other' as LivingSituation, title: '🏘️ Other / Shared Living', desc: 'Farmhouse, villa, or flexible living space' },
              ].map((opt) => {
                const isSelected = livingSituation === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => setLivingSituation(opt.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                        {opt.title}
                      </Text>
                      <Text style={[styles.optionDesc, isSelected && styles.optionDescSelected]}>{opt.desc}</Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepIconCircle}>
              <MapPin size={28} color={PetConnectColors.primary} />
            </View>
            <Text style={styles.stepTitle}>Where are you located?</Text>
            <Text style={styles.stepSubtitle}>Find nearby adoptable pets in your city or region</Text>

            <View style={styles.locationInputBox}>
              <MapPin size={18} color="#89726A" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.locationTextInput}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Bandra West, Mumbai, Maharashtra"
                placeholderTextColor="#89726A"
              />
            </View>

            <Text style={styles.quickSelectLabel}>Quick City Selection:</Text>
            <View style={styles.quickCitiesRow}>
              {POPULAR_CITIES.map((city) => (
                <TouchableOpacity
                  key={city}
                  onPress={() => setLocation(`${city}, India`)}
                  style={[
                    styles.cityChip,
                    location.toLowerCase().includes(city.toLowerCase()) && styles.cityChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.cityChipText,
                      location.toLowerCase().includes(city.toLowerCase()) && styles.cityChipTextSelected,
                    ]}
                  >
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepIconCircle}>
              <Users size={28} color={PetConnectColors.primary} />
            </View>
            <Text style={styles.stepTitle}>Who is in your household?</Text>
            <Text style={styles.stepSubtitle}>Matches temperament with your family dynamic</Text>

            <View style={styles.optionsList}>
              {[
                { id: 'alone' as HouseholdType, title: '👤 Living Alone', desc: 'Single pet parent looking for a loyal companion' },
                { id: 'couple' as HouseholdType, title: '👫 Couple', desc: 'Two adults sharing home and care routine' },
                { id: 'family' as HouseholdType, title: '👨‍👩‍👧 Family (Adults / Teens)', desc: 'Multi-member household with shared responsibilities' },
                { id: 'family_children' as HouseholdType, title: '👶 Family with Young Children', desc: 'Requires gentle, patient, and child-safe pets' },
                { id: 'seniors' as HouseholdType, title: '👵 Senior Household', desc: 'Prefers calm, affectionate, easy-to-manage companions' },
              ].map((opt) => {
                const isSelected = household === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => setHousehold(opt.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                        {opt.title}
                      </Text>
                      <Text style={[styles.optionDesc, isSelected && styles.optionDescSelected]}>{opt.desc}</Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepIconCircle}>
              <Award size={28} color={PetConnectColors.primary} />
            </View>
            <Text style={styles.stepTitle}>What is your pet experience level?</Text>
            <Text style={styles.stepSubtitle}>Helps match pet trainability and care needs</Text>

            <View style={styles.optionsList}>
              {[
                { id: 'first_time' as PetExperience, title: '🌱 First-time Pet Owner', desc: 'Looking for a friendly, easy-to-train, forgiving companion' },
                { id: 'some_experience' as PetExperience, title: '🐾 Some Experience', desc: 'Have lived with or raised family pets before' },
                { id: 'experienced' as PetExperience, title: '⭐ Experienced Caregiver', desc: 'Comfortable with specialized training or high-drive breeds' },
              ].map((opt) => {
                const isSelected = experience === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => setExperience(opt.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                        {opt.title}
                      </Text>
                      <Text style={[styles.optionDesc, isSelected && styles.optionDescSelected]}>{opt.desc}</Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepIconCircle}>
              <Activity size={28} color={PetConnectColors.primary} />
            </View>
            <Text style={styles.stepTitle}>What is your lifestyle activity level?</Text>
            <Text style={styles.stepSubtitle}>Matches pet energy level to your daily tempo</Text>

            <View style={styles.optionsList}>
              {[
                { id: 'low' as ActivityLevel, title: '🛋️ Calm & Relaxed', desc: 'Enjoys couch cuddles, leisurely strolls, and quiet evenings' },
                { id: 'moderate' as ActivityLevel, title: '🚶 Moderately Active', desc: 'Daily brisk walks, casual outdoor outings, balanced playtime' },
                { id: 'high' as ActivityLevel, title: '🏃 High Energy & Active', desc: 'Daily running, hiking trails, energetic play sessions' },
              ].map((opt) => {
                const isSelected = activityLevel === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => setActivityLevel(opt.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                        {opt.title}
                      </Text>
                      <Text style={[styles.optionDesc, isSelected && styles.optionDescSelected]}>{opt.desc}</Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 7:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepIconCircle}>
              <Clock size={28} color={PetConnectColors.primary} />
            </View>
            <Text style={styles.stepTitle}>How much time can you spend daily?</Text>
            <Text style={styles.stepSubtitle}>Dedicated walking, feeding, grooming, and companionship</Text>

            <View style={styles.optionsList}>
              {[
                { id: 'under_1h' as TimeAvailable, title: '⏳ Under 1 hour / day', desc: 'Best suited for independent cats or low-maintenance pets' },
                { id: '1_to_2h' as TimeAvailable, title: '⏰ 1 – 2 hours / day', desc: 'Standard care for adult companions' },
                { id: '2_to_4h' as TimeAvailable, title: '🌟 2 – 4 hours / day', desc: 'Active walking, training, and engaging play' },
                { id: '4h_plus' as TimeAvailable, title: '🏡 4+ hours (Home all day)', desc: 'Work from home or full-time attention for puppies/pets' },
              ].map((opt) => {
                const isSelected = timeAvailable === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => setTimeAvailable(opt.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                        {opt.title}
                      </Text>
                      <Text style={[styles.optionDesc, isSelected && styles.optionDescSelected]}>{opt.desc}</Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 8:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepIconCircle}>
              <Calendar size={28} color={PetConnectColors.primary} />
            </View>
            <Text style={styles.stepTitle}>What age stage do you prefer?</Text>
            <Text style={styles.stepSubtitle}>Select your ideal life stage</Text>

            <View style={styles.optionsList}>
              {[
                { id: 'puppy_kitten' as PreferredPetAge, title: '🍼 Puppy / Kitten (< 1 yr)', desc: 'Playful, eager to bond, needs training time' },
                { id: 'young' as PreferredPetAge, title: '⚡ Young (1 – 2 yrs)', desc: 'Past baby phase with playful energy' },
                { id: 'adult' as PreferredPetAge, title: '🐕 Adult (3 – 7 yrs)', desc: 'Settled personality, predictable routine' },
                { id: 'senior' as PreferredPetAge, title: '👑 Senior (8+ yrs)', desc: 'Gentle, loving, low-energy golden years' },
                { id: 'any' as PreferredPetAge, title: '❤️ No Preference', desc: 'Happy to bond with a pet of any age' },
              ].map((opt) => {
                const isSelected = preferredAge === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => setPreferredAge(opt.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                        {opt.title}
                      </Text>
                      <Text style={[styles.optionDesc, isSelected && styles.optionDescSelected]}>{opt.desc}</Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 9:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepIconCircle}>
              <Maximize2 size={28} color={PetConnectColors.primary} />
            </View>
            <Text style={styles.stepTitle}>What pet size do you prefer?</Text>
            <Text style={styles.stepSubtitle}>Especially relevant for canine companions</Text>

            <View style={styles.optionsList}>
              {[
                { id: 'small' as PreferredPetSize, title: '🐕 Small (< 10 kg)', desc: 'Apartment friendly, easy to transport and handle' },
                { id: 'medium' as PreferredPetSize, title: '🦮 Medium (10 – 25 kg)', desc: 'Classic family size, versatile companion' },
                { id: 'large' as PreferredPetSize, title: '🐕‍🦺 Large (25+ kg)', desc: 'Stately, loyal, great for yards or active hikers' },
                { id: 'any' as PreferredPetSize, title: '❤️ No Preference', desc: 'Any size is welcome in my home' },
              ].map((opt) => {
                const isSelected = preferredSize === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                    onPress={() => setPreferredSize(opt.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                        {opt.title}
                      </Text>
                      <Text style={[styles.optionDesc, isSelected && styles.optionDescSelected]}>{opt.desc}</Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 10:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepIconCircle}>
              <Sparkles size={28} color={PetConnectColors.primary} />
            </View>
            <Text style={styles.stepTitle}>Special Preferences & Traits</Text>
            <Text style={styles.stepSubtitle}>Select any that matter most to you (optional)</Text>

            <View style={styles.chipsWrap}>
              {ADOPTION_PREFERENCES_OPTIONS.map((pref) => {
                const isSelected = adoptionPreferences.includes(pref);
                return (
                  <TouchableOpacity
                    key={pref}
                    onPress={() => handleTogglePref(pref)}
                    style={[styles.prefChip, isSelected && styles.prefChipSelected]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.prefChipText, isSelected && styles.prefChipTextSelected]}>
                      {isSelected ? '✓ ' : '+ '}
                      {pref}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  // =========================================================================
  // RENDER SCREEN MODES
  // =========================================================================

  // 1. Loading State
  if (screenState === 'loading') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingPulseCircle}>
            <Sparkles size={40} color={PetConnectColors.primary} />
          </View>
          <Text style={styles.loadingTitle}>Finding pets that match your lifestyle... 🐾</Text>
          <Text style={styles.loadingSubtitle}>
            Analyzing living situation, energy levels, location, and personality compatibility.
          </Text>
          <ActivityIndicator size="large" color={PetConnectColors.primary} style={{ marginTop: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  // 2. Results Screen
  if (screenState === 'results') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <ArrowLeft size={22} color={PetConnectColors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Best Matches 🐾</Text>
          <TouchableOpacity onPress={handleRetake} style={styles.headerBtn}>
            <SlidersHorizontal size={20} color={PetConnectColors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.resultsScroll}>
          {/* Top Banner */}
          <View style={styles.resultsHeroCard}>
            <View style={styles.resultsHeroLeft}>
              <Text style={styles.resultsHeroTitle}>Personalized AI Matches</Text>
              <Text style={styles.resultsHeroSub}>
                Based on your lifestyle, home space, and preferences
              </Text>
            </View>
            <TouchableOpacity onPress={handleRetake} style={styles.retakeMiniBtn}>
              <RefreshCw size={14} color={PetConnectColors.primary} />
              <Text style={styles.retakeMiniBtnText}>Adjust</Text>
            </TouchableOpacity>
          </View>

          {/* Results List or Empty State */}
          {matchResults.length === 0 ? (
            <View style={styles.emptyResultsCard}>
              <Text style={styles.emptyResultsIcon}>🔍</Text>
              <Text style={styles.emptyResultsTitle}>We couldn't find a strong match right now.</Text>
              <Text style={styles.emptyResultsSub}>
                Try adjusting your species or living preferences to see more wonderful pets waiting for a home.
              </Text>
              <View style={styles.emptyActionsRow}>
                <TouchableOpacity onPress={handleRetake} style={styles.adjustPrefBtn}>
                  <Text style={styles.adjustPrefBtnText}>Adjust Preferences</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.replace('/(tabs)' as any)} style={styles.exploreAllBtn}>
                  <Text style={styles.exploreAllBtnText}>Explore All Pets</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            matchResults.map((item, idx) => {
              const pet = item.pet;
              const saved = isPetSaved(pet.id);
              const isExpanded = expandedMatchId === pet.id;

              return (
                <View key={pet.id} style={styles.matchCard}>
                  {/* Pet Photo Container */}
                  <View style={styles.matchImageContainer}>
                    <PetImage uri={pet.imageUrl} category={pet.category} style={styles.matchImage} contentFit="cover" />
                    
                    {/* Favorite Heart Button */}
                    <TouchableOpacity
                      onPress={() => toggleSavePet(pet.id)}
                      style={styles.matchFavoriteBtn}
                      activeOpacity={0.8}
                    >
                      <Heart
                        size={20}
                        color={saved ? PetConnectColors.primary : '#89726A'}
                        fill={saved ? PetConnectColors.primary : 'transparent'}
                      />
                    </TouchableOpacity>

                    {/* Rank Badge */}
                    <View style={styles.matchRankBadge}>
                      <Text style={styles.matchRankText}>#{idx + 1} Best Match</Text>
                    </View>
                  </View>

                  {/* Pet Card Body */}
                  <View style={styles.matchCardBody}>
                    <View style={styles.matchTitleRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.matchPetName}>{pet.name}</Text>
                        <Text style={styles.matchPetBreed}>
                          {pet.breed} • {pet.age}
                        </Text>
                      </View>

                      {/* Score Badge */}
                      <View style={styles.scoreBadgeContainer}>
                        <Text style={styles.scoreBadgeStar}>⭐</Text>
                        <Text style={styles.scoreBadgeText}>{item.score}% Match</Text>
                      </View>
                    </View>

                    {/* Location Pin */}
                    <View style={styles.matchLocationRow}>
                      <MapPin size={14} color="#89726A" />
                      <Text style={styles.matchLocationText}>{pet.location || 'Local'}</Text>
                    </View>

                    {/* Score Progress Bar */}
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${item.score}%` }]} />
                    </View>

                    {/* AI Explanation Box */}
                    <View style={styles.aiExplanationCard}>
                      <View style={styles.aiExplanationHeader}>
                        <Sparkles size={14} color={PetConnectColors.primary} />
                        <Text style={styles.aiExplanationTitle}>Why this pet matches you</Text>
                      </View>
                      <Text style={styles.aiExplanationText}>"{item.aiExplanation}"</Text>

                      {item.aiConsideration && (
                        <View style={styles.aiConsiderationBox}>
                          <Text style={styles.aiConsiderationLabel}>One thing to consider:</Text>
                          <Text style={styles.aiConsiderationText}>{item.aiConsideration}</Text>
                        </View>
                      )}
                    </View>

                    {/* Match Breakdown Expandable */}
                    <TouchableOpacity
                      onPress={() => toggleExpandMatch(pet.id)}
                      style={styles.breakdownToggleBtn}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.breakdownToggleText}>
                        {isExpanded ? 'Hide Match Breakdown' : 'View Match Breakdown'}
                      </Text>
                      <ChevronRight
                        size={16}
                        color={PetConnectColors.primary}
                        style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.breakdownContainer}>
                        {/* 0. MATCH BREAKDOWN HEADER */}
                        <View style={styles.breakdownHeaderCard}>
                          <Text style={styles.breakdownHeaderTitle}>MATCH BREAKDOWN</Text>
                          <Text style={styles.breakdownPetName}>{pet.name}</Text>
                          <Text style={styles.breakdownPetCategory}>
                            {pet.category.toUpperCase()} • {pet.breed} • {pet.age}
                          </Text>
                          <View style={styles.breakdownScoreRow}>
                            <Text style={styles.breakdownScoreLabel}>Final Match Percentage:</Text>
                            <View style={styles.breakdownScoreBadge}>
                              <Text style={styles.breakdownScoreBadgeText}>{item.score}% Match</Text>
                            </View>
                          </View>
                        </View>

                        {/* 1. TOP CARD: FINAL ENSEMBLE SCORE */}
                        <View style={styles.finalEnsembleCard}>
                          <View style={styles.ensembleHeaderRow}>
                            <Text style={styles.ensembleCardTitle}>FINAL ENSEMBLE SCORE</Text>
                            <View style={styles.ensemblePill}>
                              <Text style={styles.ensemblePillText}>3 ML Models</Text>
                            </View>
                          </View>

                          {/* Model Ensemble Weights Visualization (Fixed weights) */}
                          <View style={styles.weightsBarSection}>
                            <Text style={styles.weightsSectionLabel}>Model Contribution Weights:</Text>
                            
                            {/* KNN weight bar */}
                            <View style={styles.weightBarRow}>
                              <View style={styles.weightBarLabelCol}>
                                <Text style={styles.weightBarName}>K-Nearest Neighbors</Text>
                                <Text style={styles.weightBarPercent}>40% weight</Text>
                              </View>
                              <View style={styles.weightTrack}>
                                <View style={[styles.weightFillKnn, { width: '40%' }]} />
                              </View>
                              <View style={styles.weightContribRow}>
                                <Text style={styles.weightContribLabel}>Contribution:</Text>
                                <Text style={styles.weightContribVal}>
                                  +{(item.knn?.contribution ?? ((item.similarity ?? 0) * 0.4)).toFixed(4)} ({((item.knn?.contribution ?? ((item.similarity ?? 0) * 0.4)) * 100).toFixed(1)}%)
                                </Text>
                              </View>
                            </View>

                            {/* RF weight bar */}
                            <View style={styles.weightBarRow}>
                              <View style={styles.weightBarLabelCol}>
                                <Text style={styles.weightBarName}>Random Forest</Text>
                                <Text style={styles.weightBarPercent}>35% weight</Text>
                              </View>
                              <View style={styles.weightTrack}>
                                <View style={[styles.weightFillRf, { width: '35%' }]} />
                              </View>
                              <View style={styles.weightContribRow}>
                                <Text style={styles.weightContribLabel}>Contribution:</Text>
                                <Text style={styles.weightContribVal}>
                                  +{(item.randomForest?.contribution ?? 0).toFixed(4)} ({((item.randomForest?.contribution ?? 0) * 100).toFixed(1)}%)
                                </Text>
                              </View>
                            </View>

                            {/* LR weight bar */}
                            <View style={styles.weightBarRow}>
                              <View style={styles.weightBarLabelCol}>
                                <Text style={styles.weightBarName}>Logistic Regression</Text>
                                <Text style={styles.weightBarPercent}>25% weight</Text>
                              </View>
                              <View style={styles.weightTrack}>
                                <View style={[styles.weightFillLr, { width: '25%' }]} />
                              </View>
                              <View style={styles.weightContribRow}>
                                <Text style={styles.weightContribLabel}>Contribution:</Text>
                                <Text style={styles.weightContribVal}>
                                  +{(item.logisticRegression?.contribution ?? 0).toFixed(4)} ({((item.logisticRegression?.contribution ?? 0) * 100).toFixed(1)}%)
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Separate Individual Model Predictions (Distinct from weights!) */}
                          <View style={styles.modelPredictionsSection}>
                            <Text style={styles.predictionsSectionLabel}>Individual Model Predictions:</Text>
                            <View style={styles.predictionsGrid}>
                              <View style={styles.predItem}>
                                <Text style={styles.predLabel}>KNN Similarity</Text>
                                <Text style={styles.predValue}>
                                  {((item.knn?.similarity ?? item.similarity ?? 0) * 100).toFixed(1)}%
                                </Text>
                              </View>
                              <View style={styles.predItem}>
                                <Text style={styles.predLabel}>RF Probability</Text>
                                <Text style={styles.predValue}>
                                  {item.randomForest?.probability !== undefined ? `${(item.randomForest.probability * 100).toFixed(1)}%` : 'N/A'}
                                </Text>
                              </View>
                              <View style={styles.predItem}>
                                <Text style={styles.predLabel}>LR Probability</Text>
                                <Text style={styles.predValue}>
                                  {item.logisticRegression?.probability !== undefined ? `${(item.logisticRegression.probability * 100).toFixed(1)}%` : 'N/A'}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Final Score Banner */}
                          <View style={styles.finalScoreBanner}>
                            <View style={styles.finalScoreLeft}>
                              <Text style={styles.finalScoreFormulaHeader}>Ensemble Equation:</Text>
                              <Text style={styles.finalScoreFormulaMath} numberOfLines={1}>
                                (KNN × 0.40) + (RF × 0.35) + (LR × 0.25)
                              </Text>
                            </View>
                            <View style={styles.finalScoreRightBadge}>
                              <Text style={styles.finalScoreBadgeTitle}>FINAL SCORE</Text>
                              <Text style={styles.finalScoreBadgeNum}>{item.score}%</Text>
                            </View>
                          </View>
                        </View>

                        {/* 2. CARD 1: KNN ANALYSIS */}
                        <View style={styles.analysisCard}>
                          <View style={styles.analysisCardHeader}>
                            <View style={styles.analysisTitleRow}>
                              <Text style={styles.analysisCardIcon}>🧠</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.analysisCardTitle}>KNN ANALYSIS</Text>
                                <Text style={styles.analysisCardSubtitle}>K-Nearest Neighbors Instance Matching</Text>
                              </View>
                            </View>
                            <View style={styles.knnKTag}>
                              <Text style={styles.knnKTagText}>K = 5</Text>
                            </View>
                          </View>

                          <View style={styles.metricGrid}>
                            <View style={styles.metricGridRow}>
                              <Text style={styles.metricLabel}>Distance Metric:</Text>
                              <Text style={styles.metricValue}>Euclidean</Text>
                            </View>
                            <View style={styles.metricGridRow}>
                              <Text style={styles.metricLabel}>Euclidean Distance (d):</Text>
                              <Text style={styles.metricValueMono}>
                                {typeof item.distance === 'number' ? item.distance.toFixed(4) : (item.knn?.distance?.toFixed(4) ?? '0.0000')}
                              </Text>
                            </View>
                            <View style={styles.metricGridRow}>
                              <Text style={styles.metricLabel}>KNN Similarity:</Text>
                              <Text style={styles.metricValueHighlight}>
                                {((item.knn?.similarity ?? item.similarity ?? 0) * 100).toFixed(2)}%
                              </Text>
                            </View>
                            <View style={styles.metricGridRow}>
                              <Text style={styles.metricLabel}>Neighbor Rank:</Text>
                              <Text style={styles.metricValue}>
                                #{item.neighborRank || 1} Nearest Neighbor
                              </Text>
                            </View>
                            <View style={styles.metricGridRow}>
                              <Text style={styles.metricLabel}>Model Weight:</Text>
                              <Text style={styles.metricValue}>40%</Text>
                            </View>
                            <View style={[styles.metricGridRow, styles.contribHighlightRow]}>
                              <Text style={styles.contribLabel}>KNN Contribution (Sim × 0.40):</Text>
                              <Text style={styles.contribValue}>
                                +{(item.knn?.contribution ?? ((item.similarity ?? 0) * 0.4)).toFixed(4)}
                                {' '}({((item.knn?.contribution ?? ((item.similarity ?? 0) * 0.4)) * 100).toFixed(2)}%)
                              </Text>
                            </View>
                          </View>

                          {/* Button: View Calculation */}
                          <TouchableOpacity
                            style={styles.calcToggleBtn}
                            onPress={() => setExpandedKnnCalcId((prev) => (prev === pet.id ? null : pet.id))}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.calcToggleBtnText}>
                              {expandedKnnCalcId === pet.id ? 'Hide Calculation ▴' : 'View Calculation ▾'}
                            </Text>
                          </TouchableOpacity>

                          {/* KNN Detailed Calculation Box */}
                          {expandedKnnCalcId === pet.id && (() => {
                            const uVec = item.userVectorCoordinates || [];
                            const pVec = item.vectorCoordinates || [];
                            const featNames = item.featureNames || [];
                            const dist = typeof item.distance === 'number' ? item.distance : (item.knn?.distance ?? 0);
                            const sim = item.knn?.similarity ?? item.similarity ?? 0;
                            
                            const rows: { index: number; name: string; uVal: number; pVal: number; diff: number; diffSq: number }[] = [];
                            let sumSq = 0;
                            const count = Math.min(21, Math.max(uVec.length, pVec.length));
                            for (let i = 0; i < count; i++) {
                              const u = uVec[i] ?? 0;
                              const p = pVec[i] ?? 0;
                              const diff = u - p;
                              const diffSq = diff * diff;
                              sumSq += diffSq;
                              const fKey = featNames[i] || `Feature ${i}`;
                              const fName = FEATURE_DISPLAY_NAMES[fKey] || fKey;
                              rows.push({ index: i, name: fName, uVal: u, pVal: p, diff, diffSq });
                            }

                            const showAll = showAllKnnFeaturesId === pet.id;
                            const nonZeroRows = rows.filter((r) => r.diffSq > 0.0001);
                            const displayedRows = showAll ? rows : (nonZeroRows.length > 0 ? nonZeroRows : rows.slice(0, 7));

                            return (
                              <View style={styles.calcDetailsContainer}>
                                <Text style={styles.calcSectionTitle}>Euclidean Distance Calculation</Text>
                                <View style={styles.calcFormulaBlock}>
                                  <Text style={styles.calcFormulaLine}>distance = √( Σ (userFeature[i] − petFeature[i])² )</Text>
                                  <Text style={styles.calcFormulaLine}>similarity = 1 / (1 + distance)</Text>
                                </View>

                                <Text style={styles.calcSubhead}>Feature-by-Feature Calculation:</Text>
                                <View style={styles.calcTable}>
                                  {displayedRows.map((r) => (
                                    <View key={r.index} style={styles.calcTableRow}>
                                      <View style={styles.calcTableRowLeft}>
                                        <Text style={styles.calcFeatureNum}>[{r.index}]</Text>
                                        <Text style={styles.calcFeatureName} numberOfLines={1}>{r.name}</Text>
                                      </View>
                                      <View style={styles.calcTableRowRight}>
                                        <Text style={styles.calcDiffMath}>
                                          ({r.uVal.toFixed(2)} − {r.pVal.toFixed(2)})² = {r.diffSq.toFixed(4)}
                                        </Text>
                                      </View>
                                    </View>
                                  ))}
                                </View>

                                {rows.length > nonZeroRows.length && (
                                  <TouchableOpacity
                                    onPress={() => setShowAllKnnFeaturesId((prev) => (prev === pet.id ? null : pet.id))}
                                    style={styles.showMoreFeaturesBtn}
                                  >
                                    <Text style={styles.showMoreFeaturesText}>
                                      {showAll ? 'Show Only Contributing Features' : `Show All 21 Features (${rows.length - nonZeroRows.length} with diff = 0)`}
                                    </Text>
                                  </TouchableOpacity>
                                )}

                                <View style={styles.calcSummaryBox}>
                                  <Text style={styles.calcSummaryLine}>
                                    Sum of squared differences = {sumSq.toFixed(4)}
                                  </Text>
                                  <Text style={styles.calcSummaryLine}>
                                    Distance = √({sumSq.toFixed(4)}) = {dist.toFixed(4)}
                                  </Text>
                                  <Text style={styles.calcSummaryLineHighlight}>
                                    Similarity = 1 / (1 + {dist.toFixed(4)}) = {sim.toFixed(4)} ({(sim * 100).toFixed(2)}%)
                                  </Text>
                                  <Text style={styles.calcSummaryLineContribution}>
                                    Contribution = {sim.toFixed(4)} × 0.40 = +{(sim * 0.40).toFixed(4)}
                                  </Text>
                                </View>
                              </View>
                            );
                          })()}
                        </View>

                        {/* 3. CARD 2: RANDOM FOREST ANALYSIS */}
                        <View style={styles.analysisCard}>
                          <View style={styles.analysisCardHeader}>
                            <View style={styles.analysisTitleRow}>
                              <Text style={styles.analysisCardIcon}>🌲</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.analysisCardTitle}>RANDOM FOREST ANALYSIS</Text>
                                <Text style={styles.analysisCardSubtitle}>Non-Linear Decision Tree Ensemble</Text>
                              </View>
                            </View>
                            <View style={styles.rfBadge}>
                              <Text style={styles.rfBadgeText}>30 Trees</Text>
                            </View>
                          </View>

                          <View style={styles.metricGrid}>
                            <View style={styles.metricGridRow}>
                              <Text style={styles.metricLabel}>Total Estimators (Trees):</Text>
                              <Text style={styles.metricValue}>30 Decision Trees</Text>
                            </View>
                            <View style={styles.metricGridRow}>
                              <Text style={styles.metricLabel}>Maximum Tree Depth:</Text>
                              <Text style={styles.metricValue}>6 Levels</Text>
                            </View>
                            <View style={styles.metricGridRow}>
                              <Text style={styles.metricLabel}>Prediction Probability (Class 1):</Text>
                              <Text style={styles.metricValueHighlight}>
                                {item.randomForest?.probability !== undefined ? `${(item.randomForest.probability * 100).toFixed(2)}%` : 'N/A'}
                              </Text>
                            </View>
                            <View style={styles.metricGridRow}>
                              <Text style={styles.metricLabel}>Model Weight:</Text>
                              <Text style={styles.metricValue}>35%</Text>
                            </View>
                            <View style={[styles.metricGridRow, styles.contribHighlightRow]}>
                              <Text style={styles.contribLabel}>RF Contribution (Prob × 0.35):</Text>
                              <Text style={styles.contribValue}>
                                +{(item.randomForest?.contribution ?? 0).toFixed(4)}
                                {' '}({((item.randomForest?.contribution ?? 0) * 100).toFixed(2)}%)
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.modelExplanationText}>
                            "The 30 decision trees evaluate the feature vector using their learned thresholds. The final RF probability is the average class-1 probability across the trees."
                          </Text>

                          {/* Button: View Tree Calculation */}
                          <TouchableOpacity
                            style={styles.calcToggleBtn}
                            onPress={() => setExpandedRfCalcId((prev) => (prev === pet.id ? null : pet.id))}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.calcToggleBtnText}>
                              {expandedRfCalcId === pet.id ? 'Hide Tree Calculation ▴' : 'View Tree Calculation ▾'}
                            </Text>
                          </TouchableOpacity>

                          {/* Tree Trace Details */}
                          {expandedRfCalcId === pet.id && (() => {
                            const pFeatures = (item.pairwiseFeatures && item.pairwiseFeatures.length >= 25)
                              ? item.pairwiseFeatures
                              : (typeof extractPairwiseFeatures === 'function' ? extractPairwiseFeatures(currentQuestionnaire, pet) : []);
                            const traces = (typeof traceRandomForestTrees === 'function' ? traceRandomForestTrees(pFeatures) : []) || [];
                            const showAll = showAllRfTreesId === pet.id;
                            const displayedTraces = showAll ? traces : traces.slice(0, 5);

                            return (
                              <View style={styles.calcDetailsContainer}>
                                <Text style={styles.calcSectionTitle}>Decision Tree Path Tracing</Text>
                                <Text style={styles.calcSubtitle}>
                                  The Random Forest model consists of 30 learned decision trees. Below are the decision paths and thresholds evaluating this pet:
                                </Text>

                                {displayedTraces.map((t: any) => (
                                  <View key={t.treeIndex} style={styles.treeTraceCard}>
                                    <View style={styles.treeTraceHeader}>
                                      <Text style={styles.treeTraceTitle}>Tree #{t.treeIndex}</Text>
                                      <Text style={styles.treeLeafProb}>
                                        Leaf P(Match): {((t.leafProbability ?? 0.5) * 100).toFixed(1)}%
                                      </Text>
                                    </View>
                                    <View style={styles.treePathSteps}>
                                      {(t.steps || []).map((st: any, sIdx: number) => (
                                        <View key={sIdx} style={styles.treeStepRow}>
                                          <Text style={styles.treeStepNum}>{sIdx + 1}.</Text>
                                          <Text style={styles.treeStepText}>
                                            <Text style={styles.treeStepFeature}>{st.featureName}</Text> ({(st.featureValue ?? 0).toFixed(2)}) {st.goesLeft ? '≤' : '>'} {(st.threshold ?? 0).toFixed(2)} → <Text style={{ color: st.goesLeft ? PetConnectColors.primary : '#16A34A', fontWeight: '700' }}>{st.goesLeft ? 'Left branch' : 'Right branch'}</Text>
                                          </Text>
                                        </View>
                                      ))}
                                    </View>
                                  </View>
                                ))}

                                <Text style={styles.treesEvaluatedNotice}>
                                  {showAll ? 'Showing all 30 evaluated decision trees' : 'Showing first 5 representative trees out of 30'}
                                </Text>

                                <TouchableOpacity
                                  onPress={() => setShowAllRfTreesId((prev) => (prev === pet.id ? null : pet.id))}
                                  style={styles.showMoreFeaturesBtn}
                                >
                                  <Text style={styles.showMoreFeaturesText}>
                                    {showAll ? 'Show Fewer Trees (First 5) ▴' : 'Show All 30 Decision Trees ▾'}
                                  </Text>
                                </TouchableOpacity>

                                <View style={styles.calcSummaryBox}>
                                  <Text style={styles.calcSummaryLine}>
                                    Average of 30 trees = {(item.randomForest?.probability ?? 0).toFixed(4)}
                                  </Text>
                                  <Text style={styles.calcSummaryLineContribution}>
                                    Contribution = {(item.randomForest?.probability ?? 0).toFixed(4)} × 0.35 = +{(item.randomForest?.contribution ?? 0).toFixed(4)}
                                  </Text>
                                </View>
                              </View>
                            );
                          })()}
                        </View>

                        {/* 4. CARD 3: LOGISTIC REGRESSION ANALYSIS */}
                        <View style={styles.analysisCard}>
                          <View style={styles.analysisCardHeader}>
                            <View style={styles.analysisTitleRow}>
                              <Text style={styles.analysisCardIcon}>📈</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.analysisCardTitle}>LOGISTIC REGRESSION ANALYSIS</Text>
                                <Text style={styles.analysisCardSubtitle}>Standardized Linear Logit with Sigmoid Activation</Text>
                              </View>
                            </View>
                            <View style={styles.lrBadge}>
                              <Text style={styles.lrBadgeText}>StandardScaler</Text>
                            </View>
                          </View>

                          <View style={styles.metricGrid}>
                            <View style={styles.metricGridRow}>
                              <Text style={styles.metricLabel}>Feature Dimension:</Text>
                              <Text style={styles.metricValue}>25 Pairwise Features</Text>
                            </View>
                            <View style={styles.metricGridRow}>
                              <Text style={styles.metricLabel}>Feature Scaler:</Text>
                              <Text style={styles.metricValue}>StandardScaler (μ, σ)</Text>
                            </View>
                            <View style={styles.metricGridRow}>
                              <Text style={styles.metricLabel}>Activation Function:</Text>
                              <Text style={styles.metricValue}>Sigmoid: 1 / (1 + e⁻ᶻ)</Text>
                            </View>
                            <View style={styles.metricGridRow}>
                              <Text style={styles.metricLabel}>Probability Output:</Text>
                              <Text style={styles.metricValueHighlight}>
                                {item.logisticRegression?.probability !== undefined ? `${(item.logisticRegression.probability * 100).toFixed(2)}%` : 'N/A'}
                              </Text>
                            </View>
                            <View style={styles.metricGridRow}>
                              <Text style={styles.metricLabel}>Model Weight:</Text>
                              <Text style={styles.metricValue}>25%</Text>
                            </View>
                            <View style={[styles.metricGridRow, styles.contribHighlightRow]}>
                              <Text style={styles.contribLabel}>LR Contribution (Prob × 0.25):</Text>
                              <Text style={styles.contribValue}>
                                +{(item.logisticRegression?.contribution ?? 0).toFixed(4)}
                                {' '}({((item.logisticRegression?.contribution ?? 0) * 100).toFixed(2)}%)
                              </Text>
                            </View>
                          </View>

                          {/* Button: View Feature Contributions */}
                          <TouchableOpacity
                            style={styles.calcToggleBtn}
                            onPress={() => setExpandedLrCalcId((prev) => (prev === pet.id ? null : pet.id))}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.calcToggleBtnText}>
                              {expandedLrCalcId === pet.id ? 'Hide Feature Contributions ▴' : 'View Feature Contributions ▾'}
                            </Text>
                          </TouchableOpacity>

                          {/* LR Feature Contributions Breakdown */}
                          {expandedLrCalcId === pet.id && (() => {
                            const pFeatures = (item.pairwiseFeatures && item.pairwiseFeatures.length >= 25)
                              ? item.pairwiseFeatures
                              : (typeof extractPairwiseFeatures === 'function' ? extractPairwiseFeatures(currentQuestionnaire, pet) : []);
                            const lrTrace = (typeof getLogisticRegressionTrace === 'function' ? getLogisticRegressionTrace(pFeatures) : null) || {
                              intercept: 0.7327,
                              logit: 0,
                              probability: item.logisticRegression?.probability ?? 0.5,
                              features: [],
                              topPositive: [],
                              topNegative: [],
                            };
                            const showAll = showAllLrFeaturesId === pet.id;

                            return (
                              <View style={styles.calcDetailsContainer}>
                                <Text style={styles.calcSectionTitle}>Standardized Feature & Logit Calculation</Text>
                                <View style={styles.calcFormulaBlock}>
                                  <Text style={styles.calcFormulaLine}>z_i = (x_i − μ_i) / σ_i</Text>
                                  <Text style={styles.calcFormulaLine}>logit = β_0 + Σ β_i · z_i</Text>
                                  <Text style={styles.calcFormulaLine}>Probability = 1 / (1 + e⁻ᶻ)</Text>
                                </View>

                                <View style={styles.lrMathSummaryRow}>
                                  <Text style={styles.lrMathItem}>• Intercept (β₀): {(lrTrace.intercept ?? 0.7327).toFixed(4)}</Text>
                                  <Text style={styles.lrMathItem}>• Computed Logit (z): {(lrTrace.logit ?? 0).toFixed(4)}</Text>
                                </View>

                                <Text style={styles.calcSubhead}>Strongest Positive Compatibility Drivers:</Text>
                                <View style={styles.lrDriversList}>
                                  {(lrTrace.topPositive || []).map((f: any) => (
                                    <View key={f.index} style={styles.lrDriverRow}>
                                      <View style={styles.lrDriverLeft}>
                                        <Text style={styles.lrDriverName} numberOfLines={1}>{f.name}</Text>
                                        <Text style={styles.lrDriverSub}>Raw: {(f.rawValue ?? 0).toFixed(2)} • z: {(f.standardizedValue ?? 0).toFixed(2)} • β: {(f.weight ?? 0).toFixed(2)}</Text>
                                      </View>
                                      <Text style={styles.lrDriverPositive}>+{(f.contribution ?? 0).toFixed(4)}</Text>
                                    </View>
                                  ))}
                                </View>

                                <Text style={[styles.calcSubhead, { marginTop: 10 }]}>Strongest Negative Compatibility Drivers:</Text>
                                <View style={styles.lrDriversList}>
                                  {(lrTrace.topNegative || []).map((f: any) => (
                                    <View key={f.index} style={styles.lrDriverRow}>
                                      <View style={styles.lrDriverLeft}>
                                        <Text style={styles.lrDriverName} numberOfLines={1}>{f.name}</Text>
                                        <Text style={styles.lrDriverSub}>Raw: {(f.rawValue ?? 0).toFixed(2)} • z: {(f.standardizedValue ?? 0).toFixed(2)} • β: {(f.weight ?? 0).toFixed(2)}</Text>
                                      </View>
                                      <Text style={styles.lrDriverNegative}>{(f.contribution ?? 0).toFixed(4)}</Text>
                                    </View>
                                  ))}
                                </View>

                                {showAll && (
                                  <View style={styles.lrAllFeaturesBox}>
                                    <Text style={styles.calcSubhead}>All 25 Standardized Features:</Text>
                                    {(lrTrace.features || []).map((f: any) => (
                                      <View key={f.index} style={styles.lrAllRow}>
                                        <Text style={styles.lrAllIndex}>[{f.index}]</Text>
                                        <Text style={styles.lrAllName} numberOfLines={1}>{f.name}</Text>
                                        <Text style={styles.lrAllContrib}>
                                          {(f.contribution ?? 0) >= 0 ? `+${(f.contribution ?? 0).toFixed(4)}` : (f.contribution ?? 0).toFixed(4)}
                                        </Text>
                                      </View>
                                    ))}
                                  </View>
                                )}

                                <TouchableOpacity
                                  onPress={() => setShowAllLrFeaturesId((prev) => (prev === pet.id ? null : pet.id))}
                                  style={styles.showMoreFeaturesBtn}
                                >
                                  <Text style={styles.showMoreFeaturesText}>
                                    {showAll ? 'Hide Full Feature List ▴' : 'Show All 25 Standardized Feature Coefficients ▾'}
                                  </Text>
                                </TouchableOpacity>

                                <View style={styles.calcSummaryBox}>
                                  <Text style={styles.calcSummaryLine}>
                                    Logit z = {(lrTrace.logit ?? 0).toFixed(4)}
                                  </Text>
                                  <Text style={styles.calcSummaryLineHighlight}>
                                    Sigmoid = 1 / (1 + e^(-({(lrTrace.logit ?? 0).toFixed(4)}))) = {(lrTrace.probability ?? (item.logisticRegression?.probability ?? 0.5)).toFixed(4)} ({((lrTrace.probability ?? (item.logisticRegression?.probability ?? 0.5)) * 100).toFixed(2)}%)
                                  </Text>
                                  <Text style={styles.calcSummaryLineContribution}>
                                    Contribution = {(lrTrace.probability ?? (item.logisticRegression?.probability ?? 0.5)).toFixed(4)} × 0.25 = +{((lrTrace.probability ?? (item.logisticRegression?.probability ?? 0.5)) * 0.25).toFixed(4)}
                                  </Text>
                                </View>
                              </View>
                            );
                          })()}
                        </View>

                        {/* 5. SECTION: FEATURE / VECTOR DETAILS */}
                        <View style={styles.analysisCard}>
                          <View style={styles.analysisCardHeader}>
                            <View style={styles.analysisTitleRow}>
                              <Text style={styles.analysisCardIcon}>📐</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.analysisCardTitle}>FEATURE / VECTOR DETAILS</Text>
                                <Text style={styles.analysisCardSubtitle}>Normalized ℝ²¹ Feature Embedding</Text>
                              </View>
                            </View>
                            <View style={styles.vectorDimBadge}>
                              <Text style={styles.vectorDimBadgeText}>21 Dimensions</Text>
                            </View>
                          </View>

                          <Text style={styles.modelExplanationText}>
                            "Both user preferences and pet characteristics are mapped into the same 21-dimensional normalized vector space for distance evaluation."
                          </Text>

                          <TouchableOpacity
                            style={styles.calcToggleBtn}
                            onPress={() => setExpandedVectorPetId((prev) => (prev === pet.id ? null : pet.id))}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.calcToggleBtnText}>
                              {expandedVectorPetId === pet.id ? 'Hide Feature Vector ▴' : 'View Feature Vector ▾'}
                            </Text>
                          </TouchableOpacity>

                          {expandedVectorPetId === pet.id && (() => {
                            const uVec = item.userVectorCoordinates || [];
                            const pVec = item.vectorCoordinates || [];
                            const featNames = item.featureNames || [];
                            const count = Math.min(21, Math.max(uVec.length, pVec.length));
                            
                            const vectorRows = [];
                            for (let i = 0; i < count; i++) {
                              const u = uVec[i] ?? 0;
                              const p = pVec[i] ?? 0;
                              const diff = u - p;
                              const fKey = featNames[i] || `Feature ${i}`;
                              const fName = FEATURE_DISPLAY_NAMES[fKey] || fKey;
                              vectorRows.push({ index: i, name: fName, u, p, diff });
                            }

                            return (
                              <View style={styles.calcDetailsContainer}>
                                {/* User & Pet Vector Arrays */}
                                <View style={styles.rawVectorBlock}>
                                  <Text style={styles.rawVectorLabel}>USER VECTOR (U):</Text>
                                  <Text style={styles.rawVectorText} selectable>
                                    [{uVec.slice(0, 21).map(n => n.toFixed(2)).join(', ')}]
                                  </Text>
                                </View>

                                <View style={styles.rawVectorBlock}>
                                  <Text style={styles.rawVectorLabel}>PET VECTOR (P) — {pet.name.toUpperCase()}:</Text>
                                  <Text style={styles.rawVectorText} selectable>
                                    [{pVec.slice(0, 21).map(n => n.toFixed(2)).join(', ')}]
                                  </Text>
                                </View>

                                <Text style={styles.calcSubhead}>21-Dimensional Feature Breakdown:</Text>
                                <View style={styles.vectorCardsList}>
                                  {vectorRows.map((r) => (
                                    <View key={r.index} style={styles.vectorRowCard}>
                                      <View style={styles.vectorRowTop}>
                                        <Text style={styles.vectorRowIndex}>#{r.index}</Text>
                                        <Text style={styles.vectorRowName} numberOfLines={1}>{r.name}</Text>
                                        <Text style={[
                                          styles.vectorRowDiff,
                                          Math.abs(r.diff) < 0.01 ? styles.diffZero : (r.diff > 0 ? styles.diffPositive : styles.diffNegative)
                                        ]}>
                                          Δ {r.diff >= 0 ? `+${r.diff.toFixed(2)}` : r.diff.toFixed(2)}
                                        </Text>
                                      </View>
                                      <View style={styles.vectorValuesRow}>
                                        <Text style={styles.vectorValItem}>User: <Text style={styles.vectorValNum}>{r.u.toFixed(2)}</Text></Text>
                                        <Text style={styles.vectorValItem}>Pet: <Text style={styles.vectorValNum}>{r.p.toFixed(2)}</Text></Text>
                                        <Text style={styles.vectorValItem}>Diff²: <Text style={styles.vectorValNum}>{(r.diff * r.diff).toFixed(4)}</Text></Text>
                                      </View>
                                    </View>
                                  ))}
                                </View>
                              </View>
                            );
                          })()}
                        </View>

                        {/* 6. FINAL ENSEMBLE CALCULATION CARD */}
                        <View style={styles.finalCalcCard}>
                          <View style={styles.finalCalcHeader}>
                            <Text style={styles.finalCalcIcon}>✨</Text>
                            <Text style={styles.finalCalcTitle}>FINAL ENSEMBLE CALCULATION</Text>
                          </View>

                          <Text style={styles.finalCalcStepLabel}>Step 1: Mathematical Formula</Text>
                          <View style={styles.formulaRowCard}>
                            <Text style={styles.formulaRowText}>
                              Final Ensemble = (KNN × 0.40) + (RF × 0.35) + (LR × 0.25)
                            </Text>
                          </View>

                          <Text style={styles.finalCalcStepLabel}>Step 2: Real Runtime Value Substitution</Text>
                          <View style={styles.formulaRowCard}>
                            <Text style={styles.formulaSubstLine}>
                              = ({((item.knn?.similarity ?? item.similarity ?? 0)).toFixed(4)} × 0.40)
                            </Text>
                            <Text style={styles.formulaSubstLine}>
                              + ({(item.randomForest?.probability ?? 0).toFixed(4)} × 0.35)
                            </Text>
                            <Text style={styles.formulaSubstLine}>
                              + ({(item.logisticRegression?.probability ?? 0).toFixed(4)} × 0.25)
                            </Text>
                          </View>

                          <Text style={styles.finalCalcStepLabel}>Step 3: Weighted Summation</Text>
                          <View style={styles.formulaRowCard}>
                            <Text style={styles.formulaSumLine}>
                              = {(item.knn?.contribution ?? ((item.similarity ?? 0) * 0.4)).toFixed(4)} (KNN)
                            </Text>
                            <Text style={styles.formulaSumLine}>
                              + {(item.randomForest?.contribution ?? 0).toFixed(4)} (RF)
                            </Text>
                            <Text style={styles.formulaSumLine}>
                              + {(item.logisticRegression?.contribution ?? 0).toFixed(4)} (LR)
                            </Text>
                            <View style={styles.formulaDivider} />
                            <Text style={styles.formulaTotalLine}>
                              = {(item.ensemble?.score !== undefined ? item.ensemble.score : (item.score / 100)).toFixed(4)}
                            </Text>
                          </View>

                          {/* Final Score Result Card */}
                          <View style={styles.finalResultHighlightCard}>
                            <View style={styles.finalResultTextCol}>
                              <Text style={styles.finalResultLabel}>Final Match Percentage</Text>
                              <Text style={styles.finalResultSub}>ensembleScore × 100</Text>
                            </View>
                            <View style={styles.finalResultScoreBadge}>
                              <Text style={styles.finalResultScoreText}>{item.score}%</Text>
                            </View>
                          </View>
                        </View>

                        {/* 7. COMPATIBILITY DIMENSIONS ACCORDION */}
                        <View style={styles.compatDimensionsSection}>
                          <Text style={styles.compatSectionHeading}>LIFESTYLE & COMPATIBILITY DIMENSIONS</Text>
                          <View style={styles.compatList}>
                            {[
                              { icon: '🏠', title: 'Living situation', data: item.scoreBreakdown.livingSituation },
                              { icon: '🏃', title: 'Activity level', data: item.scoreBreakdown.activityLevel },
                              { icon: '📍', title: 'Location proximity', data: item.scoreBreakdown.location },
                              { icon: '👨‍👩‍👧', title: 'Household dynamic', data: item.scoreBreakdown.household },
                              { icon: '🎓', title: 'Care experience', data: item.scoreBreakdown.experience },
                              { icon: '❤️', title: 'Personality match', data: item.scoreBreakdown.personality },
                            ].map((dim, dIdx) => (
                              <View key={dIdx} style={styles.compatItem}>
                                <View style={styles.compatItemHeader}>
                                  <View style={styles.compatTitleContainer}>
                                    <Text style={styles.compatItemIcon}>{dim.icon}</Text>
                                    <Text style={styles.compatItemTitle} numberOfLines={1}>
                                      {dim.title}
                                    </Text>
                                  </View>
                                  <View
                                    style={[
                                      styles.dimStatusPill,
                                      dim.data.label === 'Excellent' && styles.dimStatusExcellent,
                                      dim.data.label === 'Good' && styles.dimStatusGood,
                                      dim.data.label === 'Compatible' && styles.dimStatusCompatible,
                                      dim.data.label === 'Needs Attention' && styles.dimStatusNeedsAttention,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.dimStatusText,
                                        dim.data.label === 'Excellent' && styles.dimStatusTextExcellent,
                                        dim.data.label === 'Good' && styles.dimStatusTextGood,
                                        dim.data.label === 'Compatible' && styles.dimStatusTextCompatible,
                                        dim.data.label === 'Needs Attention' && styles.dimStatusTextNeedsAttention,
                                      ]}
                                      numberOfLines={1}
                                    >
                                      {dim.data.label}
                                    </Text>
                                  </View>
                                </View>
                                <Text style={styles.compatItemDetail}>
                                  {dim.data.detail}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      </View>
                    )}

                    {/* View Pet Profile Button */}
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: '/pet/[id]' as any,
                          params: { id: pet.id },
                        })
                      }
                      style={styles.viewPetBtn}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.viewPetBtnText}>View {pet.name}'s Profile</Text>
                      <ChevronRight size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 3. Questionnaire Form Screen
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Questionnaire Top Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevStep} style={styles.headerBtn}>
          <ChevronLeft size={24} color={PetConnectColors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Pet Match</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <X size={22} color="#89726A" />
        </TouchableOpacity>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressSection}>
        <View style={styles.progressTextRow}>
          <Text style={styles.stepCounterText}>
            Step {currentStep} of {TOTAL_STEPS}
          </Text>
          <Text style={styles.stepPercentageText}>{progressPercent}%</Text>
        </View>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarActive, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* Question Form Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.questionScrollContent}>
        {renderQuestionStep()}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.stickyFooter}>
        {currentStep > 1 ? (
          <TouchableOpacity onPress={handlePrevStep} style={styles.prevButton} activeOpacity={0.8}>
            <Text style={styles.prevButtonText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 0 }} />
        )}

        <TouchableOpacity onPress={handleNextStep} style={styles.nextButton} activeOpacity={0.85}>
          <Text style={styles.nextButtonText}>
            {currentStep === TOTAL_STEPS ? 'Find My Matches 🐾' : 'Continue'}
          </Text>
          <ChevronRight size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PetConnectColors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: PetConnectColors.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(221, 193, 183, 0.4)',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: PetConnectColors.onSurface,
    letterSpacing: -0.2,
  },
  progressSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(221, 193, 183, 0.3)',
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stepCounterText: {
    fontSize: 12,
    fontWeight: '700',
    color: PetConnectColors.primary,
  },
  stepPercentageText: {
    fontSize: 12,
    fontWeight: '600',
    color: PetConnectColors.onSurfaceVariant,
  },
  progressBarBackground: {
    height: 6,
    borderRadius: 3,
    backgroundColor: PetConnectColors.surfaceContainer,
    overflow: 'hidden',
  },
  progressBarActive: {
    height: '100%',
    backgroundColor: PetConnectColors.primary,
    borderRadius: 3,
  },
  questionScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  stepContainer: {
    width: '100%',
  },
  stepIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 140, 97, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: PetConnectColors.onSurface,
    letterSpacing: -0.3,
    lineHeight: 28,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    color: PetConnectColors.onSurfaceVariant,
    lineHeight: 20,
    marginBottom: 20,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'rgba(221, 193, 183, 0.55)',
    shadowColor: '#332E2C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  optionCardSelected: {
    borderColor: PetConnectColors.primary,
    backgroundColor: '#FFF4EF',
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    marginBottom: 3,
  },
  optionTitleSelected: {
    color: PetConnectColors.primary,
    fontWeight: '800',
  },
  optionDesc: {
    fontSize: 13,
    color: PetConnectColors.onSurfaceVariant,
    lineHeight: 17,
  },
  optionDescSelected: {
    color: '#5E4137',
    fontWeight: '500',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(221, 193, 183, 0.9)',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  radioCircleSelected: {
    borderColor: PetConnectColors.primary,
    backgroundColor: PetConnectColors.primary,
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  locationInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(221, 193, 183, 0.8)',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 16,
  },
  locationTextInput: {
    flex: 1,
    fontSize: 15,
    color: PetConnectColors.onSurface,
  },
  quickSelectLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: PetConnectColors.onSurfaceVariant,
    marginBottom: 10,
  },
  quickCitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cityChip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(221, 193, 183, 0.7)',
  },
  cityChipSelected: {
    backgroundColor: PetConnectColors.primary,
    borderColor: PetConnectColors.primary,
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  cityChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: PetConnectColors.onSurface,
  },
  cityChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  prefChip: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(221, 193, 183, 0.7)',
  },
  prefChipSelected: {
    backgroundColor: PetConnectColors.primary,
    borderColor: PetConnectColors.primary,
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  prefChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: PetConnectColors.onSurface,
  },
  prefChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(221, 193, 183, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
  },
  prevButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: PetConnectColors.surfaceContainer,
  },
  prevButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PetConnectColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Loading Screen Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingPulseCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255, 140, 97, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: PetConnectColors.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 13,
    color: PetConnectColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Results Screen Styles
  resultsScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  resultsHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.5)',
    shadowColor: '#752501',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  resultsHeroLeft: {
    flex: 1,
  },
  resultsHeroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: PetConnectColors.onSurface,
  },
  resultsHeroSub: {
    fontSize: 12,
    color: PetConnectColors.onSurfaceVariant,
    marginTop: 2,
  },
  retakeMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: PetConnectColors.surfaceContainer,
  },
  retakeMiniBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: PetConnectColors.primary,
  },

  // Match Card Styles
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(221, 193, 183, 0.6)',
    shadowColor: '#332E2C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  matchImageContainer: {
    height: 220,
    width: '100%',
    position: 'relative',
  },
  matchImage: {
    width: '100%',
    height: '100%',
  },
  matchFavoriteBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  matchRankBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: PetConnectColors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  matchRankText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  matchCardBody: {
    padding: 18,
  },
  matchTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  matchPetName: {
    fontSize: 20,
    fontWeight: '800',
    color: PetConnectColors.onSurface,
    letterSpacing: -0.2,
  },
  matchPetBreed: {
    fontSize: 13,
    color: PetConnectColors.onSurfaceVariant,
    fontWeight: '600',
    marginTop: 2,
  },
  scoreBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 140, 97, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 97, 0.4)',
  },
  scoreBadgeStar: {
    fontSize: 13,
  },
  scoreBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: PetConnectColors.primary,
  },
  matchLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    marginBottom: 12,
  },
  matchLocationText: {
    fontSize: 12,
    color: PetConnectColors.onSurfaceVariant,
    fontWeight: '500',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: PetConnectColors.surfaceContainer,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: PetConnectColors.primary,
    borderRadius: 4,
  },
  aiExplanationCard: {
    backgroundColor: 'rgba(255, 140, 97, 0.08)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 97, 0.25)',
    marginBottom: 14,
  },
  aiExplanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiExplanationTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: PetConnectColors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aiExplanationText: {
    fontSize: 13,
    color: PetConnectColors.onSurface,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  aiConsiderationBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 140, 97, 0.2)',
  },
  aiConsiderationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#89726A',
    marginBottom: 2,
  },
  aiConsiderationText: {
    fontSize: 12,
    color: PetConnectColors.onSurfaceVariant,
    lineHeight: 16,
  },
  breakdownToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(221, 193, 183, 0.35)',
    marginBottom: 14,
  },
  breakdownToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: PetConnectColors.primary,
  },
  breakdownContainer: {
    backgroundColor: PetConnectColors.surfaceContainerLow,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.4)',
  },
  compatList: {
    gap: 12,
  },
  compatItem: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(221, 193, 183, 0.25)',
  },
  compatItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  compatTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexShrink: 1,
  },
  compatItemIcon: {
    fontSize: 14,
  },
  compatItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    flexShrink: 1,
  },
  compatItemDetail: {
    fontSize: 12,
    color: PetConnectColors.onSurfaceVariant,
    lineHeight: 17,
    marginTop: 4,
    paddingLeft: 20,
    flexWrap: 'wrap',
  },
  dimStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: PetConnectColors.surfaceContainer,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimStatusExcellent: {
    backgroundColor: '#DCFCE7',
  },
  dimStatusGood: {
    backgroundColor: '#E0F2FE',
  },
  dimStatusCompatible: {
    backgroundColor: '#FEF3C7',
  },
  dimStatusNeedsAttention: {
    backgroundColor: '#FEE2E2',
  },
  dimStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: PetConnectColors.onSurface,
  },
  dimStatusTextExcellent: {
    color: '#15803D',
  },
  dimStatusTextGood: {
    color: '#0369A1',
  },
  dimStatusTextCompatible: {
    color: '#B45309',
  },
  dimStatusTextNeedsAttention: {
    color: '#B91C1C',
  },

  // 0. Match Breakdown Header Card
  breakdownHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 140, 97, 0.35)',
    gap: 4,
  },
  breakdownHeaderTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#752501',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  breakdownPetName: {
    fontSize: 18,
    fontWeight: '900',
    color: PetConnectColors.onSurface,
    letterSpacing: -0.2,
  },
  breakdownPetCategory: {
    fontSize: 12,
    color: PetConnectColors.onSurfaceVariant,
    fontWeight: '600',
    marginBottom: 4,
  },
  breakdownScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(221, 193, 183, 0.3)',
    gap: 8,
  },
  breakdownScoreLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    flexShrink: 1,
  },
  breakdownScoreBadge: {
    backgroundColor: PetConnectColors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    flexShrink: 0,
  },
  breakdownScoreBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // 1. Final Ensemble Card Styles
  finalEnsembleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 140, 97, 0.35)',
    shadowColor: '#752501',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  ensembleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  ensembleCardTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#752501',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  ensemblePill: {
    backgroundColor: 'rgba(255, 140, 97, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 0,
  },
  ensemblePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: PetConnectColors.primary,
  },
  weightsBarSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  weightsSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: PetConnectColors.onSurface,
    marginBottom: 2,
  },
  weightBarRow: {
    gap: 4,
  },
  weightBarLabelCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weightBarName: {
    fontSize: 11,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  weightBarPercent: {
    fontSize: 11,
    fontWeight: '800',
    color: PetConnectColors.primary,
  },
  weightTrack: {
    height: 8,
    backgroundColor: 'rgba(221, 193, 183, 0.35)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  weightFillKnn: {
    height: '100%',
    backgroundColor: '#0284C7',
    borderRadius: 4,
  },
  weightFillRf: {
    height: '100%',
    backgroundColor: '#16A34A',
    borderRadius: 4,
  },
  weightFillLr: {
    height: '100%',
    backgroundColor: '#9333EA',
    borderRadius: 4,
  },
  weightContribRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weightContribLabel: {
    fontSize: 10,
    color: '#89726A',
  },
  weightContribVal: {
    fontSize: 10,
    fontWeight: '800',
    color: PetConnectColors.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Separate Model Predictions Grid
  modelPredictionsSection: {
    gap: 6,
  },
  predictionsSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: PetConnectColors.onSurface,
  },
  predictionsGrid: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  predItem: {
    flex: 1,
    backgroundColor: 'rgba(255, 140, 97, 0.08)',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 97, 0.2)',
  },
  predLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#89726A',
    textAlign: 'center',
    marginBottom: 2,
  },
  predValue: {
    fontSize: 13,
    fontWeight: '900',
    color: PetConnectColors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Final Score Banner
  finalScoreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 140, 97, 0.12)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 97, 0.3)',
    gap: 8,
  },
  finalScoreLeft: {
    flex: 1,
    flexShrink: 1,
  },
  finalScoreFormulaHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#752501',
    marginBottom: 2,
  },
  finalScoreFormulaMath: {
    fontSize: 10,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  finalScoreRightBadge: {
    backgroundColor: PetConnectColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    flexShrink: 0,
  },
  finalScoreBadgeTitle: {
    fontSize: 8,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.5,
  },
  finalScoreBadgeNum: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // 2. Individual Model Analysis Cards
  analysisCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.5)',
    shadowColor: '#332E2C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 10,
  },
  analysisCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  analysisTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    flexShrink: 1,
  },
  analysisCardIcon: {
    fontSize: 18,
  },
  analysisCardTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#752501',
    letterSpacing: 0.5,
  },
  analysisCardSubtitle: {
    fontSize: 10,
    color: PetConnectColors.onSurfaceVariant,
    fontWeight: '500',
  },
  knnKTag: {
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 0,
  },
  knnKTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
  },
  rfBadge: {
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 0,
  },
  rfBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  lrBadge: {
    backgroundColor: 'rgba(147, 51, 234, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 0,
  },
  lrBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9333EA',
  },
  vectorDimBadge: {
    backgroundColor: 'rgba(255, 140, 97, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 0,
  },
  vectorDimBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: PetConnectColors.primary,
  },

  // Metric Grid Rows
  metricGrid: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  metricGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  metricLabel: {
    fontSize: 11,
    color: PetConnectColors.onSurfaceVariant,
    fontWeight: '600',
    flex: 1,
    flexShrink: 1,
  },
  metricValue: {
    fontSize: 11,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    flexShrink: 0,
  },
  metricValueMono: {
    fontSize: 11,
    fontWeight: '800',
    color: PetConnectColors.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flexShrink: 0,
  },
  metricValueHighlight: {
    fontSize: 12,
    fontWeight: '900',
    color: PetConnectColors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flexShrink: 0,
  },
  contribHighlightRow: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(221, 193, 183, 0.3)',
    marginTop: 2,
  },
  contribLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#752501',
    flex: 1,
    flexShrink: 1,
  },
  contribValue: {
    fontSize: 12,
    fontWeight: '900',
    color: PetConnectColors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flexShrink: 0,
  },

  modelExplanationText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#89726A',
    lineHeight: 16,
    paddingHorizontal: 2,
  },

  // Calculation Toggle Buttons
  calcToggleBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 140, 97, 0.12)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 97, 0.3)',
    marginTop: 2,
  },
  calcToggleBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: PetConnectColors.primary,
  },

  // Detailed Calculation Containers
  calcDetailsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 12,
    padding: 10,
    gap: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.3)',
  },
  calcSectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#752501',
    letterSpacing: 0.3,
  },
  calcSubtitle: {
    fontSize: 10,
    color: PetConnectColors.onSurfaceVariant,
    lineHeight: 14,
  },
  calcFormulaBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.35)',
    gap: 3,
  },
  calcFormulaLine: {
    fontSize: 10,
    fontWeight: '700',
    color: PetConnectColors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 15,
  },
  calcSubhead: {
    fontSize: 10,
    fontWeight: '800',
    color: PetConnectColors.onSurface,
    marginTop: 2,
  },

  // Feature by feature calculation table
  calcTable: {
    gap: 4,
  },
  calcTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(221, 193, 183, 0.2)',
    gap: 8,
  },
  calcTableRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    flexShrink: 1,
  },
  calcFeatureNum: {
    fontSize: 9,
    fontWeight: '800',
    color: '#89726A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  calcFeatureName: {
    fontSize: 10,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    flexShrink: 1,
  },
  calcTableRowRight: {
    flexShrink: 0,
  },
  calcDiffMath: {
    fontSize: 10,
    color: PetConnectColors.onSurfaceVariant,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  showMoreFeaturesBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.5)',
    marginTop: 4,
  },
  showMoreFeaturesText: {
    fontSize: 10,
    fontWeight: '700',
    color: PetConnectColors.primary,
    textAlign: 'center',
  },

  calcSummaryBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 97, 0.3)',
    gap: 4,
    marginTop: 4,
  },
  calcSummaryLine: {
    fontSize: 10,
    color: PetConnectColors.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 15,
    flexWrap: 'wrap',
  },
  calcSummaryLineHighlight: {
    fontSize: 10,
    fontWeight: '800',
    color: PetConnectColors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 15,
    flexWrap: 'wrap',
  },
  calcSummaryLineContribution: {
    fontSize: 11,
    fontWeight: '900',
    color: '#16A34A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
    marginTop: 2,
    flexWrap: 'wrap',
  },

  // Tree Trace Styles
  treeTraceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.4)',
    gap: 4,
  },
  treeTraceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(221, 193, 183, 0.25)',
    paddingBottom: 4,
  },
  treeTraceTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  treeLeafProb: {
    fontSize: 10,
    fontWeight: '800',
    color: PetConnectColors.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  treePathSteps: {
    gap: 3,
    paddingTop: 2,
  },
  treeStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  treeStepNum: {
    fontSize: 9,
    color: '#89726A',
    width: 14,
  },
  treeStepText: {
    fontSize: 9,
    color: PetConnectColors.onSurfaceVariant,
    flex: 1,
    flexWrap: 'wrap',
    lineHeight: 14,
  },
  treeStepFeature: {
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  treesEvaluatedNotice: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#89726A',
    textAlign: 'center',
    marginVertical: 4,
  },

  // Logistic Regression Drivers Styles
  lrMathSummaryRow: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.3)',
    gap: 4,
  },
  lrMathItem: {
    fontSize: 10,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 15,
    flexWrap: 'wrap',
  },
  lrDriversList: {
    gap: 4,
  },
  lrDriverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.25)',
    gap: 8,
  },
  lrDriverLeft: {
    flex: 1,
    flexShrink: 1,
  },
  lrDriverName: {
    fontSize: 10,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  lrDriverSub: {
    fontSize: 9,
    color: '#89726A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 1,
  },
  lrDriverPositive: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flexShrink: 0,
  },
  lrDriverNegative: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flexShrink: 0,
  },
  lrAllFeaturesBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.3)',
    marginTop: 4,
  },
  lrAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(221, 193, 183, 0.15)',
    gap: 6,
  },
  lrAllIndex: {
    fontSize: 9,
    color: '#89726A',
    width: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  lrAllName: {
    fontSize: 9,
    fontWeight: '600',
    color: PetConnectColors.onSurface,
    flex: 1,
  },
  lrAllContrib: {
    fontSize: 9,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Raw Vectors Block
  rawVectorBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.35)',
    gap: 3,
  },
  rawVectorLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#752501',
    letterSpacing: 0.3,
  },
  rawVectorText: {
    fontSize: 10,
    color: PetConnectColors.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 14,
  },

  // Responsive Vector Cards List (No horizontal scroll!)
  vectorCardsList: {
    gap: 6,
  },
  vectorRowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.3)',
    gap: 4,
  },
  vectorRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  vectorRowIndex: {
    fontSize: 10,
    fontWeight: '800',
    color: '#89726A',
    width: 22,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  vectorRowName: {
    fontSize: 11,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    flex: 1,
    flexShrink: 1,
  },
  vectorRowDiff: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    flexShrink: 0,
  },
  diffZero: {
    color: '#6B7280',
  },
  diffPositive: {
    color: '#D97706',
  },
  diffNegative: {
    color: '#2563EB',
  },
  vectorValuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 3,
    borderTopWidth: 1,
    borderTopColor: 'rgba(221, 193, 183, 0.2)',
  },
  vectorValItem: {
    fontSize: 9,
    color: '#89726A',
  },
  vectorValNum: {
    fontWeight: '800',
    color: PetConnectColors.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Final Calculation Card Styles
  finalCalcCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 140, 97, 0.35)',
    shadowColor: '#752501',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    gap: 8,
  },
  finalCalcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  finalCalcIcon: {
    fontSize: 16,
  },
  finalCalcTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#752501',
    letterSpacing: 0.5,
  },
  finalCalcStepLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: PetConnectColors.onSurfaceVariant,
    marginTop: 2,
  },
  formulaRowCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.3)',
    gap: 3,
  },
  formulaRowText: {
    fontSize: 10,
    fontWeight: '700',
    color: PetConnectColors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 15,
  },
  formulaSubstLine: {
    fontSize: 10,
    color: PetConnectColors.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 15,
  },
  formulaSumLine: {
    fontSize: 10,
    color: PetConnectColors.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 15,
  },
  formulaDivider: {
    height: 1,
    backgroundColor: 'rgba(221, 193, 183, 0.4)',
    marginVertical: 4,
  },
  formulaTotalLine: {
    fontSize: 12,
    fontWeight: '900',
    color: PetConnectColors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  finalResultHighlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 140, 97, 0.15)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 97, 0.4)',
    marginTop: 6,
  },
  finalResultTextCol: {
    flex: 1,
  },
  finalResultLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#752501',
  },
  finalResultSub: {
    fontSize: 9,
    color: '#89726A',
  },
  finalResultScoreBadge: {
    backgroundColor: PetConnectColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  finalResultScoreText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // Compatibility Dimensions Accordion
  compatDimensionsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.4)',
    gap: 10,
  },
  compatSectionHeading: {
    fontSize: 11,
    fontWeight: '900',
    color: '#752501',
    letterSpacing: 0.5,
  },

  viewPetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PetConnectColors.primary,
    borderRadius: 16,
    paddingVertical: 13,
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  viewPetBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Empty Results Styles
  emptyResultsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.6)',
    marginTop: 16,
  },
  emptyResultsIcon: {
    fontSize: 48,
    marginBottom: 14,
  },
  emptyResultsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: PetConnectColors.onSurface,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyResultsSub: {
    fontSize: 13,
    color: PetConnectColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  emptyActionsRow: {
    width: '100%',
    gap: 10,
  },
  adjustPrefBtn: {
    backgroundColor: PetConnectColors.primary,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  adjustPrefBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  exploreAllBtn: {
    backgroundColor: PetConnectColors.surfaceContainer,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  exploreAllBtnText: {
    color: PetConnectColors.onSurface,
    fontSize: 14,
    fontWeight: '700',
  },
});

