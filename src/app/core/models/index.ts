export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'petugas';
  active: boolean;
  assigned_tower_id?: string | null;
  assigned_tower_name?: string | null;
  created_at?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: string;
  user_id: string;
  email: string;
  full_name: string;
}

export interface Tower {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

export interface ReadingPeriod {
  id: string;
  period_month: string;
  status: 'draft' | 'active' | 'closed';
  opened_by?: string;
  opened_at?: string;
  closed_by?: string;
  closed_at?: string;
}

export interface MeterReading {
  id: string;
  period_id: string;
  meter_id: string;
  meter_number: string;
  unit_number: string;
  tower_name?: string;
  floor?: string;
  meter_type: 'electricity' | 'water' | string;
  multiplier: number;
  unit_of_measure: string;
  previous_value?: number | null;
  meter_value: number;
  usage?: number | null;
  reading_timestamp: string;
  ocr_value?: number | null;
  verification_status: 'unrecorded' | 'verified' | 'pending_verification' | 'anomaly';
  sync_status: string;
  notes?: string | null;
  officer_name?: string | null;
  photo_filename?: string | null;
  photo_url?: string | null;
  has_photo?: boolean;
}

export interface TowerSummary {
  name: string;
  code: string;
  totalUnits: number;
  recordedUnits: number;
  progressPercent: number;
}

export interface BackupItem {
  filename: string;
  size_mb: number;
  created_at: string;
  sha256_hash?: string;
}

export interface ServerHealth {
  status: string;
  app: string;
  time: string;
  database: string;
}
