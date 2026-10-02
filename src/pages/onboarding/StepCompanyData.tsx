import React, { useState } from 'react';
import { Bot, ArrowRight } from 'lucide-react';
import { OnboardingRepository } from './onboarding.repository';
import { maskCpfCnpj, maskPhone, isValidCpfCnpj } from './masks';

const ERRORS: Record<string, string> = {
  missing_name: 'Informe seu nome e o nome da empresa.',
  invalid_email: 'Informe um e-mail válido.',
  invalid_whatsapp: 'Informe um WhatsApp válido com DDD.',
  invalid_cpf_cnpj: 'CPF ou CNPJ inválido — verifique os números.',
  invalid_plan: 'Plano inválido. Volte e escolha novamente.',
  email_exists: 'Este e-mail já está cadastrado. Faça login ou use outro.',
};

export const StepCompanyData: React.FC<{
  onDone: (token: string, expiresAt?: string) => void;
  onBack: () => void;
}> = ({ onDone, onBack }) => {
  const repo = new OnboardingRepository();
  const [form, setForm] = useState({
    lead_name: '', company_name: '', email: '',
    whatsapp: '', cpf_cnpj: '', address: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  // Mostra exatamente o que falta — o botão nunca fica "mudo"
  const missing = (): string | null => {
    if (!form.lead_name.trim()) return 'Informe seu nome.';
    if (!form.company_name.trim()) return 'Informe o nome da empresa.';
    if (!form.email.includes('@')) return 'Informe um e-mail válido (será seu login).';
    if (form.whatsapp.replace(/\D/g, '').length < 10) return 'Informe o WhatsApp da empresa com DDD.';
    if (!isValidCpfCnpj(form.cpf_cnpj)) return 'CPF ou CNPJ inválido — confira os números.';
    return null;
  };

  const submit = async () => {
    const problem = missing();
    if (problem) { setError(problem); return; }
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      // WhatsApp e o contato principal da empresa (usado pela IA e pelas OS)
      const { token, expires_at: expiresAt } = await repo.start({ ...form, phone: form.whatsapp });
      onDone(token, expiresAt);
    } catch (err) {
      setError(ERRORS[(err as Error & { code?: string }).code ?? ''] ?? 'Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { marginBottom: 0 };

  return (
    <div>
      <h2 style={{ fontSize: '1.375rem', fontWeight: 700, margin: '0 0 6px' }}>
        Vamos conhecê-lo 👋
      </h2>
      <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', margin: '0 0 20px' }}>
        Estes dados identificam sua empresa — e a sua IA usa endereço e telefone
        para informar seus clientes quando precisarem.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="form-group">
          <label className="form-label">Seu nome</label>
          <input className="input" style={inputStyle} value={form.lead_name} onChange={e => set('lead_name')(e.target.value)} placeholder="Ex: João Silva" />
        </div>
        <div className="form-group">
          <label className="form-label">Nome da empresa</label>
          <input className="input" style={inputStyle} value={form.company_name} onChange={e => set('company_name')(e.target.value)} placeholder="Ex: TechAssist Reparos" />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">E-mail (será seu login)</label>
            <input className="input" style={inputStyle} type="email" value={form.email} onChange={e => set('email')(e.target.value)} placeholder="voce@empresa.com" />
          </div>
          <div className="form-group">
            <label className="form-label">WhatsApp da empresa</label>
            <input className="input" style={inputStyle} value={form.whatsapp} onChange={e => set('whatsapp')(maskPhone(e.target.value))} placeholder="(11) 99999-0000" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">CPF ou CNPJ <span style={{ color: 'var(--text-muted)' }}>(para a fatura)</span></label>
          <input className="input" style={inputStyle} value={form.cpf_cnpj} onChange={e => set('cpf_cnpj')(maskCpfCnpj(e.target.value))} placeholder="000.000.000-00" />
        </div>
        <div className="form-group">
          <label className="form-label">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Bot size={13} color="var(--primary)" />
              Endereço <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(a IA informa aos clientes)</span>
            </span>
          </label>
          <input className="input" style={inputStyle} value={form.address} onChange={e => set('address')(e.target.value)} placeholder="Rua, número, bairro, cidade" />
        </div>

        {error && <p style={{ color: 'var(--danger)', fontSize: '0.8125rem', margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onBack} disabled={loading}>Voltar</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Salvando...' : <>Continuar <ArrowRight size={16} /></>}
          </button>
        </div>
      </div>
    </div>
  );
};
