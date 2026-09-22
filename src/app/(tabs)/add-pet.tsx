import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  Video,
  Sparkles,
  MapPin,
  PlusCircle,
  LogIn,
  AlertCircle,
  X,
  Check,
  ShieldCheck,
  HeartHandshake,
  IndianRupee,
  Plus,
  PlayCircle,
  Image as ImageIcon,
} from 'lucide-react-native';
import { Header } from '../../components/Header';
import { usePet } from '../../context/PetContext';
import { PetCategory, PetGender } from '../../types';
import { PetConnectColors } from '../../constants/colors';
import { storageService } from '../../services/storageService';

const SAMPLE_PRESETS = [
  {
    label: 'Golden Puppy',
    category: 'dogs' as PetCategory,
    breed: 'Golden Retriever',
    name: 'Sunny',
    age: '3 months',
    gender: 'male' as PetGender,
    image:
      'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=80',
    additionalImages: [
      'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
    ],
    desc: 'Sunny is a bundle of joy who loves squeaky toys, warm cuddles, and following you around like a little shadow. Healthy, energetic, and eager to learn.',
    health: { vaccinated: true, dewormed: true, spayedNeutered: false, notes: 'Up to date on puppy shots' },
    requirements: ['Good With Children', 'Active Home', 'Yard Required'],
    fee: '1500',
  },
  {
    label: 'Calico Cat',
    category: 'cats' as PetCategory,
    breed: 'Calico Shorthair',
    name: 'Hazel',
    age: '1 year',
    gender: 'female' as PetGender,
    image:
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=800&q=80',
    additionalImages: [
      'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=800&q=80',
    ],
    desc: 'Hazel is a sweet, calm feline who loves curling up next to you while you read or work. Fully vaccinated and litter trained.',
    health: { vaccinated: true, dewormed: true, spayedNeutered: true, notes: 'Spayed and microchipped' },
    requirements: ['Apartment Friendly', 'Indoor Only'],
    fee: '0',
  },
  {
    label: 'Mini Bunny',
    category: 'rabbits' as PetCategory,
    breed: 'Mini Rex',
    name: 'Barnaby Jr',
    age: '10 months',
    gender: 'male' as PetGender,
    image:
      'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=800&q=80',
    additionalImages: [],
    desc: 'Super soft velvet coat, gentle with people and loves fresh greens and apple slices.',
    health: { vaccinated: true, dewormed: true, spayedNeutered: false, notes: 'Healthy indoor bunny' },
    requirements: ['Indoor Only', 'Quiet Home'],
    fee: '0',
  },
];

const REQUIREMENT_OPTIONS = [
  'Good With Children',
  'Apartment Friendly',
  'Yard Required',
  'Active Home',
  'Experienced Owner',
  'Indoor Only',
  'Other Pets Friendly',
  'Hypoallergenic',
];

