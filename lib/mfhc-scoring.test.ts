// Run with: npx tsx lib/mfhc-scoring.test.ts
// (or jest/vitest if installed)

import { evaluateMFHC } from './mfhc-scoring'
import { MFHCParameter, MFHCResponse } from '../types/mfhc'

// ─── Fixture: full MFHC parameter set (mirrors migration 002 seed) ───
const PARAMS: MFHCParameter[] = [
  // Sec 1
  p('1.1', 1, 5, 'both', 'mandatory', false),
  p('1.2', 1, 5, 'both', 'mandatory', false),
  p('1.3', 1, 5, 'both', 'mandatory', false),
  p('1.4', 1, 5, 'both', 'mandatory', false),
  // Sec 2
  p('2.1', 2, 5, 'both', 'mandatory', false),
  // Sec 3 Type A
  p('3.1.1', 3, 15, 'type_a', 'mandatory_critical', true),
  p('3.1.2', 3, 5, 'type_a', 'mandatory', false),
  p('3.1.3', 3, 5, 'type_a', 'mandatory', false),
  // Sec 3 Type B
  p('3.2.1', 3, 15, 'type_b', 'mandatory_critical', true),
  p('3.2.2', 3, 5, 'type_b', 'mandatory_critical', true),
  p('3.2.3', 3, 5, 'type_b', 'mandatory_critical', true),
  // Sec 4
  p('4.1', 4, 10, 'both', 'mandatory', false),
  // Sec 5
  p('5.1', 5, 5, 'both', 'mandatory_critical', true),
  p('5.2', 5, 5, 'both', 'mandatory_critical', true),
  p('5.3', 5, 5, 'both', 'mandatory_critical', true),
  // Sec 6
  p('6.1', 6, 10, 'both', 'mandatory', false),
  // Sec 7
  p('7.1', 7, 2, 'both', 'mandatory', false),
  p('7.2', 7, 3, 'both', 'mandatory', false),
  // Sec 8
  p('8.1', 8, 3, 'both', 'mandatory', false),
  p('8.2', 8, 4, 'both', 'mandatory', false),
  p('8.3', 8, 3, 'both', 'mandatory', false),
  p('8.4', 8, 0, 'both', 'recommended', false),
  p('8.5', 8, 0, 'both', 'recommended', false),
  p('8.6', 8, 0, 'both', 'recommended', false),
]

function p(
  code: string,
  section: number,
  weight: number,
  applies: 'both' | 'type_a' | 'type_b',
  cls: 'mandatory_critical' | 'mandatory' | 'recommended',
  critical: boolean,
): MFHCParameter {
  return {
    id: `id-${code}`,
    code,
    section_no: section,
    section_title_en: `Section ${section}`,
    section_title_ms: `Seksyen ${section}`,
    title_en: `Item ${code}`,
    title_ms: `Item ${code}`,
    description_en: null,
    description_ms: null,
    weight,
    applies_to: applies,
    compliance_class: cls,
    is_critical: critical,
    evidence_required: null,
    sort_order: 0,
    is_active: true,
  }
}

function respondAll(
  params: MFHCParameter[],
  level: 'full' | 'partial' | 'non',
): MFHCResponse[] {
  return params.map((param) => ({
    parameter_id: param.id,
    compliance_level: level,
  }))
}

// ─── TEST A: Type B hotel, all Full Compliance ───
console.log('\n━━━ TEST A: Type B, all Full ━━━')
{
  const applicable = PARAMS.filter(
    (p) => p.applies_to === 'both' || p.applies_to === 'type_b',
  )
  const responses = respondAll(applicable, 'full')
  const result = evaluateMFHC(PARAMS, responses, 'type_b')
  console.log('Result:', result.result)
  console.log('Total score:', result.total_score, '/', result.total_possible)
  console.log('Critical failed:', result.critical_failed)
  console.log('Section scores:', result.section_scores)
  console.log('Reason:', result.reason)

  const ok =
    result.result === 'five_star' &&
    result.total_score === 100 &&
    result.critical_failed === false
  console.log(ok ? '✓ PASS' : '✗ FAIL')
}

// ─── TEST B: Type A hotel, alcohol policy = Non-Compliant → REJECTED ───
console.log('\n━━━ TEST B: Type A, alcohol=non ━━━')
{
  const applicable = PARAMS.filter(
    (p) => p.applies_to === 'both' || p.applies_to === 'type_a',
  )
  // Start with all full, then mark 5.2 (alcohol) as non
  const responses = respondAll(applicable, 'full').map((r) => {
    const param = applicable.find((p) => p.id === r.parameter_id)!
    if (param.code === '5.2') return { ...r, compliance_level: 'non' as const }
    return r
  })
  const result = evaluateMFHC(PARAMS, responses, 'type_a')
  console.log('Result:', result.result)
  console.log('Total score:', result.total_score, '/', result.total_possible)
  console.log('Critical failed:', result.critical_failed)
  console.log('Failed critical items:', result.failed_critical_items)
  console.log('Reason:', result.reason)

  const ok =
    result.result === 'rejected' &&
    result.critical_failed === true &&
    result.failed_critical_items.includes('5.2')
  console.log(ok ? '✓ PASS' : '✗ FAIL')
}

// ─── TEST C: Type A, all Partial → 50% → 4-Star? Actually 50 < 60 = not_certified ───
console.log('\n━━━ TEST C: Type A, all Partial → 50pt ━━━')
{
  const applicable = PARAMS.filter(
    (p) => p.applies_to === 'both' || p.applies_to === 'type_a',
  )
  const responses = respondAll(applicable, 'partial')
  const result = evaluateMFHC(PARAMS, responses, 'type_a')
  console.log('Result:', result.result, '— Score:', result.total_score)
  console.log(result.result === 'not_certified' ? '✓ PASS' : '✗ FAIL')
}

// ─── TEST D: Type B, all Full but skip recommended sec 8.4-8.6 (na) ───
console.log('\n━━━ TEST D: Type B, full + recommended skipped ━━━')
{
  const applicable = PARAMS.filter(
    (p) => p.applies_to === 'both' || p.applies_to === 'type_b',
  )
  const responses = applicable.map((p) => ({
    parameter_id: p.id,
    compliance_level: (p.compliance_class === 'recommended' ? 'na' : 'full') as
      | 'na'
      | 'full',
  }))
  const result = evaluateMFHC(PARAMS, responses, 'type_b')
  console.log('Result:', result.result, '— Score:', result.total_score)
  console.log(result.result === 'five_star' && result.total_score === 100 ? '✓ PASS' : '✗ FAIL')
}
