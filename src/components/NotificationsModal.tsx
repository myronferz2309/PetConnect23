import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Bell,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Inbox,
  CheckCircle,
} from 'lucide-react-native';
import { AdoptionApplication } from '../types';
import { usePet } from '../context/PetContext';
import { PetConnectColors } from '../constants/colors';
import { UserAvatar } from './UserAvatar';
import { PetImage } from './PetImage';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectApplication: (application: AdoptionApplication) => void;
}

const formatNotificationTime = (timestamp?: number): string => {
  if (!timestamp) return 'Recently';
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  onSelectApplication,
}) => {
  const { applications, incomingRequests, userProfile } = usePet();

  const currentUserId = userProfile?.uid || 'demo-user-sarah';

  // Combine applications that have message activity
  const allConversations: {
    app: AdoptionApplication;
    isIncoming: boolean;
    hasUnread: boolean;
  }[] = [];

  // 1. Sent applications
  applications.forEach((app) => {
    if (app.lastMessageText) {
      const isFromOther = app.lastSenderId && app.lastSenderId !== currentUserId;
      allConversations.push({
        app,
        isIncoming: false,
        hasUnread: Boolean(isFromOther),
      });
    }
  });

  // 2. Incoming requests
  incomingRequests.forEach((req) => {
    if (req.lastMessageText) {
      const isFromOther = req.lastSenderId && req.lastSenderId !== currentUserId;
      allConversations.push({
        app: req,
        isIncoming: true,
        hasUnread: Boolean(isFromOther),
      });
    }
  });

  // Sort by latest message time
  allConversations.sort(
    (a, b) => (b.app.lastMessageTime || 0) - (a.app.lastMessageTime || 0)
  );

  const handleSelect = (app: AdoptionApplication) => {
    onClose();
    onSelectApplication(app);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.bellIconCircle}>
              <Bell size={20} color={PetConnectColors.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Replies & Messages</Text>
              <Text style={styles.headerSub}>
                {allConversations.length > 0
                  ? `${allConversations.length} active conversation${allConversations.length > 1 ? 's' : ''}`
                  : 'No active replies'}
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <X size={20} color="#89726A" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {allConversations.length > 0 ? (
            allConversations.map(({ app, isIncoming, hasUnread }) => {
              const otherUserName = isIncoming
                ? app.applicantName
                : app.lastSenderName || 'Pet Caregiver';

              const roleLabel = isIncoming ? 'Adoption Applicant' : 'Pet Caregiver';

              return (
                <TouchableOpacity
                  key={app.id}
                  style={[
                    styles.notificationCard,
                    hasUnread && styles.notificationCardUnread,
                  ]}
                  onPress={() => handleSelect(app)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.senderInfo}>
                      <UserAvatar name={otherUserName} size={36} />
                      <View style={styles.senderTexts}>
                        <View style={styles.nameRow}>
                          <Text style={styles.senderName} numberOfLines={1}>
                            {otherUserName}
                          </Text>
                          {hasUnread && <View style={styles.unreadDot} />}
                        </View>
                        <Text style={styles.roleLabel}>{roleLabel}</Text>
                      </View>
                    </View>

                    <Text style={styles.timeText}>
                      {formatNotificationTime(app.lastMessageTime)}
                    </Text>
                  </View>

                  {/* Message Bubble Snippet */}
                  <View style={styles.messageBox}>
                    <MessageSquare size={14} color={PetConnectColors.primary} />
                    <Text style={styles.messageText} numberOfLines={2}>
                      "{app.lastMessageText}"
                    </Text>
                  </View>

                  {/* Pet Context Footer */}
                  <View style={styles.cardFooter}>
                    <View style={styles.petContextRow}>
                      <PetImage
                        uri={app.petImageUrl}
                        style={styles.petThumbnail}
                        contentFit="cover"
                      />
                      <Text style={styles.petNameText} numberOfLines={1}>
                        Regarding <Text style={styles.petBold}>{app.petName}</Text> ({app.petBreed})
                      </Text>
                    </View>

                    <View style={styles.chatActionPrompt}>
                      <Text style={styles.chatPromptText}>Reply</Text>
                      <ArrowRight size={13} color={PetConnectColors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <MessageSquare size={36} color={PetConnectColors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>
                When adopters or pet owners reply to your adoption applications or requests, their replies will appear here!
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(221, 193, 183, 0.35)',
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PetConnectColors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  headerSub: {
    fontSize: 12,
    color: PetConnectColors.onSurfaceVariant,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: PetConnectColors.surfaceContainerHigh,
  },
  container: {
    flex: 1,
    backgroundColor: PetConnectColors.background,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    gap: 10,
  },
  notificationCardUnread: {
    borderColor: PetConnectColors.primary,
    backgroundColor: '#FFFDFD',
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  senderTexts: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PetConnectColors.primary,
  },
  roleLabel: {
    fontSize: 11,
    color: PetConnectColors.onSurfaceVariant,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 11,
    color: '#89726A',
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: PetConnectColors.surfaceContainerHigh,
    padding: 10,
    borderRadius: 12,
  },
  messageText: {
    fontSize: 13,
    color: PetConnectColors.onSurface,
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(221, 193, 183, 0.25)',
    paddingTop: 8,
  },
  petContextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  petThumbnail: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
  petNameText: {
    fontSize: 11,
    color: PetConnectColors.onSurfaceVariant,
    flex: 1,
  },
  petBold: {
    fontWeight: '700',
    color: PetConnectColors.primary,
  },
  chatActionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(185, 73, 33, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chatPromptText: {
    fontSize: 11,
    fontWeight: '700',
    color: PetConnectColors.primary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.4)',
    marginTop: 20,
    gap: 10,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: PetConnectColors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  emptySubtitle: {
    fontSize: 13,
    color: PetConnectColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 19,
  },
});

