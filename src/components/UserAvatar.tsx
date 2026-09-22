import React from 'react';
import { StyleSheet, View, Text, Image, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { PetConnectColors } from '../constants/colors';

interface UserAvatarProps {
  photoUrl?: string | null;
  name?: string;
  size?: number;
  style?: StyleProp<ViewStyle | ImageStyle>;
}

/**
 * Generate 1-2 uppercase initials from a user's name
 */
export const getInitials = (name?: string): string => {
  if (!name || !name.trim()) return 'P';
  const clean = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'P';
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  photoUrl,
  name = 'Pet Parent',
  size = 72,
  style,
}) => {
  const isOldHardcodedDemo =
    photoUrl && photoUrl.includes('photo-1535713875002-d1d0cf377fde');

  const hasCustomPhoto = Boolean(
    photoUrl &&
    typeof photoUrl === 'string' &&
    photoUrl.trim().length > 0 &&
    !isOldHardcodedDemo
  );

  const initials = getInitials(name);
  const borderRadius = size / 2;

  if (hasCustomPhoto) {
    return (
      <Image
        source={{ uri: photoUrl!.trim() }}
        style={[
          styles.avatarImage,
          { width: size, height: size, borderRadius },
          style as any,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.initialsContainer,
        {
          width: size,
          height: size,
          borderRadius,
        },
        style as any,
      ]}
    >
      <Text
        style={[
          styles.initialsText,
          {
            fontSize: Math.max(14, Math.round(size * 0.38)),
            lineHeight: Math.max(16, Math.round(size * 0.44)),
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatarImage: {
    backgroundColor: PetConnectColors.surfaceContainerLow,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  initialsContainer: {
    backgroundColor: '#752501',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#752501',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  initialsText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
});

