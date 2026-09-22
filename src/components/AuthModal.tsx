import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { X, PawPrint, Mail, Lock, User, Sparkles, AlertCircle } from 'lucide-react-native';
import { usePet } from '../context/PetContext';
import { PetConnectColors } from '../constants/colors';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose }) => {
  const { signUp, signIn, showToast, isFirebaseActive } = usePet();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setErrorMessage(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const parseAuthError = (err: any): string => {
    const rawMsg = err?.message || err?.toString() || 'Authentication failed. Please try again.';
    if (rawMsg.includes('auth/api-key-not-valid')) {
      return 'Firebase API key is invalid or truncated. Please re-copy the Web API Key from Firebase Console (Project Settings > General).';
    }
    if (rawMsg.includes('auth/invalid-credential') || rawMsg.includes('auth/wrong-password') || rawMsg.includes('auth/user-not-found')) {
      return 'Invalid email or password. If you do not have an account yet, tap "Create Account" above.';
    }
    if (rawMsg.includes('auth/email-already-in-use')) {
      return 'An account with this email already exists. Try signing in instead.';
    }
    if (rawMsg.includes('auth/weak-password')) {
      return 'Password is too weak. Please use at least 6 characters.';
    }
    if (rawMsg.includes('auth/network-request-failed')) {
      return 'Network error. Please check your internet connection.';
    }
    if (rawMsg.includes('auth/operation-not-allowed')) {
      return 'Email/Password sign-in is not enabled in Firebase Console (Authentication > Sign-in method).';
    }
    return rawMsg;
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (mode === 'signup' && !name.trim()) {
      setErrorMessage('Please enter your name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signup') {
        await signUp(name.trim(), email.trim(), password);
        showToast(`Welcome to PetConnect, ${name.trim()}! 🐾`);
      } else {
        await signIn(email.trim(), password);
        showToast('Signed in successfully! 🐾');
      }
      handleClose();
    } catch (err: any) {
      setErrorMessage(parseAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoName: string, demoEmail: string) => {
    setName(demoName);
    setEmail(demoEmail);
    setPassword('petconnect123');
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (isFirebaseActive) {
        try {
          await signIn(demoEmail, 'petconnect123');
          showToast(`Logged in as ${demoName} 🐾`);
          handleClose();
        } catch {
          await signUp(demoName, demoEmail, 'petconnect123');
          showToast(`Created & logged in as ${demoName} 🐾`);
          handleClose();
        }
      } else {
        await signIn(demoEmail, 'petconnect123');
        showToast(`Demo profile active: ${demoName}`);
        handleClose();
      }
    } catch (e: any) {
      setErrorMessage(parseAuthError(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.logoBadge}>
                <PawPrint size={18} color={PetConnectColors.primary} />
              </View>
              <Text style={styles.headerTitle}>PetConnect Account</Text>
            </View>

            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={20} color={PetConnectColors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Mode Segmented Tab Switcher */}
            <View style={styles.modeTabs}>
              <TouchableOpacity
                onPress={() => {
                  setMode('signin');
                  setErrorMessage(null);
                }}
                style={[styles.tabBtn, mode === 'signin' && styles.tabBtnActive]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    mode === 'signin' && styles.tabBtnTextActive,
                  ]}
                >
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setMode('signup');
                  setErrorMessage(null);
                }}
                style={[styles.tabBtn, mode === 'signup' && styles.tabBtnActive]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    mode === 'signup' && styles.tabBtnTextActive,
                  ]}
                >
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color="#93000A" style={{ marginTop: 2 }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Form Fields */}
            <View style={styles.formContainer}>
              {mode === 'signup' && (
                <View style={styles.inputWrapper}>
                  <User size={18} color="#89726A" style={styles.inputIcon} />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Full Name"
                    placeholderTextColor="#89726A"
                    style={styles.input}
                    autoCapitalize="words"
                  />
                </View>
              )}

              <View style={styles.inputWrapper}>
                <Mail size={18} color="#89726A" style={styles.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email Address"
                  placeholderTextColor="#89726A"
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Lock size={18} color="#89726A" style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password (min. 6 chars)"
                  placeholderTextColor="#89726A"
                  style={styles.input}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isLoading}
                style={styles.submitButton}
                activeOpacity={0.9}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Quick Demo Test Buttons */}
            <View style={styles.demoSection}>
              <View style={styles.demoTitleRow}>
                <Sparkles size={14} color={PetConnectColors.primary} />
                <Text style={styles.demoTitle}>Quick Switch Testing Personas:</Text>
              </View>
              <View style={styles.demoButtonsRow}>
                <TouchableOpacity
                  onPress={() =>
                    handleDemoLogin('Sarah Adopter', 'sarah.adopter@test.com')
                  }
                  style={styles.demoButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.demoButtonText}>👤 Adopter (Sarah)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    handleDemoLogin('Alex Shelter/Owner', 'alex.owner@test.com')
                  }
                  style={styles.demoButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.demoButtonText}>🏡 Pet Owner (Alex)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.5)',
    shadowColor: '#332E2C',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: PetConnectColors.outlineVariantLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 140, 97, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PetConnectColors.primary,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: PetConnectColors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: PetConnectColors.surfaceContainer,
    borderRadius: 16,
    padding: 4,
    marginBottom: 18,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: PetConnectColors.onSurfaceVariant,
  },
  tabBtnTextActive: {
    color: PetConnectColors.primary,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: PetConnectColors.errorContainer,
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: PetConnectColors.onErrorContainer,
    fontWeight: '500',
    lineHeight: 16,
  },
  formContainer: {
    gap: 14,
    marginBottom: 20,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  input: {
    height: 52,
    backgroundColor: PetConnectColors.background,
    borderWidth: 1,
    borderColor: PetConnectColors.outlineVariant,
    borderRadius: 16,
    paddingLeft: 42,
    paddingRight: 14,
    fontSize: 15,
    color: PetConnectColors.onSurface,
  },
  submitButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: PetConnectColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  demoSection: {
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(221, 193, 183, 0.3)',
  },
  demoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: PetConnectColors.outline,
    letterSpacing: 0.5,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoButton: {
    flex: 1,
    backgroundColor: PetConnectColors.secondaryContainer,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: PetConnectColors.onSecondaryContainer,
  },
});
