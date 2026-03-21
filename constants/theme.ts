// Azure Ethereal Design System - "The Clinical Sanctuary"
export const Colors = {
  primary: '#1A73E8',
  primaryLight: '#257DF1',
  primaryDim: '#BFDBFE',
  primaryFixed: '#DBEAFE',

  surface: '#F0F7FF',
  surfaceBright: '#FFFFFF',
  surfaceDim: '#E0E9F5',
  surfaceVariant: '#F1F5F9',
  surfaceContainer: 'rgba(255, 255, 255, 0.7)',
  surfaceContainerHigh: 'rgba(255, 255, 255, 0.85)',
  surfaceContainerHighest: 'rgba(255, 255, 255, 0.95)',
  surfaceContainerLow: 'rgba(255, 255, 255, 0.4)',

  midnight: '#0B1B3D',
  onSurface: '#0B1B3D',
  onSurfaceVariant: '#64748B',

  tertiary: '#38BDF8',
  tertiaryContainer: '#BAE6FD',

  outline: '#BFDBFE',
  outlineVariant: '#E2E8F0',

  error: '#DC2626',
  errorContainer: '#FEE2E2',

  success: '#22C55E',
  warning: '#F59E0B',

  white: '#FFFFFF',
  hospitalBlue: '#003399',
} as const;

export const Shadows = {
  focus: {
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  presence: {
    shadowColor: '#172554',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 12,
  },
  card: {
    shadowColor: '#172554',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;
