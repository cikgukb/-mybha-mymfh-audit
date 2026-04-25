'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import {
  evaluateMFHC,
  filterApplicableParameters,
  tierLabel,
  tierStars,
} from '@/lib/mfhc-scoring'
import { generateCertNumber, addYears } from '@/lib/utils'
import type {
  MFHCParameter,
  MFHCResponse,
  MFHCLevel,
  HotelType,
  MFHCResult,
} from '@/types/mfhc'

interface AuditRecord {
  id: string
  hotel_id: string
  hotel_type: HotelType | null
  status: string
  total_score: number | null
  mfhc_result: MFHCResult | null
  hotels?: { id: string; name: string; hotel_type: HotelType | null }
  profiles?: { full_name: string }
}

interface ResponseRow {
  id: string
  audit_id: string
  parameter_id: string | null
  compliance_level: MFHCLevel | null
  notes: string | null
  photo_url: string | null
}

interface Props {
  audit: AuditRecord
  parameters: MFHCParameter[]
  existingResponses: ResponseRow[]
  isEditable: boolean
  canApprove: boolean
  currentUserId: string
}

type ResponseMap = Record<
  string,
  { level: MFHCLevel | null; notes: string; photo_url: string | null }
>

const LEVEL_OPTIONS: { level: MFHCLevel; label_en: string; label_ms: string; color: string }[] = [
  { level: 'full', label_en: 'Full Compliance', label_ms: 'Patuh Penuh', color: 'green' },
  { level: 'partial', label_en: 'Partial', label_ms: 'Separa', color: 'amber' },
  { level: 'non', label_en: 'Non-Compliant', label_ms: 'Tidak Patuh', color: 'red' },
  { level: 'na', label_en: 'N/A', label_ms: 'Tidak Berkenaan', color: 'gray' },
]

