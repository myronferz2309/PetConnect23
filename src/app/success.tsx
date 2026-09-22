import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CheckCircle2, PawPrint, Home, ClipboardList, Info } from 'lucide-react-native';
import { PetImage } from '../components/PetImage';
import { usePet } from '../context/PetContext';
import { PetConnectColors } from '../constants/colors';

export default function SuccessScreen() {
  const router = useRouter();
  const { submittedApplication } = usePet();

  const petName = submittedApplication?.petName || 'your new companion';
  const applicantName = submittedApplication?.applicantName || 'Applicant';
  const appId = submittedApplication?.id || 'APP-2026-X9';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.contentTop}>
          {/* Celebration Animation / Badges */}
          <View style={styles.celebrationIconBox}>
            <View style={styles.checkCircle}>
              <CheckCircle2 size={54} color={PetConnectColors.onSecondaryContainer} />
            </View>
            <View style={styles.floatingPaw}>
              <PawPrint size={16} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.headline}>
            Application Submitted Successfully!
          </Text>

          <Text style={styles.subtext}>
            Thank you, <Text style={styles.boldText}>{applicantName}</Text>! Your
            adoption application for{' '}
            <Text style={styles.primaryBoldText}>{petName}</Text> has been
            securely sent to the rescue shelter team.
          </Text>

          {/* Application Summary Card */}
          <View style={styles.summaryCard}>
            {/* Pet info row */}
            <View style={styles.summaryPetRow}>
              <View style={styles.petAvatarInfo}>
                <PetImage
                  uri={submittedApplication?.petImageUrl}
                  style={styles.petThumb}
                  contentFit="cover"
                />
                <View>
                  <Text style={styles.summaryPetName}>{petName}</Text>
                  <Text style={styles.summaryPetBreed}>
                    {submittedApplication?.petBreed || 'Adoptable Pet'}
                  </Text>
                </View>
              </View>

              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>● Pending Review</Text>
              </View>
            </View>

            {/* Reference ID & Review Timeline */}
            <View style={styles.infoGrid}>
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxLabel}>Reference ID</Text>
                <Text style={styles.infoBoxValueMono}>{appId}</Text>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoBoxLabel}>Estimated Review</Text>
                <Text style={styles.infoBoxValue}>24 - 48 Hours</Text>
              </View>
            </View>

            {/* Next Steps Hint */}
            <View style={styles.nextStepsBox}>
              <Info size={16} color={PetConnectColors.primary} style={{ marginTop: 2 }} />
              <Text style={styles.nextStepsText}>
                The shelter adoption coordinator will call or email you to schedule
                a virtual meet & greet!
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)' as any)}
            style={styles.homeButton}
            activeOpacity={0.9}
          >
            <Home size={20} color="#FFFFFF" />
            <Text style={styles.homeButtonText}>Return to Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace('/my-applications' as any)}
            style={styles.appsButton}
            activeOpacity={0.8}
          >
            <ClipboardList size={18} color={PetConnectColors.onSurface} />
            <Text style={styles.appsButtonText}>View My Applications</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PetConnectColors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  contentTop: {
    alignItems: 'center',
    paddingTop: 16,
  },
  celebrationIconBox: {
    position: 'relative',
    marginBottom: 20,
  },
  checkCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: PetConnectColors.secondaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#332E2C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  floatingPaw: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PetConnectColors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  headline: {
    fontSize: 24,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 10,
  },
  subtext: {
    fontSize: 14,
    color: PetConnectColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  boldText: {
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  primaryBoldText: {
    fontWeight: '700',
    color: PetConnectColors.primary,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.4)',
    gap: 14,
    shadowColor: '#332E2C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  summaryPetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(221, 193, 183, 0.25)',
  },
  petAvatarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  petThumb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PetConnectColors.surfaceContainerHigh,
  },
  petThumbFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PetConnectColors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryPetName: {
    fontSize: 15,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  summaryPetBreed: {
    fontSize: 12,
    color: PetConnectColors.onSurfaceVariant,
  },
  statusPill: {
    backgroundColor: PetConnectColors.statusPendingBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: PetConnectColors.statusPendingText,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  infoBox: {
    flex: 1,
    backgroundColor: PetConnectColors.surfaceContainer,
    padding: 10,
    borderRadius: 14,
  },
  infoBoxLabel: {
    fontSize: 10,
    color: PetConnectColors.outline,
    marginBottom: 2,
    fontWeight: '600',
  },
  infoBoxValueMono: {
    fontSize: 12,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    fontFamily: 'monospace',
  },
  infoBoxValue: {
    fontSize: 12,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  nextStepsBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: PetConnectColors.background,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.3)',
  },
  nextStepsText: {
    flex: 1,
    fontSize: 11,
    color: PetConnectColors.onSurfaceVariant,
    lineHeight: 16,
  },
  actions: {
    gap: 12,
    paddingBottom: 8,
  },
  homeButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: PetConnectColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  homeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  appsButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  appsButtonText: {
    color: PetConnectColors.onSurface,
    fontSize: 14,
    fontWeight: '700',
  },
});

