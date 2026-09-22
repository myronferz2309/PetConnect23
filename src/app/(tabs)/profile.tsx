import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ClipboardList,
  Heart,
  CloudCheck,
  LogOut,
  ChevronRight,
  Inbox,
  User,
  LogIn,
  Sparkles,
  Phone,
  MapPin,
  Edit3,
  Bell,
  MessageSquare,
  Bot,
} from 'lucide-react-native';
import { Header } from '../../components/Header';
import { EditProfileModal } from '../../components/EditProfileModal';
import { NotificationsModal } from '../../components/NotificationsModal';
import { UserAvatar } from '../../components/UserAvatar';
import { usePet } from '../../context/PetContext';
import { PetConnectColors } from '../../constants/colors';

export default function ProfileScreen() {
  const router = useRouter();
  const {
    userProfile,
    applications,
    incomingRequests,
    pets,
    savedPetIds,
    signOut,
    openAuthModal,
    openChatForNotification,
    isFirebaseActive,
    firebaseProjectId,
    firebaseError,
  } = usePet();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const savedPetsList = pets.filter((p) => savedPetIds.includes(p.id));
  const pendingRequestsCount = incomingRequests.filter(
    (r) => r.status === 'pending' || r.status === 'Pending Review'
  ).length;

  const currentUserId = userProfile?.uid || 'demo-user-sarah';
  const repliesWithNewMessages = [...applications, ...incomingRequests].filter(
    (app) => app.lastMessageText && app.lastSenderId && app.lastSenderId !== currentUserId
  );
  const unreadRepliesCount = repliesWithNewMessages.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="PetConnect"
        rightAction={
          <TouchableOpacity
            style={styles.notificationBellBtn}
            onPress={() => setIsNotificationsOpen(true)}
            activeOpacity={0.8}
          >
            <Bell size={20} color={PetConnectColors.primary} />
            {unreadRepliesCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>{unreadRepliesCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* User Info / Sign In Header */}
        {userProfile ? (
          <View style={styles.profileHeader}>
            <View style={styles.avatarWrapper}>
              <UserAvatar
                photoUrl={userProfile.profilePhotoUrl || userProfile.avatarUrl}
                name={userProfile.name}
                size={94}
                style={styles.avatarMain}
              />
            </View>

            <Text style={styles.userName}>{userProfile.name}</Text>
            <Text style={styles.userEmail}>{userProfile.email}</Text>

            {userProfile.uid && (
              <View style={styles.uidBadge}>
                <Text style={styles.uidBadgeText}>
                  UID: {userProfile.uid.slice(0, 14)}...
                </Text>
              </View>
            )}

            {/* Indian User Contact Details Card */}
            <View style={styles.contactDetailsCard}>
              <View style={styles.contactItemRow}>
                <View style={styles.contactIconPill}>
                  <Phone size={14} color={PetConnectColors.primary} />
                </View>
                <View style={styles.contactItemTexts}>
                  <Text style={styles.contactItemLabel}>Phone</Text>
                  <Text
                    style={[
                      styles.contactItemValue,
                      !userProfile.phone && styles.contactItemPlaceholder,
                    ]}
                  >
                    {userProfile.phone || 'Add phone number (+91)'}
                  </Text>
                </View>
              </View>

              <View style={styles.contactDivider} />

              <View style={styles.contactItemRow}>
                <View style={styles.contactIconPill}>
                  <MapPin size={14} color={PetConnectColors.primary} />
                </View>
                <View style={styles.contactItemTexts}>
                  <Text style={styles.contactItemLabel}>Home Address</Text>
                  <Text
                    style={[
                      styles.contactItemValue,
                      !userProfile.address && styles.contactItemPlaceholder,
                    ]}
                  >
                    {userProfile.address || 'Add home address (Mumbai, India)'}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setIsEditModalOpen(true)}
              style={styles.editProfileButton}
              activeOpacity={0.8}
            >
              <Edit3 size={15} color={PetConnectColors.onSecondaryContainer} />
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>

            {/* New Replies Alert Banner */}
            {unreadRepliesCount > 0 && (
              <TouchableOpacity
                style={styles.repliesAlertBanner}
                onPress={() => setIsNotificationsOpen(true)}
                activeOpacity={0.85}
              >
                <View style={styles.alertBannerIconCircle}>
                  <MessageSquare size={15} color="#FFFFFF" />
                </View>
                <View style={styles.alertBannerTexts}>
                  <Text style={styles.alertBannerTitle}>
                    {unreadRepliesCount} New User Repl{unreadRepliesCount > 1 ? 'ies' : 'y'}
                  </Text>
                  <Text style={styles.alertBannerSub} numberOfLines={1}>
                    Tap to see messages from {repliesWithNewMessages[0]?.lastSenderName || 'users'}
                  </Text>
                </View>
                <ChevronRight size={18} color={PetConnectColors.primary} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.guestCard}>
            <View style={styles.guestIconCircle}>
              <User size={36} color={PetConnectColors.primary} />
            </View>
            <Text style={styles.guestTitle}>Welcome to PetConnect</Text>
            <Text style={styles.guestSubtitle}>
              Sign in to list pets, submit adoption applications, and manage incoming
              requests in real time.
            </Text>
            <TouchableOpacity
              onPress={openAuthModal}
              style={styles.guestSignInButton}
              activeOpacity={0.9}
            >
              <LogIn size={18} color="#FFFFFF" />
              <Text style={styles.guestSignInButtonText}>Sign In / Register</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bento Grid: My Applications, Incoming Requests, Saved Pets */}
        <View style={styles.bentoContainer}>
          {/* Incoming Requests for Pet Owner */}
          <View style={styles.bentoCard}>
            <View style={styles.bentoHeaderRow}>
              <View style={styles.bentoTitleGroup}>
                <Text style={styles.bentoTitle}>Incoming Requests</Text>
                {pendingRequestsCount > 0 && (
                  <View style={styles.requestCounterBadge}>
                    <Text style={styles.requestCounterText}>
                      {pendingRequestsCount} Pending
                    </Text>
                  </View>
                )}
              </View>
              <Inbox size={20} color={PetConnectColors.primary} />
            </View>

            {incomingRequests.length > 0 ? (
              <Text style={styles.bentoInfoText}>
                You have {incomingRequests.length} adoption application(s) from
                interested adopters for your pets.
              </Text>
            ) : (
              <Text style={styles.emptyCardText}>
                No incoming adoption requests yet.
              </Text>
            )}

            <TouchableOpacity
              onPress={() => router.push('/my-applications' as any)}
              style={styles.bentoFooterButton}
            >
              <Text style={styles.bentoFooterText}>
                Manage Incoming Requests ({incomingRequests.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* My Applications Card */}
          <View style={styles.bentoCard}>
            <View style={styles.bentoHeaderRow}>
              <Text style={styles.bentoTitle}>My Applications</Text>
              <ClipboardList size={20} color={PetConnectColors.primary} />
            </View>

            {applications.length > 0 ? (
              <View style={styles.appsList}>
                {applications.slice(0, 2).map((app) => {
                  let statusBg = PetConnectColors.statusPendingBg;
                  let statusColor = PetConnectColors.statusPendingText;

                  if (
                    app.status === 'Approved' ||
                    app.status === 'accepted' ||
                    app.status === 'Completed'
                  ) {
                    statusBg = PetConnectColors.statusApprovedBg;
                    statusColor = PetConnectColors.statusApprovedText;
                  } else if (app.status === 'Under Shelter Review') {
                    statusBg = PetConnectColors.statusReviewBg;
                    statusColor = PetConnectColors.statusReviewText;
                  } else if (app.status === 'rejected') {
                    statusBg = PetConnectColors.errorContainer;
                    statusColor = PetConnectColors.onErrorContainer;
                  }

                  return (
                    <TouchableOpacity
                      key={app.id}
                      onPress={() => router.push('/my-applications' as any)}
                      style={styles.appRow}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{
                          uri:
                            app.petImageUrl ||
                            'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
                        }}
                        style={styles.appPetThumb}
                      />
                      <View style={styles.appInfo}>
                        <Text style={styles.appPetName} numberOfLines={1}>
                          {app.petName} ({app.petBreed})
                        </Text>
                        <View style={styles.appStatusRow}>
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: statusColor },
                            ]}
                          />
                          <Text style={styles.appStatusText}>{app.status}</Text>
                        </View>
                      </View>
                      <ChevronRight size={18} color="#89726A" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.emptyCardText}>
                No applications submitted yet.
              </Text>
            )}

            <TouchableOpacity
              onPress={() => router.push('/my-applications' as any)}
              style={styles.bentoFooterButton}
            >
              <Text style={styles.bentoFooterText}>
                View All Applications ({applications.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Saved Pets Card */}
          <View style={styles.bentoCard}>
            <View style={styles.bentoHeaderRow}>
              <Text style={styles.bentoTitle}>Saved Pets</Text>
              <Heart
                size={20}
                color={PetConnectColors.primary}
                fill={PetConnectColors.primary}
              />
            </View>

            {savedPetsList.length > 0 ? (
              <View style={styles.savedThumbGrid}>
                {savedPetsList.slice(0, 2).map((pet) => (
                  <TouchableOpacity
                    key={pet.id}
                    onPress={() =>
                      router.push({
                        pathname: '/pet/[id]' as any,
                        params: { id: pet.id },
                      })
                    }
                    style={styles.savedThumbItem}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: pet.imageUrl }}
                      style={styles.savedThumbImage}
                    />
                    <View style={styles.savedThumbOverlay}>
                      <Text style={styles.savedThumbName} numberOfLines={1}>
                        {pet.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyCardText}>
                No saved pets yet. Tap ❤️ on pets to bookmark them!
              </Text>
            )}

            <TouchableOpacity
              onPress={() => router.push('/saved-pets' as any)}
              style={styles.bentoFooterButton}
            >
              <Text style={styles.bentoFooterText}>
                Browse Saved List ({savedPetsList.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* PetCare AI Card */}
          <View style={styles.bentoCard}>
            <View style={styles.bentoHeaderRow}>
              <Text style={styles.bentoTitle}>PetCare AI</Text>
              <Bot size={20} color={PetConnectColors.primary} />
            </View>
            <Text style={styles.bentoInfoText}>
              Get personalized daily routines, training tips, nutrition advice & care plans for your pets.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/pet-care-ai' as any)}
              style={styles.bentoFooterButton}
            >
              <Text style={styles.bentoFooterText}>
                Open PetCare AI Assistant 🐾
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Architecture & Backend Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeaderRow}>
            <View style={styles.statusTitleRow}>
              <CloudCheck size={18} color={PetConnectColors.primary} />
              <Text style={styles.statusTitle}>Backend Architecture</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                !isFirebaseActive && styles.statusBadgeDemo,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  !isFirebaseActive && styles.statusBadgeDemoText,
                ]}
              >
                {isFirebaseActive ? 'Live Firebase Backend' : 'Offline Mode'}
              </Text>
            </View>
          </View>
          <Text style={styles.statusDescription}>
            {isFirebaseActive
              ? `Connected to Cloud Firestore (${firebaseProjectId || 'petconnect-6e1f6'}) with Firebase Authentication. Real-time multi-user cloud synchronization is active.`
              : 'Running in offline mode.'}
          </Text>
        </View>

        {/* Logout or Account Switcher */}
        {userProfile ? (
          <TouchableOpacity
            onPress={signOut}
            style={styles.logoutButton}
            activeOpacity={0.8}
          >
            <LogOut size={18} color="#93000A" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={openAuthModal}
            style={styles.switchAccountButton}
            activeOpacity={0.8}
          >
            <Sparkles size={16} color={PetConnectColors.primary} />
            <Text style={styles.switchAccountText}>Sign In / Switch Persona</Text>
          </TouchableOpacity>
        )}

        {/* Bottom spacer for floating navigation bar */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileModal
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      {/* Replies & Notifications Modal */}
      <NotificationsModal
        visible={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onSelectApplication={(app) => openChatForNotification(app)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PetConnectColors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: {
    marginBottom: 10,
    shadowColor: '#332E2C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarMain: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 13,
    color: PetConnectColors.onSurfaceVariant,
    marginTop: 2,
  },
  uidBadge: {
    backgroundColor: PetConnectColors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
  },
  uidBadgeText: {
    fontSize: 10,
    color: PetConnectColors.outline,
    fontFamily: 'monospace',
  },
  contactDetailsCard: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.5)',
    gap: 10,
  },
  contactItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contactIconPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 140, 97, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactItemTexts: {
    flex: 1,
  },
  contactItemLabel: {
    fontSize: 11,
    color: '#89726A',
    fontWeight: '600',
  },
  contactItemValue: {
    fontSize: 13,
    color: PetConnectColors.onSurface,
    fontWeight: '700',
    marginTop: 1,
  },
  contactItemPlaceholder: {
    color: PetConnectColors.outline,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  contactDivider: {
    height: 1,
    backgroundColor: 'rgba(221, 193, 183, 0.35)',
  },
  notificationBellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 140, 97, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: PetConnectColors.primary,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    backgroundColor: PetConnectColors.secondaryContainer,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 20,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '700',
    color: PetConnectColors.onSecondaryContainer,
  },
  repliesAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: PetConnectColors.primary,
    borderRadius: 18,
    padding: 12,
    marginTop: 14,
    width: '100%',
    shadowColor: '#752501',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  alertBannerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PetConnectColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertBannerTexts: {
    flex: 1,
  },
  alertBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  alertBannerSub: {
    fontSize: 11,
    color: PetConnectColors.onSurfaceVariant,
    marginTop: 1,
  },
  guestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.5)',
    marginBottom: 20,
    shadowColor: '#332E2C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  guestIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PetConnectColors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
    marginBottom: 6,
  },
  guestSubtitle: {
    fontSize: 13,
    color: PetConnectColors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  guestSignInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PetConnectColors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: PetConnectColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  guestSignInButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  bentoContainer: {
    gap: 14,
    marginBottom: 18,
  },
  bentoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.4)',
    shadowColor: '#332E2C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  bentoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bentoTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bentoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  requestCounterBadge: {
    backgroundColor: PetConnectColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  requestCounterText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  bentoInfoText: {
    fontSize: 13,
    color: PetConnectColors.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: 4,
  },
  appsList: {
    gap: 8,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PetConnectColors.background,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.3)',
  },
  appPetThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: PetConnectColors.surfaceContainerHighest,
  },
  appInfo: {
    flex: 1,
    marginLeft: 10,
  },
  appPetName: {
    fontSize: 13,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  appStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  appStatusText: {
    fontSize: 11,
    color: PetConnectColors.onSurfaceVariant,
    fontWeight: '500',
  },
  savedThumbGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  savedThumbItem: {
    flex: 1,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  savedThumbImage: {
    width: '100%',
    height: '100%',
  },
  savedThumbOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  savedThumbName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCardText: {
    fontSize: 12,
    color: PetConnectColors.outline,
    textAlign: 'center',
    paddingVertical: 10,
  },
  bentoFooterButton: {
    marginTop: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  bentoFooterText: {
    fontSize: 12,
    fontWeight: '700',
    color: PetConnectColors.primary,
  },
  statusCard: {
    backgroundColor: 'rgba(246, 236, 232, 0.7)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.3)',
    marginBottom: 16,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: PetConnectColors.onSurface,
  },
  statusBadge: {
    backgroundColor: PetConnectColors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: PetConnectColors.onSecondaryContainer,
  },
  statusBadgeDemo: {
    backgroundColor: PetConnectColors.surfaceContainerHigh,
  },
  statusBadgeDemoText: {
    color: PetConnectColors.onSurfaceVariant,
  },
  statusDescription: {
    fontSize: 12,
    color: PetConnectColors.onSurfaceVariant,
    lineHeight: 16,
  },
  logoutButton: {
    backgroundColor: PetConnectColors.errorContainer,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    color: PetConnectColors.onErrorContainer,
    fontSize: 14,
    fontWeight: '700',
  },
  switchAccountButton: {
    backgroundColor: PetConnectColors.surfaceContainer,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(221, 193, 183, 0.5)',
  },
  switchAccountText: {
    color: PetConnectColors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
