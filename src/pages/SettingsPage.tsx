import React, { useState, useEffect, useCallback } from 'react';
import {
  Palette, Bell, Shield, Users, Wrench,
  Check, ChevronRight, Smartphone, MessageSquare, MonitorSmartphone, Bot
} from 'lucide-react';
import { useThemeStore } from '@/stores/theme.store';
import { useAuthStore } from '@/stores/auth.store';
import { TenantThemeRepository } from '@/repositories/tenant-theme.repository';
import { SkeletonCard } from '@/components/Skeleton';
import ErrorMessage from '@/components/ErrorMessage';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ConnectionRepository } from '@/repositories/connection.repository';
import { ConnectionStatusBadge, QRCodeModal, HybridConfigModal } from '@/components/whatsapp';
import { generateQRCode, configureWebhook, checkConnectionStatus } from '@/lib/api-alternativa.service';
import { hybridService } from '@/lib/hybrid.service';
import { supabase } from '@/lib/supabase';
import type { Connection, HybridMode } from '@/types';
import { useTranslation } from '@/hooks/useTranslation';
import { DeviceCoverageSection } from '@/pages/settings/DeviceCoverageSection';

type Section = 'aparencia' | 'notificacoes' | 'empresa' | 'aparelhos' | 'usuarios' | 'seguranca' | 'integracao' | 'conexoes';

const NAV: { key: Section; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { key: 'aparencia', label: 'Aparência', icon: Palette },
  { key: 'empresa', label: 'Empresa', icon: Wrench },
  { key: 'aparelhos', label: 'Aparelhos Atendidos', icon: MonitorSmartphone },
  { key: 'usuarios', label: 'Usuários', icon: Users },
  { key: 'notificacoes', label: 'Notificações', icon: Bell },
  { key: 'seguranca', label: 'Segurança', icon: Shield },
  { key: 'integracao', label: 'Integrações', icon: Smartphone },
  { key: 'conexoes', label: 'Conexões WhatsApp', icon: MessageSquare },
];

const PRESET_COLORS = [
  '#4f46e5', '#7c3aed', '#db2777', '#dc2626',
  '#ea580c', '#16a34a', '#0891b2', '#0f172a',
];

const LANGS = [
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'en',    label: 'English' },
  { code: 'es',    label: 'Español' },
];

