import { Platform, PermissionsAndroid, NativeModules } from 'react-native';

const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '';

// Check if the native module is available (false in Expo Go)
const AGORA_AVAILABLE = !!NativeModules.AgoraRtcNg;

export interface AgoraEvents {
  onJoinChannelSuccess?: (connection: any, elapsed: number) => void;
  onUserJoined?: (connection: any, remoteUid: number, elapsed: number) => void;
  onUserOffline?: (connection: any, remoteUid: number, reason: any) => void;
  onLeaveChannel?: (connection: any, stats: any) => void;
  onError?: (err: number, msg: string) => void;
}

class AgoraService {
  private engine?: any;
  private isInitialized = false;

  get isAvailable() {
    return AGORA_AVAILABLE;
  }

  async requestPermissions() {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ]);
    }
  }

  async init(events: AgoraEvents) {
    if (!AGORA_AVAILABLE) {
      console.warn('[Agora] Native module not available (Expo Go). Video calls disabled.');
      return;
    }
    if (this.isInitialized) return;

    await this.requestPermissions();

    // Dynamic require — only runs when native module is confirmed available
    const { default: createAgoraRtcEngine, ChannelProfileType } = require('react-native-agora');

    this.engine = createAgoraRtcEngine();
    this.engine.initialize({
      appId: AGORA_APP_ID,
      channelProfile: ChannelProfileType.ChannelProfileCommunication,
    });

    this.engine.registerEventHandler({
      onJoinChannelSuccess: (connection: any, elapsed: number) => {
        console.log('[Agora] Join success', connection.channelId);
        events.onJoinChannelSuccess?.(connection, elapsed);
      },
      onUserJoined: (connection: any, remoteUid: number, elapsed: number) => {
        console.log('[Agora] Remote user joined', remoteUid);
        events.onUserJoined?.(connection, remoteUid, elapsed);
      },
      onUserOffline: (connection: any, remoteUid: number, reason: any) => {
        console.log('[Agora] Remote user offline', remoteUid);
        events.onUserOffline?.(connection, remoteUid, reason);
      },
      onLeaveChannel: (connection: any, stats: any) => {
        console.log('[Agora] Leave channel');
        events.onLeaveChannel?.(connection, stats);
      },
      onError: (err: number, msg: string) => {
        console.error('[Agora] Error', err, msg);
        events.onError?.(err, msg);
      },
    });

    this.engine.enableVideo();
    this.engine.startPreview();
    this.isInitialized = true;
  }

  async join(channelName: string, uid: number = 0, token: string = '') {
    if (!this.engine) throw new Error('Agora engine not initialized');

    const { ClientRoleType } = require('react-native-agora');
    this.engine.joinChannel(token, channelName, uid, {
      clientRoleType: ClientRoleType.ClientRoleBroadcaster,
    });
  }

  async leave() {
    if (this.engine) {
      this.engine.leaveChannel();
      this.engine.release();
      this.engine = undefined;
      this.isInitialized = false;
    }
  }

  async toggleMute(muted: boolean) {
    this.engine?.muteLocalAudioStream(muted);
  }

  async toggleVideo(enabled: boolean) {
    this.engine?.enableLocalVideo(enabled);
  }

  async switchCamera() {
    this.engine?.switchCamera();
  }

  getEngine() {
    return this.engine;
  }
}

export const agoraService = new AgoraService();
