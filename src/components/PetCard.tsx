import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, MapPin, Images } from 'lucide-react-native';
import { GenderIcon } from './GenderIcon';
import { PetImage } from './PetImage';
import { Pet } from '../types';
import { usePet } from '../context/PetContext';
import { PetConnectColors } from '../constants/colors';

interface PetCardProps {
  pet: Pet;
  fullWidth?: boolean;
}

export const PetCard: React.FC<PetCardProps> = ({ pet, fullWidth = false }) => {
  const router = useRouter();
  const { isPetSaved, toggleSavePet } = usePet();
  const saved = isPetSaved(pet.id);

  const [cardWidth, setCardWidth] = useState<number>(0);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const scrollRef = useRef<ScrollView>(null);

  // Extract all available images (main image + any additional photos)
  const rawList = pet.imageUrls || pet.additionalImages || [];
  const allImages = [
    pet.imageUrl,
    ...rawList.filter((url) => Boolean(url) && url !== pet.imageUrl),
  ].filter(Boolean);

  const handleCardPress = () => {
    router.push({
      pathname: '/pet/[id]' as any,
      params: { id: pet.id },
    });
  };

  const handleFavoritePress = (e: any) => {
    e?.stopPropagation?.();
    toggleSavePet(pet.id);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (cardWidth <= 0) return;
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / cardWidth);
    if (index !== activeImageIndex && index >= 0 && index < allImages.length) {
      setActiveImageIndex(index);
    }
  };

  const city = pet.location ? pet.location.split(',')[0].trim() : 'Local';

  return (
    <View style={[styles.card, fullWidth && styles.cardFullWidth]}>
      {/* Pet Image Container with Manual Swipe Carousel */}
      <View
        style={styles.imageContainer}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && Math.abs(w - cardWidth) > 1) {
            setCardWidth(w);
          }
        }}
      >
        {allImages.length <= 1 ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleCardPress}
            style={styles.singleImageTouchable}
          >
            <PetImage
              uri={allImages[0] || pet.imageUrl}
              category={pet.category}
              style={styles.image}
              contentFit="cover"
            />
          </TouchableOpacity>
        ) : (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            onScroll={handleScroll}
            onMomentumScrollEnd={handleScroll}
            scrollEventThrottle={16}
            style={{ width: cardWidth, height: 210 }}
          >
            {allImages.map((imgUri, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.9}
                onPress={handleCardPress}
                style={{ width: cardWidth, height: 210 }}
              >
                <PetImage
                  uri={imgUri}
                  category={pet.category}
                  style={styles.image}
                  contentFit="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Pet Status Badge */}
        {pet.status === 'adopted' ? (
          <View style={styles.cardAdoptedBadge}>
            <Text style={styles.cardAdoptedBadgeText}>Adopted</Text>
          </View>
        ) : pet.status === 'pending' ? (
          <View style={styles.cardPendingBadge}>
            <Text style={styles.cardPendingBadgeText}>Pending</Text>
          </View>
        ) : null}

        {/* Favorite Heart Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleFavoritePress}
          style={styles.favoriteButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={saved ? `Remove ${pet.name} from saved` : `Save ${pet.name}`}
        >
          <Heart
            size={20}
            color={saved ? PetConnectColors.primary : '#89726A'}
            fill={saved ? PetConnectColors.primary : 'transparent'}
          />
        </TouchableOpacity>

        {/* Multi-Photo Dots Indicator on bottom of image */}
        {allImages.length > 1 && (
          <View style={styles.dotsRow}>
            {allImages.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  activeImageIndex === idx ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            ))}
          </View>
        )}

        {/* Location Badge */}
        <View style={styles.locationBadge}>
          <MapPin size={12} color="#FFFFFF" />
          <Text style={styles.locationBadgeText} numberOfLines={1}>
            {city}
          </Text>
        </View>
      </View>

      {/* Card Info */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={handleCardPress}
        style={styles.infoContainer}
      >
        <View>
          <View style={styles.nameRow}>
            <Text style={styles.petName} numberOfLines={1}>
              {pet.name}
            </Text>
            <GenderIcon
              gender={pet.gender}
              size={18}
              color={pet.gender === 'female' ? '#9E421D' : '#576159'}
            />
          </View>
          <Text style={styles.breedText} numberOfLines={1}>
            {pet.breed}
          </Text>
        </View>

        {/* Attribute Pills */}
        <View style={styles.pillsRow}>
          <View style={[styles.pill, styles.sagePill]}>
            <Text style={styles.sagePillText}>{pet.age}</Text>
          </View>

          {pet.tags && pet.tags[0] && (
            <View style={[styles.pill, styles.sagePill]}>
              <Text style={styles.sagePillText} numberOfLines={1}>
                {pet.tags[0]}
              </Text>
            </View>
          )}

          {pet.tags && pet.tags[1] && (
            <View style={[styles.pill, styles.neutralPill]}>
              <Text style={styles.neutralPillText} numberOfLines={1}>
                {pet.tags[1]}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.45)',
    shadowColor: '#332E2C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 16,
  },
  cardFullWidth: {
    width: '100%',
  },
  imageContainer: {
    height: 210,
    width: '100%',
    backgroundColor: '#F6ECE8',
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  singleImageTouchable: {
    width: '100%',
    height: 210,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    zIndex: 15,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    backgroundColor: '#FFFFFF',
    width: 14,
    borderRadius: 4,
  },
  inactiveDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  cardAdoptedBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#2E6930',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 10,
  },
  cardAdoptedBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardPendingBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#9E421D',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 10,
  },
  cardPendingBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  locationBadge: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  locationBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 15,
    justifyContent: 'space-between',
    minHeight: 110,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  petName: {
    fontSize: 20,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    letterSpacing: -0.3,
    flex: 1,
    marginRight: 6,
  },
  breedText: {
    fontSize: 14,
    fontWeight: '500',
    color: PetConnectColors.onSurfaceVariant,
    marginBottom: 10,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 2,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  sagePill: {
    backgroundColor: PetConnectColors.secondaryContainer,
  },
  sagePillText: {
    color: PetConnectColors.onSecondaryContainer,
    fontSize: 11,
    fontWeight: '700',
  },
  neutralPill: {
    backgroundColor: PetConnectColors.surfaceContainerHigh,
  },
  neutralPillText: {
    color: PetConnectColors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '600',
  },
});
