import React, { useRef, useState, useEffect } from 'react';
import { Mic, Square, Trash2 } from 'lucide-react';

interface VoiceRecorderBarProps {
  disabled?: boolean;
  /** Nao exibe o botao de microfone (ex: quando ha texto sendo digitado) */
  hidden?: boolean;
  onSendAudio: (blob: Blob) => void;
  onStateChange: (recording: boolean) => void;
}

/**
 * Botao de microfone / barra de gravacao (PTT).
 * Deve permanecer sempre montado (instancia unica) para que o estado interno
 * de gravacao nao se perca em trocas de render do pai.
 */
export const VoiceRecorderBar: React.FC<VoiceRecorderBarProps> = ({
  disabled,
  hidden,
  onSendAudio,
  onStateChange,
}) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    onStateChange(recording);
  }, [recording, onStateChange]);

  useEffect(() => {
    if (recording) {
      timerRef.current = window.setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      setSeconds(0);
    }
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [recording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = (send: boolean) => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorder.onstop = () => {
      recorder.stream.getTracks().forEach(t => t.stop());
      if (send && chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        onSendAudio(blob);
      }
      chunksRef.current = [];
    };
    recorder.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  const iconBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', padding: 6,
    borderRadius: '50%', color: 'var(--text-muted)', display: 'flex',
    alignItems: 'center', flexShrink: 0, transition: 'color 0.15s, background 0.15s',
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (recording) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-full)', padding: '8px 14px' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 0 4px rgba(239,68,68,0.15)' }} />
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#b91c1c', flex: 1 }}>
          Gravando áudio · {fmt(seconds)}
        </span>
        <button onClick={() => stopRecording(false)} title="Descartar gravação" style={{ ...iconBtn, color: '#b91c1c' }}>
          <Trash2 size={16} />
        </button>
        <button onClick={() => stopRecording(true)} title="Enviar áudio" style={{ ...iconBtn, background: 'var(--primary)', color: '#fff' }}>
          <Square size={14} />
        </button>
      </div>
    );
  }

  if (hidden) return null;

  return (
    <button
      onClick={startRecording}
      disabled={disabled}
      title="Gravar áudio"
      aria-label="Gravar áudio"
      style={iconBtn}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
    >
      <Mic size={18} />
    </button>
  );
};
