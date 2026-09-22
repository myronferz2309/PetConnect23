import React, { useState, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { X, Camera, Lock, AlertCircle, MapPin, Phone, User as UserIcon } from 'lucide-react-native';
import { usePet } from '../context/PetContext';
import { PetConnectColors } from '../constants/colors';
import { UserAvatar } from './UserAvatar';
import { storageService } from '../services/storageService';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Extracts 10 raw digits from an existing phone number string
 */
const extract10Digits = (phoneStr?: string): string => {
  if (!phoneStr) return '';
  const digitsOnly = phoneStr.replace(/\D/g, '');
  if (digitsOnly.startsWith('91') && digitsOnly.length > 10) {
    return digitsOnly.slice(2, 12);
  }
  return digitsOnly.slice(-10);
};

/**
 * Formats 10 digits as '98765 43210' for display
 */
const formatIndianNumberDisplay = (digits: string): string => {
  const clean = digits.replace(/\D/g, '').slice(0, 10);
  if (clean.length > 5) {
    return `${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return clean;
};

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ visible, onClose }) => {
  const { userProfile, updateUserProfile, showToast } = usePet();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rawPhoneDigits, setRawPhoneDigits] = useState('');
  const [address, setAddress] = useState('');
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const [isPhotoChanged, setIsPhotoChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible && userProfile) {
      setName(userProfile.name || '');
      setEmail(userProfile.email || '');
      setRawPhoneDigits(extract10Digits(userProfile.phone));
      setAddress(userProfile.address || '');
      setSelectedPhotoUri(userProfile.profilePhotoUrl || userProfile.avatarUrl || null);
      setIsPhotoChanged(false);
      setErrorMessage(null);
      setIsSaving(false);
      setStatusText('');
    }
  }, [visible, userProfile]);

  const handlePickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setSelectedPhotoUri(uri);
        setIsPhotoChanged(true);
        setErrorMessage(null);
      }
    } catch (err: any) {
      console.warn('Profile photo pick error:', err);
      Alert.alert('Photo Selection', 'Could not open image library. Please try again.');
    }
  };

  const handlePhoneChange = (text: string) => {
    const digitsOnly = text.replace(/\D/g, '').slice(0, 10);
    setRawPhoneDigits(digitsOnly);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    const cleanPhone = rawPhoneDigits.replace(/\D/g, '');
    if (cleanPhone.length > 0 && cleanPhone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setIsSaving(true);

    try {
      let finalPhotoUrl: string | undefined = undefined;

      // 1. Upload photo to Supabase Storage if user selected a new photo
      if (isPhotoChanged && selectedPhotoUri && userProfile?.uid) {
        setStatusText('Uploading photo to Supabase Storage...');
        finalPhotoUrl = await storageService.uploadProfilePhoto(
          selectedPhotoUri,
          userProfile.uid
        );
      }

      // 2. Format phone with +91 if provided
      const formattedPhone =
        cleanPhone.length === 10
          ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`
          : '';

      setStatusText('Saving profile updates...');

      await updateUserProfile({
        name: name.trim(),
        phone: formattedPhone,
        address: address.trim(),
        ...(finalPhotoUrl
          ? { profilePhotoUrl: finalPhotoUrl, avatarUrl: finalPhotoUrl }
          : {}),
      });

      showToast('Profile updated successfully! ✨');
      onClose();
    } catch (err: any) {
      console.warn('Profile save error:', err);
      setErrorMessage(
        err?.message || 'Failed to update profile. Please try again.'
      );
    } finally {
      setIsSaving(false);
      setStatusText('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.backdrop}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Edit Profile</Text>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSaving}
              style={styles.closeButton}
            >
              <X size={20} color="#89726A" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
            {/* Profile Photo Selector */}
            <View style={styles.avatarSection}>
              <TouchableOpacity
                onPress={handlePickPhoto}
                disabled={isSaving}
                style={styles.avatarTouchable}
                activeOpacity={0.8}
              >
                <UserAvatar
                  photoUrl={selectedPhotoUri}
                  name={name || 'Pet Parent'}
                  size={88}
                  style={styles.avatarPreview}
                />
                <View style={styles.cameraBadge}>
                  <Camera size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePickPhoto}
                disabled={isSaving}
                style={styles.changePhotoBtn}
              >
                <Text style={styles.changePhotoText}>
                  {selectedPhotoUri ? 'Change Profile Photo' : 'Upload Profile Photo'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Message Banner */}
            {Boolean(errorMessage) && (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color={PetConnectColors.error} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {/* Full Name */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <UserIcon size={14} color={PetConnectColors.primary} />
                <Text style={styles.label}>
                  Full Name <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
              </View>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  setErrorMessage(null);
                }}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor="#89726A"
                editable={!isSaving}
              />
            </View>

            {/* Email (Read-Only from Firebase Auth) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Lock size={14} color="#89726A" />
                <Text style={styles.label}>Email Address</Text>
                <Text style={styles.readOnlyTag}>Account Linked</Text>
              </View>
              <View style={styles.readOnlyInput}>
                <Text style={styles.readOnlyEmailText}>{email || 'Not available'}</Text>
              </View>
            </View>

            {/* Indian Phone Number with fixed +91 */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Phone size={14} color={PetConnectColors.primary} />
                <Text style={styles.label}>Mobile Number (India)</Text>
              </View>
              <View style={styles.phoneInputRow}>
                <View style={styles.countryCodeBadge}>
                  <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  value={formatIndianNumberDisplay(rawPhoneDigits)}
                  onChangeText={handlePhoneChange}
                  placeholder="98765 43210"
                  placeholderTextColor="#89726A"
                  keyboardType="number-pad"
                  maxLength={11} // account for middle space
                  editable={!isSaving}
                />
              </View>
              <Text style={styles.helperText}>10-digit mobile number for adoption contacts</Text>
            </View>

            {/* Home Address (Indian context) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <MapPin size={14} color={PetConnectColors.primary} />
                <Text style={styles.label}>Home Address</Text>
              </View>
              <TextInput
                style={[styles.input, styles.addressInput]}
                value={address}
                onChangeText={(t) => {
                  setAddress(t);
                  setErrorMessage(null);
                }}
                placeholder="e.g. Bandra West, Mumbai, Maharashtra"
                placeholderTextColor="#89726A"
                multiline
                numberOfLines={2}
                editable={!isSaving}
              />
            </View>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={onClose}
                disabled={isSaving}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving}
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              >
                {isSaving ? (
                  <View style={styles.savingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.saveText}>{statusText || 'Saving...'}</Text>
                  </View>
                ) : (
                  <Text style={styles.saveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(221, 193, 183, 0.3)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  closeButton: {
    padding: 6,
  },
  form: {
    paddingTop: 16,
    gap: 16,
    paddingBottom: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatarPreview: {
    shadowColor: '#752501',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: PetConnectColors.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  changePhotoBtn: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: '700',
    color: PetConnectColors.primary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PetConnectColors.errorContainer,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.2)',
  },
  errorText: {
    fontSize: 13,
    color: PetConnectColors.onErrorContainer,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  requiredAsterisk: {
    color: PetConnectColors.primary,
  },
  readOnlyTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#89726A',
    marginLeft: 'auto',
    backgroundColor: PetConnectColors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  input: {
    backgroundColor: PetConnectColors.background,
    borderWidth: 1,
    borderColor: PetConnectColors.outlineVariant,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: PetConnectColors.onSurface,
  },
  addressInput: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  readOnlyInput: {
    backgroundColor: PetConnectColors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.4)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  readOnlyEmailText: {
    fontSize: 14,
    color: '#89726A',
    fontWeight: '500',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryCodeBadge: {
    backgroundColor: PetConnectColors.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PetConnectColors.outlineVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: PetConnectColors.background,
    borderWidth: 1,
    borderColor: PetConnectColors.outlineVariant,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: PetConnectColors.onSurface,
  },
  helperText: {
    fontSize: 11,
    color: '#89726A',
    paddingLeft: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: PetConnectColors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: PetConnectColors.onSurfaceVariant,
  },
  saveButton: {
    flex: 1.6,
    height: 48,
    borderRadius: 24,
    backgroundColor: PetConnectColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
