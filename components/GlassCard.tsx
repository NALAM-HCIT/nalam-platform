import React from 'react';
import { View, type ViewProps } from 'react-native';
import { Shadows } from '@/constants/theme';

interface GlassCardProps extends ViewProps {
  variant?: 'default' | 'high' | 'highest';
}

export function GlassCard({ variant = 'default', className = '', style, children, ...props }: GlassCardProps) {
  const bg = variant === 'highest'
    ? 'bg-white/95'
    : variant === 'high'
    ? 'bg-white/85'
    : 'bg-white/70';

  return (
    <View
      className={`${bg} rounded-[24px] p-6 border border-white/50 ${className}`}
      style={[Shadows.presence, style]}
      {...props}
    >
      {children}
    </View>
  );
}
