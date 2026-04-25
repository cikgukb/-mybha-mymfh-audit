/**
 * MFHC Scoring Engine — pure function, no DB calls.
 *
 * Inputs: applicable parameters (filtered by hotel type), responses, hotel type.
 * Outputs: total score, section scores, critical-fail status, certification result.
 *
 * Rules:
 *  - Item score = weight × multiplier(level). Multipliers: full=1.0, partial=0.5, non=0.0, na=0.0.
 *  - Recommended items (weight=0) contribute 0 points but are still rendered.
 *  - If ANY parameter with is_critical=true has level='non' → result = 'rejected'.
 *  - Tier from total_score: <60 not_certified, 60–74 three_star, 75–89 four_star, 90–100 five_star.
 */

import {
  MFHCParameter,
  MFHCResponse,
  MFHCEvaluation,
  MFHCLevel,
  MFHCResult,
  HotelType,
  MFHC_LEVEL_MULTIPLIER,
  MFHC_TIER_THRESHOLDS,
} from '@/types/mfhc'

export function filterApplicableParameters(
  parameters: MFHCParameter[],
  hotelType: HotelType,
): MFHCParameter[] {
  return parameters.filter(
    (p) =>
      p.is_active &&
      (p.applies_to === 'both' ||
        (hotelType === 'type_a' && p.applies_to === 'type_a') ||
        (hotelType === 'type_b' && p.applies_to === 'type_b')),
  )
}

export function evaluateMFHC(
  parameters: MFHCParameter[],
  responses: MFHCResponse[],
  hotelType: HotelType,
): MFHCEvaluation {
  const applicable = filterApplicableParameters(parameters, hotelType)
  const responseMap = new Map<string, MFHCResponse>(
    responses.map((r) => [r.parameter_id, r]),
  )

  const sectionScores: Record<number, { earned: number; total: number }> = {}
  const failedCritical: string[] = []
  const items: MFHCEvaluation['items'] = []

  let totalScore = 0
  let totalPossible = 0

  for (const param of applicable) {
    const response = responseMap.get(param.id)
    const level: MFHCLevel | null = response?.compliance_level ?? null
    const multiplier = level ? MFHC_LEVEL_MULTIPLIER[level] : 0
    const score = Number((param.weight * multiplier).toFixed(2))

    // Section aggregation (only weighted items count toward section totals)
    if (!sectionScores[param.section_no]) {
      sectionScores[param.section_no] = { earned: 0, total: 0 }
    }
    sectionScores[param.section_no].earned += score
    sectionScores[param.section_no].total += param.weight

    totalScore += score
    totalPossible += param.weight

    // Critical-fail gating
    if (param.is_critical && level === 'non') {
      failedCritical.push(param.code)
    }

    items.push({
      code: param.code,
      title: param.title_en,
      weight: param.weight,
      multiplier,
      score,
      level,
      is_critical: param.is_critical,
    })
  }

  // Round to 2 decimals
  totalScore = Number(totalScore.toFixed(2))
  totalPossible = Number(totalPossible.toFixed(2))
  for (const s of Object.values(sectionScores)) {
    s.earned = Number(s.earned.toFixed(2))
    s.total = Number(s.total.toFixed(2))
  }

  const criticalFailed = failedCritical.length > 0
  const result = determineResult(totalScore, criticalFailed)
  const reason = buildReason(result, totalScore, failedCritical)

  return {
    result,
    total_score: totalScore,
    total_possible: totalPossible,
    section_scores: sectionScores,
    critical_failed: criticalFailed,
    failed_critical_items: failedCritical,
    hotel_type: hotelType,
    reason,
    items,
  }
}

function determineResult(totalScore: number, criticalFailed: boolean): MFHCResult {
  if (criticalFailed) return 'rejected'
  if (totalScore >= MFHC_TIER_THRESHOLDS.five_star) return 'five_star'
  if (totalScore >= MFHC_TIER_THRESHOLDS.four_star) return 'four_star'
  if (totalScore >= MFHC_TIER_THRESHOLDS.three_star) return 'three_star'
  return 'not_certified'
}

function buildReason(result: MFHCResult, score: number, failed: string[]): string {
  switch (result) {
    case 'rejected':
      return `Auto-rejected: critical compliance failed (${failed.join(', ')})`
    case 'five_star':
      return `5-Star Premium Muslim-Friendly: score ${score}/100`
    case 'four_star':
      return `4-Star Enhanced Muslim-Friendly: score ${score}/100`
    case 'three_star':
      return `3-Star Basic Muslim-Friendly: score ${score}/100`
    case 'not_certified':
      return `Not certified: score ${score}/100 (minimum 60 required)`
    default:
      return 'Pending evaluation'
  }
}

export function tierLabel(result: MFHCResult, locale: 'en' | 'ms' = 'en'): string {
  const map = {
    en: {
      five_star: '5-Star Premium',
      four_star: '4-Star Enhanced',
      three_star: '3-Star Basic',
      not_certified: 'Not Certified',
      rejected: 'Rejected',
      pending: 'Pending',
    },
    ms: {
      five_star: '5 Bintang Premium',
      four_star: '4 Bintang Tinggi',
      three_star: '3 Bintang Asas',
      not_certified: 'Tidak Disahkan',
      rejected: 'Ditolak',
      pending: 'Belum Selesai',
    },
  }
  return map[locale][result]
}

export function tierStars(result: MFHCResult): number {
  switch (result) {
    case 'five_star':
      return 5
    case 'four_star':
      return 4
    case 'three_star':
      return 3
    default:
      return 0
  }
}
