import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Heart,
  Calendar,
  MapPin,
  PawPrint,
  Video,
  Play,
  ShieldCheck,
  CheckCircle,
  Inbox,
  Check,
  HeartHandshake,
  DollarSign,
  Trash2,
  Bot,
  Sparkles,
} from 'lucide-react-native';
import { GenderIcon } from '../../components/GenderIcon';
import { PetImage } from '../../components/PetImage';
import { usePet } from '../../context/PetContext';
import { PetConnectColors } from '../../constants/colors';
import { getValidPetImageUrl, getCategoryFallbackImage } from '../../utils/imageHelper';

const { width } = Dimensions.get('window');

export default function PetDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    getPetById,
    isPetSaved,
    toggleSavePet,
    openVideoModal,
    userProfile,
    hasUserApplied,
    openAuthModal,
    deletePet,
  } = usePet();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const showcaseScrollRef = useRef<ScrollView>(null);
  const isUserInteracting = useRef<boolean>(false);
  const interactionTimeout = useRef<any>(null);

  const pet = getPetById(id || '');

  if (!pet) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>Pet not found</Text>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)' as any)}
            style={styles.returnButton}
          >
            <Text style={styles.returnButtonText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const saved = isPetSaved(pet.id);
  const primaryImg = getValidPetImageUrl(pet.imageUrl, pet.category);
  const rawAdditional = pet.imageUrls || pet.additionalImages || [];
  const additionalList = rawAdditional.filter((url) => url !== pet.imageUrl);
  const images = [
    primaryImg,
    ...additionalList.map((img) => getValidPetImageUrl(img, pet.category)),
  ];
  const [heroImageSrc, setHeroImageSrc] = useState<string>(images[0] || primaryImg);

  // Automatic carousel slide interval
  useEffect(() => {
    if (images.length <= 1) return;

    const timer = setInterval(() => {
      if (isUserInteracting.current) return;

      setActiveImageIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % images.length;
        showcaseScrollRef.current?.scrollTo({
          x: nextIndex * width,
          animated: true,
        });
        return nextIndex;
      });
    }, 4000);

    return () => {
      clearInterval(timer);
      if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
    };
  }, [images.length, width]);

  const isOwner = Boolean(
    userProfile?.uid && pet.ownerId && pet.ownerId === userProfile.uid
  );
  const isAdopted = pet.status === 'adopted';
  const isPending = pet.status === 'pending';
  const alreadyApplied = hasUserApplied(pet.id);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as any);
    }
  };

  const handleAdoptPress = () => {
    if (!userProfile) {
      openAuthModal();
      return;
    }

    if (isOwner) {
      router.push('/my-applications' as any);
      return;
    }

    if (alreadyApplied) {
      router.push('/my-applications' as any);
      return;
    }

    router.push({
      pathname: '/apply/[id]' as any,
      params: { id: pet.id },
    });
  };

  const handleDeletePet = () => {
    Alert.alert(
      `Delete "${pet.name}"?`,
      'Are you sure you want to remove this pet listing? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePet(pet.id);
            router.replace('/(tabs)' as any);
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.headerButton}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={22} color={PetConnectColors.onSurfaceVariant} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>PetConnect</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {(isOwner || pet.id.startsWith('pet-')) && (
            <TouchableOpacity
              onPress={handleDeletePet}
              style={[styles.headerButton, styles.deleteHeaderButton]}
              accessibilityLabel="Delete pet listing"
            >
              <Trash2 size={20} color="#BA1A1A" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => toggleSavePet(pet.id)}
            style={styles.headerButton}
            accessibilityLabel={saved ? 'Remove favorite' : 'Save pet'}
          >
            <Heart
              size={22}
              color={saved ? PetConnectColors.primary : '#89726A'}
              fill={saved ? PetConnectColors.primary : 'transparent'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Photo Showcase Container with Swipe Carousel */}
        <View style={styles.showcaseContainer}>
          {images.length <= 1 ? (
            <PetImage
              uri={images[0] || primaryImg}
              category={pet.category}
              style={styles.showcaseImage}
              contentFit="cover"
            />
          ) : (
            <ScrollView
              ref={showcaseScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              onScroll={(e) => {
                const offsetX = e.nativeEvent.contentOffset.x;
                const idx = Math.round(offsetX / width);
                if (idx !== activeImageIndex && idx >= 0 && idx < images.length) {
                  setActiveImageIndex(idx);
                }
              }}
              onScrollBeginDrag={() => {
                isUserInteracting.current = true;
                if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
              }}
              onScrollEndDrag={() => {
                if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
                interactionTimeout.current = setTimeout(() => {
                  isUserInteracting.current = false;
                }, 3000);
              }}
              onMomentumScrollEnd={(e) => {
                const offsetX = e.nativeEvent.contentOffset.x;
                const idx = Math.round(offsetX / width);
                if (idx >= 0 && idx < images.length) {
                  setActiveImageIndex(idx);
                }
                if (interactionTimeout.current) clearTimeout(interactionTimeout.current);
                interactionTimeout.current = setTimeout(() => {
                  isUserInteracting.current = false;
                }, 3000);
              }}
              scrollEventThrottle={16}
              style={{ width, height: 380 }}
            >
              {images.map((imgUri, idx) => (
                <View key={idx} style={{ width, height: 380 }}>
                  <PetImage
                    uri={imgUri}
                    category={pet.category}
                    style={styles.showcaseImage}
                    contentFit="cover"
                  />
                </View>
              ))}
            </ScrollView>
          )}

          {/* Category Badge & Status Badge */}
          <View style={styles.topBadgesRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {pet.category.toUpperCase()}
              </Text>
            </View>

            {isAdopted ? (
              <View style={styles.adoptedBadge}>
                <CheckCircle size={12} color="#FFFFFF" />
                <Text style={styles.adoptedBadgeText}>ADOPTED</Text>
              </View>
            ) : isPending ? (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>ADOPTION PENDING</Text>
              </View>
            ) : (
              images.length > 1 && (
                <View style={styles.photoCountBadge}>
                  <Text style={styles.photoCountBadgeText}>
                    {activeImageIndex + 1} / {images.length}
                  </Text>
                </View>
              )
            )}
          </View>

          {/* Multi-Image Interactive Dots */}
          {images.length > 1 && (
            <View style={styles.dotsContainer}>
              {images.map((_, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => {
                    setActiveImageIndex(idx);
                    showcaseScrollRef.current?.scrollTo({
                      x: idx * width,
                      animated: true,
                    });
                  }}
                  style={[
                    styles.dot,
                    activeImageIndex === idx ? styles.activeDot : styles.inactiveDot,
                  ]}
                  accessibilityLabel={`Show photo ${idx + 1}`}
                />
              ))}
            </View>
          )}
        </View>

        {/* Floating Detail Card */}
        <View style={styles.detailCard}>
          {/* Owner Notice if current user posted this pet */}
          {isOwner && (
            <View style={styles.ownerNoticeBanner}>
              <Inbox size={16} color={PetConnectColors.onSecondaryContainer} />
              <Text style={styles.ownerNoticeText}>
                You listed this pet. Tap below to manage incoming requests.
              </Text>
            </View>
          )}

          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.petName}>{pet.name}</Text>
              <View style={styles.breedRow}>
                <PawPrint size={16} color={PetConnectColors.primary} />
                <Text style={styles.breedText}>{pet.breed}</Text>
              </View>
            </View>

            {/* Favorite FAB */}
            <TouchableOpacity
              onPress={() => toggleSavePet(pet.id)}
              style={styles.favoriteFab}
              activeOpacity={0.8}
            >
              <Heart
                size={24}
                color={saved ? PetConnectColors.primary : '#89726A'}
                fill={saved ? PetConnectColors.primary : 'transparent'}
              />
            </TouchableOpacity>
          </View>

          {/* Key Attributes Chips */}
          <View style={styles.chipsRow}>
            <View style={styles.attributeChip}>
              <Calendar size={14} color={PetConnectColors.onSecondaryContainer} />
              <Text style={styles.attributeChipText}>{pet.age}</Text>
            </View>

            <View style={styles.attributeChip}>
              <GenderIcon
                gender={pet.gender}
                size={14}
                color={PetConnectColors.onSecondaryContainer}
              />
              <Text style={styles.attributeChipText}>
                {pet.gender === 'female' ? 'Female' : 'Male'}
              </Text>
            </View>

            <View style={styles.attributeChip}>
              <MapPin size={14} color={PetConnectColors.onSecondaryContainer} />
              <Text style={styles.attributeChipText}>{pet.location}</Text>
            </View>
          </View>

          {/* Tags */}
          {pet.tags && pet.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {pet.tags.map((tag, idx) => (
                <View key={idx} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>✓ {tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* About Section */}
          <View style={styles.aboutSection}>
            <Text style={styles.sectionHeading}>About {pet.name}</Text>
            <Text style={styles.descriptionText}>{pet.description}</Text>
          </View>

          {/* Health & Medical Information */}
          {Boolean(pet.health) && (
            <View style={styles.healthDetailCard}>
              <View style={styles.healthHeaderRow}>
                <ShieldCheck size={16} color={PetConnectColors.primary} />
                <Text style={styles.healthHeaderTitle}>Health & Medical Status</Text>
              </View>

              <View style={styles.healthBadgesRow}>
                <View
                  style={[
                    styles.healthBadge,
                    pet.health?.vaccinated
                      ? styles.healthBadgePositive
                      : styles.healthBadgeNeutral,
                  ]}
                >
                  <Text
                    style={[
                      styles.healthBadgeText,
                      pet.health?.vaccinated
                        ? styles.healthBadgeTextPositive
                        : styles.healthBadgeTextNeutral,
                    ]}
                  >
                    {pet.health?.vaccinated ? '✓ Vaccinated' : '○ Pending Vaccine'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.healthBadge,
                    pet.health?.dewormed
                      ? styles.healthBadgePositive
                      : styles.healthBadgeNeutral,
                  ]}
                >
                  <Text
                    style={[
                      styles.healthBadgeText,
                      pet.health?.dewormed
                        ? styles.healthBadgeTextPositive
                        : styles.healthBadgeTextNeutral,
                    ]}
                  >
                    {pet.health?.dewormed ? '✓ Dewormed' : '○ Deworming Needed'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.healthBadge,
                    pet.health?.spayedNeutered
                      ? styles.healthBadgePositive
                      : styles.healthBadgeNeutral,
                  ]}
                >
                  <Text
                    style={[
                      styles.healthBadgeText,
                      pet.health?.spayedNeutered
                        ? styles.healthBadgeTextPositive
                        : styles.healthBadgeTextNeutral,
                    ]}
                  >
                    {pet.health?.spayedNeutered ? '✓ Neutered/Spayed' : '○ Not Neutered'}
                  </Text>
                </View>
              </View>

              {Boolean(pet.health?.notes) && (
                <Text style={styles.healthNotesText}>
                  Note: {pet.health?.notes}
                </Text>
              )}
            </View>
          )}

          {/* Ask PetCare AI Card */}
          <TouchableOpacity
            style={styles.petCareDetailCard}
            onPress={() =>
              router.push({
                pathname: '/pet-care-ai' as any,
                params: { petId: pet.id },
              })
            }
            activeOpacity={0.85}
          >
            <View style={styles.petCareDetailIconCircle}>
              <Bot size={22} color={PetConnectColors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.petCareDetailHeaderRow}>
                <Text style={styles.petCareDetailTitle}>Ask PetCare AI about {pet.name}</Text>
                <Sparkles size={14} color={PetConnectColors.primary} />
              </View>
              <Text style={styles.petCareDetailSub}>
                Get tailored guidance on nutrition, exercise & routine for a {pet.breed}.
              </Text>
            </View>
          </TouchableOpacity>

          {/* Adoption Requirements */}
          {Boolean(pet.adoptionRequirements && pet.adoptionRequirements.length > 0) && (
            <View style={styles.requirementsDetailCard}>
              <View style={styles.healthHeaderRow}>
                <HeartHandshake size={16} color={PetConnectColors.primary} />
                <Text style={styles.healthHeaderTitle}>Adoption Requirements</Text>
              </View>

              <View style={styles.requirementsTagsRow}>
                {pet.adoptionRequirements?.map((req, idx) => (
                  <View key={idx} style={styles.reqTagItem}>
                    <Text style={styles.reqTagText}>• {req}</Text>
                  </View>
                ))}
              </View>

              {typeof pet.adoptionFee === 'number' && (
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Adoption Fee:</Text>
                  <Text style={styles.feeValue}>
                    {pet.adoptionFee === 0 ? 'Free / None' : `₹${pet.adoptionFee.toLocaleString('en-IN')}`}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Shelter / Caregiver Info Card */}
          <View style={styles.shelterBox}>
            <View style={styles.shelterLeft}>
              <Text style={styles.shelterName}>
                {pet.ownerName || pet.shelterName || 'Community Caregiver'}
              </Text>
              <Text style={styles.shelterContact}>
                {pet.shelterContact || 'PetConnect Adoption Member'}
              </Text>
            </View>
            <View style={styles.verifiedBadge}>
              <ShieldCheck size={14} color="#752501" />
              <Text style={styles.verifiedBadgeText}>Verified Rescue</Text>
            </View>
          </View>
        </View>

        {/* Video Profile Section (only rendered if pet has an actual video) */}
        {Boolean(pet.videoUrl && pet.videoUrl.trim()) && (
          <View style={styles.videoSection}>
            <View style={styles.videoSectionHeader}>
              <Text style={styles.sectionHeading}>Watch {pet.name} Play</Text>
              <View style={styles.videoLabel}>
                <Video size={14} color={PetConnectColors.outline} />
                <Text style={styles.videoLabelText}>Video Profile</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => openVideoModal(pet)}
              style={styles.videoPreviewCard}
              activeOpacity={0.9}
            >
              <PetImage
                uri={pet.videoThumbnail || pet.imageUrl}
                category={pet.category}
                style={styles.videoPreviewImage}
                contentFit="cover"
              />
              <View style={styles.videoOverlay} />

              <View style={styles.playButtonCenter}>
                <View style={styles.playIconCircle}>
                  <Play size={28} color="#FFFFFF" fill="#FFFFFF" />
                </View>
                <View style={styles.watchBadge}>
                  <Text style={styles.watchBadgeText}>Tap to watch video</Text>
                </View>
              </View>

              <View style={styles.videoDurationBadge}>
                <Text style={styles.videoDurationText}>Video • HD</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom space for sticky CTA */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={styles.bottomBar}>
        {isAdopted ? (
          <View style={styles.disabledAdoptButton}>
            <CheckCircle size={20} color="#576159" />
            <Text style={styles.disabledAdoptButtonText}>
              Already Adopted 🎉
            </Text>
          </View>
        ) : isOwner ? (
          <TouchableOpacity
            onPress={handleAdoptPress}
            style={[styles.adoptButton, styles.ownerManageButton]}
            activeOpacity={0.9}
          >
            <Inbox size={20} color="#FFFFFF" />
            <Text style={styles.adoptButtonText}>Manage Incoming Requests</Text>
          </TouchableOpacity>
        ) : alreadyApplied ? (
          <TouchableOpacity
            onPress={handleAdoptPress}
            style={[styles.adoptButton, styles.appliedButton]}
            activeOpacity={0.9}
          >
            <Check size={20} color={PetConnectColors.onSecondaryContainer} />
            <Text style={styles.appliedButtonText}>
              Application Submitted (Track Status)
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleAdoptPress}
            style={styles.adoptButton}
            activeOpacity={0.9}
          >
            <Heart size={20} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={styles.adoptButtonText}>Adopt {pet.name}</Text>
          </TouchableOpacity>
        )}
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
  deleteHeaderButton: {
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PetConnectColors.primary,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  showcaseContainer: {
    width: '100%',
    height: 320,
    backgroundColor: PetConnectColors.surfaceContainer,
    position: 'relative',
  },
  showcaseImage: {
    width: '100%',
    height: '100%',
  },
  topBadgesRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryBadgeText: {
    color: '#752501',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  adoptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2E6930',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  adoptedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  pendingBadge: {
    backgroundColor: '#9E421D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  pendingBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  photoCountBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  photoCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    backgroundColor: '#FFFFFF',
    width: 16,
  },
  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  detailCard: {
    marginHorizontal: 16,
    marginTop: -28,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.4)',
    shadowColor: '#332E2C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    zIndex: 10,
    marginBottom: 20,
  },
  ownerNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PetConnectColors.secondaryContainer,
    padding: 10,
    borderRadius: 14,
    marginBottom: 14,
  },
  ownerNoticeText: {
    fontSize: 12,
    color: PetConnectColors.onSecondaryContainer,
    fontWeight: '600',
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  petName: {
    fontSize: 28,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    letterSpacing: -0.4,
  },
  breedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  breedText: {
    fontSize: 16,
    color: PetConnectColors.onSurfaceVariant,
    fontWeight: '500',
  },
  favoriteFab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: PetConnectColors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  attributeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PetConnectColors.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  attributeChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: PetConnectColors.onSecondaryContainer,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(221, 193, 183, 0.25)',
    marginBottom: 16,
  },
  tagChip: {
    backgroundColor: PetConnectColors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  tagChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: PetConnectColors.onSurfaceVariant,
  },
  aboutSection: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: PetConnectColors.onSurfaceVariant,
  },
  shelterBox: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(221, 193, 183, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shelterLeft: {
    flex: 1,
    paddingRight: 10,
  },
  shelterName: {
    fontSize: 13,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  shelterContact: {
    fontSize: 11,
    color: PetConnectColors.onSurfaceVariant,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PetConnectColors.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#752501',
  },
  healthDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.5)',
  },
  healthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  healthHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  healthBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  healthBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  healthBadgePositive: {
    backgroundColor: 'rgba(87, 97, 89, 0.12)',
    borderColor: '#576159',
  },
  healthBadgeNeutral: {
    backgroundColor: PetConnectColors.surfaceContainerLow,
    borderColor: 'rgba(221, 193, 183, 0.7)',
  },
  healthBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  healthBadgeTextPositive: {
    color: '#3F4941',
  },
  healthBadgeTextNeutral: {
    color: PetConnectColors.outline,
  },
  healthNotesText: {
    fontSize: 11,
    color: PetConnectColors.onSurfaceVariant,
    marginTop: 8,
    fontStyle: 'italic',
  },
  requirementsDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.5)',
  },
  petCareDetailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9F6',
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 140, 97, 0.35)',
    gap: 12,
    shadowColor: '#752501',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  petCareDetailIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 140, 97, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  petCareDetailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  petCareDetailTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: PetConnectColors.primary,
  },
  petCareDetailSub: {
    fontSize: 12,
    color: PetConnectColors.onSurfaceVariant,
    lineHeight: 16,
  },
  requirementsTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reqTagItem: {
    backgroundColor: 'rgba(255, 140, 97, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 97, 0.3)',
  },
  reqTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: PetConnectColors.primary,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(221, 193, 183, 0.3)',
  },
  feeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: PetConnectColors.onSurfaceVariant,
  },
  feeValue: {
    fontSize: 13,
    fontWeight: '800',
    color: PetConnectColors.primary,
  },
  videoSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  videoSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  videoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  videoLabelText: {
    fontSize: 12,
    color: PetConnectColors.outline,
    fontWeight: '500',
  },
  videoPreviewCard: {
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#332E2C',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.3)',
    shadowColor: '#332E2C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  videoPreviewImage: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  playButtonCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  playIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(158, 66, 29, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  watchBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  watchBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  videoDurationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  videoDurationText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
  adoptButton: {
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
  adoptButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  ownerManageButton: {
    backgroundColor: '#752501',
  },
  appliedButton: {
    backgroundColor: PetConnectColors.secondaryContainer,
    shadowColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.6)',
  },
  appliedButtonText: {
    color: PetConnectColors.onSecondaryContainer,
    fontSize: 15,
    fontWeight: '700',
  },
  disabledAdoptButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: PetConnectColors.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledAdoptButtonText: {
    color: PetConnectColors.onSurfaceVariant,
    fontSize: 16,
    fontWeight: '700',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    marginBottom: 16,
  },
  returnButton: {
    backgroundColor: PetConnectColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  returnButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