export default function AddPetScreen() {
  const router = useRouter();
  const { addPet, showToast, userProfile, openAuthModal } = usePet();

  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [ageNumber, setAgeNumber] = useState('');
  const [ageUnit, setAgeUnit] = useState<'months' | 'years'>('years');
  const [gender, setGender] = useState<PetGender>('female');
  const [category, setCategory] = useState<PetCategory>('dogs');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  // Media
  const [profileImageUri, setProfileImageUri] = useState('');
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [videoUri, setVideoUri] = useState('');

  // Health Information
  const [vaccinated, setVaccinated] = useState<boolean>(true);
  const [dewormed, setDewormed] = useState<boolean>(true);
  const [spayedNeutered, setSpayedNeutered] = useState<boolean>(false);
  const [healthNotes, setHealthNotes] = useState<string>('');

  // Adoption Details (empty by default so user can select)
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([]);
  const [adoptionFee, setAdoptionFee] = useState<string>('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Main Profile Photo Picker
  const handlePickMainPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setProfileImageUri(uri);
        showToast('Profile photo selected! 🐾');
      }
    } catch (e) {
      console.warn('Profile photo pick error:', e);
    }
  };

  // 2. Additional Photos Picker (up to 5)
  const handlePickAdditionalPhoto = async () => {
    if (additionalImages.length >= 5) {
      showToast('Maximum 5 additional photos allowed');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setAdditionalImages((prev) => [...prev, uri].slice(0, 5));
        showToast(`Additional photo added (${additionalImages.length + 1}/5)`);
      }
    } catch (e) {
      console.warn('Additional photo pick error:', e);
    }
  };

  const handleRemoveAdditionalPhoto = (indexToRemove: number) => {
    setAdditionalImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // 3. Video Picker
  const handlePickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setVideoUri(result.assets[0].uri);
        showToast('Video attached successfully! 🎬');
      }
    } catch (e) {
      console.warn('Video pick error:', e);
    }
  };

  const handleToggleRequirement = (req: string) => {
    if (selectedRequirements.includes(req)) {
      setSelectedRequirements((prev) => prev.filter((r) => r !== req));
    } else {
      setSelectedRequirements((prev) => [...prev, req]);
    }
  };

  const handleApplyPreset = (preset: (typeof SAMPLE_PRESETS)[0]) => {
    setName(preset.name);
    setBreed(preset.breed);
    setCategory(preset.category);

    // Parse age number and unit from preset string
    const ageParts = preset.age.split(' ');
    const num = ageParts[0] ? ageParts[0].replace(/[^0-9]/g, '') : '1';
    const unit = preset.age.toLowerCase().includes('month') ? 'months' : 'years';
    setAgeNumber(num);
    setAgeUnit(unit);

    setGender(preset.gender);
    setProfileImageUri(preset.image);
    setAdditionalImages(preset.additionalImages || []);
    setDescription(preset.desc);
    setVaccinated(preset.health.vaccinated);
    setDewormed(preset.health.dewormed);
    setSpayedNeutered(preset.health.spayedNeutered);
    setHealthNotes(preset.health.notes);
    setSelectedRequirements(preset.requirements || []);
    setAdoptionFee(preset.fee);
    showToast(`Filled form with preset "${preset.name}"`);
  };

  // 4. Submit Pet Form to Supabase Storage & Firestore
  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!userProfile) {
      openAuthModal();
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Please enter a pet name');
      return;
    }
    if (!breed.trim()) {
      setErrorMessage('Please enter a breed');
      return;
    }
    if (!ageNumber.trim() || Number(ageNumber) <= 0) {
      setErrorMessage('Please enter a valid age (numbers only)');
      return;
    }

    if (!profileImageUri || !profileImageUri.trim()) {
      setErrorMessage('Please select a main profile photo for your pet');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload Main Profile Photo using existing Supabase Storage implementation
      setUploadProgressText('Uploading main profile photo to Supabase...');
      const finalMainImage = await storageService.uploadPetImage(profileImageUri, category);

      // 2. Upload Additional Photos using existing Supabase Storage implementation
      let uploadedAdditionalUrls: string[] = [];
      if (additionalImages.length > 0) {
        setUploadProgressText(`Uploading ${additionalImages.length} additional photos to Supabase...`);
        uploadedAdditionalUrls = await Promise.all(
          additionalImages.map((uri) => storageService.uploadPetImage(uri, category))
        );
      }

      // 3. Upload Video using existing Supabase Storage implementation
      let finalVideoUrl: string | undefined = undefined;
      if (videoUri && videoUri.trim()) {
        setUploadProgressText('Uploading your video...');
        finalVideoUrl = await storageService.uploadPetVideo(videoUri);
      }

      setUploadProgressText('Saving pet record...');

      const allImageUrls = [
        finalMainImage,
        ...uploadedAdditionalUrls.filter((url) => url !== finalMainImage),
      ];

      const formattedAge = `${ageNumber.trim()} ${Number(ageNumber) === 1 ? (ageUnit === 'months' ? 'month' : 'year') : ageUnit}`;

      const newPetId = await addPet({
        name: name.trim(),
        breed: breed.trim(),
        age: formattedAge,
        gender,
        category,
        location: location.trim() || 'Mumbai, Maharashtra',
        description:
          description.trim() ||
          `${name} is a friendly and wonderful pet looking for a loving forever home. Healthy, playful, and excited to meet you!`,
        imageUrl: finalMainImage,
        imageUrls: allImageUrls,
        additionalImages: uploadedAdditionalUrls,
        ...(finalVideoUrl ? { videoUrl: finalVideoUrl, videoThumbnail: finalMainImage } : {}),
        health: {
          vaccinated,
          dewormed,
          spayedNeutered,
          ...(healthNotes.trim() ? { notes: healthNotes.trim() } : {}),
        },
        adoptionRequirements: selectedRequirements,
        adoptionFee: Number(adoptionFee) || 0,
        tags: [
          'Newly Added',
          'Adoptable',
          ...selectedRequirements.slice(0, 2),
        ],
        shelterName: userProfile.name || 'PetConnect Caregiver',
        shelterContact: userProfile.email || 'adoptions@petconnect.org',
      });

      showToast(`🎉 ${name} listed for adoption successfully!`);

      // Navigate to pet details
      router.push({
        pathname: '/pet/[id]' as any,
        params: { id: newPetId },
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to list pet. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgressText('');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header title="Add New Pet" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Sign In Required Notice if guest */}
          {!userProfile && (
            <View style={styles.signInWarningCard}>
              <LogIn size={20} color={PetConnectColors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.signInWarningTitle}>
                  Sign in required to list a pet
                </Text>
                <Text style={styles.signInWarningSub}>
                  Your account will be linked as the pet's owner so you can receive
                  and accept adoption requests.
                </Text>
              </View>
              <TouchableOpacity
                onPress={openAuthModal}
                style={styles.signInSmallBtn}
              >
                <Text style={styles.signInSmallBtnText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Quick Demo Preset Chips */}
          <View style={styles.presetBox}>
            <View style={styles.presetTitleRow}>
              <Sparkles size={14} color="#752501" />
              <Text style={styles.presetTitle}>Quick Fill Demo Pet:</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetScroll}
            >
              {SAMPLE_PRESETS.map((preset, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleApplyPreset(preset)}
                  style={styles.presetChip}
                  activeOpacity={0.7}
                >
                  <Text style={styles.presetChipText}>+ {preset.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ============================================================ */}
          {/* 1. MEDIA UPLOAD SECTION (Supabase Storage) */}
          {/* ============================================================ */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Pet Media (Supabase Storage)</Text>
            <Text style={styles.sectionSubtitle}>
              Upload 1 main profile image, up to 5 additional photos, and 1 short video.
            </Text>

            {/* Main Profile Photo */}
            <Text style={styles.fieldLabel}>
              Main Profile Photo <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <View style={styles.mediaRow}>
              {profileImageUri ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: profileImageUri }} style={styles.mainPreviewImage} />
                  <TouchableOpacity
                    onPress={() => setProfileImageUri('')}
                    style={styles.removeMediaBtn}
                  >
                    <X size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                  <View style={styles.mainPhotoBadge}>
                    <Text style={styles.mainPhotoBadgeText}>Main Photo</Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handlePickMainPhoto}
                  style={styles.pickButton}
                  activeOpacity={0.8}
                >
                  <Camera size={26} color={PetConnectColors.primary} />
                  <Text style={styles.pickButtonTitle}>Select Profile Photo</Text>
                  <Text style={styles.pickButtonSub}>PNG or JPG format</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Additional Photos (Up to 5) */}
            <View style={styles.additionalHeaderRow}>
              <Text style={styles.fieldLabel}>
                Additional Photos ({additionalImages.length}/5)
              </Text>
              {additionalImages.length < 5 && (
                <TouchableOpacity
                  onPress={handlePickAdditionalPhoto}
                  style={styles.addMoreBtn}
                >
                  <Plus size={14} color={PetConnectColors.primary} />
                  <Text style={styles.addMoreBtnText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.additionalPhotosScroll}
            >
              {additionalImages.map((uri, idx) => (
                <View key={idx} style={styles.additionalThumbContainer}>
                  <Image source={{ uri }} style={styles.additionalThumbImage} />
                  <TouchableOpacity
                    onPress={() => handleRemoveAdditionalPhoto(idx)}
                    style={styles.removeAdditionalBtn}
                  >
                    <X size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                  <View style={styles.photoIndexBadge}>
                    <Text style={styles.photoIndexText}>#{idx + 1}</Text>
                  </View>
                </View>
              ))}

              {additionalImages.length < 5 && (
                <TouchableOpacity
                  onPress={handlePickAdditionalPhoto}
                  style={styles.addAdditionalPlaceholder}
                  activeOpacity={0.7}
                >
                  <ImageIcon size={22} color={PetConnectColors.outline} />
                  <Text style={styles.addPlaceholderText}>+ Add</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Video Upload */}
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
              Short Video (Optional)
            </Text>
            {videoUri ? (
              <View style={styles.videoAttachedCard}>
                <View style={styles.videoAttachedLeft}>
                  <PlayCircle size={24} color={PetConnectColors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.videoAttachedTitle}>Video Attached</Text>
                    <Text style={styles.videoAttachedSub} numberOfLines={1}>
                      {videoUri.split('/').pop() || 'Selected MP4 Video'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setVideoUri('')}
                  style={styles.removeVideoBtn}
                >
                  <X size={16} color="#BA1A1A" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handlePickVideo}
                style={styles.pickVideoButton}
                activeOpacity={0.8}
              >
                <Video size={22} color={PetConnectColors.primary} />
                <Text style={styles.pickVideoButtonText}>Attach Play Video (MP4)</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ============================================================ */}
          {/* 2. BASIC PET INFORMATION */}
          {/* ============================================================ */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            {/* Pet Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Pet Name <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Bella, Charlie, Oliver"
                placeholderTextColor="#89726A"
              />
            </View>

            {/* Species / Category */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Species Category</Text>
              <View style={styles.categoryRow}>
                {(['dogs', 'cats', 'rabbits', 'birds', 'others'] as PetCategory[]).map(
                  (cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={[
                        styles.catOptionPill,
                        category === cat && styles.catOptionPillSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.catOptionText,
                          category === cat && styles.catOptionTextSelected,
                        ]}
                      >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            {/* Breed */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Breed <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={breed}
                onChangeText={setBreed}
                placeholder="e.g. Golden Retriever, Indie, Persian Cat"
                placeholderTextColor="#89726A"
              />
            </View>

            {/* Age: Numeric Input + Months/Years Toggle */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Age <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={styles.ageInputRow}>
                <TextInput
                  style={[styles.input, styles.ageNumberInput]}
                  value={ageNumber}
                  onChangeText={(val) => setAgeNumber(val.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 2"
                  placeholderTextColor="#89726A"
                  keyboardType="number-pad"
                  maxLength={3}
                />
                <View style={styles.ageUnitToggleGroup}>
                  <TouchableOpacity
                    onPress={() => setAgeUnit('months')}
                    style={[
                      styles.ageUnitBtn,
                      ageUnit === 'months' && styles.ageUnitBtnActive,
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.ageUnitBtnText,
                        ageUnit === 'months' && styles.ageUnitBtnTextActive,
                      ]}
                    >
                      Months
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setAgeUnit('years')}
                    style={[
                      styles.ageUnitBtn,
                      ageUnit === 'years' && styles.ageUnitBtnActive,
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.ageUnitBtnText,
                        ageUnit === 'years' && styles.ageUnitBtnTextActive,
                      ]}
                    >
                      Years
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Gender */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  onPress={() => setGender('female')}
                  style={[
                    styles.genderButton,
                    gender === 'female' && styles.genderButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      gender === 'female' && styles.genderButtonTextSelected,
                    ]}
                  >
                    ♀ Female
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setGender('male')}
                  style={[
                    styles.genderButton,
                    gender === 'male' && styles.genderButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      gender === 'male' && styles.genderButtonTextSelected,
                    ]}
                  >
                    ♂ Male
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Location */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location / City (India)</Text>
              <View style={styles.locationInputWrapper}>
                <MapPin size={18} color="#89726A" style={styles.locationIcon} />
                <TextInput
                  style={styles.locationInput}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="e.g. Bandra West, Mumbai, Maharashtra"
                  placeholderTextColor="#89726A"
                />
              </View>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description & Personality</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe personality, energy level, favorite toys, habits, and story..."
                placeholderTextColor="#89726A"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* ============================================================ */}
          {/* 3. HEALTH & MEDICAL INFORMATION */}
          {/* ============================================================ */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderFlex}>
              <ShieldCheck size={20} color={PetConnectColors.primary} />
              <Text style={styles.sectionTitle}>Health & Medical Info</Text>
            </View>

            <View style={styles.healthTogglesList}>
              <TouchableOpacity
                onPress={() => setVaccinated(!vaccinated)}
                style={styles.healthToggleItem}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    vaccinated && styles.checkboxBoxChecked,
                  ]}
                >
                  {vaccinated && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.healthToggleTitle}>Vaccinations Up to Date</Text>
                  <Text style={styles.healthToggleSub}>Has received all core vaccines</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setDewormed(!dewormed)}
                style={styles.healthToggleItem}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    dewormed && styles.checkboxBoxChecked,
                  ]}
                >
                  {dewormed && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.healthToggleTitle}>Dewormed</Text>
                  <Text style={styles.healthToggleSub}>Treated for parasites</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSpayedNeutered(!spayedNeutered)}
                style={styles.healthToggleItem}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkboxBox,
                    spayedNeutered && styles.checkboxBoxChecked,
                  ]}
                >
                  {spayedNeutered && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.healthToggleTitle}>Spayed / Neutered</Text>
                  <Text style={styles.healthToggleSub}>Sterilized by licensed veterinarian</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Medical Notes */}
            <View style={[styles.inputGroup, { marginTop: 10 }]}>
              <Text style={styles.label}>Medical Notes (Optional)</Text>
              <TextInput
                style={styles.input}
                value={healthNotes}
                onChangeText={setHealthNotes}
                placeholder="e.g. Special diet, allergies, microchipped"
                placeholderTextColor="#89726A"
              />
            </View>
          </View>

          {/* ============================================================ */}
          {/* 4. ADOPTION REQUIREMENTS & FEE */}
          {/* ============================================================ */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderFlex}>
              <HeartHandshake size={20} color={PetConnectColors.primary} />
              <Text style={styles.sectionTitle}>Adoption Requirements</Text>
            </View>

            <Text style={styles.fieldLabel}>Select Matching Criteria:</Text>
            <View style={styles.requirementsWrap}>
              {REQUIREMENT_OPTIONS.map((req, idx) => {
                const isSelected = selectedRequirements.includes(req);
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleToggleRequirement(req)}
                    style={[
                      styles.requirementChip,
                      isSelected && styles.requirementChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.requirementChipText,
                        isSelected && styles.requirementChipTextSelected,
                      ]}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {req}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Adoption Fee */}
            <View style={[styles.inputGroup, { marginTop: 14 }]}>
              <Text style={styles.label}>Adoption Fee (₹ INR)</Text>
              <View style={styles.locationInputWrapper}>
                <IndianRupee size={18} color="#89726A" style={styles.locationIcon} />
                <TextInput
                  style={styles.locationInput}
                  value={adoptionFee}
                  onChangeText={(val) => setAdoptionFee(val.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 0 (Free) or 1500"
                  placeholderTextColor="#89726A"
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <AlertCircle size={18} color="#BA1A1A" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            activeOpacity={0.9}
          >
            {isSubmitting ? (
              <View style={styles.submittingRow}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.submitButtonText}>
                  {uploadProgressText || 'Uploading to Supabase...'}
                </Text>
              </View>
            ) : (
              <View style={styles.submitButtonRow}>
                <PlusCircle size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>List Pet for Adoption</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PetConnectColors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  signInWarningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: PetConnectColors.statusReviewBg,
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: PetConnectColors.primaryLight,
  },
  signInWarningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#752501',
  },
  signInWarningSub: {
    fontSize: 11,
    color: '#752501',
    marginTop: 2,
    lineHeight: 15,
  },
  signInSmallBtn: {
    backgroundColor: PetConnectColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  signInSmallBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  presetBox: {
    backgroundColor: PetConnectColors.surfaceContainer,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  presetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  presetTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#752501',
  },
  presetScroll: {
    gap: 8,
  },
  presetChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.6)',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: PetConnectColors.primary,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.45)',
    marginBottom: 16,
    shadowColor: '#332E2C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: PetConnectColors.onSurface,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: PetConnectColors.onSurfaceVariant,
    marginTop: 2,
    marginBottom: 14,
  },
  sectionHeaderFlex: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    marginBottom: 8,
  },
  requiredAsterisk: {
    color: '#BA1A1A',
  },
  mediaRow: {
    marginBottom: 14,
  },
  pickButton: {
    height: 120,
    backgroundColor: PetConnectColors.surfaceContainerLow,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(221, 193, 183, 0.8)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  pickButtonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: PetConnectColors.primary,
  },
  pickButtonSub: {
    fontSize: 11,
    color: PetConnectColors.outline,
  },
  previewContainer: {
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  mainPreviewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainPhotoBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(31, 27, 25, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  mainPhotoBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  additionalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addMoreBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: PetConnectColors.primary,
  },
  additionalPhotosScroll: {
    gap: 10,
    paddingVertical: 8,
  },
  additionalThumbContainer: {
    width: 76,
    height: 76,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  additionalThumbImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  removeAdditionalBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoIndexBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  photoIndexText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  addAdditionalPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(221, 193, 183, 0.8)',
    borderStyle: 'dashed',
    backgroundColor: PetConnectColors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  addPlaceholderText: {
    fontSize: 10,
    fontWeight: '600',
    color: PetConnectColors.outline,
  },
  pickVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: PetConnectColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.8)',
  },
  pickVideoButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: PetConnectColors.primary,
  },
  videoAttachedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 140, 97, 0.12)',
    borderWidth: 1,
    borderColor: PetConnectColors.primaryLight,
  },
  videoAttachedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  videoAttachedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: PetConnectColors.primary,
  },
  videoAttachedSub: {
    fontSize: 11,
    color: PetConnectColors.onSurfaceVariant,
    marginTop: 1,
  },
  removeVideoBtn: {
    padding: 6,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: PetConnectColors.onSurfaceVariant,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.7)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: PetConnectColors.onSurface,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  ageInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ageNumberInput: {
    flex: 1,
  },
  ageUnitToggleGroup: {
    flexDirection: 'row',
    backgroundColor: PetConnectColors.surfaceContainer,
    borderRadius: 14,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.4)',
  },
  ageUnitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  ageUnitBtnActive: {
    backgroundColor: PetConnectColors.primary,
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  ageUnitBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: PetConnectColors.onSurfaceVariant,
  },
  ageUnitBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catOptionPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: PetConnectColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.6)',
  },
  catOptionPillSelected: {
    backgroundColor: PetConnectColors.primary,
    borderColor: PetConnectColors.primary,
  },
  catOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: PetConnectColors.onSurfaceVariant,
  },
  catOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: PetConnectColors.surfaceContainerLow,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.6)',
  },
  genderButtonSelected: {
    backgroundColor: PetConnectColors.primary,
    borderColor: PetConnectColors.primary,
  },
  genderButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: PetConnectColors.onSurfaceVariant,
  },
  genderButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  locationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.7)',
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  locationIcon: {
    marginRight: 6,
  },
  locationInput: {
    flex: 1,
    fontSize: 14,
    color: PetConnectColors.onSurface,
    paddingVertical: 12,
  },
  healthTogglesList: {
    gap: 10,
  },
  healthToggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    backgroundColor: PetConnectColors.surfaceContainerLow,
    borderRadius: 12,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: PetConnectColors.outline,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: PetConnectColors.primary,
    borderColor: PetConnectColors.primary,
  },
  healthToggleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  healthToggleSub: {
    fontSize: 11,
    color: PetConnectColors.onSurfaceVariant,
  },
  requirementsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  requirementChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: PetConnectColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.6)',
  },
  requirementChipSelected: {
    backgroundColor: 'rgba(255, 140, 97, 0.2)',
    borderColor: PetConnectColors.primary,
  },
  requirementChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: PetConnectColors.onSurfaceVariant,
  },
  requirementChipTextSelected: {
    color: PetConnectColors.primary,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PetConnectColors.errorContainer,
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  errorText: {
    color: PetConnectColors.onErrorContainer,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  submitButton: {
    backgroundColor: PetConnectColors.primary,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
