import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, X, Frown } from 'lucide-react-native';
import { Header } from '../../components/Header';
import { PetCard } from '../../components/PetCard';
import { usePet } from '../../context/PetContext';
import { PetCategory, PetGender } from '../../types';
import { PetConnectColors } from '../../constants/colors';

export default function SearchScreen() {
  const { pets, searchQuery, setSearchQuery } = usePet();
  const [selectedCategory, setSelectedCategory] = useState<PetCategory | 'all'>('all');
  const [selectedGender, setSelectedGender] = useState<'all' | PetGender>('all');

  const filteredPets = pets.filter((pet) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pet.breed.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pet.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pet.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (pet.tags &&
        pet.tags.some((t) =>
          t.toLowerCase().includes(searchQuery.toLowerCase())
        ));

    const matchesCategory =
      selectedCategory === 'all' || pet.category === selectedCategory;
    const matchesGender =
      selectedGender === 'all' || pet.gender === selectedGender;

    return matchesSearch && matchesCategory && matchesGender;
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header title="Search Pets" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#89726A" style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by breed, name, city, tag..."
            placeholderTextColor="#89726A"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
              accessibilityLabel="Clear search"
            >
              <X size={18} color="#89726A" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Species Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.speciesRow}
        >
          <TouchableOpacity
            onPress={() => setSelectedCategory('all')}
            style={[
              styles.filterPill,
              selectedCategory === 'all' && styles.filterPillSelected,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedCategory === 'all' && styles.filterPillTextSelected,
              ]}
            >
              All Species
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedCategory('dogs')}
            style={[
              styles.filterPill,
              selectedCategory === 'dogs' && styles.filterPillSelected,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedCategory === 'dogs' && styles.filterPillTextSelected,
              ]}
            >
              🐕 Dogs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedCategory('cats')}
            style={[
              styles.filterPill,
              selectedCategory === 'cats' && styles.filterPillSelected,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedCategory === 'cats' && styles.filterPillTextSelected,
              ]}
            >
              🐈 Cats
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedCategory('rabbits')}
            style={[
              styles.filterPill,
              selectedCategory === 'rabbits' && styles.filterPillSelected,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedCategory === 'rabbits' && styles.filterPillTextSelected,
              ]}
            >
              🐇 Rabbits
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedCategory('birds')}
            style={[
              styles.filterPill,
              selectedCategory === 'birds' && styles.filterPillSelected,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedCategory === 'birds' && styles.filterPillTextSelected,
              ]}
            >
              🦜 Birds
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedCategory('others')}
            style={[
              styles.filterPill,
              selectedCategory === 'others' && styles.filterPillSelected,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedCategory === 'others' && styles.filterPillTextSelected,
              ]}
            >
              🐾 Others
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Gender Filter Buttons */}
        <View style={styles.genderRow}>
          <Text style={styles.genderLabel}>Gender:</Text>
          <TouchableOpacity
            onPress={() => setSelectedGender('all')}
            style={[
              styles.genderButton,
              selectedGender === 'all' && styles.genderButtonSelected,
            ]}
          >
            <Text
              style={[
                styles.genderButtonText,
                selectedGender === 'all' && styles.genderButtonTextSelected,
              ]}
            >
              Any
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedGender('female')}
            style={[
              styles.genderButton,
              selectedGender === 'female' && styles.genderButtonSelected,
            ]}
          >
            <Text
              style={[
                styles.genderButtonText,
                selectedGender === 'female' && styles.genderButtonTextSelected,
              ]}
            >
              Female ♀
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedGender('male')}
            style={[
              styles.genderButton,
              selectedGender === 'male' && styles.genderButtonSelected,
            ]}
          >
            <Text
              style={[
                styles.genderButtonText,
                selectedGender === 'male' && styles.genderButtonTextSelected,
              ]}
            >
              Male ♂
            </Text>
          </TouchableOpacity>
        </View>

        {/* Results Counter */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {filteredPets.length} Result{filteredPets.length === 1 ? '' : 's'}
          </Text>
        </View>

        {/* Results List */}
        {filteredPets.length > 0 ? (
          <View style={styles.petsList}>
            {filteredPets.map((pet) => (
              <PetCard key={pet.id} pet={pet} fullWidth />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Frown size={42} color={PetConnectColors.outline} />
            <Text style={styles.emptyTitle}>No matching pets found</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your search terms or filter selections
            </Text>
          </View>
        )}

        {/* Bottom space for tab bar */}
        <View style={{ height: 110 }} />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.6)',
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 16,
    shadowColor: '#332E2C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: PetConnectColors.onSurface,
    height: '100%',
  },
  clearButton: {
    padding: 4,
  },
  speciesRow: {
    gap: 8,
    paddingBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.6)',
  },
  filterPillSelected: {
    backgroundColor: PetConnectColors.primary,
    borderColor: PetConnectColors.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: PetConnectColors.onSurfaceVariant,
  },
  filterPillTextSelected: {
    color: '#FFFFFF',
  },
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  genderLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: PetConnectColors.outline,
  },
  genderButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  genderButtonSelected: {
    backgroundColor: PetConnectColors.secondaryContainer,
  },
  genderButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: PetConnectColors.onSurfaceVariant,
  },
  genderButtonTextSelected: {
    color: PetConnectColors.onSecondaryContainer,
    fontWeight: '700',
  },
  resultsHeader: {
    paddingVertical: 6,
    marginBottom: 10,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  petsList: {
    gap: 4,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.4)',
    marginTop: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: PetConnectColors.onSurfaceVariant,
    textAlign: 'center',
  },
});

