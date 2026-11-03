import { supabase } from '@/lib/supabase';

/**
 * Upload de vídeo/thumbnail do treinamento direto ao Storage via XHR —
 * o `upload` do supabase-js não expõe progresso, então o POST manual
 * entrega percentual real (NetworkStorageSettings: bucket training-videos).
 */
const BUCKET = 'training-videos';

export interface UploadedFile {
  path: string;
  publicUrl: string;
}

export function uploadTrainingFile(
  file: File,
  onProgress: (pct: number) => void,
): Promise<UploadedFile> {
  const folder = file.type.startsWith('image/') ? 'thumbs' : 'videos';
  const safeName = file.name.replace(/[^\w.\-]+/g, '_');
  const storagePath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || '';

  return new Promise((resolve, reject) => {
    supabase.auth.getSession()
      .then(({ data }) => {
        const token = data.session?.access_token;
        if (!token) {
          reject(new Error('no_session'));
          return;
        }
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${baseUrl}/storage/v1/object/${BUCKET}/${storagePath}`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({
              path: storagePath,
              publicUrl: `${baseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}`,
            });
          } else {
            reject(new Error(`upload_failed_${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('upload_network'));
        xhr.send(file);
      })
      .catch(() => reject(new Error('no_session')));
  });
}

/** Remove o objeto do Storage (melhor esforço) a partir da URL persistida. */
export async function removeTrainingFile(publicUrl: string | null | undefined): Promise<void> {
  if (!publicUrl) return;
  try {
    const path = publicUrl.split(`/object/public/${BUCKET}/`)[1];
    if (!path) return;
    await supabase.storage.from(BUCKET).remove([decodeURIComponent(path)]);
  } catch {
    /* melhor esforço — não bloqueia a exclusão do registro */
  }
}