const NOTIFICATION_META = [
  { key: 'notif_new_os', label: 'Nova OS aberta', desc: 'Quando uma nova ordem de serviço é criada' },
  { key: 'notif_os_ready', label: 'OS pronta para entrega', desc: 'Quando o técnico marca a OS como concluída' },
  { key: 'notif_budget_no_reply', label: 'Orçamento sem resposta', desc: 'Depois de 24h sem resposta do cliente' },
  { key: 'notif_low_stock', label: 'Estoque baixo', desc: 'Quando um item atinge o estoque mínimo' },
  { key: 'notif_whatsapp_message', label: 'Mensagem no WhatsApp', desc: 'Notificação em tempo real de novas mensagens' },
  { key: 'notif_weekly_report', label: 'Relatório semanal', desc: 'Resumo de faturamento e OS toda segunda-feira' },
];

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<Section>('aparencia');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [companyCnpj, setCompanyCnpj] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyWhatsapp, setCompanyWhatsapp] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyLanguage, setCompanyLanguage] = useState('pt-BR');
  const [companyTimezone, setCompanyTimezone] = useState('America/Sao_Paulo');
  const [companyOsTerms, setCompanyOsTerms] = useState('');
  const [notifications, setNotifications] = useState<Record<string, boolean>>({});
  const [connections, setConnections] = useState<Connection[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [newConnectionId, setNewConnectionId] = useState<string | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [newConnectionName, setNewConnectionName] = useState('');
  const [creatingConnection, setCreatingConnection] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);
  const [showHybridModal, setShowHybridModal] = useState(false);
  const [hybridMode, setHybridMode] = useState<HybridMode>('integral');
  const [hybridPercentage, setHybridPercentage] = useState(50);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info';
    onConfirm: () => void | Promise<void>;
  }>({ isOpen: false, title: '', message: '', variant: 'danger', onConfirm: () => {} });

  const { activeTheme, setTenantTheme, applyTheme, loadTenantTheme } = useThemeStore();
  const { user } = useAuthStore();

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      try {
        const { data: settings } = await supabase
          .from('tenant_settings')
          .select('*')
          .eq('tenant_id', user?.tenantId ?? '')
          .maybeSingle();

        if (settings) {
          setCompanyName(settings.company_name ?? '');
          setCompanyCnpj(settings.cnpj ?? '');
          setCompanyPhone(settings.phone ?? '');
          setCompanyWhatsapp(settings.whatsapp ?? '');
          setCompanyAddress(settings.address ?? '');
          setCompanyLanguage(settings.language ?? 'pt-BR');
          setCompanyTimezone(settings.timezone ?? 'America/Sao_Paulo');
          setCompanyOsTerms(settings.os_terms ?? '');
        }

        if (user?.tenantId) {
          await loadTenantTheme(user.tenantId);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
        setError('Erro ao carregar configurações');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user?.tenantId, loadTenantTheme, applyTheme]);

  useEffect(() => {
    if (activeSection !== 'conexoes') return;
    const loadConnections = async () => {
      setConnectionsLoading(true);
      try {
        const repo = new ConnectionRepository();
        const data = await repo.getAll();
        setConnections(data);

        // Verifica status real da Uazapi para cada conexao com token
        for (const conn of data) {
          if (conn.instance_token && conn.provider === 'api_alternativa') {
            checkConnectionStatus(conn.id).then(real => {
              setConnections(prev => prev.map(c =>
                c.id === conn.id ? { ...c, status: real.status as Connection['status'] } : c
              ));
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.error('Failed to load connections:', err);
      } finally {
        setConnectionsLoading(false);
      }
    };
    loadConnections();
  }, [activeSection]);

  const handleNewConnection = () => {
    setNewConnectionName('');
    setShowNamePrompt(true);
  };

  const handleConfirmCreateConnection = async () => {
    const name = newConnectionName.trim();
    if (!name) return;
    setCreatingConnection(true);
    setShowNamePrompt(false);
    try {
      const repo = new ConnectionRepository();
      const conn = await repo.create({
        name,
        provider: 'api_alternativa',
        status: 'waiting',
      });
      setConnections(prev => [...prev, conn]);
    } catch (err) {
      console.error('Failed to create connection:', err);
    } finally {
      setCreatingConnection(false);
    }
  };

  const handleGenerateQR = async (conn: Connection) => {
    setNewConnectionId(conn.id);
    setQrLoading(true);
    setQrImage(null);
    setQrError(null);
    setShowQRModal(true);
    try {
      const result = await generateQRCode(conn.id);
      if (result.success && result.qrCode) {
        setQrImage(result.qrCode);
      } else if (result.error) {
        setQrError(result.error);
      }
    } catch (err) {
      setQrError('Erro ao gerar QR Code');
      console.error('Failed to generate QR:', err);
    } finally {
      setQrLoading(false);
    }
  };

  const handleRefreshQR = async () => {
    if (!newConnectionId) return;
    setQrLoading(true);
    setQrError(null);
    try {
      const result = await generateQRCode(newConnectionId);
      if (result.success && result.qrCode) {
        setQrImage(result.qrCode);
      } else if (result.error) {
        setQrError(result.error);
      }
    } catch (err) {
      setQrError('Erro ao atualizar QR Code');
      console.error('Failed to refresh QR:', err);
    } finally {
      setQrLoading(false);
    }
  };

  const handleConnected = useCallback(async () => {
    setShowQRModal(false);
    setNewConnectionId(null);
    setQrImage(null);
    setQrError(null);
    showToast('Conexao conectada com sucesso!');
    try {
      const repo = new ConnectionRepository();
      const data = await repo.getAll();
      setConnections(data);
    } catch (err) {
      console.error('Failed to refresh connections:', err);
    }
  }, [showToast]);

  const handleDisconnect = async (conn: Connection) => {
    setConfirmModal({
      isOpen: true,
      title: 'Desconectar WhatsApp',
      message: `Tem certeza que deseja desconectar "${conn.name || conn.phone_number}"? A conexão será encerrada e você precisará escanear o QR Code novamente para reconectar.`,
      variant: 'warning',
      onConfirm: async () => {
        try {
          const { disconnectInstance } = await import('@/lib/api-alternativa.service');
          await disconnectInstance(conn.id);
          const repo = new ConnectionRepository();
          const data = await repo.getAll();
          setConnections(data);
        } catch (err) {
          console.error('Failed to disconnect:', err);
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleDeleteConnection = async (conn: Connection) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Conexão',
      message: `Tem certeza que deseja excluir "${conn.name || conn.phone_number}" permanentemente? Esta ação não pode ser desfeita.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const { deleteInstance } = await import('@/lib/api-alternativa.service');
          await deleteInstance(conn.id);
          const repo = new ConnectionRepository();
          await repo.delete(conn.id);
          setConnections(prev => prev.filter(c => c.id !== conn.id));
        } catch (err) {
          console.error('Failed to delete connection:', err);
        } finally {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleToggleConnectionAi = async (conn: Connection) => {
    const next = !conn.ai_enabled;
    try {
      const repo = new ConnectionRepository();
      await repo.update(conn.id, { ai_enabled: next });
      setConnections(prev => prev.map(c => (c.id === conn.id ? { ...c, ai_enabled: next } : c)));
      showToast(
        next ? 'Agente de IA ativado neste canal' : 'Agente de IA desativado neste canal',
        next ? 'success' : 'info'
      );
    } catch (err) {
      console.error('Failed to toggle connection AI:', err);
      showToast('Erro ao alterar agente de IA', 'error');
    }
  };

  const handleOpenHybrid = async () => {
    setShowHybridModal(true);
    try {
      const config = await hybridService.getConfig();
      setHybridMode(config.hybridMode);
      setHybridPercentage(config.hybridRandomPercentage);
    } catch (err) {
      console.error('Failed to load hybrid config:', err);
    }
  };

  const handleSaveHybrid = async (mode: HybridMode, percentage: number) => {
    await hybridService.updateConfig(mode, percentage);
    const repo = new ConnectionRepository();
    const data = await repo.getAll();
    setConnections(data);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const tenantId = user?.tenantId ?? '';
      const { data: existing } = await supabase
        .from('tenant_settings')
        .select('tenant_id')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      const settingsData = {
        company_name: companyName,
        cnpj: companyCnpj,
        phone: companyPhone,
        whatsapp: companyWhatsapp,
        address: companyAddress,
        language: companyLanguage,
        timezone: companyTimezone,
        os_terms: companyOsTerms || null,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        await supabase.from('tenant_settings').update(settingsData).eq('tenant_id', tenantId);
      } else {
        await supabase.from('tenant_settings').insert({ ...settingsData, tenant_id: tenantId });
      }

      if (user?.tenantId) {
        const themeRepo = new TenantThemeRepository();
        await themeRepo.upsert({
          primary_color: activeTheme.primaryColor,
          primary_dark: activeTheme.primaryDark,
          logo_url: activeTheme.logoUrl || undefined,
          logo_type: activeTheme.logoType || 'icon',
          logo_text: activeTheme.logoText || 'ConsertIA',
          favicon_url: activeTheme.faviconUrl || undefined,
          sidebar_dark: activeTheme.sidebarDark || false,
        });
        applyTheme(user?.tenantId);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateColor = (color: string) => {
    if (!user?.tenantId) return;
    setTenantTheme(user.tenantId, {
      primaryColor: color,
      primaryDark: color,
    });
    applyTheme(user.tenantId);
  };

  if (error) {
    return (
      <div className="page">
        <ErrorMessage message={error} onRetry={() => { setError(null); setLoading(true); }} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Sidebar nav */}
        <div className="card" style={{ width: 220, flexShrink: 0, overflow: 'hidden' }}>
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '12px 16px', border: 'none',
                borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left',
                background: activeSection === key ? 'var(--primary-light)' : 'transparent',
                color: activeSection === key ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeSection === key ? 600 : 400,
                fontSize: '0.875rem', fontFamily: 'inherit',
                transition: 'background 0.1s, color 0.1s',
                borderLeft: activeSection === key ? '3px solid var(--primary)' : '3px solid transparent',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon size={16} />
                {t(label)}
              </span>
              <ChevronRight size={13} />
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          {/* ── APARÊNCIA ── */}
          {activeSection === 'aparencia' && (
            <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{t('Aparência')}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('Personalize a cor de destaque do seu painel de atendimento.')}</p>
              </div>

              {/* Color presets */}
              <div className="form-group">
                <label className="form-label">{t('Cor primária')}</label>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  {PRESET_COLORS.map(c => (
                    <div
                      key={c}
                      onClick={() => updateColor(c)}
                      style={{
                        width: 36, height: 36, borderRadius: '50%', background: c, cursor: 'pointer',
                        border: activeTheme.primaryColor === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                        transition: 'transform 0.1s, border 0.1s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transform: activeTheme.primaryColor === c ? 'scale(1.1)' : 'scale(1)',
                      }}
                    >
                      {activeTheme.primaryColor === c && <Check size={14} color="#fff" />}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', maxWidth: 280 }}>
                  <input
                    type="color"
                    value={activeTheme.primaryColor}
                    onChange={e => updateColor(e.target.value)}
                    style={{ width: 42, height: 38, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: 2 }}
                  />
                  <input
                    className="input"
                    value={activeTheme.primaryColor}
                    onChange={e => updateColor(e.target.value)}
                    placeholder="#4f46e5"
                  />
                </div>
              </div>

              {/* Preview mini */}
              <div style={{ padding: 16, background: '#f8fafc', borderRadius: 12, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>PREVIEW</p>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {activeTheme.logoUrl && activeTheme.logoType === 'full' ? (
                    <img src={activeTheme.logoUrl} style={{ maxHeight: 42, maxWidth: 180, objectFit: 'contain' }} alt={activeTheme.logoText} />
                  ) : (
                    <>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: activeTheme.logoUrl ? 'transparent' : activeTheme.primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, overflow: 'hidden' }}>
                        {activeTheme.logoUrl ? <img src={activeTheme.logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : (activeTheme.logoText || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontWeight: 700 }}>{activeTheme.logoText || 'ConsertIA'}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('CRM + IA para Assistência Técnica')}</p>
                      </div>
                    </>
                  )}
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button style={{ padding: '8px 16px', borderRadius: 8, background: activeTheme.primaryColor, color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.875rem' }}>{t('Botão primário')}</button>
                  <span style={{ padding: '4px 12px', borderRadius: 99, background: activeTheme.primaryColor + '20', color: activeTheme.primaryColor, fontWeight: 600, fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>Badge</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => updateColor('#4f46e5')}>{t('Restaurar cor padrão')}</button>
                <button className="btn" onClick={handleSave} style={{ background: saved ? 'var(--success)' : 'var(--primary)', color: '#fff', border: 'none', gap: 6 }}>
                  {saved ? <><Check size={15} />{t('Salvo!')}</> : t('Salvar cor')}
                </button>
              </div>
            </div>
          )}

          {/* ── EMPRESA ── */}
          {activeSection === 'empresa' && (
            <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{t('Dados da Empresa')}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('Informações que aparecem nas OS, orçamentos e notas fiscais.')}</p>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('Razão Social')}</label>
                  <input className="input" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">CNPJ</label>
                  <input className="input" value={companyCnpj} onChange={e => setCompanyCnpj(e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('Telefone')}</label>
                  <input className="input" value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">WhatsApp</label>
                  <input className="input" value={companyWhatsapp} onChange={e => setCompanyWhatsapp(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('Endereço')}</label>
                <input className="input" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('Idioma padrão')}</label>
                  <select className="select" value={companyLanguage} onChange={e => setCompanyLanguage(e.target.value)}>
                    {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('Fuso horário')}</label>
                  <select className="select" value={companyTimezone} onChange={e => setCompanyTimezone(e.target.value)}>
                    <option value="America/Sao_Paulo">America/São_Paulo (GMT-3)</option>
                    <option value="America/Manaus">America/Manaus (GMT-4)</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('Termos de Serviço (OS)')}</label>
                <textarea
                  className="input"
                  rows={3}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  value={companyOsTerms}
                  onChange={e => setCompanyOsTerms(e.target.value)}
                  placeholder={t('Texto simples que aparece no rodapé das Ordens de Serviço. Deixe vazio para usar o padrão.')}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  {t('Exibido no documento da OS enviado ao cliente.')}
                </p>
              </div>
              <div>
                <button className="btn btn-primary" onClick={handleSave}>
                  {saved ? <><Check size={15} />{t('Salvo!')}</> : t('Salvar dados')}
                </button>
              </div>
            </div>
          )}

          {/* ── NOTIFICAÇÕES ── */}
          {activeSection === 'notificacoes' && (
            <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{t('Notificações')}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('Configure quando e como você quer ser notificado.')}</p>
              </div>
              {NOTIFICATION_META.map((n, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t(n.label)}</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>{t(n.desc)}</p>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22, cursor: 'pointer', flexShrink: 0 }}>
                    <input
                      type="checkbox"
                      checked={notifications[n.key] ?? false}
                      style={{ opacity: 0, width: 0, height: 0 }}
                      onChange={() => setNotifications(prev => ({ ...prev, [n.key]: !prev[n.key] }))}
                    />
                    <span style={{ position: 'absolute', inset: 0, background: notifications[n.key] ? 'var(--primary)' : '#cbd5e1', borderRadius: 11, transition: '0.3s' }}>
                      <span style={{ position: 'absolute', top: 3, left: notifications[n.key] ? 21 : 3, width: 16, height: 16, background: '#fff', borderRadius: '50%', transition: '0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </span>
                  </label>
                </div>
              ))}
              <div>
                <button className="btn btn-primary" onClick={handleSave}>
                  {saved ? <><Check size={15} />{t('Salvo!')}</> : t('Salvar notificações')}
                </button>
              </div>
            </div>
          )}

          {/* ── APARELHOS ATENDIDOS ── */}
          {activeSection === 'aparelhos' && <DeviceCoverageSection />}

          {/* ── CONEXÕES WHATSAPP ── */}
          {activeSection === 'conexoes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card card-p">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{t('Conexões WhatsApp')}</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {t('Gerencie suas conexões com a API Oficial e API Alternativa.')}
                    </p>
                  </div>
                  <button className="btn btn-primary" onClick={handleNewConnection}>
                    + {t('Nova Conexão')}
                  </button>
                </div>

                {connectionsLoading ? (
                  <div style={{ display: 'flex', gap: 12 }}>
                    {[1, 2].map(i => (
                      <div key={i} className="card" style={{ flex: 1, padding: 20 }}>
                        <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 12 }} />
                        <div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 16 }} />
                        <div className="skeleton" style={{ height: 32, width: '100%' }} />
                      </div>
                    ))}
                  </div>
                ) : connections.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon"><MessageSquare size={24} /></div>
                    <p className="empty-state-title">{t('Nenhuma conexão')}</p>
                    <p className="empty-state-desc">{t('Conecte seu WhatsApp para começar a receber mensagens.')}</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {connections.map(conn => (
                      <div key={conn.id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <MessageSquare size={18} style={{ color: 'var(--primary)' }} />
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{conn.name || conn.phone_number}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {conn.provider === 'api_oficial' ? 'API Oficial' : 'API Alternativa'}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <label
                            title={t('Agente de IA atende neste canal')}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                              padding: '6px 10px', borderRadius: 99,
                              border: `1px solid ${conn.ai_enabled ? 'var(--primary)' : 'var(--border)'}`,
                              background: conn.ai_enabled ? 'var(--primary-light)' : 'transparent',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={conn.ai_enabled === true}
                              onChange={() => handleToggleConnectionAi(conn)}
                              style={{ width: 14, height: 14, accentColor: 'var(--primary)' }}
                            />
                            <Bot size={14} color={conn.ai_enabled ? 'var(--primary)' : 'var(--text-muted)'} />
                            <span style={{
                              fontSize: '0.75rem', fontWeight: 600,
                              color: conn.ai_enabled ? 'var(--primary)' : 'var(--text-muted)',
                            }}>
                              {t('IA')}
                            </span>
                          </label>
                          <ConnectionStatusBadge status={conn.status} provider={conn.provider} />
                          {conn.status === 'waiting' ? (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleGenerateQR(conn)}
                              disabled={qrLoading && newConnectionId === conn.id}
                            >
                              {qrLoading && newConnectionId === conn.id ? t('Gerando...') : t('Gerar QR Code')}
                            </button>
                          ) : conn.status === 'connected' ? (
                            <>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: 'var(--primary)' }}
                                onClick={async () => {
                                  try {
                                    const result = await configureWebhook(conn.id);
                                    showToast(result.success ? 'Webhook reconfigurado!' : `Erro: ${result.error}`, result.success ? 'success' : 'error');
                                  } catch {
                                    showToast('Erro ao reconfigurar webhook', 'error');
                                  }
                                }}
                              >
                                {t('Reconfigurar Webhook')}
                              </button>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ color: 'var(--danger)' }}
                                onClick={() => handleDisconnect(conn)}
                              >
                                {t('Desconectar')}
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => handleDisconnect(conn)}
                            >
                              {t('Desconectar')}
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: 'var(--text-muted)' }}
                            onClick={() => handleDeleteConnection(conn)}
                          >
                            {t('Excluir')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hybrid config */}
              <div className="card card-p">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{t('Modo Híbrido')}</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {t('Roteie mensagens entre API Oficial e API Alternativa automaticamente.')}
                    </p>
                  </div>
                  <button className="btn btn-secondary" onClick={handleOpenHybrid}>
                    {t('Configurar')}
                  </button>
                </div>
              </div>

              {/* WaCalls sessions */}
              <div className="card card-p">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{t('Ligações')}</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      {t('Sessões de chamadas via API Oficial (WaCalls).')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Placeholder for other sections ── */}
          {!['aparencia', 'empresa', 'notificacoes', 'conexoes'].includes(activeSection) && (
            <div className="card card-p">
              <div className="empty-state">
                <div className="empty-state-icon">
                  {NAV.find(n => n.key === activeSection)?.icon && (() => {
                    const Icon = NAV.find(n => n.key === activeSection)!.icon;
                    return <Icon size={24} />;
                  })()}
                </div>
                <p className="empty-state-title">{t(NAV.find(n => n.key === activeSection)?.label || '')}</p>
                <p className="empty-state-desc">{t('Esta seção estará disponível em breve.')}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showNamePrompt && (
        <div className="modal-overlay" onClick={() => setShowNamePrompt(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-body">
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{t('Nova Conexão WhatsApp')}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {t('Digite um nome para identificar esta conexão:')}
              </p>
              <input
                type="text"
                className="input"
                placeholder="Ex: Loja Principal"
                value={newConnectionName}
                onChange={e => setNewConnectionName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConfirmCreateConnection()}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowNamePrompt(false)}>
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirmCreateConnection}
                  disabled={!newConnectionName.trim() || creatingConnection}
                >
                  {creatingConnection ? 'Criando...' : 'Criar Conexão'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => { setShowQRModal(false); setNewConnectionId(null); setQrImage(null); setQrError(null); }}
        qrCode={qrImage}
        title="Nova Conexao WhatsApp"
        subtitle="Escaneie o QR Code com seu WhatsApp"
        loading={qrLoading}
        error={qrError}
        onRefresh={handleRefreshQR}
        connectionId={newConnectionId}
        onConnected={handleConnected}
      />

      <HybridConfigModal
        isOpen={showHybridModal}
        onClose={() => setShowHybridModal(false)}
        currentMode={hybridMode}
        currentPercentage={hybridPercentage}
        onSave={handleSaveHybrid}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
      />

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 300,
            padding: '12px 20px',
            borderRadius: 'var(--radius)',
            background: toast.type === 'success' ? '#16a34a' : toast.type === 'info' ? 'var(--primary)' : '#dc2626',
            color: '#fff',
            fontSize: '0.875rem',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            animation: 'slideUp 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {toast.type === 'success' ? <Check size={16} /> : null}
          {toast.message}
        </div>
      )}
    </div>
  );
};
