// MFHC questionnaire engine types

export type HotelType = 'type_a' | 'type_b'
export type MFHCLevel = 'full' | 'partial' | 'non' | 'na'
export type MFHCComplianceClass = 'mandatory_critical' | 'mandatory' | 'recommended'
export type MFHCApplies = 'both' | 'type_a' | 'type_b'
export type MFHCResult =
  | 'pending'
  | 'rejected'
  | 'not_certified'
  | 'three_star'
  | 'four_star'
  | 'five_star'

export interface MFHCParameter {
  id: string
  code: string
  section_no: number
  section_title_en: string
  section_title_ms: string
  title_en: string
  title_ms: string
  description_en: string | null
  description_ms: string | null
  weight: number
  applies_to: MFHCApplies
  compliance_class: MFHCComplianceClass
  is_critical: boolean
  evidence_required: string | null
  sort_order: number
  is_active: boolean
}

export interface MFHCResponse {
  parameter_id: string
  compliance_level: MFHCLevel | null
  notes?: string | null
  evidence_urls?: string[]
}

export interface MFHCSectionScore {
  section_no: number
  section_title: string
  earned: number
  total: number
}

export interface MFHCEvaluation {
  result: MFHCResult
  total_score: number
  total_possible: number
  section_scores: Record<number, { earned: number; total: number }>
  critical_failed: boolean
  failed_critical_items: string[]
  hotel_type: HotelType
  reason: string
  // Per-item breakdown for report
  items: Array<{
    code: string
    title: string
    weight: number
    multiplier: number
    score: number
    level: MFHCLevel | null
    is_critical: boolean
  }>
}

// Scoring constants
export const MFHC_LEVEL_MULTIPLIER: Record<MFHCLevel, number> = {
  full: 1.0,
  partial: 0.5,
  non: 0.0,
  na: 0.0,
}

export const MFHC_TIER_THRESHOLDS = {
  three_star: 60,
  four_star: 75,
  five_star: 90,
} as const
