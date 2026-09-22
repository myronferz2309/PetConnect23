import { Platform } from 'react-native';
import { PetConnectColors } from './colors';

export const Colors = {
  light: {
    text: PetConnectColors.onSurface,
    textSecondary: PetConnectColors.onSurfaceVariant,
    background: PetConnectColors.background,
    backgroundElement: PetConnectColors.surfaceContainer,
    backgroundSelected: PetConnectColors.primaryContainer,
    primary: PetConnectColors.primary,
    card: PetConnectColors.surfaceCard,
    border: PetConnectColors.outlineVariant,
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#DDC1B7',
    background: '#1F1B19',
    backgroundElement: '#2D2825',
    backgroundSelected: PetConnectColors.primary,
    primary: PetConnectColors.primaryContainer,
    card: '#292523',
    border: '#56423C',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 70, android: 80 }) ?? 75;
export const MaxContentWidth = 720;
