import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageSquare, ArrowRight, X } from 'lucide-react-native';
import { usePet } from '../context/PetContext';
import { PetConnectColors } from '../constants/colors';
import { UserAvatar } from './UserAvatar';
import { PetImage } from './PetImage';

export const NewMessageNotificationBanner: React.FC = () => {
  const { chatNotification, dismissChatNotification, openChatForNotification } = usePet();
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<any>(null);

  useEffect(() => {
    if (chatNotification) {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: insets.top + 8,
          useNativeDriver: true,
          tension: 70,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss after 6 seconds
      dismissTimer.current = setTimeout(() => {
        handleDismiss();
      }, 6000);
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -150,
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

    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [chatNotification, insets.top]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -150,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      dismissChatNotification();
    });
  };

  const handlePress = () => {
    if (chatNotification) {
      openChatForNotification(chatNotification.application);
      handleDismiss();
    }
  };

  if (!chatNotification) return null;

  const { message, application } = chatNotification;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={handlePress}
        style={styles.bannerCard}
      >
        {/* Left Avatar / Icon */}
        <View style={styles.avatarWrap}>
          <UserAvatar
            photoUrl={message.senderPhotoUrl}
            name={message.senderName}
            size={38}
          />
          <View style={styles.chatIconBadge}>
            <MessageSquare size={10} color="#FFFFFF" />
          </View>
        </View>

        {/* Middle Notification Text */}
        <View style={styles.textWrap}>
          <View style={styles.titleRow}>
            <Text style={styles.senderName} numberOfLines={1}>
              {message.senderName}
            </Text>
            <View style={styles.petTag}>
              <Text style={styles.petTagText} numberOfLines={1}>
                🐾 {application.petName}
              </Text>
            </View>
          </View>

          <Text style={styles.messageText} numberOfLines={1}>
            {message.text}
          </Text>

          <Text style={styles.tapPrompt}>Tap to open chat & reply</Text>
        </View>

        {/* Right Actions */}
        <View style={styles.rightActions}>
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={14} color="#89726A" />
          </TouchableOpacity>

          <View style={styles.arrowCircle}>
            <ArrowRight size={14} color="#FFFFFF" />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    zIndex: 99999,
  },
  bannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: PetConnectColors.primary,
    shadowColor: '#752501',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarWrap: {
    position: 'relative',
  },
  chatIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: PetConnectColors.primary,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    maxWidth: 140,
  },
  petTag: {
    backgroundColor: PetConnectColors.surfaceContainerHigh,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  petTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: PetConnectColors.primary,
  },
  messageText: {
    fontSize: 13,
    color: PetConnectColors.onSurfaceVariant,
    fontWeight: '500',
  },
  tapPrompt: {
    fontSize: 10,
    color: PetConnectColors.primary,
    fontWeight: '700',
    marginTop: 1,
  },
  rightActions: {
    alignItems: 'center',
    gap: 8,
  },
  closeBtn: {
    padding: 2,
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PetConnectColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

