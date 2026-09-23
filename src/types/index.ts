// Tipos fundamentais do sistema

export type Language = 'pt-BR' | 'en' | 'es';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  theme_color?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  cpf_cnpj?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ChecklistPhoto {
  url: string;
  label: string;
  uploadedAt: string;
}

export interface ServiceOrder {
  id: string;
  tenant_id: string;
  customer_id: string;
  equipment_id?: string;
  status: ServiceOrderStatus;
  subject: string;
  description: string;
  diagnosis?: string;
  budget_amount?: number;
  part_name?: string;
  part_amount?: number;
  labor_amount?: number;
  approved_at?: string;
  started_at?: string;
  completed_at?: string;
  technician_id?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  checklist_photos: ChecklistPhoto[];
  created_at: string;
  updated_at: string;
}

export type ServiceOrderStatus = 
  | 'pending'
  | 'diagnosis'
  | 'awaiting_approval'
  | 'approved'
  | 'awaiting_part'
  | 'in_progress'
  | 'completed'
  | 'ready'
  | 'cancelled';

export interface Equipment {
  id: string;
  tenant_id: string;
  customer_id: string;
  type: string;
  brand: string;
  model: string;
  serial_number?: string;
  color?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  sku: string;
  price: number;
  cost?: number;
  stock_quantity: number;
  min_stock_quantity?: number;
  category?: string;
  location?: string;
  part_type?: string;
  device_brand?: string;
  device_model?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  tenant_id: string;
  name: string;
  phone?: string;
  email?: string;
  source: 'whatsapp' | 'phone' | 'walk_in' | 'website' | 'referral';
  status: LeadStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';

export type MessageSenderType = 'customer' | 'ai' | 'attendant';

export interface Message {
  id: string;
  tenant_id: string;
  conversation_id: string;
  sender_id?: string;
  contact_phone: string;
  content: string;
  direction: 'inbound' | 'outbound';
  read: boolean;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'error';
  wa_message_id?: string;
  wa_chat_id?: string;
  media_type?: string;
  media_url?: string;
  reaction?: string;
  edited?: boolean;
  deleted?: boolean;
  reply_to?: string;
  message_id_provider?: string;
  message_type?: string;
  is_internal_note?: boolean;
  connection_id?: string;
  hybrid_provider?: HybridProvider;
  sender_type?: MessageSenderType;
  created_at: string;
}

export type ConversationAiState = 'attending' | 'handed_off' | 'paused' | 'off';

export interface Conversation {
  id: string;
  tenant_id: string;
  contact_phone: string;
  contact_name?: string;
  contact_avatar?: string;
  customer_id?: string;
  last_message_at?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  pinned?: boolean;
  assigned_to?: string;
  status: 'open' | 'closed';
  connection_id?: string;
  remote_jid?: string;
  is_group?: boolean;
  archived_at?: string;
  ai_state?: ConversationAiState;
  ai_released_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  tenant_id: string;
  service_order_id?: string;
  type: TransactionType;
  amount: number;
  description: string;
  payment_method?: string;
  status: TransactionStatus;
  created_at: string;
  updated_at: string;
}

export type TransactionType = 'income' | 'expense' | 'refund';
export type TransactionStatus = 'pending' | 'completed' | 'cancelled';

export interface CalendarEvent {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  event_type: CalendarEventType;
  related_id?: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export type CalendarEventType = 'service_order' | 'meeting' | 'reminder' | 'other';

export interface StockMovement {
  id: string;
  tenant_id: string;
  product_id: string;
  type: StockMovementType;
  quantity: number;
  reference_id?: string;
  notes?: string;
  created_at: string;
}

export type StockMovementType = 'in' | 'out' | 'adjustment';

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  max_users: number;
  max_storage_mb: number;
  ai_token_limit: number;
  features: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantSettings {
  id: string;
  tenant_id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface TenantTheme {
  id?: string;
  tenant_id: string;
  primary_color: string;
  primary_dark: string;
  logo_url?: string;
  logo_type?: 'icon' | 'full';
  logo_text: string;
  favicon_url?: string;
  sidebar_dark: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiConfig {
  id: string;
  tenant_id: string;
  provider: string;
  model: string;
  api_key: string;
  max_tokens: number;
  temperature: number;
  system_prompt?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiLog {
  id: string;
  tenant_id: string;
  conversation_id?: string;
  message_id?: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  response_time_ms: number;
  success: boolean;
  error_message?: string;
  created_at: string;
}

// ============================================================
// AGENTE DE IA ESPECIALISTA (plano-agente-ia.md)
// ============================================================

export type PostHandoffBehavior = 'continue' | 'pause';
export type LaborMode = 'separate' | 'included';
export type LaborType = 'fixed' | 'percent';
export type RepairMode = 'screen_only' | 'screen_and_glass';
export type PreQuoteTemplateType = 'text' | 'media';
export type AiDistributionMode = 'all' | 'selected';

export interface AiAgentSettings {
  id: string;
  tenant_id: string;
  agent_name: string;
  greeting_enabled: boolean;
  ask_name_enabled: boolean;
  typing_simulation: boolean;
  active: boolean;
  post_handoff_behavior: PostHandoffBehavior;
  handoff_message: string;
  transfer_message: string;
  uncovered_transfer: boolean;
  auto_os_enabled: boolean;
  auto_schedule_enabled: boolean;
  openrouter_model: string;
  own_api_key?: string;
  created_at: string;
  updated_at: string;
}

export interface AiQuoteSettings {
  id: string;
  tenant_id: string;
  labor_enabled: boolean;
  labor_mode: LaborMode;
  labor_type: LaborType;
  labor_value: number;
  quote_template: string;
  created_at: string;
  updated_at: string;
}

export interface AiPreQuoteTemplate {
  id: string;
  tenant_id: string;
  title: string;
  type: PreQuoteTemplateType;
  content: string;
  media_url?: string;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiDiagnosisSettings {
  id: string;
  tenant_id: string;
  repair_mode: RepairMode;
  glass_rules?: string;
  created_at: string;
  updated_at: string;
}

export interface AiDeviceCoverage {
  id: string;
  tenant_id: string;
  device_type: string;
  brands: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlatformAiConfig {
  id: string;
  openrouter_token?: string;
  distribution_mode: AiDistributionMode;
  created_at: string;
  updated_at: string;
}

export interface TenantAiEntitlement {
  id: string;
  tenant_id: string;
  use_platform_token: boolean;
  token_limit_override?: number;
  created_at: string;
  updated_at: string;
}

export interface AiTokenUsage {
  id: string;
  tenant_id: string;
  period: string;
  tokens_in: number;
  tokens_out: number;
  cost: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// WHATSAPP - API OFICIAL + API ALTERNATIVA + LIGACOES + MODO HIBRIDO
// ============================================================

export type ConnectionProvider = 'api_alternativa' | 'api_oficial';

export type ConnectionStatus = 'pending' | 'connected' | 'disconnected' | 'waiting';

export type HybridMode = 'integral' | 'partial' | 'random';

export type HybridProvider = 'api_oficial' | 'api_alternativa';

export type RoutingType = 'department' | 'flow';

export interface Connection {
  id: string;
  tenant_id: string;
  name: string;
  phone_number?: string;
  color?: string;
  provider: ConnectionProvider;
  status: ConnectionStatus;
  profile_name?: string;
  profile_pic_url?: string;
  number?: string;

  // API Alternativa
  instance_name?: string;
  instance_token?: string;
  instance_data?: Record<string, any>;

  // API Oficial (Meta Cloud API via Pontaltech)
  bsp_username?: string;
  bsp_password?: string;
  bsp_waba_id?: string;
  bsp_phone_number_id?: string;
  bsp_app_id?: string;
  bsp_config_id?: string;
  bsp_webhook_url?: string;

  // Modo Hibrido
  hybrid_connection_id?: string;

  // Roteamento
  routing_type: RoutingType;
  department_id?: string;
  flow_id?: string;
  ai_agent_project_id?: string;

  // IA
  ai_enabled?: boolean;

  // Historico
  import_history?: boolean;
  history_days?: number;
  history_sync_data?: Record<string, any>;

  created_at: string;
  updated_at: string;
}

export interface HybridRouteResult {
  provider: HybridProvider;
  reason: string;
}

export interface ConversationHybridState {
  conversation_id: string;
  provider_override?: HybridProvider;
  first_response_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppWebhookEvent {
  id: string;
  tenant_id: string;
  event_type: string;
  event_name: string;
  payload: Record<string, any>;
  connection_id?: string;
  conversation_id?: string;
  contact_phone?: string;
  created_at: string;
}

export interface PlatformSettings {
  id: string;
  admin_api_token?: string;
  uazapi_subdomain?: string;
  uazapi_mode?: string;
  bsp_username?: string;
  bsp_password?: string;
  bsp_app_id?: string;
  bsp_config_id?: string;
  bsp_waba_id?: string;
  bsp_phone_number_id?: string;
  bsp_webhook_url?: string;
  bsp_template_pricing?: Record<string, any>;
  hybrid_mode: HybridMode;
  hybrid_random_percentage: number;
  support_whatsapp?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// LIGACOES (WaCalls)
// ============================================================

export type WaCallsSessionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export type WaCallsCallStatus = 'ringing' | 'active' | 'ended' | 'missed' | 'rejected';

export type WaCallsCallDirection = 'inbound' | 'outbound';

export interface WaCallsSession {
  id: string;
  tenant_id: string;
  fork_session_id: string;
  name?: string;
  phone_number?: string;
  status: WaCallsSessionStatus;
  jid?: string;
  connection_id?: string;
  max_concurrent_calls: number;
  created_at: string;
  updated_at: string;
}

export interface WaCallsCall {
  id: string;
  tenant_id: string;
  session_id: string;
  direction: WaCallsCallDirection;
  status: WaCallsCallStatus;
  caller_phone?: string;
  callee_phone?: string;
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  recording_url?: string;
  created_at: string;
}

export interface WaCallsPlanLimit {
  id: string;
  plan_name: string;
  max_channels: number;
  max_concurrent_calls: number;
  max_calls_per_day: number;
  active: boolean;
  created_at: string;
}

export interface WaCallsCanCallResult {
  allowed: boolean;
  reason?: string;
  active_calls?: number;
  calls_today?: number;
  max_concurrent?: number;
  max_per_day?: number;
}

// ============================================================
// EXTENSOES PARA CONVERSATION E MESSAGE
// (merged nas interfaces principais acima)
// ============================================================
