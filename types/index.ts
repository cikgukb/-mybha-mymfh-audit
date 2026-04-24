export type UserRole = 'admin' | 'auditor' | 'hotel_manager'
export type AuditStatus = 'draft' | 'in_progress' | 'submitted' | 'approved' | 'rejected'
export type CertTier = 'bronze' | 'silver' | 'gold'
export type ChecklistTier = 'mandatory' | 'silver' | 'gold'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  hotel_id: string | null
  created_at: string
  updated_at: string
}

export interface Hotel {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  country: string
  phone: string | null
  email: string | null
  pic_name: string | null
  mybha_member_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ChecklistItem {
  id: string
  code: string
  tier: ChecklistTier
  category: string
  label_en: string
  label_ms: string
  label_zh: string | null
  label_ja: string | null
  description_en: string | null
  description_ms: string | null
  description_zh: string | null
  description_ja: string | null
  sort_order: number
  is_active: boolean
}

export interface Audit {
  id: string
  hotel_id: string
  auditor_id: string
  audit_type: 'self_audit' | 'conformity_assessment'
  status: AuditStatus
  tier: CertTier | null
  mandatory_passed: number
  mandatory_total: number
  silver_passed: number
  silver_total: number
  gold_passed: number
  gold_total: number
  notes: string | null
  submitted_at: string | null
  approved_at: string | null
  approved_by: string | null
  created_at: string
  updated_at: string
  hotels?: Hotel
  profiles?: Profile
}

export interface AuditResponse {
  id: string
  audit_id: string
  checklist_item_id: string
  passed: boolean | null
  notes: string | null
  photo_url: string | null
  created_at: string
  updated_at: string
  checklist_items?: ChecklistItem
}

export interface Certificate {
  id: string
  cert_number: string
  hotel_id: string
  audit_id: string
  tier: CertTier
  issued_date: string
  expiry_date: string
  issued_by: string
  is_active: boolean
  revoked_at: string | null
  revoked_reason: string | null
  created_at: string
  hotels?: Hotel
  audits?: Audit
  profiles?: Profile
}

export interface Notification {
  id: string
  type: 'expiry_reminder' | 'audit_submitted' | 'cert_approved' | 'cert_rejected'
  recipient_id: string
  hotel_id: string | null
  certificate_id: string | null
  message_en: string
  message_ms: string | null
  message_zh: string | null
  message_ja: string | null
  is_read: boolean
  created_at: string
  hotels?: Hotel
}

export interface DashboardStats {
  totalHotels: number
  activeHotels: number
  totalAudits: number
  pendingAudits: number
  activeCerts: number
  expiringCerts: number
  tierBreakdown: { bronze: number; silver: number; gold: number }
}

export interface ScoringResult {
  tier: CertTier | null
  mandatoryPassed: number
  mandatoryTotal: number
  silverPassed: number
  silverTotal: number
  goldPassed: number
  goldTotal: number
  eligible: boolean
  reason: string
}
