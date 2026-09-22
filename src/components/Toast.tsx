import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PawPrint } from 'lucide-react-native';
import { usePet } from '../context/PetContext';
import { PetConnectColors } from '../constants/colors';

export const Toast: React.FC = () => {
  const { toastMessage } = usePet();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toastMessage) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: insets.top + 12,
          useNativeDriver: true,
          tension: 80,
          friction: 9,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [toastMessage, insets.top, translateY, opacity]);

  if (!toastMessage) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.toast}>
        <PawPrint size={16} color={PetConnectColors.primaryContainer} />
        <Text style={styles.text}>{toastMessage}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    backgroundColor: 'rgba(31, 27, 25, 0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

