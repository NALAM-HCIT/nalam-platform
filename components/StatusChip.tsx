import React from 'react';
import { View, Text } from 'react-native';

type ChipVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

interface StatusChipProps {
  label: string;
  variant?: ChipVariant;
}

const variantStyles: Record<ChipVariant, { bg: string; text: string; border: string }> = {
  primary: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  success: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  danger: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  neutral: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' },
};

export function StatusChip({ label, variant = 'primary' }: StatusChipProps) {
  const s = variantStyles[variant];
  return (
    <View className={`${s.bg} ${s.border} border px-3 py-1 rounded-full`}>
      <Text className={`${s.text} text-xs font-bold`}>{label}</Text>
    </View>
  );
}
