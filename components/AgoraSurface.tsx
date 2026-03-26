import React from 'react';
import { View, Text, NativeModules } from 'react-native';

/**
 * Safe wrapper for RtcSurfaceView.
 * In Expo Go the Agora native module doesn't exist — we show a fallback.
 * The actual require('react-native-agora') only happens inside the render
 * function, guarded by a native module check, so Metro won't execute it
 * unless the native module is actually present.
 */

const AGORA_NATIVE_EXISTS = !!NativeModules.AgoraRtcNg;

export function isAgoraAvailable(): boolean {
  return AGORA_NATIVE_EXISTS;
}

export function AgoraSurfaceView({ canvas, style, fallbackText }: {
  canvas: { uid: number };
  style?: any;
  fallbackText?: string;
}) {
  if (!AGORA_NATIVE_EXISTS) {
    return (
      <View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center' }, style]}>
        <Text style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', paddingHorizontal: 16 }}>
          {fallbackText || 'Video requires a development build'}
        </Text>
      </View>
    );
  }

  // Only require when native module is confirmed present at runtime
  const { RtcSurfaceView: NativeSurface } = require('react-native-agora');
  return <NativeSurface canvas={canvas} style={style} />;
}