export default function MFHCQuestionnaire({
  audit,
  parameters,
  existingResponses,
  isEditable,
  canApprove,
  currentUserId,
}: Props) {
  const locale = useLocale()
  const isMS = locale === 'ms'
  const router = useRouter()
  const supabase = createClient()

  const hotelType: HotelType = (audit.hotel_type ?? audit.hotels?.hotel_type ?? 'type_a') as HotelType

  // Filter parameters by hotel type
  const applicable = useMemo(
    () => filterApplicableParameters(parameters, hotelType),
    [parameters, hotelType],
  )

  // Group by section
  const sections = useMemo(() => {
    const map = new Map<number, { title: string; items: MFHCParameter[] }>()
    for (const p of applicable) {
      const key = p.section_no
      const title = isMS ? p.section_title_ms : p.section_title_en
      if (!map.has(key)) map.set(key, { title, items: [] })
      map.get(key)!.items.push(p)
    }
    map.forEach((s) => s.items.sort((a, b) => a.sort_order - b.sort_order))
    return Array.from(map.entries()).sort(([a]: [number, unknown], [b]: [number, unknown]) => a - b)
  }, [applicable, isMS])

  // Initialize responses
  const [responses, setResponses] = useState<ResponseMap>(() => {
    const map: ResponseMap = {}
    for (const r of existingResponses) {
      if (!r.parameter_id) continue
      map[r.parameter_id] = {
        level: r.compliance_level,
        notes: r.notes ?? '',
        photo_url: r.photo_url,
      }
    }
    return map
  })

  const [currentSection, setCurrentSection] = useState(0)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [approveLoading, setApproveLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)

  // Live evaluation
  const evaluation = useMemo(() => {
    const respList: MFHCResponse[] = applicable.map((p) => ({
      parameter_id: p.id,
      compliance_level: responses[p.id]?.level ?? null,
    }))
    return evaluateMFHC(parameters, respList, hotelType)
  }, [applicable, parameters, responses, hotelType])

  const answered = applicable.filter((p) => responses[p.id]?.level != null).length
  const total = applicable.length
  const progressPct = total === 0 ? 0 : Math.round((answered / total) * 100)

  const triggerAutoSave = useCallback(
    (newResponses: ResponseMap) => {
      if (!isEditable) return
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      autoSaveTimer.current = setTimeout(() => saveResponses(newResponses, false), 1500)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isEditable],
  )

  async function saveResponses(r: ResponseMap, showSuccess = true) {
    setSaving(true)
    setError('')

    const upserts = Object.entries(r)
      .filter(([paramId]) => applicable.some((p) => p.id === paramId))
      .map(([paramId, resp]) => {
        const param = applicable.find((p) => p.id === paramId)!
        const multiplier = resp.level
          ? { full: 1, partial: 0.5, non: 0, na: 0 }[resp.level]
          : 0
        return {
          audit_id: audit.id,
          parameter_id: paramId,
          compliance_level: resp.level,
          notes: resp.notes || null,
          photo_url: resp.photo_url,
          item_score: Number((param.weight * multiplier).toFixed(2)),
        }
      })

    if (upserts.length > 0) {
      const { error: respErr } = await supabase
        .from('audit_responses')
        .upsert(upserts, { onConflict: 'audit_id,parameter_id' })

      if (respErr) {
        setSaving(false)
        setError(respErr.message)
        return
      }
    }

    // Update audit with live score snapshot
    const sectionScoresJson: Record<string, number> = {}
    for (const [sno, score] of Object.entries(evaluation.section_scores)) {
      sectionScoresJson[sno] = score.earned
    }

    const { error: auditErr } = await supabase
      .from('audits')
      .update({
        status: audit.status === 'draft' ? 'in_progress' : audit.status,
        hotel_type: hotelType,
        total_score: evaluation.total_score,
        section_scores: sectionScoresJson,
        critical_failed: evaluation.critical_failed,
        failed_critical_items: evaluation.failed_critical_items,
        mfhc_result: evaluation.result,
      })
      .eq('id', audit.id)

    setSaving(false)
    if (auditErr) setError(auditErr.message)
    else if (showSuccess) {
      setSuccess(isMS ? 'Kemajuan disimpan' : 'Progress saved')
      setTimeout(() => setSuccess(''), 2000)
    }
  }

  function setLevel(paramId: string, level: MFHCLevel | null) {
    const updated = {
      ...responses,
      [paramId]: {
        ...(responses[paramId] ?? { notes: '', photo_url: null }),
        level,
      },
    }
    setResponses(updated)
    triggerAutoSave(updated)
  }

  function setNotes(paramId: string, notes: string) {
    const updated = {
      ...responses,
      [paramId]: {
        ...(responses[paramId] ?? { level: null, photo_url: null }),
        notes,
      },
    }
    setResponses(updated)
    triggerAutoSave(updated)
  }

  async function handleEvidenceUpload(paramId: string, file: File) {
    setUploading(paramId)
    const path = `${audit.id}/${paramId}-${Date.now()}.${file.name.split('.').pop()}`
    const { data, error: upErr } = await supabase.storage
      .from('audit-evidence')
      .upload(path, file)

    if (upErr) {
      setError(upErr.message)
    } else {
      const { data: url } = supabase.storage.from('audit-evidence').getPublicUrl(data.path)
      const updated = {
        ...responses,
        [paramId]: {
          ...(responses[paramId] ?? { level: null, notes: '' }),
          photo_url: url.publicUrl,
        },
      }
      setResponses(updated)
      triggerAutoSave(updated)
    }
    setUploading(null)
  }

  async function handleSubmit() {
    if (answered < total) {
      setError(
        isMS
          ? `Sila lengkapkan semua item (${answered}/${total})`
          : `Please complete all items (${answered}/${total})`,
      )
      return
    }
    setSubmitLoading(true)
    setError('')
    await saveResponses(responses, false)

    const { error: subErr } = await supabase
      .from('audits')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', audit.id)

    setSubmitLoading(false)
    if (subErr) setError(subErr.message)
    else router.push(`/${locale}/audits/${audit.id}/report`)
  }

  async function handleApprove() {
    if (evaluation.result === 'rejected' || evaluation.result === 'not_certified') {
      setError(evaluation.reason)
      return
    }
    setApproveLoading(true)
    setError('')

    const certNumber = generateCertNumber(evaluation.result)
    const issued = new Date()
    const expiry = addYears(issued, 1) // 1 year validity

    const { error: certErr } = await supabase.from('certificates').insert({
      cert_number: certNumber,
      hotel_id: audit.hotel_id,
      audit_id: audit.id,
      tier: evaluation.result, // three_star/four_star/five_star
      issued_date: issued.toISOString().split('T')[0],
      expiry_date: expiry.toISOString().split('T')[0],
      issued_by: currentUserId,
    })

    if (!certErr) {
      await supabase
        .from('audits')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: currentUserId,
        })
        .eq('id', audit.id)
    }

    setApproveLoading(false)
    if (certErr) setError(certErr.message)
    else router.push(`/${locale}/certificates`)
  }

  const T = isMS ? TXT.ms : TXT.en

  return (
    <div className="max-w-5xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600 mb-1">
            ← {T.back}
          </button>
          <h1 className="text-xl font-bold text-gray-900">{audit.hotels?.name}</h1>
          <p className="text-sm text-gray-500">
            {hotelType === 'type_a' ? T.typeA : T.typeB} · {audit.profiles?.full_name}
          </p>
        </div>
        <ResultBadge result={evaluation.result} score={evaluation.total_score} isMS={isMS} />
      </div>

      {/* Score panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="font-medium text-gray-700">{T.progress}</span>
          <span className="text-gray-500">
            {answered}/{total} ({progressPct}%)
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="bg-mybha-gold h-2 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
          <div className="p-2 bg-gray-50 rounded-lg">
            <div className="font-bold text-gray-900 text-base">{evaluation.total_score}</div>
            <div className="text-gray-500">{T.totalScore}</div>
          </div>
          <div className="p-2 bg-gray-50 rounded-lg">
            <div className="font-bold text-gray-900 text-base">{evaluation.total_possible}</div>
            <div className="text-gray-500">{T.possible}</div>
          </div>
          <div
            className={`p-2 rounded-lg ${
              evaluation.critical_failed ? 'bg-red-50' : 'bg-green-50'
            }`}
          >
            <div className={`font-bold text-base ${evaluation.critical_failed ? 'text-red-700' : 'text-green-700'}`}>
              {evaluation.critical_failed ? T.fail : T.pass}
            </div>
            <div className="text-gray-500">{T.criticalCheck}</div>
          </div>
          <div className="p-2 bg-yellow-50 rounded-lg">
            <div className="font-bold text-yellow-700 text-base">{tierStars(evaluation.result)}★</div>
            <div className="text-gray-500">{T.projected}</div>
          </div>
        </div>

        {evaluation.critical_failed && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            ⚠ {T.criticalFailed}: {evaluation.failed_critical_items.join(', ')}
          </div>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success} {saving && '·'}
        </div>
      )}

      {/* Section tabs */}
      <div className="flex flex-wrap gap-1 bg-white rounded-xl border border-gray-200 p-1">
        {sections.map(([sno, sec], idx) => {
          const sectionParams = sec.items
          const sectionAnswered = sectionParams.filter((p) => responses[p.id]?.level != null).length
          const sectionTotal = sectionParams.length
          const isComplete = sectionAnswered === sectionTotal
          return (
            <button
              key={sno}
              onClick={() => setCurrentSection(idx)}
              className={`flex-1 min-w-0 px-2 py-2 text-xs font-medium rounded-lg transition-colors ${
                currentSection === idx
                  ? 'bg-mybha-gold text-white'
                  : isComplete
                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div>{sno}</div>
              <div className="text-[10px] opacity-80">
                {sectionAnswered}/{sectionTotal}
              </div>
            </button>
          )
        })}
      </div>

      {/* Current section */}
      {sections[currentSection] && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-3 border-b border-gray-100 bg-mybha-cream/30">
            <h2 className="font-semibold text-sm text-gray-900">
              {T.section} {sections[currentSection][0]} — {sections[currentSection][1].title}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {evaluation.section_scores[sections[currentSection][0]]?.earned ?? 0} /{' '}
              {evaluation.section_scores[sections[currentSection][0]]?.total ?? 0} {T.points}
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {sections[currentSection][1].items.map((param) => {
              const resp = responses[param.id]
              const title = isMS ? param.title_ms : param.title_en
              const desc = isMS ? param.description_ms : param.description_en
              const isRecommended = param.compliance_class === 'recommended'

              return (
                <div key={param.id} className="px-5 py-4">
                  <div className="flex items-start gap-4">
                    <span className="text-xs font-mono text-gray-300 mt-0.5 w-12 shrink-0">{param.code}</span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">{title}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          {param.is_critical && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-medium">
                              {T.critical}
                            </span>
                          )}
                          {isRecommended && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                              {T.recommended}
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-medium">
                            {param.weight} {T.pts}
                          </span>
                        </div>
                      </div>
                      {desc && <p className="text-xs text-gray-500 mb-3">{desc}</p>}

                      {isEditable && (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {LEVEL_OPTIONS.map(({ level, color, ...labels }) => {
                              const selected = resp?.level === level
                              return (
                                <button
                                  key={level}
                                  onClick={() => setLevel(param.id, level)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                    selected
                                      ? `bg-${color}-500 text-white border-${color}-500`
                                      : `bg-white text-gray-600 border-gray-200 hover:border-${color}-300 hover:text-${color}-700`
                                  }`}
                                  style={
                                    selected
                                      ? {
                                          backgroundColor:
                                            color === 'green'
                                              ? '#22c55e'
                                              : color === 'amber'
                                              ? '#f59e0b'
                                              : color === 'red'
                                              ? '#ef4444'
                                              : '#6b7280',
                                          color: 'white',
                                          borderColor: 'transparent',
                                        }
                                      : {}
                                  }
                                >
                                  {isMS ? labels.label_ms : labels.label_en}
                                </button>
                              )
                            })}
                            {resp?.level && (
                              <button
                                onClick={() => setLevel(param.id, null)}
                                className="px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600"
                              >
                                {T.clear}
                              </button>
                            )}
                          </div>

                          <input
                            type="text"
                            placeholder={T.notes}
                            value={resp?.notes ?? ''}
                            onChange={(e) => setNotes(param.id, e.target.value)}
                            className="w-full text-xs px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-mybha-gold"
                          />

                          <div className="flex items-center gap-3">
                            <label className="cursor-pointer text-xs text-mybha-gold hover:text-mybha-gold-dark font-medium">
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                disabled={uploading === param.id}
                                onChange={(e) => {
                                  const f = e.target.files?.[0]
                                  if (f) handleEvidenceUpload(param.id, f)
                                }}
                              />
                              {uploading === param.id
                                ? '⏳ ' + T.uploading
                                : resp?.photo_url
                                ? '📎 ' + T.changeEvidence
                                : '📎 ' + T.uploadEvidence}
                            </label>
                            {resp?.photo_url && (
                              <a
                                href={resp.photo_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-gray-400 hover:text-gray-600 underline"
                              >
                                {T.view}
                              </a>
                            )}
                            {param.evidence_required && (
                              <span className="text-[10px] text-gray-400">
                                {T.evidenceReq}: {param.evidence_required}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {!isEditable && (
                        <div className="flex items-center gap-2">
                          <LevelBadge level={resp?.level ?? null} isMS={isMS} />
                          {resp?.notes && <span className="text-xs text-gray-500">{resp.notes}</span>}
                          {resp?.photo_url && (
                            <a
                              href={resp.photo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-mybha-gold underline"
                            >
                              {T.evidence}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Section nav */}
          <div className="px-5 py-3 border-t border-gray-100 flex justify-between">
            <button
              onClick={() => setCurrentSection((i) => Math.max(0, i - 1))}
              disabled={currentSection === 0}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40"
            >
              ← {T.prev}
            </button>
            <button
              onClick={() => setCurrentSection((i) => Math.min(sections.length - 1, i + 1))}
              disabled={currentSection === sections.length - 1}
              className="text-sm text-mybha-gold hover:text-mybha-gold-dark disabled:opacity-40"
            >
              {T.next} →
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {isEditable && (
        <div className="flex flex-wrap gap-3 pb-8">
          <button
            onClick={() => saveResponses(responses)}
            disabled={saving}
            className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {saving ? T.saving : T.save}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitLoading || answered < total}
            className="px-5 py-2 bg-mybha-gold hover:bg-mybha-gold-dark text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {submitLoading ? T.submitting : T.submit}
          </button>
          <a
            href={`/${locale}/audits/${audit.id}/report`}
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
          >
            {T.preview}
          </a>
        </div>
      )}

      {canApprove && (
        <div className="flex gap-3 pb-8 items-center">
          <button
            onClick={handleApprove}
            disabled={
              approveLoading ||
              evaluation.result === 'rejected' ||
              evaluation.result === 'not_certified'
            }
            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {approveLoading ? T.issuing : T.approve}
          </button>
          {(evaluation.result === 'rejected' || evaluation.result === 'not_certified') && (
            <p className="text-sm text-red-600">{evaluation.reason}</p>
          )}
        </div>
      )}
    </div>
  )
}

function ResultBadge({ result, score, isMS }: { result: MFHCResult; score: number; isMS: boolean }) {
  const stars = tierStars(result)
  const label = tierLabel(result, isMS ? 'ms' : 'en')
  const color =
    result === 'rejected'
      ? 'bg-red-100 text-red-800 border-red-200'
      : result === 'not_certified'
      ? 'bg-gray-100 text-gray-700 border-gray-200'
      : result === 'five_star'
      ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
      : result === 'four_star'
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : 'bg-orange-100 text-orange-800 border-orange-300'
  return (
    <div className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${color}`}>
      <div>{label}</div>
      <div className="text-[10px] font-normal opacity-70">
        {score}/100 {stars > 0 && '· ' + '★'.repeat(stars)}
      </div>
    </div>
  )
}

function LevelBadge({ level, isMS }: { level: MFHCLevel | null; isMS: boolean }) {
  if (!level) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-400">
        {isMS ? 'Belum dijawab' : 'Not answered'}
      </span>
    )
  }
  const opt = LEVEL_OPTIONS.find((o) => o.level === level)!
  const colorMap: Record<string, string> = {
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    gray: 'bg-gray-50 text-gray-600',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorMap[opt.color]}`}>
      {isMS ? opt.label_ms : opt.label_en}
    </span>
  )
}

const TXT = {
  en: {
    back: 'Back',
    typeA: 'Type A — No In-house F&B',
    typeB: 'Type B — With In-house F&B',
    progress: 'Progress',
    section: 'Section',
    points: 'points',
    pts: 'pts',
    critical: 'CRITICAL',
    recommended: 'RECOMMENDED',
    totalScore: 'Score',
    possible: 'Possible',
    criticalCheck: 'Critical',
    pass: 'PASS',
    fail: 'FAIL',
    projected: 'Projected',
    criticalFailed: 'Critical compliance failed',
    notes: 'Notes...',
    uploadEvidence: 'Upload evidence',
    changeEvidence: 'Change evidence',
    uploading: 'Uploading...',
    view: 'View',
    evidenceReq: 'Required',
    evidence: 'Evidence',
    save: 'Save Progress',
    saving: 'Saving...',
    submit: 'Submit Audit',
    submitting: 'Submitting...',
    preview: 'Preview Report',
    approve: 'Approve & Issue Certificate',
    issuing: 'Issuing...',
    prev: 'Previous',
    next: 'Next',
    clear: 'Clear',
  },
  ms: {
    back: 'Kembali',
    typeA: 'Jenis A — Tanpa F&B Dalaman',
    typeB: 'Jenis B — Dengan F&B Dalaman',
    progress: 'Kemajuan',
    section: 'Seksyen',
    points: 'mata',
    pts: 'mata',
    critical: 'KRITIKAL',
    recommended: 'DISYORKAN',
    totalScore: 'Skor',
    possible: 'Maksimum',
    criticalCheck: 'Kritikal',
    pass: 'LULUS',
    fail: 'GAGAL',
    projected: 'Unjuran',
    criticalFailed: 'Pematuhan kritikal gagal',
    notes: 'Nota...',
    uploadEvidence: 'Muat naik bukti',
    changeEvidence: 'Tukar bukti',
    uploading: 'Memuat naik...',
    view: 'Lihat',
    evidenceReq: 'Diperlukan',
    evidence: 'Bukti',
    save: 'Simpan',
    saving: 'Menyimpan...',
    submit: 'Hantar Audit',
    submitting: 'Menghantar...',
    preview: 'Pratonton Laporan',
    approve: 'Lulus & Keluarkan Sijil',
    issuing: 'Mengeluarkan...',
    prev: 'Sebelum',
    next: 'Seterusnya',
    clear: 'Padam',
  },
}
