import React, { useState, useImperativeHandle } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { Shadows, Colors } from '@/constants/theme';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

export const alertRef = React.createRef<any>();

export const CustomAlert = {
  alert: (title: string, message?: string, buttons?: AlertButton[]) => {
    alertRef.current?.showAlert(title, message, buttons);
  }
};

export const CustomAlertProvider = () => {
  const [state, setState] = useState<AlertState>({ visible: false, title: '' });

  useImperativeHandle(alertRef, () => ({
    showAlert: (title: string, message?: string, buttons?: AlertButton[]) => {
      setState({
        visible: true,
        title,
        message,
        buttons: buttons || [{ text: 'OK' }]
      });
    }
  }));

  const handlePress = (onPress?: () => void) => {
    setState((prev) => ({ ...prev, visible: false }));
    if (onPress) {
      setTimeout(() => {
        onPress();
      }, 100);
    }
  };

  if (!state.visible) return null;

  const buttonCount = state.buttons?.length ?? 0;
  const isMulti = buttonCount > 2;

  return (
    <Modal transparent animationType="fade" visible={state.visible}>
      <BlurView intensity={20} tint="dark" style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(0,0,0,0.2)' }}>
        <View style={[{ backgroundColor: '#FFFFFF', width: '100%', maxWidth: 340, borderRadius: 24, padding: 24, maxHeight: '80%' }, Shadows.presence]}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#0B1B3D', textAlign: 'center', marginBottom: 8, letterSpacing: -0.3 }}>
            {state.title}
          </Text>
          {!!state.message && (
            <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', fontWeight: '500', lineHeight: 20, marginBottom: 20 }}>
              {state.message}
            </Text>
          )}

          {isMulti ? (
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 8 }}>
                {state.buttons?.map((btn, index) => {
                  const isDestructive = btn.style === 'destructive';
                  const isCancel = btn.style === 'cancel';

                  let bgColor: string = Colors.primary;
                  let txtColor = '#FFFFFF';

                  if (isDestructive) {
                    bgColor = '#FEF2F2';
                    txtColor = '#DC2626';
                  } else if (isCancel) {
                    bgColor = '#F1F5F9';
                    txtColor = '#475569';
                  }

                  return (
                    <Pressable
                      key={index}
                      onPress={() => handlePress(btn.onPress)}
                      style={{ backgroundColor: bgColor, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center' }}
                    >
                      <Text style={{ fontWeight: '700', fontSize: 14, color: txtColor }}>
                        {btn.text}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              {state.buttons?.map((btn, index) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel' || (buttonCount === 2 && index === 0 && btn.text.toLowerCase() === 'cancel');

                let bgColor: string = Colors.primary;
                let txtColor = '#FFFFFF';

                if (isDestructive) {
                  bgColor = '#FEF2F2';
                  txtColor = '#DC2626';
                } else if (isCancel) {
                  bgColor = '#F1F5F9';
                  txtColor = '#475569';
                }

                return (
                  <Pressable
                    key={index}
                    onPress={() => handlePress(btn.onPress)}
                    style={{ flex: 1, backgroundColor: bgColor, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center' }}
                  >
                    <Text style={{ fontWeight: '700', fontSize: 14, color: txtColor }}>
                      {btn.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </BlurView>
    </Modal>
  );
};
