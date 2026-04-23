import type { AuditResponse, ChecklistItem, ScoringResult, CertTier } from '@/types'

const SILVER_THRESHOLD = 5  // out of 8
const GOLD_SILVER_THRESHOLD = 6  // out of 8
const GOLD_GOLD_THRESHOLD = 7   // out of 10

export function calculateScore(
  responses: (AuditResponse & { checklist_items: ChecklistItem })[],
): ScoringResult {
  const mandatory = responses.filter(r => r.checklist_items.tier === 'mandatory')
  const silver = responses.filter(r => r.checklist_items.tier === 'silver')
  const gold = responses.filter(r => r.checklist_items.tier === 'gold')

  const mandatoryPassed = mandatory.filter(r => r.passed === true).length
  const mandatoryTotal = mandatory.length
  const silverPassed = silver.filter(r => r.passed === true).length
  const silverTotal = silver.length
  const goldPassed = gold.filter(r => r.passed === true).length
  const goldTotal = gold.length

  const allMandatoryPass = mandatoryPassed === mandatoryTotal && mandatoryTotal === 14

  if (!allMandatoryPass) {
    return {
      tier: null,
      mandatoryPassed,
      mandatoryTotal,
      silverPassed,
      silverTotal,
      goldPassed,
      goldTotal,
      eligible: false,
      reason: `Mandatory requirements not met (${mandatoryPassed}/${mandatoryTotal})`,
    }
  }

  let tier: CertTier = 'bronze'

  if (
    silverPassed >= GOLD_SILVER_THRESHOLD &&
    goldPassed >= GOLD_GOLD_THRESHOLD
  ) {
    tier = 'gold'
  } else if (silverPassed >= SILVER_THRESHOLD) {
    tier = 'silver'
  }

  return {
    tier,
    mandatoryPassed,
    mandatoryTotal,
    silverPassed,
    silverTotal,
    goldPassed,
    goldTotal,
    eligible: true,
    reason: getTierReason(tier, silverPassed, silverTotal, goldPassed, goldTotal),
  }
}

function getTierReason(
  tier: CertTier,
  silverPassed: number,
  silverTotal: number,
  goldPassed: number,
  goldTotal: number
): string {
  if (tier === 'gold') {
    return `Gold tier: all mandatory + ${silverPassed}/${silverTotal} silver + ${goldPassed}/${goldTotal} gold`
  }
  if (tier === 'silver') {
    return `Silver tier: all mandatory + ${silverPassed}/${silverTotal} silver bonus`
  }
  return `Bronze tier: all mandatory requirements passed`
}

export function getTierColor(tier: CertTier | null): string {
  switch (tier) {
    case 'gold': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'silver': return 'text-slate-600 bg-slate-50 border-slate-200'
    case 'bronze': return 'text-amber-700 bg-amber-50 border-amber-200'
    default: return 'text-gray-500 bg-gray-50 border-gray-200'
  }
}

export function getTierStars(tier: CertTier | null): number {
  switch (tier) {
    case 'gold': return 5
    case 'silver': return 4
    case 'bronze': return 3
    default: return 0
  }
}

export function getProgressToNextTier(
  tier: CertTier | null,
  silverPassed: number,
  goldPassed: number
): { label: string; current: number; required: number } | null {
  if (tier === 'bronze') {
    return { label: 'Silver', current: silverPassed, required: SILVER_THRESHOLD }
  }
  if (tier === 'silver') {
    return { label: 'Gold', current: goldPassed, required: GOLD_GOLD_THRESHOLD }
  }
  return null
}
