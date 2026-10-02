import React, { useEffect, useState } from 'react';
import { Rocket, MessageSquare, Zap, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const HIGHLIGHTS = [
  { icon: MessageSquare, text: 'Seu WhatsApp vira um atendente de IA' },
  { icon: Zap, text: 'Respondendo clientes em segundos, 24/7' },
  { icon: Clock, text: 'Tudo funcionando em menos de 5 minutos' },
];

export const StepWelcome: React.FC<{ onStart: () => void }> = ({ onStart }) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Vídeo de demonstração configurado pelo superadmin (opcional)
  useEffect(() => {
    supabase
      .from('global_settings')
      .select('wizard')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setVideoUrl((data?.wizard as { video_url?: string } | null)?.video_url ?? null);
      });
  }, []);


  return (
    <div style={{ textAlign: 'center', padding: '12px 0' }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
        background: 'var(--primary)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 12px 32px var(--primary-light)',
      }}>
        <Rocket size={36} />
      </div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 8px', letterSpacing: -0.5 }}>
        Coloque sua assistência técnica para vender enquanto você repara
      </h1>
      <p style={{ fontSize: '1rem', color: 'var(--text-muted)', margin: '0 0 20px' }}>
        Conecte seu WhatsApp, escolha o plano e em poucos minutos sua IA já estará
        atendendo clientes, orçando e agendando por você.
      </p>

      {videoUrl && (
        <video
          src={videoUrl}
          controls
          autoPlay
          muted
          loop
          playsInline
          style={{
            width: '100%', maxHeight: 280, borderRadius: 16, background: '#000',
            marginBottom: 20, boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
          }}
        />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', maxWidth: 380, margin: '0 auto 28px' }}>
        {HIGHLIGHTS.map(({ icon: Icon, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'var(--primary-light)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={18} />
            </div>
            <span style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>{text}</span>
          </div>
        ))}
      </div>
      <button className="btn btn-primary" onClick={onStart} style={{ fontSize: '1rem', padding: '14px 32px', borderRadius: 12 }}>
        Começar agora →
      </button>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 14, margin: '14px 0 0' }}>
        Sem compromisso. Você só paga quando decidir ativar.
      </p>
    </div>
  );
};
