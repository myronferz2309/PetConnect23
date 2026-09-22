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
import { useRouter } from 'expo-router';
import {
  Search,
  X,
  Plus,
  PawPrint,
  Cat,
  Rabbit,
  Bird,
  MoreHorizontal,
  SearchX,
  Sparkles,
  Bot,
} from 'lucide-react-native';
import { usePet } from '../../context/PetContext';
import { PetCard } from '../../components/PetCard';
import { PetCareFab } from '../../components/PetCareFab';
import { PetCategory } from '../../types';
import { PetConnectColors } from '../../constants/colors';

const CATEGORIES: { id: PetCategory; label: string; icon: any }[] = [
  { id: 'dogs', label: 'Dogs', icon: PawPrint },
  { id: 'cats', label: 'Cats', icon: Cat },
  { id: 'rabbits', label: 'Rabbits', icon: Rabbit },
  { id: 'birds', label: 'Birds', icon: Bird },
  { id: 'others', label: 'Others', icon: MoreHorizontal },
];

export default function HomeScreen() {
  const router = useRouter();
  const {
    pets,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
  } = usePet();

  const [showOnlyFeatured, setShowOnlyFeatured] = useState<boolean>(false);

  // Filter logic matching the original app
  const filteredPets = pets.filter((pet) => {
    const matchesCategory =
      selectedCategory === 'all' || pet.category === selectedCategory;

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

    const matchesFeatured = !showOnlyFeatured || pet.isFeatured;

    return matchesCategory && matchesSearch && matchesFeatured;
  });

  const handleCategoryPress = (catId: PetCategory) => {
    if (selectedCategory === catId) {
      setSelectedCategory('all');
    } else {
      setSelectedCategory(catId);
    }
  };

  const selectedCategoryLabel =
    CATEGORIES.find((c) => c.id === selectedCategory)?.label || 'Category';

  const sectionTitle =
    selectedCategory !== 'all'
      ? `${selectedCategoryLabel} Pets`
      : showOnlyFeatured
      ? 'Featured Pets'
      : 'All Adoptable Pets';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <PawPrint size={18} color={PetConnectColors.primary} />
          </View>
          <Text style={styles.headerTitle}>PetConnect</Text>
        </View>

        <TouchableOpacity
          style={styles.listPetButton}
          onPress={() => router.push('/(tabs)/add-pet' as any)}
          activeOpacity={0.8}
          accessibilityLabel="List a pet"
        >
          <Plus size={16} color={PetConnectColors.primary} />
          <Text style={styles.listPetText}>List Pet</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Find Your Perfect Companion</Text>
          <Text style={styles.heroSubtitle}>
            Discover pets waiting for a loving home.
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#89726A" style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search for pets (breed, name, city)..."
            placeholderTextColor="#89726A"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchButton}
              accessibilityLabel="Clear search"
            >
              <X size={18} color="#89726A" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* AI Pet Match Prominent Banner */}
        <View style={styles.aiMatchBanner}>
          <View style={styles.aiMatchLeft}>
            <View style={styles.aiMatchHeaderRow}>
              <Text style={styles.aiMatchIcon}>🐾</Text>
              <Text style={styles.aiMatchTitle}>Find My Perfect Match</Text>
            </View>
            <Text style={styles.aiMatchSubtitle}>
              Let AI find pets that fit your lifestyle.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.aiMatchButton}
            onPress={() => router.push('/ai-match' as any)}
            activeOpacity={0.85}
          >
            <Sparkles size={15} color="#FFFFFF" />
            <Text style={styles.aiMatchButtonText}>Start Matching</Text>
          </TouchableOpacity>
        </View>

        {/* Category Chips */}
        <View style={styles.categoriesSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.categoriesLabel}>CATEGORIES</Text>
            {selectedCategory !== 'all' && (
              <TouchableOpacity onPress={() => setSelectedCategory('all')}>
                <Text style={styles.resetFilterText}>Reset filter</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const IconComponent = cat.icon;

              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => handleCategoryPress(cat.id)}
                  activeOpacity={0.75}
                  style={[
                    styles.categoryCard,
                    isSelected && styles.categoryCardSelected,
                  ]}
                  accessibilityLabel={`Filter by ${cat.label}`}
                >
                  <IconComponent
                    size={24}
                    color={isSelected ? '#FFFFFF' : '#576159'}
                  />
                  <Text
                    style={[
                      styles.categoryCardText,
                      isSelected && styles.categoryCardTextSelected,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Pets Section */}
        <View style={styles.petsSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.petsTitle}>
              {sectionTitle}{' '}
              <Text style={styles.petsCount}>({filteredPets.length})</Text>
            </Text>

            <TouchableOpacity
              onPress={() => setShowOnlyFeatured(!showOnlyFeatured)}
              accessibilityLabel={showOnlyFeatured ? 'Show all' : 'See all'}
            >
              <Text style={styles.seeAllText}>
                {showOnlyFeatured ? 'Show all' : 'See all'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Pets List */}
          {filteredPets.length > 0 ? (
            <View style={styles.petsGrid}>
              {filteredPets.map((pet) => (
                <PetCard key={pet.id} pet={pet} fullWidth />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <SearchX size={36} color={PetConnectColors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No pets found</Text>
              <Text style={styles.emptySubtitle}>
                We couldn't find any pets matching "
                {searchQuery || selectedCategory}". Try another keyword or browse
                all categories.
              </Text>

              <View style={styles.emptyButtonsRow}>
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setShowOnlyFeatured(false);
                  }}
                  style={styles.clearFiltersButton}
                >
                  <Text style={styles.clearFiltersText}>Clear Filters</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/add-pet' as any)}
                  style={styles.postPetButton}
                >
                  <Text style={styles.postPetText}>Post a Pet</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Bottom spacer for floating tab bar */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Floating PetCare AI Action Button */}
      <PetCareFab onPress={() => router.push('/pet-care-ai' as any)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PetConnectColors.background,
  },
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: PetConnectColors.background,
    borderBottomWidth: 1,
    borderBottomColor: PetConnectColors.outlineVariantLight,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 140, 97, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: PetConnectColors.primary,
    letterSpacing: -0.3,
  },
  listPetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PetConnectColors.surfaceContainer,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  listPetText: {
    fontSize: 12,
    fontWeight: '700',
    color: PetConnectColors.primary,
  },
  scrollContent: {
    paddingTop: 16,
  },
  heroSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 27,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  heroSubtitle: {
    fontSize: 15,
    color: PetConnectColors.onSurfaceVariant,
    marginTop: 4,
    fontWeight: '400',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.6)',
    borderRadius: 18,
    paddingHorizontal: 14,
    height: 52,
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
  clearSearchButton: {
    padding: 4,
  },
  aiMatchBanner: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 140, 97, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#752501',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  aiMatchLeft: {
    flex: 1,
  },
  aiMatchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  aiMatchIcon: {
    fontSize: 16,
  },
  aiMatchTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: PetConnectColors.onSurface,
    letterSpacing: -0.2,
  },
  aiMatchSubtitle: {
    fontSize: 12,
    color: PetConnectColors.onSurfaceVariant,
    lineHeight: 16,
  },
  aiMatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PetConnectColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 2,
  },
  aiMatchButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  categoriesSection: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  categoriesLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: PetConnectColors.outline,
  },
  resetFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: PetConnectColors.primary,
  },
  categoryScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryCard: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#332E2C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  categoryCardSelected: {
    backgroundColor: PetConnectColors.primary,
    borderColor: PetConnectColors.primary,
    shadowColor: PetConnectColors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  categoryCardText: {
    fontSize: 12,
    fontWeight: '600',
    color: PetConnectColors.onSurfaceVariant,
  },
  categoryCardTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  petsSection: {
    paddingHorizontal: 20,
  },
  petsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    letterSpacing: -0.2,
  },
  petsCount: {
    fontSize: 14,
    fontWeight: '400',
    color: PetConnectColors.outline,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: PetConnectColors.primary,
  },
  petsGrid: {
    marginTop: 6,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.4)',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: PetConnectColors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: PetConnectColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  clearFiltersButton: {
    backgroundColor: PetConnectColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  clearFiltersText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  postPetButton: {
    backgroundColor: PetConnectColors.surfaceContainer,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  postPetText: {
    color: PetConnectColors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
