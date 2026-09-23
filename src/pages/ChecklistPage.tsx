import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Wrench, Camera, X, Upload, Check,
  SwitchCamera, Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ChecklistPhoto } from '@/types';

interface CapturedPhoto {
  id: string;
  blob: Blob;
  preview: string;
  label: string;
}

const MAX_SIZE_BYTES = 2 * 1024 * 1024;
const CAPTURE_WIDTH = 1920;
const CAPTURE_HEIGHT = 1080;

export const ChecklistPage: React.FC = () => {
  const { osId } = useParams<{ osId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [osSubject, setOsSubject] = useState('');
  const [savedPhotos, setSavedPhotos] = useState<ChecklistPhoto[]>([]);
  const [captured, setCaptured] = useState<CapturedPhoto[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!osId) return;
    const fetchOS = async () => {
      const { data } = await supabase
        .from('service_orders')
        .select('subject, checklist_photos')
        .eq('id', osId)
        .single();
      if (data) {
        setOsSubject(data.subject || '');
        setSavedPhotos(data.checklist_photos || []);
      }
      setLoading(false);
    };
    fetchOS();
  }, [osId]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: CAPTURE_WIDTH }, height: { ideal: CAPTURE_HEIGHT } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch {
      setError('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
    }
  };

  const switchCamera = () => {
    stopCamera();
    setFacingMode(f => f === 'environment' ? 'user' : 'environment');
  };

  useEffect(() => {
    if (cameraActive) startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const compressImage = (blob: Blob): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > CAPTURE_WIDTH || height > CAPTURE_HEIGHT) {
          const ratio = Math.min(CAPTURE_WIDTH / width, CAPTURE_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);

        const tryCompress = (quality: number) => {
          canvas.toBlob((result) => {
            if (result && result.size > MAX_SIZE_BYTES && quality > 0.3) {
              tryCompress(quality - 0.1);
            } else {
              resolve(result || blob);
            }
          }, 'image/jpeg', quality);
        };

        tryCompress(0.85);
      };
      img.src = URL.createObjectURL(blob);
    });
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);

    const rawBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.92);
    });

    const compressed = await compressImage(rawBlob);
    const preview = URL.createObjectURL(compressed);

    setCaptured(prev => [...prev, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      blob: compressed,
      preview,
      label: '',
    }]);
  };

  const removeCaptured = (id: string) => {
    setCaptured(prev => {
      const photo = prev.find(p => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter(p => p.id !== id);
    });
  };

  const updateCapturedLabel = (id: string, label: string) => {
    setCaptured(prev => prev.map(p => p.id === id ? { ...p, label } : p));
  };

  const uploadAll = async () => {
    if (!osId || captured.length === 0) return;
    setUploading(true);

    const uploaded: ChecklistPhoto[] = [];
    for (const photo of captured) {
      const ext = 'jpg';
      const path = `${osId}/${photo.id}.${ext}`;

      const { error } = await supabase.storage
        .from('checklist-photos')
        .upload(path, photo.blob, { contentType: 'image/jpeg' });

      if (!error) {
        const { data } = supabase.storage.from('checklist-photos').getPublicUrl(path);
        uploaded.push({
          url: data.publicUrl,
          label: photo.label,
          uploadedAt: new Date().toISOString(),
        });
      }
    }

    if (uploaded.length > 0) {
      const all = [...savedPhotos, ...uploaded];
      setSavedPhotos(all);
      await supabase
        .from('service_orders')
        .update({ checklist_photos: all })
        .eq('id', osId);
    }

    captured.forEach(p => URL.revokeObjectURL(p.preview));
    setCaptured([]);
    setUploading(false);
    stopCamera();
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f6fb' }}>
        <p style={{ color: '#9ca3af' }}>Carregando...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#000', position: 'relative', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        padding: '12px 16px',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8,
          background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}>
          <Wrench size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#fff', fontSize: '0.8125rem', fontWeight: 600, margin: 0 }}>
            Checklist — {osSubject || `OS #${osId}`}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6875rem', margin: 0 }}>
            {captured.length > 0 ? `${captured.length} foto(s) capturada(s)` : 'Aponte e tire fotos'}
          </p>
        </div>
        {captured.length > 0 && (
          <button
            onClick={stopCamera}
            style={{
              padding: '6px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
              fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Revisar
          </button>
        )}
      </div>

      {/* Camera view */}
      {cameraActive && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100dvh', objectFit: 'cover' }}
          />

          {/* Botão switch camera */}
          <button
            onClick={switchCamera}
            style={{
              position: 'absolute', top: 60, right: 16, zIndex: 20,
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <SwitchCamera size={18} />
          </button>

          {/* Botão capturar */}
          <div style={{
            position: 'absolute', bottom: 32, left: 0, right: 0, zIndex: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
          }}>
            {/* Miniatura das fotos capturadas */}
            {captured.length > 0 && (
              <div
                onClick={stopCamera}
                style={{
                  width: 52, height: 52, borderRadius: 10, border: '2px solid #fff',
                  overflow: 'hidden', cursor: 'pointer', position: 'relative',
                }}
              >
                <img src={captured[captured.length - 1].preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'rgba(0,0,0,0.6)', color: '#fff', textAlign: 'center',
                  fontSize: '0.625rem', fontWeight: 700, padding: '1px 0',
                }}>
                  {captured.length}
                </div>
              </div>
            )}

            {/* Botão circular de captura */}
            <button
              onClick={capturePhoto}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'transparent', border: '4px solid #fff',
                cursor: 'pointer', position: 'relative', padding: 0,
              }}
            >
              <div style={{
                position: 'absolute', inset: 4, borderRadius: '50%',
                background: '#fff', transition: 'transform 0.1s',
              }} />
            </button>
          </div>
        </>
      )}

      {/* Tela de revisão (fotos capturadas) */}
      {!cameraActive && (
        <div style={{
          minHeight: '100dvh', background: '#f5f6fb',
          padding: '60px 16px 100px', overflow: 'auto',
        }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            {captured.length === 0 && savedPhotos.length === 0 ? (
              <div style={{
                padding: '60px 20px', background: '#fff', borderRadius: 14,
                border: '1px solid #eef0f6', textAlign: 'center',
              }}>
                <div style={{
                  width: 60, height: 60, borderRadius: 14, background: '#f1f5f9',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <Camera size={28} color="#9ca3af" />
                </div>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1d2e', margin: '0 0 6px' }}>
                  Tire fotos do aparelho
                </p>
                <p style={{ fontSize: '0.8125rem', color: '#9ca3af', margin: 0 }}>
                  Abra a câmera para capturar o estado de entrada do dispositivo
                </p>
              </div>
            ) : (
              <>
                {/* Fotos salvas */}
                {savedPhotos.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Fotos salvas
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {savedPhotos.map((photo, i) => (
                        <div key={i} style={{
                          background: '#fff', borderRadius: 10, border: '1px solid #eef0f6',
                          overflow: 'hidden', display: 'flex', gap: 10, padding: 8,
                          alignItems: 'center',
                        }}>
                          <img src={photo.url} style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover' }} />
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1a1d2e', margin: 0 }}>
                              {photo.label || `Foto ${i + 1}`}
                            </p>
                            <p style={{ fontSize: '0.6875rem', color: '#9ca3af', margin: 0 }}>
                              Salva
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fotos pendentes (capturadas) */}
                {captured.length > 0 && (
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4f46e5', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Prontas para enviar ({captured.length})
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {captured.map((photo) => (
                        <div key={photo.id} style={{
                          background: '#fff', borderRadius: 10, border: '2px solid #4f46e5',
                          overflow: 'hidden',
                        }}>
                          <div style={{ position: 'relative' }}>
                            <img src={photo.preview} style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }} />
                            <button
                              onClick={() => removeCaptured(photo.id)}
                              style={{
                                position: 'absolute', top: 8, right: 8,
                                width: 30, height: 30, borderRadius: '50%',
                                background: 'rgba(239,68,68,0.9)', border: 'none', color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Legenda (ex: Tela trincada)"
                            value={photo.label}
                            onChange={(e) => updateCapturedLabel(photo.id, e.target.value)}
                            style={{
                              width: '100%', padding: '10px 12px', border: 'none',
                              borderTop: '1px solid #eef0f6', fontSize: '0.8125rem',
                              outline: 'none', color: '#1a1d2e',
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Botões fixos embaixo */}
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
            padding: '12px 16px',
            background: 'linear-gradient(to top, rgba(245,246,251,1) 70%, transparent)',
          }}>
            <div style={{ maxWidth: 448, margin: '0 auto', display: 'flex', gap: 10 }}>
              <button
                onClick={startCamera}
                style={{
                  flex: 1, padding: '14px', borderRadius: 12,
                  background: '#4f46e5', color: '#fff', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
                }}
              >
                <Camera size={18} />
                {captured.length > 0 ? 'Tirar mais' : 'Abrir câmera'}
              </button>

              {captured.length > 0 && (
                <button
                  onClick={uploadAll}
                  disabled={uploading}
                  style={{
                    flex: 1, padding: '14px', borderRadius: 12,
                    background: uploading ? '#9ca3af' : '#10b981', color: '#fff', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    fontSize: '0.875rem', fontWeight: 600, cursor: uploading ? 'wait' : 'pointer',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                  }}
                >
                  {uploading ? <Upload size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={18} />}
                  {uploading ? 'Enviando...' : `Enviar ${captured.length} foto(s)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div style={{
          position: 'fixed', top: 60, left: 16, right: 16, zIndex: 30,
          padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <X size={16} color="#ef4444" />
          <p style={{ fontSize: '0.8125rem', color: '#991b1b', margin: 0, flex: 1 }}>{error}</p>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <X size={14} color="#991b1b" />
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', -apple-system, sans-serif; }
        input::placeholder { color: #9ca3af; }
      `}</style>
    </div>
  );
};
