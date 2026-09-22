import React from 'react';
import { ThumbsUp, ThumbsDown, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import type { AiLog } from './types';
import { useTranslation } from '@/hooks/useTranslation';

interface LogsTabProps {
  aiLogs: AiLog[];
  totalLogsCount: number;
  totalCost: number;
  loadingLogs: boolean;
  expandedLog: string | null;
  setExpandedLog: (id: string | null) => void;
  formatDate: (iso: string) => string;
}

export const LogsTab: React.FC<LogsTabProps> = ({
  aiLogs, totalLogsCount, totalCost, loadingLogs,
  expandedLog, setExpandedLog, formatDate,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {loadingLogs ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{t('Carregando...')}</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Total de logs', value: String(totalLogsCount), color: 'var(--primary)' },
              { label: 'Custo total', value: `R$ ${totalCost.toFixed(2)}`, color: '#16a34a' },
              { label: 'Requisições', value: String(aiLogs.length), color: '#7c3aed' },
              { label: 'Erros', value: String(aiLogs.filter(l => !l.success).length), color: '#ea580c' },
            ].map((m, i) => (
              <div key={i} className="card" style={{ padding: '16px 18px' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>{t(m.label)}</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.value}</p>
              </div>
            ))}
          </div>

          <div className="card card-p" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{t('Últimas Requisições de IA')}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{t('Histórico recente de chamadas ao modelo de linguagem.')}</p>
            </div>
            {aiLogs.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>{t('Nenhum log encontrado.')}</div>
            ) : (
              aiLogs.map(log => (
                <div key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <div onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', cursor: 'pointer' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: log.success ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: log.success ? '#16a34a' : '#dc2626' }}>
                      {log.success ? <ThumbsUp size={15} /> : <ThumbsDown size={15} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{log.provider}/{log.model}</span>
                        <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 600, background: log.success ? 'var(--primary-light)' : '#fee2e2', color: log.success ? 'var(--primary)' : '#dc2626' }}>
                          {log.success ? t('Sucesso') : t('Erro')}
                        </span>
                        {log.cost > 0 && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>R$ {log.cost.toFixed(4)}</span>
                        )}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {log.error_message || `${log.input_tokens}+${log.output_tokens} tokens · ${log.response_time_ms}ms`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDate(log.created_at)}</span>
                    {expandedLog === log.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </div>
                </div>
                {expandedLog === log.id && (
                  <div style={{ padding: '0 0 14px 46px' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      Provider: {log.provider} | Modelo: {log.model} | Tokens entrada: {log.input_tokens} | Tokens saída: {log.output_tokens} | Tempo: {log.response_time_ms}ms
                      {log.conversation_id && ` | Conversa: ${log.conversation_id}`}
                      {log.error_message && ` | Erro: ${log.error_message}`}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </>
    )}
  </>
  );
};
