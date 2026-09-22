import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Sparkles,
  Send,
  Bot,
  AlertCircle,
  Stethoscope,
  ChevronDown,
  CheckCircle2,
  Calendar,
  Share2,
  RefreshCw,
  X,
  Smile,
  ShieldAlert,
} from 'lucide-react-native';
import { usePet } from '../context/PetContext';
import { PetConnectColors } from '../constants/colors';
import { PetImage } from '../components/PetImage';
import { Pet, PetCareCategory, PetCareMessage, PetCarePlan } from '../types';
import {
  PET_CARE_CATEGORIES,
  petCareAiService,
  generateCarePlan,
} from '../services/petCareAiService';

export default function PetCareAiScreen() {
  const router = useRouter();
  const { petId } = useLocalSearchParams<{ petId?: string }>();
  const { pets, showToast } = usePet();

  // Selected Pet State
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [isPetModalOpen, setIsPetModalOpen] = useState<boolean>(false);

  // Active Category filter
  const [activeCategory, setActiveCategory] = useState<PetCareCategory>('nutrition');

  // Conversation State
  const [messages, setMessages] = useState<PetCareMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // Initialize selected pet from query param or first pet
  useEffect(() => {
    if (petId && pets.length > 0) {
      const found = pets.find((p) => p.id === petId);
      if (found) {
        setSelectedPet(found);
        return;
      }
    }
    if (pets.length > 0 && !selectedPet) {
      setSelectedPet(pets[0]);
    }
  }, [petId, pets]);

  // Set initial welcome greeting when selected pet changes
  useEffect(() => {
    const greetingText = selectedPet
      ? `Hello! I'm **PetCare AI**, your intelligent companion for **${selectedPet.name}** (${selectedPet.breed}, ${selectedPet.age}).\n\nHow can I help you with ${selectedPet.name}'s daily routine, behavior, or nutrition today?`
      : `Hello! I'm **PetCare AI**, your companion for pet care, training, nutrition, and adoption guidance.\n\nSelect a pet above or ask any general pet-care question below!`;

    setMessages([
      {
        id: 'welcome-msg',
        sender: 'assistant',
        text: greetingText,
        category: 'general',
        tryThis: selectedPet
          ? [
              `Ask: "What's the best daily routine for ${selectedPet.name}?"`,
              `Ask: "How much exercise does a ${selectedPet.breed} need?"`,
              `Tap '✨ Create Care Plan' to build a custom weekly schedule.`,
            ]
          : [
              'Ask: "What supplies do I need for a new puppy or kitten?"',
              'Ask: "How to stop separation anxiety when leaving home?"',
              'Select a specific pet to get tailored breed advice.',
            ],
        createdAt: Date.now(),
      },
    ]);
  }, [selectedPet?.id]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    const userMsg: PetCareMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Simulate intelligent processing delay for natural feel
      const [aiResponse] = await Promise.all([
        petCareAiService.askPetCare(query, selectedPet, messages),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);

      const assistantMsg: PetCareMessage = {
        ...aiResponse,
        id: `ai-${Date.now()}`,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      console.warn('PetCare AI error:', e);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'assistant',
          text: 'PetCare AI is temporarily unavailable. Please check your connection and try again.',
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setIsTyping(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleCategorySelect = (catId: PetCareCategory) => {
    setActiveCategory(catId);
    const catObj = PET_CARE_CATEGORIES.find((c) => c.id === catId);
    if (catObj && catObj.exampleQuestions.length > 0) {
      const q = selectedPet
        ? catObj.exampleQuestions[0].replace('my pet', selectedPet.name).replace('my dog', selectedPet.name)
        : catObj.exampleQuestions[0];
      handleSendMessage(q);
    }
  };

  const handleGenerateCarePlan = () => {
    if (selectedPet) {
      handleSendMessage(`Create a personalized weekly care plan for ${selectedPet.name}`);
    } else {
      handleSendMessage('Create a general pet care plan');
    }
  };

  const handleShareCarePlan = async (plan: PetCarePlan) => {
    try {
      const planText = `🐾 ${plan.petName}'s Care Plan (${plan.petBreed || 'Pet'})\n\n📅 Daily Routine:\n${plan.dailyRoutine.map((r) => `• ${r.time ? r.time + ': ' : ''}${r.task}`).join('\n')}\n\n🗓️ Weekly Tasks:\n${plan.weeklyRoutine.map((w) => `• [${w.frequency}] ${w.task}`).join('\n')}\n\nGenerated via PetConnect PetCare AI`;
      await Share.share({
        message: planText,
        title: `${plan.petName}'s Care Plan`,
      });
    } catch (err) {
      console.warn(err);
    }
  };

  const renderFormattedText = (text: string) => {
    if (!text) return null;

    const paragraphs = text.split('\n');

    return (
      <View style={{ gap: 5 }}>
        {paragraphs.map((line, pIdx) => {
          let trimmed = line.trim();
          if (!trimmed) {
            return <View key={pIdx} style={{ height: 4 }} />;
          }

          // Check if line is a bullet item
          const isBullet =
            trimmed.startsWith('* ') ||
            trimmed.startsWith('• ') ||
            trimmed.startsWith('- ');

          if (isBullet) {
            trimmed = trimmed.replace(/^[\*\•\-]\s+/, '');
          }

          // Split line by **bold** markers
          const parts = trimmed.split(/(\*\*.*?\*\*)/g);

          const renderedLine = parts.map((part, partIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              const inner = part.slice(2, -2);
              return (
                <Text key={partIdx} style={styles.assistantTextBold}>
                  {inner}
                </Text>
              );
            }
            // Strip any stray single asterisks
            const clean = part.replace(/\*/g, '');
            return <Text key={partIdx}>{clean}</Text>;
          });

          if (isBullet) {
            return (
              <View key={pIdx} style={styles.bulletRow}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={[styles.assistantText, { flex: 1 }]}>
                  {renderedLine}
                </Text>
              </View>
            );
          }

          return (
            <Text key={pIdx} style={styles.assistantText}>
              {renderedLine}
            </Text>
          );
        })}
      </View>
    );
  };

  const currentCategoryExamples =
    PET_CARE_CATEGORIES.find((c) => c.id === activeCategory)?.exampleQuestions || [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          activeOpacity={0.8}
        >
          <ArrowLeft size={22} color={PetConnectColors.onSurface} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <View style={styles.headerBadge}>
            <Sparkles size={14} color={PetConnectColors.primary} />
            <Text style={styles.headerTitle}>PetCare AI</Text>
          </View>
          <Text style={styles.headerSubtitle}>Intelligent Pet-Care Guide</Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            if (selectedPet) {
              setMessages((prev) => prev.slice(0, 1));
              showToast('Chat history cleared');
            }
          }}
          style={styles.headerBtn}
          activeOpacity={0.8}
        >
          <RefreshCw size={18} color="#89726A" />
        </TouchableOpacity>
      </View>

      {/* Pet Selector Bar */}
      <View style={styles.petSelectorBar}>
        <Text style={styles.petSelectorLabel}>Currently asking about:</Text>
        <TouchableOpacity
          style={styles.petSelectorPill}
          onPress={() => setIsPetModalOpen(true)}
          activeOpacity={0.85}
        >
          {selectedPet ? (
            <View style={styles.petSelectorPillInner}>
              <Text style={styles.petPillEmoji}>
                {selectedPet.category === 'cats' ? '🐱' : selectedPet.category === 'dogs' ? '🐶' : '🐾'}
              </Text>
              <Text style={styles.petPillName}>{selectedPet.name}</Text>
              <Text style={styles.petPillBreed}>
                • {selectedPet.breed} ({selectedPet.age})
              </Text>
              <ChevronDown size={14} color={PetConnectColors.primary} style={{ marginLeft: 4 }} />
            </View>
          ) : (
            <View style={styles.petSelectorPillInner}>
              <Text style={styles.petPillEmoji}>✨</Text>
              <Text style={styles.petPillName}>General Pet Care</Text>
              <ChevronDown size={14} color={PetConnectColors.primary} style={{ marginLeft: 4 }} />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick Action Category Carousel */}
      <View style={styles.categoriesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {PET_CARE_CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => handleCategorySelect(cat.id)}
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                activeOpacity={0.8}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text
                  style={[
                    styles.categoryLabel,
                    isSelected && styles.categoryLabelSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Chat Messages Stream */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chatScrollContent}
        >
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';

            if (isUser) {
              return (
                <View key={msg.id} style={styles.userMessageRow}>
                  <View style={styles.userBubble}>
                    <Text style={styles.userMessageText}>{msg.text}</Text>
                  </View>
                </View>
              );
            }

            // Assistant Response Card
            return (
              <View key={msg.id} style={styles.assistantMessageRow}>
                <View style={styles.assistantAvatar}>
                  <Bot size={18} color="#FFFFFF" />
                </View>

                <View
                  style={[
                    styles.assistantCard,
                    msg.isEmergency && styles.assistantCardEmergency,
                  ]}
                >
                  {/* Emergency Badge */}
                  {msg.isEmergency && (
                    <View style={styles.emergencyBadge}>
                      <ShieldAlert size={16} color="#B91C1C" />
                      <Text style={styles.emergencyBadgeText}>Veterinary Medical Advisory</Text>
                    </View>
                  )}

                  {/* Main Message Text */}
                  {renderFormattedText(msg.text)}

                  {/* Structured Care Plan View */}
                  {msg.carePlan && (
                    <View style={styles.carePlanContainer}>
                      <View style={styles.carePlanHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.carePlanTitle}>
                            📅 {msg.carePlan.petName}'s Structured Care Plan
                          </Text>
                          <Text style={styles.carePlanSubtitle}>
                            Tailored for {msg.carePlan.petBreed || 'companions'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleShareCarePlan(msg.carePlan!)}
                          style={styles.sharePlanBtn}
                          activeOpacity={0.8}
                        >
                          <Share2 size={15} color={PetConnectColors.primary} />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.planSectionLabel}>DAILY ROUTINE</Text>
                      {msg.carePlan.dailyRoutine.map((item, idx) => (
                        <View key={idx} style={styles.planItemRow}>
                          <CheckCircle2 size={14} color={PetConnectColors.primary} style={{ marginTop: 2 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.planItemTime}>{item.time}</Text>
                            <Text style={styles.planItemTask}>{item.task}</Text>
                          </View>
                        </View>
                      ))}

                      <Text style={[styles.planSectionLabel, { marginTop: 12 }]}>WEEKLY ESSENTIALS</Text>
                      {msg.carePlan.weeklyRoutine.map((item, idx) => (
                        <View key={idx} style={styles.planItemRow}>
                          <Calendar size={14} color="#89726A" style={{ marginTop: 2 }} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.planItemFreq}>[{item.frequency}]</Text>
                            <Text style={styles.planItemTask}>{item.task}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Try This Actionable Tips */}
                  {msg.tryThis && msg.tryThis.length > 0 && (
                    <View style={styles.tryThisBox}>
                      <Text style={styles.tryThisHeading}>Try this:</Text>
                      {msg.tryThis.map((tip, idx) => (
                        <View key={idx} style={styles.tipRow}>
                          <Text style={styles.tipNumber}>{idx + 1}.</Text>
                          <Text style={styles.tipText}>{tip}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* When to get help callout */}
                  {msg.whenToGetHelp && (
                    <View
                      style={[
                        styles.whenToHelpBox,
                        msg.isEmergency && styles.whenToHelpBoxEmergency,
                      ]}
                    >
                      <View style={styles.whenToHelpHeader}>
                        {msg.isEmergency ? (
                          <AlertCircle size={14} color="#B91C1C" />
                        ) : (
                          <Stethoscope size={14} color={PetConnectColors.primary} />
                        )}
                        <Text
                          style={[
                            styles.whenToHelpTitle,
                            msg.isEmergency && { color: '#B91C1C' },
                          ]}
                        >
                          When to seek professional care:
                        </Text>
                      </View>
                      <Text style={styles.whenToHelpText}>{msg.whenToGetHelp}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {/* Typing Indicator */}
          {isTyping && (
            <View style={styles.assistantMessageRow}>
              <View style={styles.assistantAvatar}>
                <Bot size={18} color="#FFFFFF" />
              </View>
              <View style={styles.typingCard}>
                <Sparkles size={16} color={PetConnectColors.primary} />
                <Text style={styles.typingText}>PetCare AI is thinking... 🐾</Text>
                <ActivityIndicator size="small" color={PetConnectColors.primary} style={{ marginLeft: 6 }} />
              </View>
            </View>
          )}

          <View style={{ height: 16 }} />
        </ScrollView>

        {/* Smart Suggestion Chips */}
        <View style={styles.suggestionsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}
          >
            {currentCategoryExamples.map((prompt, idx) => {
              const formattedPrompt = selectedPet
                ? prompt.replace('my pet', selectedPet.name).replace('my dog', selectedPet.name)
                : prompt;
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleSendMessage(formattedPrompt)}
                  style={styles.suggestionChip}
                  activeOpacity={0.8}
                >
                  <Text style={styles.suggestionChipText}>💡 {formattedPrompt}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity
            onPress={handleGenerateCarePlan}
            style={styles.carePlanQuickBtn}
            activeOpacity={0.85}
          >
            <Sparkles size={14} color={PetConnectColors.primary} />
            <Text style={styles.carePlanQuickBtnText}>Care Plan</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              selectedPet
                ? `Ask about ${selectedPet.name}...`
                : 'Ask PetCare AI anything...'
            }
            placeholderTextColor="#89726A"
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => handleSendMessage()}
          />

          <TouchableOpacity
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim() || isTyping}
            style={[
              styles.sendButton,
              (!inputText.trim() || isTyping) && styles.sendButtonDisabled,
            ]}
            activeOpacity={0.85}
          >
            <Send size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Health Disclaimer Footnote */}
        <View style={styles.disclaimerBar}>
          <Text style={styles.disclaimerText}>
            PetCare AI provides educational guidance. For medical emergencies, always contact a licensed veterinarian.
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* Pet Selector Modal */}
      <Modal
        visible={isPetModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsPetModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select a Pet for PetCare AI</Text>
              <TouchableOpacity onPress={() => setIsPetModalOpen(false)} style={styles.modalCloseBtn}>
                <X size={20} color="#89726A" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 360 }}>
              {/* General Care Option */}
              <TouchableOpacity
                style={[
                  styles.modalPetOption,
                  selectedPet === null && styles.modalPetOptionSelected,
                ]}
                onPress={() => {
                  setSelectedPet(null);
                  setIsPetModalOpen(false);
                }}
              >
                <View style={styles.modalOptionIconCircle}>
                  <Sparkles size={20} color={PetConnectColors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalOptionName}>General Pet Care</Text>
                  <Text style={styles.modalOptionSub}>Advice not tied to a specific pet</Text>
                </View>
                {selectedPet === null && <CheckCircle2 size={20} color={PetConnectColors.primary} />}
              </TouchableOpacity>

              {/* Pets List */}
              {pets.map((pet) => {
                const isSelected = selectedPet?.id === pet.id;
                return (
                  <TouchableOpacity
                    key={pet.id}
                    style={[styles.modalPetOption, isSelected && styles.modalPetOptionSelected]}
                    onPress={() => {
                      setSelectedPet(pet);
                      setIsPetModalOpen(false);
                    }}
                  >
                    <PetImage uri={pet.imageUrl} category={pet.category} style={styles.modalPetImage} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.modalOptionName}>{pet.name}</Text>
                      <Text style={styles.modalOptionSub}>
                        {pet.breed} • {pet.age} • {pet.location.split(',')[0]}
                      </Text>
                    </View>
                    {isSelected && <CheckCircle2 size={20} color={PetConnectColors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    borderBottomColor: 'rgba(221, 193, 183, 0.4)',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: PetConnectColors.onSurface,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: PetConnectColors.onSurfaceVariant,
    fontWeight: '600',
    marginTop: 1,
  },
  petSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(221, 193, 183, 0.3)',
    gap: 8,
  },
  petSelectorLabel: {
    fontSize: 12,
    color: PetConnectColors.onSurfaceVariant,
    fontWeight: '600',
  },
  petSelectorPill: {
    flex: 1,
    backgroundColor: 'rgba(255, 140, 97, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 97, 0.3)',
  },
  petSelectorPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  petPillEmoji: {
    fontSize: 13,
    marginRight: 4,
  },
  petPillName: {
    fontSize: 13,
    fontWeight: '800',
    color: PetConnectColors.primary,
  },
  petPillBreed: {
    fontSize: 12,
    color: PetConnectColors.onSurface,
    marginLeft: 4,
    flex: 1,
  },
  categoriesSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(221, 193, 183, 0.3)',
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: PetConnectColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.5)',
  },
  categoryChipSelected: {
    backgroundColor: PetConnectColors.primary,
    borderColor: PetConnectColors.primary,
  },
  categoryIcon: {
    fontSize: 13,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  categoryLabelSelected: {
    color: '#FFFFFF',
  },
  chatScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  userMessageRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  userBubble: {
    maxWidth: '82%',
    backgroundColor: PetConnectColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderBottomRightRadius: 4,
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 2,
  },
  userMessageText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  assistantMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
    gap: 10,
  },
  assistantAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: PetConnectColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  assistantCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderTopLeftRadius: 4,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(221, 193, 183, 0.5)',
    shadowColor: '#332E2C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  assistantCardEmergency: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  emergencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  emergencyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C1C',
  },
  assistantText: {
    fontSize: 14,
    color: PetConnectColors.onSurface,
    lineHeight: 21,
  },
  assistantTextBold: {
    fontSize: 14,
    fontWeight: '800',
    color: PetConnectColors.onSurface,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginVertical: 1,
  },
  bulletSymbol: {
    fontSize: 14,
    fontWeight: '800',
    color: PetConnectColors.primary,
    lineHeight: 21,
  },
  tryThisBox: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 140, 97, 0.08)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 97, 0.25)',
  },
  tryThisHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: PetConnectColors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  tipNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: PetConnectColors.primary,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: PetConnectColors.onSurface,
    lineHeight: 18,
  },
  whenToHelpBox: {
    marginTop: 12,
    backgroundColor: PetConnectColors.surfaceContainerLow,
    borderRadius: 14,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: PetConnectColors.primary,
  },
  whenToHelpBoxEmergency: {
    borderLeftColor: '#EF4444',
    backgroundColor: '#FEE2E2',
  },
  whenToHelpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  whenToHelpTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: PetConnectColors.onSurface,
  },
  whenToHelpText: {
    fontSize: 12,
    color: PetConnectColors.onSurfaceVariant,
    lineHeight: 16,
  },
  carePlanContainer: {
    marginTop: 14,
    backgroundColor: '#FFF9F6',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 140, 97, 0.35)',
  },
  carePlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 140, 97, 0.2)',
    paddingBottom: 8,
  },
  carePlanTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: PetConnectColors.primary,
  },
  carePlanSubtitle: {
    fontSize: 11,
    color: PetConnectColors.onSurfaceVariant,
  },
  sharePlanBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 140, 97, 0.15)',
  },
  planSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#89726A',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  planItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  planItemTime: {
    fontSize: 12,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  planItemFreq: {
    fontSize: 11,
    fontWeight: '700',
    color: PetConnectColors.primary,
  },
  planItemTask: {
    fontSize: 12,
    color: PetConnectColors.onSurfaceVariant,
    lineHeight: 16,
  },
  typingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.5)',
  },
  typingText: {
    fontSize: 13,
    color: PetConnectColors.onSurfaceVariant,
    fontWeight: '600',
    marginLeft: 6,
  },
  suggestionsContainer: {
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(221, 193, 183, 0.3)',
  },
  suggestionsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: PetConnectColors.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.6)',
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: PetConnectColors.onSurface,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  carePlanQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 140, 97, 0.15)',
  },
  carePlanQuickBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: PetConnectColors.primary,
  },
  textInput: {
    flex: 1,
    backgroundColor: PetConnectColors.surfaceContainerLow,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: PetConnectColors.onSurface,
    maxHeight: 90,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PetConnectColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButtonDisabled: {
    backgroundColor: PetConnectColors.outline,
    shadowOpacity: 0,
    elevation: 0,
  },
  disclaimerBar: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  disclaimerText: {
    fontSize: 10,
    color: '#89726A',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: PetConnectColors.onSurface,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalPetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(221, 193, 183, 0.4)',
  },
  modalPetOptionSelected: {
    borderColor: PetConnectColors.primary,
    backgroundColor: '#FFF4EF',
  },
  modalOptionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 140, 97, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPetImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  modalOptionName: {
    fontSize: 15,
    fontWeight: '800',
    color: PetConnectColors.onSurface,
  },
  modalOptionSub: {
    fontSize: 12,
    color: PetConnectColors.onSurfaceVariant,
    marginTop: 2,
  },
});

