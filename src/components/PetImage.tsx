import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, StyleProp, ImageStyle, ViewStyle } from 'react-native';
import { Image, ImageProps } from 'expo-image';
import { getValidPetImageUrl, getCategoryFallbackImage } from '../utils/imageHelper';
import { PetConnectColors } from '../constants/colors';

interface PetImageProps {
  uri?: string | null;
  category?: string;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  priority?: 'low' | 'normal' | 'high';
  testId?: string;
}

export const PetImage: React.FC<PetImageProps> = ({
  uri,
  category,
  style,
  containerStyle,
  contentFit = 'cover',
  priority = 'normal',
}) => {
  const initialUrl = getValidPetImageUrl(uri, category);
  const [currentSource, setCurrentSource] = useState<string>(initialUrl);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    const valid = getValidPetImageUrl(uri, category);
    setCurrentSource(valid);
    setHasError(false);
  }, [uri, category]);

  const handleError = () => {
    const fallback = getCategoryFallbackImage(category);
    setHasError(true);
    setIsLoading(false);
    if (currentSource !== fallback) {
      setCurrentSource(fallback);
    }
  };

  const handleLoadStart = () => {
    setIsLoading(true);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Image
        source={{ uri: currentSource }}
        style={[styles.image, style]}
        contentFit={contentFit}
        priority={priority}
        transition={200}
        onLoadStart={handleLoadStart}
        onLoad={handleLoadEnd}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
      />
      {isLoading && !currentSource?.startsWith('data:') && (
        <View style={[styles.loadingOverlay, style]}>
          <ActivityIndicator size="small" color={PetConnectColors.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#F3EDE8',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#F3EDE8',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
