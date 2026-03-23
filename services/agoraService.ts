import createAgoraRtcEngine, {
  ChannelProfileType,
  ClientRoleType,
  IRtcEngine,
  RtcConnection,
  RtcStats,
  UserOfflineReasonType,
} from 'react-native-agora';
import { Platform, PermissionsAndroid } from 'react-native';

const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '';

export interface AgoraEvents {
  onJoinChannelSuccess?: (connection: RtcConnection, elapsed: number) => void;
  onUserJoined?: (connection: RtcConnection, remoteUid: number, elapsed: number) => void;
  onUserOffline?: (connection: RtcConnection, remoteUid: number, reason: UserOfflineReasonType) => void;
  onLeaveChannel?: (connection: RtcConnection, stats: RtcStats) => void;
  onError?: (err: number, msg: string) => void;
}

class AgoraService {
  private engine?: IRtcEngine;
  private isInitialized = false;

  async requestPermissions() {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        PermissionsAndroid.PERMISSIONS.CAMERA,
      ]);
    }
  }

  async init(events: AgoraEvents) {
    if (this.isInitialized) return;

    await this.requestPermissions();

    this.engine = createAgoraRtcEngine();
    this.engine.initialize({
      appId: AGORA_APP_ID,
      channelProfile: ChannelProfileType.ChannelProfileCommunication,
    });

    this.engine.registerEventHandler({
      onJoinChannelSuccess: (connection, elapsed) => {
        console.log('[Agora] Join success', connection.channelId);
        events.onJoinChannelSuccess?.(connection, elapsed);
      },
      onUserJoined: (connection, remoteUid, elapsed) => {
        console.log('[Agora] Remote user joined', remoteUid);
        events.onUserJoined?.(connection, remoteUid, elapsed);
      },
      onUserOffline: (connection, remoteUid, reason) => {
        console.log('[Agora] Remote user offline', remoteUid);
        events.onUserOffline?.(connection, remoteUid, reason);
      },
      onLeaveChannel: (connection, stats) => {
        console.log('[Agora] Leave channel');
        events.onLeaveChannel?.(connection, stats);
      },
      onError: (err, msg) => {
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
    
    // In testing mode (no token), token can be an empty string or null 
    // depending on Agora project settings.
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
