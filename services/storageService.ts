/// Upload resources (PDF, images, videos) to Supabase Storage
import { supabase } from './supabaseClient';

const BUCKET_NAME = 'curriculum_books';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_TYPES: Record<string, string[]> = {
  pdf: ['application/pdf'],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
};

function getAcceptForType(type: 'pdf' | 'image' | 'video'): string {
  if (type === 'pdf') return 'application/pdf';
  if (type === 'image') return 'image/jpeg,image/png,image/gif,image/webp';
  if (type === 'video') return 'video/mp4,video/webm,video/quicktime,video/x-msvideo';
  return '*/*';
}

export function getResourceFileAccept(type: 'pdf' | 'image' | 'video'): string {
  return getAcceptForType(type);
}

export function isAllowedFileType(file: File, type: 'pdf' | 'image' | 'video'): boolean {
  const allowed = ALLOWED_TYPES[type] || [];
  return allowed.includes(file.type) || allowed.some(m => file.type.startsWith(m.split('/')[0]));
}

/**
 * Upload a file to Supabase Storage and return the public URL.
 * Uses "curriculum_books" bucket with resources/ prefix for class uploads.
 */
export async function uploadResourceFile(
  file: File,
  type: 'pdf' | 'image' | 'video'
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('حجم الملف يتجاوز الحد الأقصى (50 ميجابايت)');
  }

  if (!isAllowedFileType(file, type)) {
    throw new Error(`نوع الملف غير مدعوم. المتوقع: ${type === 'pdf' ? 'PDF' : type === 'image' ? 'صورة' : 'فيديو'}`);
  }

  const safeName = `resources/${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(safeName, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    if (error.message?.includes('Bucket not found') || error.message?.includes('does not exist')) {
      throw new Error('دلو التخزين غير موجود. تأكد من إعداد Storage في Supabase.');
    }
    throw new Error(error.message || 'فشل رفع الملف');
  }

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);
  return urlData.publicUrl;
}

/**
 * Delete a file from Storage by its public URL (if it belongs to our bucket).
 * Used when deleting a resource to keep Storage in sync.
 */
export async function deleteStorageFileByUrl(url: string): Promise<void> {
  if (!url) return;
  try {
    const bucketPrefix = `/object/public/${BUCKET_NAME}/`;
    const idx = url.indexOf(bucketPrefix);
    if (idx === -1) return;
    const pathWithQuery = url.slice(idx + bucketPrefix.length);
    const path = decodeURIComponent(pathWithQuery.split('?')[0]);
    if (!path.startsWith('resources/')) return;
    await supabase.storage.from(BUCKET_NAME).remove([path]);
  } catch (_) {
    // Ignore - DB row delete is more critical
  }
}
