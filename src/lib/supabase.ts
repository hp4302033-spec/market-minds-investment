import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}
function getAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
}
function getServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
}

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(getSupabaseUrl(), getAnonKey());
  }
  return _supabase;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(getSupabaseUrl(), getServiceKey(), {
      auth: { persistSession: false },
    });
  }
  return _supabaseAdmin;
}

// Keep named exports for backward compatibility
export const supabase = { get client() { return getSupabase(); } };
export const supabaseAdmin = { get client() { return getSupabaseAdmin(); } };

export interface Lead {
  id?: string;
  name: string;
  email: string;
  phone: string;
  investment_type: 'SIP' | 'LUMPSUM' | 'SWP';
  amount: number;
  period_years: number;
  expected_return: number;
  total_invested: number;
  estimated_returns: number;
  final_value: number;
  cagr: number;
  wealth_multiplier: number;
  advisor_note: string;
  created_at?: string;
}

export async function saveLead(lead: Omit<Lead, 'id' | 'created_at'>): Promise<{ id: string } | null> {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('leads')
      .insert([lead])
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('saveLead failed:', err);
    return null;
  }
}

export async function getAllLeads(): Promise<Lead[]> {
  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('getAllLeads failed:', err);
    return [];
  }
}

// SQL schema to run in Supabase SQL editor:
/*
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  investment_type TEXT NOT NULL CHECK (investment_type IN ('SIP', 'LUMPSUM', 'SWP')),
  amount NUMERIC NOT NULL,
  period_years INTEGER NOT NULL,
  expected_return NUMERIC NOT NULL,
  total_invested NUMERIC NOT NULL,
  estimated_returns NUMERIC NOT NULL,
  final_value NUMERIC NOT NULL,
  cagr NUMERIC NOT NULL,
  wealth_multiplier NUMERIC NOT NULL,
  advisor_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "service_role_all" ON leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);
*/
