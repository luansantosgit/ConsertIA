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

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'manager' | 'technician' | 'attendant';

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
  approved_at?: string;
  started_at?: string;
  completed_at?: string;
  technician_id?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
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

export interface Message {
  id: string;
  tenant_id: string;
  conversation_id: string;
  sender_id?: string;
  contact_phone: string;
  content: string;
  direction: 'inbound' | 'outbound';
  read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  tenant_id: string;
  contact_phone: string;
  contact_name?: string;
  customer_id?: string;
  last_message_at?: string;
  unread_count: number;
  assigned_to?: string;
  status: 'open' | 'closed';
  created_at: string;
  updated_at: string;
}
