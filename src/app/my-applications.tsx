import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ClipboardList,
  ArrowRight,
  Inbox,
  Check,
  X,
  User,
  Phone,
  Mail,
  MapPin,
  LogIn,
  MessageSquare,
} from 'lucide-react-native';
import { Header } from '../components/Header';
import { PetImage } from '../components/PetImage';
import { ApplicationChatModal } from '../components/ApplicationChatModal';
import { usePet } from '../context/PetContext';
import { PetConnectColors } from '../constants/colors';
import { AdoptionApplication } from '../types';

export default function MyApplicationsScreen() {
  const router = useRouter();
  const {
    applications,
    incomingRequests,
    userProfile,
    openAuthModal,
    acceptRequest,
    rejectRequest,
  } = usePet();

  const [activeTab, setActiveTab] = useState<'sent' | 'incoming'>('sent');
  const [selectedChatApp, setSelectedChatApp] = useState<AdoptionApplication | null>(null);

  const pendingIncomingCount = incomingRequests.filter(
    (req) => req.status === 'pending' || req.status === 'Pending Review'
  ).length;

  const handleAccept = (appId: string, petId: string, applicantName: string) => {
    Alert.alert(
      'Accept Adoption Application',
      `Are you sure you want to approve ${applicantName}'s application? This will mark the pet as Adopted and decline other pending requests.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Accept',
          style: 'default',
          onPress: () => acceptRequest(appId, petId),
        },
      ]
    );
  };

  const handleDecline = (appId: string, petOwnerId: string, applicantName: string) => {
    Alert.alert(
      'Decline Application',
      `Are you sure you want to decline ${applicantName}'s application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => rejectRequest(appId, petOwnerId),
        },
      ]
    );
  };

  const renderStatusBadge = (status: string) => {
    let statusBg = PetConnectColors.statusPendingBg;
    let statusColor = PetConnectColors.statusPendingText;
    let label = status;

    if (status === 'accepted' || status === 'Approved' || status === 'Completed') {
      statusBg = PetConnectColors.statusApprovedBg;
      statusColor = PetConnectColors.statusApprovedText;
      label = status === 'accepted' ? 'Accepted' : status;
    } else if (status === 'rejected') {
      statusBg = PetConnectColors.errorContainer;
      statusColor = PetConnectColors.onErrorContainer;
      label = 'Declined';
    } else if (status === 'Under Shelter Review') {
      statusBg = PetConnectColors.statusReviewBg;
      statusColor = PetConnectColors.statusReviewText;
    } else if (status === 'pending') {
      label = 'Pending Review';
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
        <Text style={[styles.statusBadgeText, { color: statusColor }]}>
          ● {label}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header title="Adoptions & Requests" showBack />

      {/* Segmented Tab Switcher */}
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            onPress={() => setActiveTab('sent')}
            style={[styles.tabButton, activeTab === 'sent' && styles.tabButtonActive]}
            activeOpacity={0.8}
          >
            <ClipboardList
              size={16}
              color={
                activeTab === 'sent'
                  ? PetConnectColors.primary
                  : PetConnectColors.onSurfaceVariant
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'sent' && styles.tabTextActive,
              ]}
            >
              My Applications ({applications.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('incoming')}
            style={[
              styles.tabButton,
              activeTab === 'incoming' && styles.tabButtonActive,
            ]}
            activeOpacity={0.8}
          >
            <Inbox
              size={16}
              color={
                activeTab === 'incoming'
                  ? PetConnectColors.primary
                  : PetConnectColors.onSurfaceVariant
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'incoming' && styles.tabTextActive,
              ]}
            >
              Incoming Requests
            </Text>
            {pendingIncomingCount > 0 && (
              <View style={styles.counterBadge}>
                <Text style={styles.counterBadgeText}>{pendingIncomingCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Not Logged In Notice */}
        {!userProfile && (
          <View style={styles.signInCard}>
            <LogIn size={24} color={PetConnectColors.primary} />
            <Text style={styles.signInCardTitle}>Sign in to track applications</Text>
            <Text style={styles.signInCardSub}>
              Log into your PetConnect account to submit applications and manage
              incoming adoption requests for your pets.
            </Text>
            <TouchableOpacity
              onPress={openAuthModal}
              style={styles.signInCardButton}
              activeOpacity={0.8}
            >
              <Text style={styles.signInCardButtonText}>Sign In / Register</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TAB 1: MY APPLICATIONS (SENT) */}
        {activeTab === 'sent' && (
          <>
            <Text style={styles.counterText}>
              Tracking <Text style={styles.boldCount}>{applications.length}</Text>{' '}
              adoption application(s) submitted by you
            </Text>

            {applications.length > 0 ? (
              <View style={styles.appsList}>
                {applications.map((app) => (
                  <View key={app.id} style={styles.appCard}>
                    {/* Pet Header Row */}
                    <View style={styles.cardHeader}>
                      <View style={styles.petInfoRow}>
                        <PetImage
                          uri={app.petImageUrl}
                          style={styles.petThumb}
                          contentFit="cover"
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.petName} numberOfLines={1}>
                            {app.petName}
                          </Text>
                          <Text style={styles.petBreed} numberOfLines={1}>
                            {app.petBreed}
                          </Text>
                        </View>
                      </View>

                      {renderStatusBadge(app.status)}
                    </View>

                    {/* Submission Details Grid */}
                    <View style={styles.detailsGrid}>
                      <View style={styles.detailCol}>
                        <Text style={styles.detailLabel}>Submitted</Text>
                        <Text style={styles.detailValue}>{app.submittedAt}</Text>
                      </View>
                      <View style={styles.detailCol}>
                        <Text style={styles.detailLabel}>Applicant</Text>
                        <Text style={styles.detailValue}>{app.applicantName}</Text>
                      </View>
                    </View>

                    {/* Reason snippet */}
                    {app.reason ? (
                      <View style={styles.reasonBox}>
                        <Text style={styles.reasonText} numberOfLines={2}>
                          <Text style={styles.reasonBold}>Reason: </Text>
                          {app.reason}
                        </Text>
                      </View>
                    ) : null}

                    {/* Latest Message Preview Banner */}
                    {Boolean(app.lastMessageText) && (
                      <TouchableOpacity
                        style={styles.lastMessagePreviewBanner}
                        onPress={() => setSelectedChatApp(app)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.lastMessageHeader}>
                          <MessageSquare size={13} color={PetConnectColors.primary} />
                          <Text style={styles.lastMessageSender}>
                            {app.lastSenderName || 'Caregiver'}:
                          </Text>
                        </View>
                        <Text style={styles.lastMessageText} numberOfLines={1}>
                          "{app.lastMessageText}"
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Actions: Chat & View Pet */}
                    <View style={styles.appCardActionsRow}>
                      <TouchableOpacity
                        onPress={() => setSelectedChatApp(app)}
                        style={styles.chatButton}
                        activeOpacity={0.85}
                      >
                        <MessageSquare size={14} color="#FFFFFF" />
                        <Text style={styles.chatButtonText}>Chat with Caregiver</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: '/pet/[id]' as any,
                            params: { id: app.petId },
                          })
                        }
                        style={styles.profileLinkBtn}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.profileLinkText}>View Pet</Text>
                        <ArrowRight size={13} color={PetConnectColors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconCircle}>
                  <ClipboardList size={32} color={PetConnectColors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No applications submitted</Text>
                <Text style={styles.emptySubtitle}>
                  When you submit an adoption form for any pet, you can track its
                  live review status here!
                </Text>

                <TouchableOpacity
                  onPress={() => router.replace('/(tabs)' as any)}
                  style={styles.browseButton}
                  activeOpacity={0.9}
                >
                  <Text style={styles.browseButtonText}>Discover Pets</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        {/* TAB 2: INCOMING ADOPTION REQUESTS (FOR PET OWNER) */}
        {activeTab === 'incoming' && (
          <>
            <Text style={styles.counterText}>
              You have{' '}
              <Text style={styles.boldCount}>{incomingRequests.length}</Text> adoption
              request(s) for your listed pets
            </Text>

            {incomingRequests.length > 0 ? (
              <View style={styles.appsList}>
                {incomingRequests.map((req) => {
                  const isPending =
                    req.status === 'pending' || req.status === 'Pending Review';
                  const isAccepted =
                    req.status === 'accepted' || req.status === 'Approved';

                  return (
                    <View key={req.id} style={styles.incomingCard}>
                      {/* Pet Header */}
                      <View style={styles.cardHeader}>
                        <View style={styles.petInfoRow}>
                          <PetImage
                            uri={req.petImageUrl}
                            style={styles.petThumb}
                            contentFit="cover"
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.petName} numberOfLines={1}>
                              {req.petName}
                            </Text>
                            <Text style={styles.petBreed} numberOfLines={1}>
                              {req.petBreed}
                            </Text>
                          </View>
                        </View>
                        {renderStatusBadge(req.status)}
                      </View>

                      {/* Applicant Profile Box */}
                      <View style={styles.applicantDetailsBox}>
                        <Text style={styles.applicantSectionTitle}>
                          Applicant Information
                        </Text>

                        <View style={styles.applicantItem}>
                          <User size={14} color={PetConnectColors.primary} />
                          <Text style={styles.applicantItemText}>
                            <Text style={styles.itemLabel}>Name: </Text>
                            {req.applicantName}
                          </Text>
                        </View>

                        {req.applicantEmail ? (
                          <View style={styles.applicantItem}>
                            <Mail size={14} color={PetConnectColors.primary} />
                            <Text style={styles.applicantItemText}>
                              <Text style={styles.itemLabel}>Email: </Text>
                              {req.applicantEmail}
                            </Text>
                          </View>
                        ) : null}

                        <View style={styles.applicantItem}>
                          <Phone size={14} color={PetConnectColors.primary} />
                          <Text style={styles.applicantItemText}>
                            <Text style={styles.itemLabel}>Phone: </Text>
                            {req.phoneNumber}
                          </Text>
                        </View>

                        <View style={styles.applicantItem}>
                          <MapPin size={14} color={PetConnectColors.primary} />
                          <Text style={styles.applicantItemText}>
                            <Text style={styles.itemLabel}>Address: </Text>
                            {req.address}
                          </Text>
                        </View>
                      </View>

                      {/* Experience & Reason */}
                      <View style={styles.reasonBox}>
                        <Text style={styles.reasonText}>
                          <Text style={styles.reasonBold}>Experience: </Text>
                          {req.experience || 'No previous experience detailed.'}
                        </Text>
                        <Text style={[styles.reasonText, { marginTop: 6 }]}>
                          <Text style={styles.reasonBold}>Adoption Reason: </Text>
                          {req.reason}
                        </Text>
                      </View>

                      {/* Latest Message Preview Banner */}
                      {Boolean(req.lastMessageText) && (
                        <TouchableOpacity
                          style={styles.lastMessagePreviewBanner}
                          onPress={() => setSelectedChatApp(req)}
                          activeOpacity={0.85}
                        >
                          <View style={styles.lastMessageHeader}>
                            <MessageSquare size={13} color={PetConnectColors.primary} />
                            <Text style={styles.lastMessageSender}>
                              {req.lastSenderName || req.applicantName}:
                            </Text>
                          </View>
                          <Text style={styles.lastMessageText} numberOfLines={1}>
                            "{req.lastMessageText}"
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Chat with Applicant Button */}
                      <TouchableOpacity
                        onPress={() => setSelectedChatApp(req)}
                        style={styles.chatWithApplicantBtn}
                        activeOpacity={0.85}
                      >
                        <MessageSquare size={15} color={PetConnectColors.primary} />
                        <Text style={styles.chatWithApplicantBtnText}>
                          Chat with {req.applicantName}
                        </Text>
                      </TouchableOpacity>

                      {/* Owner Decision Actions */}
                      {isPending && (
                        <View style={styles.actionButtonsRow}>
                          <TouchableOpacity
                            onPress={() =>
                              handleDecline(
                                req.id,
                                req.petOwnerId || '',
                                req.applicantName
                              )
                            }
                            style={styles.declineButton}
                            activeOpacity={0.8}
                          >
                            <X size={16} color="#93000A" />
                            <Text style={styles.declineButtonText}>Decline</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() =>
                              handleAccept(req.id, req.petId, req.applicantName)
                            }
                            style={styles.acceptButton}
                            activeOpacity={0.85}
                          >
                            <Check size={16} color="#FFFFFF" />
                            <Text style={styles.acceptButtonText}>
                              Accept Adoption
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {isAccepted && (
                        <View style={styles.acceptedBanner}>
                          <Check size={16} color={PetConnectColors.onSecondaryContainer} />
                          <Text style={styles.acceptedBannerText}>
                            Adoption Approved! {req.petName} has been marked as
                            Adopted.
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconCircle}>
                  <Inbox size={32} color={PetConnectColors.primary} />
                </View>
                <Text style={styles.emptyTitle}>No incoming requests</Text>
                <Text style={styles.emptySubtitle}>
                  When other users apply to adopt pets that you listed, their
                  adoption applications will appear here for your review and
                  decision.
                </Text>

                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/add-pet' as any)}
                  style={styles.browseButton}
                  activeOpacity={0.9}
                >
                  <Text style={styles.browseButtonText}>List a Pet</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Direct Application Chat Modal */}
      <ApplicationChatModal
        visible={Boolean(selectedChatApp)}
        application={selectedChatApp}
        onClose={() => setSelectedChatApp(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PetConnectColors.background,
  },
  tabBarContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: PetConnectColors.background,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: PetConnectColors.surfaceContainer,
    borderRadius: 18,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    position: 'relative',
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: PetConnectColors.onSurfaceVariant,
  },
  tabTextActive: {
    color: PetConnectColors.primary,
    fontWeight: '700',
  },
  counterBadge: {
    backgroundColor: PetConnectColors.primary,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },
  counterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  signInCard: {
    backgroundColor: 'rgba(255, 140, 97, 0.12)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.5)',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  signInCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  signInCardSub: {
    fontSize: 12,
    color: PetConnectColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 16,
  },
  signInCardButton: {
    marginTop: 6,
    backgroundColor: PetConnectColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  signInCardButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  counterText: {
    fontSize: 13,
    color: PetConnectColors.onSurfaceVariant,
    marginBottom: 14,
  },
  boldCount: {
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  appsList: {
    gap: 16,
  },
  appCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.4)',
    gap: 12,
    shadowColor: '#332E2C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  incomingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.5)',
    gap: 12,
    shadowColor: '#332E2C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  petInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  petThumb: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: PetConnectColors.surfaceContainerHighest,
  },
  petName: {
    fontSize: 16,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  petBreed: {
    fontSize: 12,
    color: PetConnectColors.onSurfaceVariant,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailsGrid: {
    flexDirection: 'row',
    backgroundColor: PetConnectColors.background,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.25)',
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: PetConnectColors.outline,
    marginBottom: 2,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: PetConnectColors.onSurface,
  },
  applicantDetailsBox: {
    backgroundColor: PetConnectColors.background,
    padding: 12,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.3)',
  },
  applicantSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: PetConnectColors.outline,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  applicantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  applicantItemText: {
    fontSize: 12,
    color: PetConnectColors.onSurface,
    flex: 1,
  },
  itemLabel: {
    fontWeight: '700',
    color: PetConnectColors.onSurfaceVariant,
  },
  reasonBox: {
    backgroundColor: 'rgba(246, 236, 232, 0.55)',
    padding: 10,
    borderRadius: 14,
  },
  reasonText: {
    fontSize: 12,
    color: PetConnectColors.onSurfaceVariant,
    lineHeight: 16,
  },
  reasonBold: {
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 4,
  },
  declineButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: PetConnectColors.errorContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  declineButtonText: {
    color: PetConnectColors.onErrorContainer,
    fontSize: 13,
    fontWeight: '700',
  },
  acceptButton: {
    flex: 2,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2E6930',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#2E6930',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  acceptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PetConnectColors.secondaryContainer,
    padding: 10,
    borderRadius: 12,
  },
  acceptedBannerText: {
    fontSize: 12,
    color: PetConnectColors.onSecondaryContainer,
    fontWeight: '700',
    flex: 1,
  },
  lastMessagePreviewBanner: {
    backgroundColor: '#FFF7F4',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderLeftWidth: 3.5,
    borderLeftColor: PetConnectColors.primary,
    borderWidth: 1,
    borderColor: 'rgba(185, 73, 33, 0.2)',
    gap: 3,
  },
  lastMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  lastMessageSender: {
    fontSize: 11,
    fontWeight: '700',
    color: PetConnectColors.primary,
  },
  lastMessageText: {
    fontSize: 12,
    color: PetConnectColors.onSurface,
    fontStyle: 'italic',
  },
  appCardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 4,
  },
  chatButton: {
    flex: 1.4,
    height: 40,
    borderRadius: 20,
    backgroundColor: PetConnectColors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  chatButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileLinkBtn: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: PetConnectColors.surfaceContainerHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.4)',
  },
  profileLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: PetConnectColors.primary,
  },
  chatWithApplicantBtn: {
    height: 42,
    borderRadius: 21,
    backgroundColor: PetConnectColors.secondaryContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.5)',
    marginBottom: 4,
  },
  chatWithApplicantBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: PetConnectColors.onSecondaryContainer,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.4)',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PetConnectColors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: PetConnectColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  browseButton: {
    backgroundColor: PetConnectColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  browseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
