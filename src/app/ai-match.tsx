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
  species_dog: 'Dog',
  species_cat: 'Cat',
  species_other: 'Other Species',
  age_normalized: 'Normalized Age',
  size: 'Pet Size',
  activity_level: 'Activity Level',
  time_commitment: 'Time Commitment',
  experience_level: 'Experience Level',
  living_space: 'Living Space',
  location_proximity: 'Location Proximity',
  trait_friendly: 'Friendly',
  trait_calm: 'Calm',
  trait_playful: 'Playful',
  trait_active: 'Active',
  trait_kid_friendly: 'Kid-Friendly',
  trait_pet_friendly: 'Pet-Friendly',
  trait_house_trained: 'House-Trained',
  trait_special_needs: 'Special Needs',
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

  // Results state
  const [matchResults, setMatchResults] = useState<AIMatchResult[]>([]);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [expandedVectorPetId, setExpandedVectorPetId] = useState<string | null>(null);

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
                        {isExpanded ? 'Hide Match Breakdown' : 'View Compatibility Breakdown'}
                      </Text>
                      <ChevronRight
                        size={16}
                        color={PetConnectColors.primary}
                        style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                      />
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.breakdownContainer}>
                        {/* Section 1: Detailed Compatibility Rows */}
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
                              {/* Top Row: Icon + Title on left, Status Badge on right */}
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

                              {/* Description: full width, naturally wraps */}
                              <Text style={styles.compatItemDetail}>
                                {dim.data.detail}
                              </Text>
                            </View>
                          ))}
                        </View>

                        {/* Section 2: Dedicated KNN Matching Analysis Card */}
                        {Boolean(item.distance !== undefined) && (
                          <View style={styles.knnSectionCard}>
                            {/* KNN Header Row: Responsive & uncrowded */}
                            <View style={styles.knnHeaderRow}>
                              <View style={styles.knnHeaderLeft}>
                                <View style={styles.knnTitleRow}>
                                  <Text style={styles.knnTitleIcon}>🧠</Text>
                                  <Text style={styles.knnSectionTitle}>KNN MATCHING ANALYSIS</Text>
                                </View>
                                <View style={styles.knnKBadge}>
                                  <Text style={styles.knnKBadgeText}>K = {item.kValue || 5}</Text>
                                </View>
                              </View>

                              <View style={styles.knnHeaderRight}>
                                <Text style={styles.knnRankBadgeText}>Rank #{item.neighborRank}</Text>
                                <Text style={styles.knnRankSubText}>Nearest Neighbor</Text>
                              </View>
                            </View>

                            <View style={styles.knnDivider} />

                            {/* Metric 1: Euclidean Distance */}
                            <View style={styles.knnMetricRow}>
                              <View style={styles.knnMetricLeft}>
                                <Text style={styles.knnMetricLabel}>Euclidean Distance</Text>
                              </View>
                              <View style={styles.knnMetricRight}>
                                <Text style={styles.knnMetricVal}>
                                  {typeof item.distance === 'number' ? item.distance.toFixed(4) : item.distance}
                                </Text>
                              </View>
                            </View>

                            {/* Metric 2: Vector Similarity */}
                            <View style={styles.knnMetricRow}>
                              <View style={styles.knnMetricLeft}>
                                <Text style={styles.knnMetricLabel}>Vector Similarity</Text>
                              </View>
                              <View style={styles.knnMetricRight}>
                                <Text style={styles.knnMetricVal}>
                                  {typeof item.similarity === 'number'
                                    ? `${(item.similarity * 100).toFixed(1)}%`
                                    : `${item.score}%`}
                                </Text>
                              </View>
                            </View>

                            {/* Metric 3: Feature Vector Space */}
                            <View style={styles.knnMetricRow}>
                              <View style={styles.knnMetricLeft}>
                                <Text style={styles.knnMetricLabel}>Feature Vector Space</Text>
                              </View>
                              <View style={styles.knnMetricRight}>
                                <Text style={styles.knnMetricVal}>
                                  ℝ{item.vectorCoordinates?.length ? `${item.vectorCoordinates.length}` : '¹⁸'}
                                </Text>
                                <Text style={styles.knnMetricSubVal}>
                                  {item.vectorCoordinates?.length || 18} normalized features
                                </Text>
                              </View>
                            </View>

                            {/* Intuitive Note */}
                            <Text style={styles.knnNoticeText}>
                              "Smaller distance means a closer match."
                            </Text>

                            {/* Expandable Vector Details Toggle Button */}
                            <TouchableOpacity
                              onPress={() =>
                                setExpandedVectorPetId((prev) => (prev === pet.id ? null : pet.id))
                              }
                              style={styles.vectorToggleBtn}
                              activeOpacity={0.75}
                            >
                              <Text style={styles.vectorToggleBtnText}>
                                {expandedVectorPetId === pet.id
                                  ? 'Hide Vector Details ▴'
                                  : 'View Vector Details ▾'}
                              </Text>
                            </TouchableOpacity>

                            {/* Collapsible Vector Data (Uses Real Vector Data) */}
                            {expandedVectorPetId === pet.id && (() => {
                              const uVec = item.userVectorCoordinates || [];
                              const pVec = item.vectorCoordinates || [];
                              const weights = item.metricWeights || [];
                              const featNames = item.featureNames || [];
                              const vectorDimension = uVec.length || pVec.length || 18;
                              const dScale = item.normalizationScaleDistance || 2.9247;
                              const dist = typeof item.distance === 'number' ? item.distance : 0;
                              const sim = typeof item.similarity === 'number' ? item.similarity : ((item.score || 0) / 100);

                              let sumWeightedDiffSq = 0;
                              const componentRows = [];
                              for (let j = 0; j < vectorDimension; j++) {
                                const uVal = uVec[j] ?? 0;
                                const pVal = pVec[j] ?? 0;
                                const wVal = weights[j] ?? 1.0;
                                const diff = uVal - pVal;
                                const diffSq = diff * diff;
                                const weightedDiffSq = wVal * diffSq;
                                sumWeightedDiffSq += weightedDiffSq;
                                const featKey = featNames[j] || `dim_${j}`;
                                const featLabel = FEATURE_DISPLAY_NAMES[featKey] || featKey;
                                componentRows.push({
                                  index: j,
                                  label: featLabel,
                                  uVal,
                                  pVal,
                                  wVal,
                                  diffSq,
                                  weightedDiffSq,
                                });
                              }

                              return (
                                <View style={styles.vectorDetailsBox}>
                                  {/* 1. Feature Vector Space */}
                                  <View style={styles.vecBlock}>
                                    <Text style={styles.vecBlockBadge}>1. FEATURE VECTOR SPACE</Text>
                                    <View style={styles.vecDimensionRow}>
                                      <Text style={styles.vecDimensionBig}>
                                        ℝ{toSuperscript(vectorDimension)}
                                      </Text>
                                      <Text style={styles.vecDimensionSub}>
                                        {vectorDimension} normalized features
                                      </Text>
                                    </View>
                                    <Text style={styles.vecDescriptionText}>
                                      Both the user and pet are represented using the same {vectorDimension}-dimensional feature space. Each dimension represents a normalized feature used by KNN.
                                    </Text>
                                  </View>

                                  <View style={styles.vecInnerDivider} />

                                  {/* 2. Feature Index Mapping */}
                                  <View style={styles.vecBlock}>
                                    <Text style={styles.vecBlockBadge}>2. FEATURE INDEX MAPPING</Text>
                                    <View style={styles.vecIndexContainer}>
                                      {componentRows.map((row) => (
                                        <View key={row.index} style={styles.vecIndexRow}>
                                          <Text style={styles.vecIndexNumber}>{row.index}</Text>
                                          <Text style={styles.vecIndexArrow}>→</Text>
                                          <Text style={styles.vecIndexTitle}>{row.label}</Text>
                                        </View>
                                      ))}
                                    </View>
                                  </View>

                                  <View style={styles.vecInnerDivider} />

                                  {/* 3. User Feature Vector */}
                                  <View style={styles.vecBlock}>
                                    <Text style={styles.vecBlockBadge}>3. USER FEATURE VECTOR</Text>
                                    <Text style={styles.vecCodeBlock} selectable>
                                      {formatVectorLines(uVec, 'U')}
                                    </Text>
                                  </View>

                                  <View style={styles.vecInnerDivider} />

                                  {/* 4. Pet Feature Vector */}
                                  <View style={styles.vecBlock}>
                                    <Text style={styles.vecBlockBadge}>
                                      4. PET FEATURE VECTOR — {pet.name.toUpperCase()}
                                    </Text>
                                    <Text style={styles.vecCodeBlock} selectable>
                                      {formatVectorLines(pVec, 'P')}
                                    </Text>
                                  </View>

                                  <View style={styles.vecInnerDivider} />

                                  {/* 5. Euclidean Distance Calculation */}
                                  <View style={styles.vecBlock}>
                                    <Text style={styles.vecBlockBadge}>5. EUCLIDEAN DISTANCE CALCULATION</Text>
                                    <Text style={styles.vecFormulaHeader}>Formula:</Text>
                                    <Text style={styles.vecFormulaBox} selectable>
                                      d(U, P) = √( Σ w_j · (u_j − p_j)² )
                                    </Text>

                                    <Text style={styles.vecSubHeading}>Feature-by-Feature Difference Breakdown:</Text>
                                    
                                    <View style={styles.vecTableContainer}>
                                      {componentRows.map((row) => (
                                        <View key={row.index} style={styles.vecTableRow}>
                                          <View style={styles.vecTableRowHeader}>
                                            <Text style={styles.vecTableIndex}>{row.index}.</Text>
                                            <Text style={styles.vecTableFeature}>{row.label}</Text>
                                            <Text style={styles.vecTableWeight}>w: {row.wVal}</Text>
                                          </View>
                                          <View style={styles.vecTableRowSub}>
                                            <Text style={styles.vecTableMathText} selectable>
                                              U: {row.uVal.toFixed(2)}  •  P: {row.pVal.toFixed(2)}  •  w·(U−P)²: {row.weightedDiffSq.toFixed(4)}
                                            </Text>
                                          </View>
                                        </View>
                                      ))}
                                    </View>

                                    {/* Distance Summation & Final Result */}
                                    <View style={styles.vecDistanceResultCard}>
                                      <Text style={styles.vecSumFormulaText} selectable>
                                        Σ w_j · (u_j − p_j)² = {sumWeightedDiffSq.toFixed(4)}
                                      </Text>
                                      <Text style={styles.vecFinalDistanceText} selectable>
                                        d(U, P) = √{sumWeightedDiffSq.toFixed(4)} = {dist.toFixed(4)}
                                      </Text>
                                    </View>
                                  </View>

                                  <View style={styles.vecInnerDivider} />

                                  {/* 6. Vector Similarity Calculation */}
                                  <View style={styles.vecBlock}>
                                    <Text style={styles.vecBlockBadge}>6. VECTOR SIMILARITY CALCULATION</Text>
                                    <Text style={styles.vecFormulaHeader}>Formula:</Text>
                                    <Text style={styles.vecFormulaBox} selectable>
                                      Similarity = max(0, 1 − (d / d_scale))
                                    </Text>
                                    <Text style={styles.vecScaleNote}>
                                      Where d_scale (Normalization Scale Distance) = {dScale.toFixed(4)}
                                    </Text>

                                    <View style={styles.vecSubstitutionCard}>
                                      <Text style={styles.vecSubstLine} selectable>
                                        Similarity = 1 − ({dist.toFixed(4)} / {dScale.toFixed(4)})
                                      </Text>
                                      <Text style={styles.vecSubstLine} selectable>
                                        {'           '}= 1 − {(dist / dScale).toFixed(4)}
                                      </Text>
                                      <Text style={styles.vecSubstLine} selectable>
                                        {'           '}= {sim.toFixed(4)}
                                      </Text>
                                      <Text style={styles.vecSubstHighlight} selectable>
                                        = {(sim * 100).toFixed(1)}% Match Score
                                      </Text>
                                    </View>
                                  </View>

                                  <View style={styles.vecInnerDivider} />

                                  {/* 7. Explain What the Score Means */}
                                  <View style={styles.vecNoteBox}>
                                    <Text style={styles.vecNoteLine}>
                                      "Smaller Euclidean distance means the pet's feature vector is closer to the user's preferences."
                                    </Text>
                                    <Text style={styles.vecNoteLine}>
                                      "The similarity percentage is derived from the calculated vector distance."
                                    </Text>
                                  </View>

                                  <View style={styles.vecInnerDivider} />

                                  {/* 8. KNN Parameters & Ranking Summary */}
                                  <View style={styles.vecBlock}>
                                    <Text style={styles.vecBlockBadge}>7. KNN PARAMETERS & NEIGHBOR RANK</Text>
                                    <View style={styles.vecKnnSummaryCard}>
                                      <View style={styles.vecKnnRow}>
                                        <Text style={styles.vecKnnKey}>K Parameter:</Text>
                                        <Text style={styles.vecKnnVal}>K = {item.kValue || 5}</Text>
                                      </View>
                                      <View style={styles.vecKnnRow}>
                                        <Text style={styles.vecKnnKey}>Neighbor Rank:</Text>
                                        <Text style={styles.vecKnnVal}>Rank #{item.neighborRank}</Text>
                                      </View>
                                      <View style={styles.vecKnnRow}>
                                        <Text style={styles.vecKnnKey}>Euclidean Distance:</Text>
                                        <Text style={styles.vecKnnVal}>{dist.toFixed(4)}</Text>
                                      </View>
                                      <View style={styles.vecKnnRow}>
                                        <Text style={styles.vecKnnKey}>Vector Similarity:</Text>
                                        <Text style={styles.vecKnnVal}>{(sim * 100).toFixed(1)}%</Text>
                                      </View>

                                      <Text style={styles.vecKnnVerdict}>
                                        Among the available pets, {pet.name} is the #{item.neighborRank} nearest neighbor to the user's feature vector.
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                              );
                            })()}
                          </View>
                        )}
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

  // Dedicated KNN Section Styles
  knnSectionCard: {
    marginTop: 14,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 97, 0.3)',
    shadowColor: '#752501',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  knnHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  knnHeaderLeft: {
    flex: 1,
    flexShrink: 1,
    gap: 4,
  },
  knnTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  knnTitleIcon: {
    fontSize: 13,
  },
  knnSectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#752501',
    letterSpacing: 0.5,
  },
  knnKBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 140, 97, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  knnKBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: PetConnectColors.primary,
  },
  knnHeaderRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  knnRankBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: PetConnectColors.primary,
  },
  knnRankSubText: {
    fontSize: 10,
    color: PetConnectColors.onSurfaceVariant,
    fontWeight: '600',
  },
  knnDivider: {
    height: 1,
    backgroundColor: 'rgba(221, 193, 183, 0.35)',
    marginVertical: 10,
  },
  knnMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    gap: 12,
  },
  knnMetricLeft: {
    flex: 1,
    flexShrink: 1,
  },
  knnMetricLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  knnMetricSub: {
    fontSize: 10,
    color: '#89726A',
    marginTop: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  knnMetricRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  knnMetricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: PetConnectColors.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  knnMetricSubVal: {
    fontSize: 10,
    color: PetConnectColors.onSurfaceVariant,
    marginTop: 1,
  },
  knnNoticeText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#89726A',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  vectorToggleBtn: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 140, 97, 0.1)',
    borderRadius: 8,
    marginTop: 4,
  },
  vectorToggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: PetConnectColors.primary,
  },
  vectorDetailsBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(221, 193, 183, 0.4)',
    gap: 12,
  },
  vecBlock: {
    gap: 5,
  },
  vecBlockBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: '#752501',
    letterSpacing: 0.5,
  },
  vecDimensionRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 2,
  },
  vecDimensionBig: {
    fontSize: 22,
    fontWeight: '900',
    color: PetConnectColors.primary,
  },
  vecDimensionSub: {
    fontSize: 12,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  vecDescriptionText: {
    fontSize: 11,
    color: PetConnectColors.onSurfaceVariant,
    lineHeight: 16,
    marginTop: 2,
  },
  vecInnerDivider: {
    height: 1,
    backgroundColor: 'rgba(221, 193, 183, 0.25)',
    marginVertical: 4,
  },
  vecIndexContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.025)',
    borderRadius: 8,
    padding: 8,
    gap: 4,
  },
  vecIndexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vecIndexNumber: {
    fontSize: 10,
    fontWeight: '800',
    color: PetConnectColors.primary,
    width: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  vecIndexArrow: {
    fontSize: 10,
    color: '#89726A',
  },
  vecIndexTitle: {
    fontSize: 11,
    color: PetConnectColors.onSurface,
    fontWeight: '600',
  },
  vecCodeBlock: {
    fontSize: 11,
    color: PetConnectColors.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: 'rgba(0, 0, 0, 0.035)',
    padding: 8,
    borderRadius: 8,
    lineHeight: 16,
  },
  vecFormulaHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#89726A',
    marginTop: 2,
  },
  vecFormulaBox: {
    fontSize: 11,
    fontWeight: '700',
    color: PetConnectColors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: 'rgba(255, 140, 97, 0.1)',
    padding: 8,
    borderRadius: 8,
    marginTop: 2,
  },
  vecSubHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    marginTop: 6,
    marginBottom: 2,
  },
  vecTableContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  vecTableRow: {
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(221, 193, 183, 0.2)',
  },
  vecTableRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vecTableIndex: {
    fontSize: 10,
    fontWeight: '800',
    color: PetConnectColors.primary,
    width: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  vecTableFeature: {
    fontSize: 11,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    flex: 1,
  },
  vecTableWeight: {
    fontSize: 10,
    color: '#89726A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  vecTableRowSub: {
    marginTop: 2,
    paddingLeft: 20,
  },
  vecTableMathText: {
    fontSize: 10,
    color: PetConnectColors.onSurfaceVariant,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  vecDistanceResultCard: {
    backgroundColor: 'rgba(255, 140, 97, 0.12)',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 4,
  },
  vecSumFormulaText: {
    fontSize: 11,
    color: PetConnectColors.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  vecFinalDistanceText: {
    fontSize: 13,
    fontWeight: '900',
    color: PetConnectColors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  vecScaleNote: {
    fontSize: 10,
    color: '#89726A',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  vecSubstitutionCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.035)',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    gap: 3,
  },
  vecSubstLine: {
    fontSize: 11,
    color: PetConnectColors.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  vecSubstHighlight: {
    fontSize: 13,
    fontWeight: '900',
    color: PetConnectColors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 4,
  },
  vecNoteBox: {
    backgroundColor: 'rgba(255, 140, 97, 0.06)',
    padding: 8,
    borderRadius: 8,
    gap: 3,
  },
  vecNoteLine: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#89726A',
    lineHeight: 15,
  },
  vecKnnSummaryCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.025)',
    padding: 10,
    borderRadius: 8,
    gap: 5,
  },
  vecKnnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vecKnnKey: {
    fontSize: 11,
    color: PetConnectColors.onSurfaceVariant,
  },
  vecKnnVal: {
    fontSize: 11,
    fontWeight: '800',
    color: PetConnectColors.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  vecKnnVerdict: {
    fontSize: 11,
    fontWeight: '600',
    color: PetConnectColors.primary,
    marginTop: 4,
    lineHeight: 16,
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

