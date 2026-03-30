import { CustomAlert } from '@/components/CustomAlert';
import { useState, useCallback } from 'react';

import * as ImagePicker from 'expo-image-picker';
import { uploadService, UploadProgress } from '@/services/uploadService';
import { useAuthStore } from '@/stores/authStore';
/**
 * Shared hook for profile photo upload with Firebase Storage.
 * Handles camera/gallery picking, Firebase upload with progress, and state management.
 *
 * Usage:
 *   const { profileImage, uploading, uploadProgress, handleChangePhoto } = useProfilePhoto();
 */
export function useProfilePhoto(existingImageUrl?: string | null) {
  const { userId } = useAuthStore();
  const [profileImage, setProfileImage] = useState<string | null>(existingImageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const pickAndUpload = useCallback(async (useCamera: boolean) => {
    const permissionResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      CustomAlert.alert('Permission Required', `Please allow ${useCamera ? 'camera' : 'photo library'} access in your device settings.`);
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });

    if (result.canceled || !result.assets[0]) return;

    const localUri = result.assets[0].uri;

    // Show local image immediately for fast UX
    setProfileImage(localUri);

    if (!userId) {
      CustomAlert.alert('Success', 'Profile photo updated locally.');
      return;
    }

    // Upload to Supabase Storage
    setUploading(true);
    setUploadProgress(0);

    try {
      const { url } = await uploadService.uploadProfilePhoto(
        userId,
        localUri,
        (progress: UploadProgress) => setUploadProgress(progress.progress),
      );
      setProfileImage(url);
      CustomAlert.alert('Success', 'Profile photo uploaded!');
    } catch (err) {
      console.error('Upload failed:', err);
      CustomAlert.alert('Upload Failed', 'Photo saved locally but could not be uploaded. Please try again later.');
      // Keep local image as fallback
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [userId]);

  const handleChangePhoto = useCallback(() => {
    CustomAlert.alert('Update Profile Photo', 'Choose a source:', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: () => pickAndUpload(true) },
      { text: 'Choose from Gallery', onPress: () => pickAndUpload(false) },
    ]);
  }, [pickAndUpload]);

  return {
    profileImage,
    setProfileImage,
    uploading,
    uploadProgress,
    handleChangePhoto,
  };
}
