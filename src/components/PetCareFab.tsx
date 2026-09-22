import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PawPrint, Sparkles } from 'lucide-react-native';
import { PetConnectColors } from '../constants/colors';

interface PetCareFabProps {
  onPress: () => void;
}

export function PetCareFab({ onPress }: PetCareFabProps) {
  const insets = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const labelWidthAnim = useRef(new Animated.Value(1)).current; // 1 = expanded, 0 = collapsed
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate bottom offset to sit comfortably above the custom bottom tab bar
  const bottomOffset = Platform.OS === 'ios' ? insets.bottom + 76 : 84;

  useEffect(() => {
    // Automatically collapse first-use label smoothly after 3.5 seconds
    const timer = setTimeout(() => {
      collapseLabel();
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  const collapseLabel = () => {
    Animated.timing(labelWidthAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: false,
    }).start(() => setIsExpanded(false));
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (isExpanded) {
      collapseLabel();
    }
    onPress();
  };

  const labelOpacity = labelWidthAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0, 1],
  });

  const labelMaxWidth = labelWidthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 140],
  });

  return (
    <Animated.View
      style={[
        styles.fabContainer,
        {
          bottom: bottomOffset,
          transform: [{ scale: scaleAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={styles.fabButton}
        accessibilityRole="button"
        accessibilityLabel="Open PetCare AI"
        accessible={true}
      >
        <View style={styles.iconContainer}>
          <PawPrint size={22} color="#FFFFFF" strokeWidth={2.3} />
          <View style={styles.sparkleDot}>
            <Sparkles size={10} color="#FFD166" />
          </View>
        </View>

        {isExpanded && (
          <Animated.View
            style={[
              styles.labelContainer,
              {
                opacity: labelOpacity,
                maxWidth: labelMaxWidth,
              },
            ]}
          >
            <Text style={styles.labelText} numberOfLines={1}>
              Ask PetCare AI
            </Text>
          </Animated.View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: 18,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PetConnectColors.primary,
    height: 54,
    borderRadius: 27,
    paddingHorizontal: 16,
    shadowColor: '#752501',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  iconContainer: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  sparkleDot: {
    position: 'absolute',
    top: -4,
    right: -6,
  },
  labelContainer: {
    overflow: 'hidden',
    marginLeft: 8,
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});

