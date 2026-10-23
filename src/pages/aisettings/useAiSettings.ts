import { useState, useEffect, useCallback } from 'react';
import { AiAgentSettingsRepository } from '@/repositories/ai-agent-settings.repository';
import { AiQuoteSettingsRepository, AiDiagnosisSettingsRepository } from '@/repositories/ai-quote-settings.repository';
import { AiPreQuoteTemplateRepository } from '@/repositories/ai-templates.repository';
import { AiEntitlementRepository } from '@/repositories/ai-entitlement.repository';
import { AiLogRepository } from '@/repositories/ai-log.repository';
import { AiConfigRepository } from '@/repositories/ai-config.repository';
import type { Section, AiLog } from './types';
import type { AiAgentSettings, AiQuoteSettings, AiDiagnosisSettings, AiPreQuoteTemplate } from '@/types';

const agentRepo = new AiAgentSettingsRepository();
const quoteRepo = new AiQuoteSettingsRepository();
const diagnosisRepo = new AiDiagnosisSettingsRepository();
const templateRepo = new AiPreQuoteTemplateRepository();
const entitlementRepo = new AiEntitlementRepository();
const aiLogRepo = new AiLogRepository();
const aiConfigRepo = new AiConfigRepository();

export function useAiSettings() {
  const [activeSection, setActiveSection] = useState<Section>('personalidade');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [agent, setAgent] = useState<AiAgentSettings | null>(null);
  const [quote, setQuote] = useState<AiQuoteSettings | null>(null);
  const [diagnosis, setDiagnosis] = useState<AiDiagnosisSettings | null>(null);
  const [templates, setTemplates] = useState<AiPreQuoteTemplate[]>([]);
  const [usesPlatformToken, setUsesPlatformToken] = useState(true);
  const [allowedModels, setAllowedModels] = useState<string[]>([]);
  const [defaultModel, setDefaultModel] = useState('');
  const [usageTokens, setUsageTokens] = useState(0);
  const [usageCost, setUsageCost] = useState(0);
  const [tokenLimit, setTokenLimit] = useState<number | null>(null);
  const [agentDesc, setAgentDesc] = useState('');

  const [aiLogs, setAiLogs] = useState<AiLog[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [totalLogsCount, setTotalLogsCount] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logsPage, setLogsPage] = useState(1);
  const LOGS_PAGE_SIZE = 20;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [agentData, quoteData, diagnosisData, templateData, entitlement, planLimit, activeConfig, logs, count, cost] = await Promise.all([
          agentRepo.get(),
          quoteRepo.get(),
          diagnosisRepo.get(),
          templateRepo.getAll(),
          entitlementRepo.getEntitlement(),
          entitlementRepo.getPlanLimit().catch(() => 0),
          aiConfigRepo.getActive().catch(() => null),
          aiLogRepo.getPage(1, LOGS_PAGE_SIZE),
          aiLogRepo.count(),
          aiLogRepo.getTotalCost(),
        ]);
        setAgent(agentData);
        setAgentDesc(activeConfig?.system_prompt ?? '');
        setQuote(quoteData);
        setDiagnosis(diagnosisData);
        setTemplates(templateData);
        const usesPlatform = entitlement?.use_platform_token !== false;
        setUsesPlatformToken(usesPlatform);
        const usageSrc = await entitlementRepo.getUsage(undefined, usesPlatform ? 'platform' : 'own');
        setUsageTokens((usageSrc?.tokens_in ?? 0) + (usageSrc?.tokens_out ?? 0));
        setUsageCost(Number(usageSrc?.cost ?? 0));
        entitlementRepo.getEffectiveModels().then(m => {
          setAllowedModels(m.allowedModels);
          setDefaultModel(m.defaultModel);
        }).catch(() => {});

      // Cota efetiva: limite do plano/override + tokens comprados
      const extra = entitlement?.extra_tokens ?? 0;
      setTokenLimit((entitlement?.token_limit_override ?? planLimit) + (extra || 0));
      setAiLogs(logs);
        setTotalLogsCount(count);
        setTotalCost(cost);
      } catch (err) {
        console.error('Failed to fetch AI settings:', err);
      } finally {
        setLoading(false);
        setLoadingLogs(false);
      }
    }
    fetchData();
  }, []);

  // Paginação dos logs: carrega a página solicitada
  const goToLogsPage = useCallback(async (page: number) => {
    setLogsPage(page);
    setLoadingLogs(true);
    setExpandedLog(null);
    try {
      const [logs, count] = await Promise.all([
        aiLogRepo.getPage(page, LOGS_PAGE_SIZE),
        aiLogRepo.count(),
      ]);
      setAiLogs(logs);
      setTotalLogsCount(count);
    } catch (err) {
      console.error('Failed to fetch AI logs page:', err);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  const flashSaved = useCallback(() => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, []);

  // Recarrega cota/uso (após compra de tokens, por exemplo)
  const refreshUsage = useCallback(async () => {
    try {
      const [entitlement, planLimit] = await Promise.all([
        entitlementRepo.getEntitlement(),
        entitlementRepo.getPlanLimit().catch(() => 0),
      ]);
      const usesPlatform = entitlement?.use_platform_token !== false;
      const usage = await entitlementRepo.getUsage(undefined, usesPlatform ? 'platform' : 'own');
      setUsageTokens((usage?.tokens_in ?? 0) + (usage?.tokens_out ?? 0));
      setUsageCost(Number(usage?.cost ?? 0));
      const extra = entitlement?.extra_tokens ?? 0;
      setTokenLimit((entitlement?.token_limit_override ?? planLimit) + (extra || 0));
    } catch { /* silencioso */ }
  }, []);

  const savePersonality = useCallback(async (agentName: string, systemPrompt: string) => {
    setSaving(true);
    try {
      const updated = await agentRepo.save({ agent_name: agentName });
      setAgent(updated);
      const active = await aiConfigRepo.getActive().catch(() => null);
      if (active) {
        await aiConfigRepo.update(active.id, { system_prompt: systemPrompt });
      } else {
        await aiConfigRepo.create({
          provider: 'openrouter',
          model: updated.openrouter_model,
          system_prompt: systemPrompt,
          active: true,
        });
      }
      flashSaved();
    } catch (err) {
      console.error('Failed to save personality:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [flashSaved]);

  const saveAgent = useCallback(async (partial: Partial<AiAgentSettings>) => {
    setSaving(true);
    try {
      const updated = await agentRepo.save(partial);
      setAgent(updated);
      flashSaved();
    } catch (err) {
      console.error('Failed to save agent settings:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [flashSaved]);

  const saveQuote = useCallback(async (partial: Partial<AiQuoteSettings>) => {
    setSaving(true);
    try {
      const updated = await quoteRepo.save(partial);
      setQuote(updated);
      flashSaved();
    } catch (err) {
      console.error('Failed to save quote settings:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [flashSaved]);

  const saveDiagnosis = useCallback(async (partial: Partial<AiDiagnosisSettings>) => {
    setSaving(true);
    try {
      const updated = await diagnosisRepo.save(partial);
      setDiagnosis(updated);
      flashSaved();
    } catch (err) {
      console.error('Failed to save diagnosis settings:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [flashSaved]);

  const createTemplate = useCallback(async (template: Partial<AiPreQuoteTemplate>) => {
    const created = await templateRepo.create(template);
    setTemplates(prev => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
  }, []);

  const updateTemplate = useCallback(async (id: string, template: Partial<AiPreQuoteTemplate>) => {
    const updated = await templateRepo.update(id, template);
    setTemplates(prev => prev.map(t => (t.id === id ? updated : t)).sort((a, b) => a.sort_order - b.sort_order));
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    await templateRepo.delete(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  }, []);

  const formatDate = useCallback((iso: string) => {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
  }, []);

  return {
    activeSection, setActiveSection,
    loading, saving, saved,
    agent, quote, diagnosis, templates,
    usesPlatformToken, usageTokens, usageCost, tokenLimit, allowedModels, defaultModel,
    refreshUsage,
    agentDesc, setAgentDesc,
    saveAgent, savePersonality, saveQuote, saveDiagnosis,
    createTemplate, updateTemplate, deleteTemplate,
    aiLogs, totalLogsCount, totalCost, loadingLogs,
    logsPage, logsPageSize: LOGS_PAGE_SIZE, goToLogsPage,
    expandedLog, setExpandedLog, formatDate,
  };
}
