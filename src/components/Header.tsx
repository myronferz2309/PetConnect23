import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, PawPrint } from 'lucide-react-native';
import { PetConnectColors } from '../constants/colors';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'PetConnect',
  showBack = false,
  onBack,
  rightAction,
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)' as any);
      }
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.leftContainer}>
        {showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <ArrowLeft size={24} color={PetConnectColors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.logoBadge}>
            <PawPrint size={18} color={PetConnectColors.primary} />
          </View>
        )}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={styles.rightContainer}>
        {rightAction || <View style={styles.emptyRight} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 140, 97, 0.12)',
    marginLeft: -4,
  },
  logoBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 140, 97, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: PetConnectColors.primary,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyRight: {
    width: 34,
  },
});

