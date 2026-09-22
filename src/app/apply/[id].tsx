import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Send,
  HeartHandshake,
  AlertCircle,
  CheckCircle,
  LogIn,
} from 'lucide-react-native';
import { usePet } from '../../context/PetContext';
import { PetConnectColors } from '../../constants/colors';

export default function AdoptionApplicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    getPetById,
    userProfile,
    submitApplication,
    showToast,
    hasUserApplied,
    openAuthModal,
  } = usePet();

  const pet = getPetById(id || '');
  const petName = pet?.name || 'Pet';

  const [applicantName, setApplicantName] = useState(userProfile?.name || '');
  const [phoneNumber, setPhoneNumber] = useState(userProfile?.phone || '');
  const [address, setAddress] = useState(userProfile?.address || '');
  const [experience, setExperience] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync with userProfile when available
  useEffect(() => {
    if (userProfile) {
      if (userProfile.name && !applicantName) setApplicantName(userProfile.name);
      if (userProfile.phone) setPhoneNumber(userProfile.phone);
      if (userProfile.address) setAddress(userProfile.address);
    }
  }, [userProfile]);

  const alreadyApplied = Boolean(pet?.id && hasUserApplied(pet.id));
  const isAdopted = pet?.status === 'adopted';
  const isOwner = Boolean(
    userProfile?.uid && pet?.ownerId && pet.ownerId === userProfile.uid
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as any);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (!userProfile) {
      openAuthModal();
      return;
    }

    if (isOwner) {
      setErrorMessage('You cannot apply to adopt a pet that you listed.');
      return;
    }

    if (alreadyApplied) {
      setErrorMessage('You have already submitted an adoption application for this pet.');
      return;
    }

    if (isAdopted) {
      setErrorMessage('This pet has already been adopted by another family.');
      return;
    }

    if (!applicantName.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }
    if (!phoneNumber.trim()) {
      setErrorMessage('Please enter a contact phone number');
      return;
    }
    if (!address.trim()) {
      setErrorMessage('Please enter your home address');
      return;
    }
    if (!reason.trim()) {
      setErrorMessage('Please share your reason for adopting');
      return;
    }

    setIsSubmitting(true);

    try {
      await submitApplication({
        petId: pet?.id || 'unknown',
        petName: pet?.name || 'Companion',
        petBreed: pet?.breed || 'Domestic',
        petImageUrl: pet?.imageUrl || '',
        petOwnerId: pet?.ownerId,
        applicantName: applicantName.trim(),
        applicantEmail: userProfile.email,
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        experience: experience.trim(),
        reason: reason.trim(),
      });

      // Navigate to success celebration screen
      router.replace('/success' as any);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.headerButton}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={PetConnectColors.primary} />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          Application for {petName}
        </Text>

        <View style={{ width: 38 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* Sign In Required Notice */}
          {!userProfile && (
            <View style={styles.signInWarningCard}>
              <LogIn size={20} color={PetConnectColors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.signInWarningTitle}>
                  Sign in required to apply
                </Text>
                <Text style={styles.signInWarningSub}>
                  Please sign in or create an account to link your application with
                  the pet owner.
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

          {/* Already Applied Notice */}
          {alreadyApplied && (
            <View style={styles.alreadyAppliedCard}>
              <CheckCircle size={20} color={PetConnectColors.onSecondaryContainer} />
              <View style={{ flex: 1 }}>
                <Text style={styles.alreadyAppliedTitle}>
                  Application Already Submitted
                </Text>
                <Text style={styles.alreadyAppliedSub}>
                  You have an active application for {petName}. The pet owner or
                  shelter will review it soon!
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.replace('/my-applications' as any)}
                style={styles.trackAppBtn}
              >
                <Text style={styles.trackAppBtnText}>View Status</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Pet Owner Warning */}
          {isOwner && (
            <View style={styles.alreadyAppliedCard}>
              <AlertCircle size={20} color={PetConnectColors.onSecondaryContainer} />
              <View style={{ flex: 1 }}>
                <Text style={styles.alreadyAppliedTitle}>You Own This Pet</Text>
                <Text style={styles.alreadyAppliedSub}>
                  You listed {petName} for adoption. You can review and manage incoming
                  applications from other adopters in your dashboard.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => router.replace('/my-applications' as any)}
                style={styles.trackAppBtn}
              >
                <Text style={styles.trackAppBtnText}>Requests</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Pet Adopted Notice */}
          {isAdopted && (
            <View style={styles.adoptedWarningCard}>
              <AlertCircle size={20} color="#93000A" />
              <View style={{ flex: 1 }}>
                <Text style={styles.adoptedWarningTitle}>Pet Adopted</Text>
                <Text style={styles.adoptedWarningSub}>
                  {petName} has already found a forever home and is no longer
                  accepting new applications.
                </Text>
              </View>
            </View>
          )}

          {/* Intro Card */}
          <View style={styles.introCard}>
            <View style={styles.introIconBadge}>
              <HeartHandshake size={24} color={PetConnectColors.primary} />
            </View>
            <Text style={styles.introText}>
              We're so excited you're interested in giving{' '}
              <Text style={styles.introPetName}>{petName}</Text> a forever home!
              Please fill out the details below.
            </Text>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color="#93000A" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Applicant Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Applicant Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                value={applicantName}
                onChangeText={setApplicantName}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor="#89726A"
                style={styles.input}
              />
            </View>

            {/* Phone Number */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Phone Number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="+91 98765 43210"
                placeholderTextColor="#89726A"
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>

            {/* Home Address */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>
                Home Address <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. Bandra West, Mumbai, Maharashtra"
                placeholderTextColor="#89726A"
                style={styles.input}
              />
            </View>

            {/* Previous Experience */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Previous pet experience?</Text>
              <TextInput
                value={experience}
                onChangeText={setExperience}
                placeholder="Tell us about pets you've had in the past..."
                placeholderTextColor="#89726A"
                multiline
                numberOfLines={3}
                style={[styles.input, styles.textArea]}
                textAlignVertical="top"
              />
            </View>

            {/* Reason for Adoption */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Reason for adoption?</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder={`Why do you think ${petName} is the right fit for your family?`}
                placeholderTextColor="#89726A"
                multiline
                numberOfLines={4}
                style={[styles.input, styles.textAreaLarge]}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Bottom spacer for sticky button */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Bottom Submit Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting || alreadyApplied || isAdopted || isOwner}
          style={[
            styles.submitButton,
            (alreadyApplied || isAdopted || isOwner) && styles.submitButtonDisabled,
          ]}
          activeOpacity={0.9}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>
                {isOwner
                  ? 'You Are The Pet Owner'
                  : alreadyApplied
                  ? 'Application Already Submitted'
                  : isAdopted
                  ? 'Pet Already Adopted'
                  : 'Submit Application'}
              </Text>
              {!alreadyApplied && !isAdopted && !isOwner && <Send size={18} color="#FFFFFF" />}
            </>
          )}
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
    borderBottomColor: PetConnectColors.outlineVariantLight,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PetConnectColors.primary,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  signInWarningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 140, 97, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.6)',
    padding: 14,
    borderRadius: 18,
    marginBottom: 16,
  },
  signInWarningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  signInWarningSub: {
    fontSize: 11,
    color: PetConnectColors.onSurfaceVariant,
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
    fontSize: 11,
    fontWeight: '700',
  },
  alreadyAppliedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: PetConnectColors.secondaryContainer,
    padding: 14,
    borderRadius: 18,
    marginBottom: 16,
  },
  alreadyAppliedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: PetConnectColors.onSecondaryContainer,
  },
  alreadyAppliedSub: {
    fontSize: 11,
    color: PetConnectColors.onSecondaryContainer,
    lineHeight: 15,
  },
  trackAppBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  trackAppBtnText: {
    color: PetConnectColors.onSecondaryContainer,
    fontSize: 11,
    fontWeight: '700',
  },
  adoptedWarningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: PetConnectColors.errorContainer,
    padding: 14,
    borderRadius: 18,
    marginBottom: 16,
  },
  adoptedWarningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: PetConnectColors.onErrorContainer,
  },
  adoptedWarningSub: {
    fontSize: 11,
    color: PetConnectColors.onErrorContainer,
    lineHeight: 15,
  },
  introCard: {
    backgroundColor: 'rgba(246, 236, 232, 0.7)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.4)',
  },
  introIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 140, 97, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    color: PetConnectColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  introPetName: {
    fontWeight: '700',
    color: PetConnectColors.onSurface,
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
    flex: 1,
    fontSize: 12,
    color: PetConnectColors.onErrorContainer,
    fontWeight: '500',
  },
  formContainer: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  required: {
    color: PetConnectColors.primary,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: PetConnectColors.outlineVariant,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: PetConnectColors.onSurface,
    shadowColor: '#332E2C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  textArea: {
    height: 80,
  },
  textAreaLarge: {
    height: 100,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: PetConnectColors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(221, 193, 183, 0.3)',
  },
  submitButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: PetConnectColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: PetConnectColors.surfaceContainerHigh,
    shadowColor: 'transparent',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
