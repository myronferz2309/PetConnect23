import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Send,
  MessageSquare,
  ShieldCheck,
  Calendar,
  HeartHandshake,
  Sparkles,
} from 'lucide-react-native';
import { AdoptionApplication, ChatMessage } from '../types';
import { usePet } from '../context/PetContext';
import { PetConnectColors } from '../constants/colors';
import { UserAvatar } from './UserAvatar';
import { PetImage } from './PetImage';

interface ApplicationChatModalProps {
  visible: boolean;
  application: AdoptionApplication | null;
  onClose: () => void;
}

const QUICK_SUGGESTIONS = [
  '📅 Can we schedule a meet & greet visit?',
  '💉 Is the pet up to date on all vaccinations?',
  '🐶 Is the pet friendly with other pets and kids?',
  '🏡 We have a secure and loving home ready!',
];

const formatMessageTime = (timestamp?: number): string => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const ApplicationChatModal: React.FC<ApplicationChatModalProps> = ({
  visible,
  application,
  onClose,
}) => {
  const { userProfile, sendMessage, subscribeToMessages } = usePet();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // Determine user roles
  const currentUserId = userProfile?.uid || 'demo-user-sarah';
  const isApplicant =
    application?.applicantId === currentUserId ||
    (!application?.applicantId && userProfile?.name === application?.applicantName);

  const otherUserName = isApplicant
    ? 'Pet Caregiver / Shelter'
    : application?.applicantName || 'Adopter';

  const otherUserRole = isApplicant ? 'Pet Owner / Caregiver' : 'Adopter';

  useEffect(() => {
    if (!visible || !application?.id) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToMessages(application.id, (newMsgs) => {
      setMessages(newMsgs);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      unsubscribe();
    };
  }, [visible, application?.id]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !application?.id || isSending) return;

    setInputText('');
    setIsSending(true);

    try {
      await sendMessage(application.id, text);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err) {
      console.warn('Failed to send chat message:', err);
    } finally {
      setIsSending(false);
    }
  };

  if (!application) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <UserAvatar name={otherUserName} size={42} style={styles.headerAvatar} />
              <View style={styles.headerInfo}>
                <View style={styles.nameBadgeRow}>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    {otherUserName}
                  </Text>
                  <View style={styles.roleTag}>
                    <Text style={styles.roleTagText}>{otherUserRole}</Text>
                  </View>
                </View>

                {/* Pet Subject context */}
                <View style={styles.petSubjectRow}>
                  <PetImage
                    uri={application.petImageUrl}
                    style={styles.headerPetThumb}
                    contentFit="cover"
                  />
                  <Text style={styles.headerSub} numberOfLines={1}>
                    Regarding <Text style={styles.petBold}>{application.petName}</Text> ({application.petBreed})
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color="#89726A" />
            </TouchableOpacity>
          </View>

          {/* Chat Messages Stream */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {/* Trust & Safety Card */}
            <View style={styles.safetyCard}>
              <ShieldCheck size={18} color={PetConnectColors.primary} />
              <Text style={styles.safetyText}>
                This is a secure direct channel between the adopter and pet caregiver. Coordinate visits, vaccination records, and adoption details safely.
              </Text>
            </View>

            {/* Empty or Initial greeting note */}
            {messages.length === 0 && (
              <View style={styles.greetingBox}>
                <Sparkles size={24} color={PetConnectColors.primary} />
                <Text style={styles.greetingTitle}>Start the Conversation!</Text>
                <Text style={styles.greetingSub}>
                  Send a friendly greeting or use one of the quick suggestions below to connect with {otherUserName}.
                </Text>
              </View>
            )}

            {/* Messages */}
            {messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;

              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    isMe ? styles.myMessageRow : styles.otherMessageRow,
                  ]}
                >
                  {!isMe && (
                    <UserAvatar
                      photoUrl={msg.senderPhotoUrl}
                      name={msg.senderName}
                      size={28}
                      style={styles.msgAvatar}
                    />
                  )}

                  <View
                    style={[
                      styles.messageBubble,
                      isMe ? styles.myBubble : styles.otherBubble,
                    ]}
                  >
                    {!isMe && (
                      <Text style={styles.senderLabel}>{msg.senderName}</Text>
                    )}
                    <Text
                      style={[
                        styles.messageText,
                        isMe ? styles.myMessageText : styles.otherMessageText,
                      ]}
                    >
                      {msg.text}
                    </Text>
                    <Text
                      style={[
                        styles.timestampText,
                        isMe ? styles.myTimestamp : styles.otherTimestamp,
                      ]}
                    >
                      {formatMessageTime(msg.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Quick Suggestions Chips */}
          <View style={styles.suggestionsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsScroll}
            >
              {QUICK_SUGGESTIONS.map((suggestion, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.suggestionChip}
                  onPress={() => handleSend(suggestion)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.suggestionText}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Message Input Bar */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={`Message ${otherUserName}...`}
              placeholderTextColor="#89726A"
              multiline
              maxLength={1000}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!inputText.trim() || isSending) && styles.sendBtnDisabled,
              ]}
              onPress={() => handleSend()}
              disabled={!inputText.trim() || isSending}
              activeOpacity={0.85}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Send size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: PetConnectColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(221, 193, 183, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerAvatar: {
    borderWidth: 2,
    borderColor: PetConnectColors.primary,
  },
  headerInfo: {
    flex: 1,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    maxWidth: 160,
  },
  roleTag: {
    backgroundColor: PetConnectColors.surfaceContainerHigh,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: PetConnectColors.primary,
  },
  petSubjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  headerPetThumb: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  headerSub: {
    fontSize: 12,
    color: PetConnectColors.onSurfaceVariant,
    flex: 1,
  },
  petBold: {
    fontWeight: '700',
    color: PetConnectColors.primary,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: PetConnectColors.surfaceContainerHigh,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
  },
  safetyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PetConnectColors.secondaryContainer,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.4)',
    marginBottom: 6,
  },
  safetyText: {
    fontSize: 11,
    color: PetConnectColors.onSecondaryContainer,
    flex: 1,
    lineHeight: 15,
    fontWeight: '500',
  },
  greetingBox: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.4)',
    marginTop: 20,
    gap: 8,
  },
  greetingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  greetingSub: {
    fontSize: 13,
    color: PetConnectColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginVertical: 2,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  msgAvatar: {
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  myBubble: {
    backgroundColor: PetConnectColors.primary,
    borderBottomRightRadius: 4,
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  otherBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  senderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: PetConnectColors.primary,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: PetConnectColors.onSurface,
  },
  timestampText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myTimestamp: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  otherTimestamp: {
    color: '#89726A',
  },
  suggestionsContainer: {
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(221, 193, 183, 0.3)',
  },
  suggestionsScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: PetConnectColors.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.5)',
  },
  suggestionText: {
    fontSize: 12,
    color: PetConnectColors.onSurface,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(221, 193, 183, 0.4)',
  },
  textInput: {
    flex: 1,
    backgroundColor: PetConnectColors.background,
    borderWidth: 1,
    borderColor: PetConnectColors.outlineVariant,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: PetConnectColors.onSurface,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PetConnectColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
});

