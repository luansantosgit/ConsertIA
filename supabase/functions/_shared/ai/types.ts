export interface AgentSettings {
  id: string;
  tenant_id: string;
  agent_name: string;
  greeting_enabled: boolean;
  ask_name_enabled: boolean;
  typing_simulation: boolean;
  active: boolean;
  post_handoff_behavior: "continue" | "pause";
  handoff_message: string;
  transfer_message: string;
  uncovered_transfer: boolean;
  auto_os_enabled: boolean;
  auto_schedule_enabled: boolean;
  openrouter_model: string;
  own_api_key: string | null;
}

export interface QuoteSettings {
  labor_enabled: boolean;
  labor_mode: "separate" | "included";
  labor_type: "fixed" | "percent";
  labor_value: number;
  quote_template: string;
}

export interface DiagnosisSettings {
  repair_mode: "screen_only" | "screen_and_glass";
  glass_rules: string | null;
}

export interface CoverageRow {
  device_type: string;
  brands: string[];
  active: boolean;
}

export interface TemplateRow {
  id: string;
  title: string;
  type: "text" | "media";
  content: string;
  media_url: string | null;
  sort_order: number;
}

export interface OpenOrderRow {
  id: string;
  subject: string;
  status: string;
  budget_amount: number | null;
  created_at: string;
}

export interface AppointmentRow {
  id: string;
  title: string;
  date: string;
  start_time: string;
  os_id: string | null;
}

export interface PartRow {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  part_type: string | null;
  device_brand: string | null;
  device_model: string | null;
}

export interface AgentContext {
  supabase: any;
  conversation: Record<string, any>;
  tenantId: string;
  companyName: string;
  agent: AgentSettings;
  quote: QuoteSettings;
  diagnosis: DiagnosisSettings;
  coverage: CoverageRow[];
  templates: TemplateRow[];
  customer: { id: string; name: string } | null;
  contactName: string;
  openOrders: OpenOrderRow[];
  appointments: AppointmentRow[];
  isFirstContact: boolean;
  apiKey: string | null;
  tokenLimit: number;
  period: string;
  timezone: string;
  uazapiBase: string;
  connectionToken: string;
  allowedValues: Set<number>;
  handoffRequested: boolean;
  canonicalQuote: string | null;
  toolsUsed: string[];
  toolResults: Record<string, any>[];
}

export interface ChatMessagePayload {
  role: "system" | "user" | "assistant" | "tool";
  content: any;
  tool_call_id?: string;
  tool_calls?: any[];
  name?: string;
}

export interface ToolResult {
  ok: boolean;
  [key: string]: any;
}
