import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  StatusBar,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  X,
  PlayCircle,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
} from 'lucide-react-native';
import { usePet } from '../context/PetContext';
import { Pet } from '../types';
import { PetConnectColors } from '../constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 480);
const CARD_HEIGHT = (CARD_WIDTH * 9) / 16;

const VideoPlayerModalInner: React.FC<{ pet: Pet }> = ({ pet }) => {
  const { closeVideoModal } = usePet();
  const insets = useSafeAreaInsets();

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(true); // Default to full screen for immersive experience
  const [showControls, setShowControls] = useState<boolean>(true);

  const controlsTimeoutRef = useRef<any>(null);

  // Directly load the pet's uploaded video
  const player = useVideoPlayer(pet.videoUrl || '', (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  useEffect(() => {
    try {
      player.play();
      setIsPlaying(true);
    } catch {}

    resetControlsTimeout();

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      try {
        player.pause();
      } catch {}
    };
  }, [player]);

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3500);
  };

  const handleTogglePlay = () => {
    try {
      if (player.playing || isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
      resetControlsTimeout();
    } catch (e) {
      console.warn('[MEDIA] Video play/pause error:', e);
    }
  };

  const handleToggleMute = () => {
    try {
      player.muted = !isMuted;
      setIsMuted(!isMuted);
      resetControlsTimeout();
    } catch (e) {
      console.warn('[MEDIA] Video mute toggle error:', e);
    }
  };

  const handleReplay = () => {
    try {
      player.currentTime = 0;
      player.play();
      setIsPlaying(true);
      resetControlsTimeout();
    } catch (e) {
      console.warn('[MEDIA] Video replay error:', e);
    }
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
    resetControlsTimeout();
  };

  const handleVideoPress = () => {
    if (!showControls) {
      resetControlsTimeout();
    } else {
      setShowControls(false);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }
  };

  const handleClose = () => {
    try {
      player.pause();
    } catch {}
    closeVideoModal();
  };

  return (
    <Modal
      visible={true}
      transparent={!isFullscreen}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={handleClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={[styles.container, isFullscreen && styles.containerFullscreen]}>
        {/* Fullscreen Video View */}
        {isFullscreen ? (
          <TouchableWithoutFeedback onPress={handleVideoPress}>
            <View style={styles.fullscreenWrapper}>
              <VideoView
                player={player}
                style={styles.fullscreenVideo}
                nativeControls={false}
                contentFit="contain"
              />

              {/* Floating Overlay Controls for Fullscreen */}
              {showControls && (
                <View style={[styles.fullscreenOverlay, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
                  {/* Top Bar */}
                  <View style={styles.fullscreenTopBar}>
                    <View style={styles.topTitleGroup}>
                      <Text style={styles.fullscreenTitle} numberOfLines={1}>
                        Watch {pet.name} Play
                      </Text>
                      <Text style={styles.fullscreenSub}>
                        {pet.breed} • {pet.age}
                      </Text>
                    </View>

                    <View style={styles.topActionsRow}>
                      <TouchableOpacity
                        onPress={handleToggleFullscreen}
                        style={styles.circleBtn}
                        accessibilityLabel="Exit fullscreen"
                        activeOpacity={0.8}
                      >
                        <Minimize2 size={18} color="#FFFFFF" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleClose}
                        style={[styles.circleBtn, styles.closeCircleBtn]}
                        accessibilityLabel="Close video"
                        activeOpacity={0.8}
                      >
                        <X size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Center Play/Pause Indicator HUD */}
                  <TouchableOpacity
                    onPress={handleTogglePlay}
                    style={styles.centerPlayHud}
                    activeOpacity={0.8}
                  >
                    <View style={styles.centerPlayCircle}>
                      {isPlaying ? (
                        <Pause size={32} color="#FFFFFF" />
                      ) : (
                        <Play size={32} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 4 }} />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Bottom Controls Bar */}
                  <View style={styles.fullscreenBottomBar}>
                    <View style={styles.controlsLeft}>
                      <TouchableOpacity
                        onPress={handleTogglePlay}
                        style={styles.controlPill}
                        activeOpacity={0.8}
                      >
                        {isPlaying ? (
                          <Pause size={18} color="#FFFFFF" />
                        ) : (
                          <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
                        )}
                        <Text style={styles.controlPillText}>
                          {isPlaying ? 'Pause' : 'Play'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleToggleMute}
                        style={styles.circleBtn}
                        activeOpacity={0.8}
                      >
                        {isMuted ? (
                          <VolumeX size={18} color="#FFFFFF" />
                        ) : (
                          <Volume2 size={18} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleReplay}
                        style={styles.circleBtn}
                        activeOpacity={0.8}
                      >
                        <RotateCcw size={17} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.loopBadge}>
                      <Sparkles size={12} color={PetConnectColors.primary} />
                      <Text style={styles.loopBadgeText}>HD Video</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        ) : (
          /* Centered Modal Card View with Expand Option */
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.titleRow}>
                <PlayCircle size={20} color={PetConnectColors.primary} />
                <Text style={styles.modalTitle} numberOfLines={1}>
                  Watch {pet.name} Play
                </Text>
              </View>

              <View style={styles.headerActionsRow}>
                <TouchableOpacity
                  onPress={handleToggleFullscreen}
                  style={styles.smallActionBtn}
                  accessibilityLabel="Full screen"
                  activeOpacity={0.8}
                >
                  <Maximize2 size={16} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                  accessibilityLabel="Close video"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Video Player Display */}
            <TouchableOpacity
              activeOpacity={0.95}
              onPress={handleTogglePlay}
              style={styles.videoContainer}
            >
              <VideoView
                player={player}
                style={styles.video}
                nativeControls={false}
                contentFit="contain"
              />
              {!isPlaying && (
                <View style={styles.cardCenterPlayOverlay}>
                  <View style={styles.cardCenterPlayCircle}>
                    <Play size={28} color="#FFFFFF" fill="#FFFFFF" style={{ marginLeft: 3 }} />
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* Controls Bar */}
            <View style={styles.controlsBar}>
              <View style={styles.controlsLeft}>
                <TouchableOpacity
                  onPress={handleTogglePlay}
                  style={styles.controlButton}
                  accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause size={20} color="#FFFFFF" />
                  ) : (
                    <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleToggleMute}
                  style={styles.controlButton}
                  accessibilityLabel={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <VolumeX size={18} color="#FFFFFF" />
                  ) : (
                    <Volume2 size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleToggleFullscreen}
                  style={styles.controlButton}
                  accessibilityLabel="Fullscreen"
                >
                  <Maximize2 size={18} color={PetConnectColors.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>
                  {pet.breed} • {pet.age}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

export const VideoPlayerModal: React.FC = () => {
  const { activeVideoPet } = usePet();
  if (!activeVideoPet || !activeVideoPet.videoUrl) return null;
  return <VideoPlayerModalInner pet={activeVideoPet} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  containerFullscreen: {
    backgroundColor: '#000000',
    padding: 0,
  },
  fullscreenWrapper: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fullscreenVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  fullscreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  fullscreenTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  topTitleGroup: {
    flex: 1,
    paddingRight: 16,
  },
  fullscreenTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  fullscreenSub: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeCircleBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.7)',
  },
  centerPlayHud: {
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerPlayCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  controlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PetConnectColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  controlPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  loopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  loopBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalCard: {
    width: CARD_WIDTH,
    backgroundColor: '#1F1B19',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1F1B19',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  smallActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  cardCenterPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCenterPlayCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1F1B19',
  },
  controlsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  controlButton: {
    padding: 6,
  },
  badgeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '600',
  },
});
