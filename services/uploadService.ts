import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

// ─── Types ──────────────────────────────────────────

export interface UploadResult {
  url: string;
  path: string;
}

export interface UploadProgress {
  progress: number; // 0 or 100 (Supabase doesn't support granular progress)
  state: 'running' | 'success' | 'error';
}

// ─── Helpers ────────────────────────────────────────

/**
 * Generate a unique file path
 */
function generatePath(folder: string, userId: string, fileName: string): string {
  const timestamp = Date.now();
  const ext = fileName.split('.').pop() || 'jpg';
  return `${folder}/${userId}/${timestamp}.${ext}`;
}

/**
 * Get the content type from a file extension
 */
function getContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const types: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return types[ext] || 'application/octet-stream';
}

// The bucket name — must be created in Supabase Dashboard → Storage
const BUCKET = 'nalam-uploads';

// ─── Core Upload ────────────────────────────────────

async function uploadFile(
  storagePath: string,
  localUri: string,
  onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
  onProgress?.({ progress: 0, state: 'running' });

  try {
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: 'base64' as any,
    });

    const contentType = getContentType(storagePath);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, decode(base64), {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('Supabase storage upload error:', JSON.stringify(error));
      throw new Error(error.message ?? JSON.stringify(error));
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(data.path);

    onProgress?.({ progress: 100, state: 'success' });
    return { url: urlData.publicUrl, path: data.path };
  } catch (err) {
    onProgress?.({ progress: 0, state: 'error' });
    throw err;
  }
}

// ─── Service ────────────────────────────────────────

export const uploadService = {
  /**
   * Upload a profile photo
   * Path: profile-photos/{userId}/{timestamp}.jpg
   */
  uploadProfilePhoto: async (
    userId: string,
    localUri: string,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResult> => {
    const path = generatePath('profile-photos', userId, 'photo.jpg');
    return uploadFile(path, localUri, onProgress);
  },

  /**
   * Upload a medical document (lab report, prescription scan, etc.)
   * Path: medical-documents/{userId}/{timestamp}.{ext}
   */
  uploadMedicalDocument: async (
    userId: string,
    localUri: string,
    fileName: string,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResult> => {
    const path = generatePath('medical-documents', userId, fileName);
    return uploadFile(path, localUri, onProgress);
  },

  /**
   * Upload a prescription PDF
   * Path: prescriptions/{userId}/{timestamp}.pdf
   */
  uploadPrescription: async (
    userId: string,
    localUri: string,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<UploadResult> => {
    const path = generatePath('prescriptions', userId, 'prescription.pdf');
    return uploadFile(path, localUri, onProgress);
  },

  /**
   * Delete a file from Supabase Storage
   */
  deleteFile: async (storagePath: string): Promise<void> => {
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove([storagePath]);
    if (error) throw error;
  },

  /**
   * List all files in a folder
   */
  listFiles: async (folderPath: string): Promise<{ name: string; url: string }[]> => {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(folderPath);
    if (error) throw error;

    return (data || []).map((file) => {
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(`${folderPath}/${file.name}`);
      return { name: file.name, url: urlData.publicUrl };
    });
  },
};
