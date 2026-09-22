import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { Header } from '../components/Header';
import { PetCard } from '../components/PetCard';
import { usePet } from '../context/PetContext';
import { PetConnectColors } from '../constants/colors';

export default function SavedPetsScreen() {
  const router = useRouter();
  const { pets, savedPetIds } = usePet();

  const savedPets = pets.filter((pet) => savedPetIds.includes(pet.id));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header title="Saved Pets" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.counterText}>
          You have <Text style={styles.boldCount}>{savedPets.length}</Text> pets in
          your favorites
        </Text>

        {savedPets.length > 0 ? (
          <View style={styles.petsList}>
            {savedPets.map((pet) => (
              <PetCard key={pet.id} pet={pet} fullWidth />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Heart size={32} color={PetConnectColors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No saved pets yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the heart icon on any pet profile to save them here for quick
              comparison!
            </Text>

            <TouchableOpacity
              onPress={() => router.replace('/(tabs)' as any)}
              style={styles.browseButton}
              activeOpacity={0.9}
            >
              <Text style={styles.browseButtonText}>Browse Pets</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
    paddingTop: 16,
  },
  counterText: {
    fontSize: 14,
    color: PetConnectColors.onSurfaceVariant,
    marginBottom: 16,
  },
  boldCount: {
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  petsList: {
    gap: 4,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.4)',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PetConnectColors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: PetConnectColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  browseButton: {
    backgroundColor: PetConnectColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

