'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { calculateScore } from '@/lib/scoring'
import { generateCertNumber, addYears } from '@/lib/utils'
import TierBadge from './TierBadge'
import type { Audit, ChecklistItem, AuditResponse, CertTier } from '@/types'

interface Props {
  audit: Audit & { hotels: any; profiles: any }
  checklistItems: ChecklistItem[]
  existingResponses: AuditResponse[]
  locale: string
  isEditable: boolean
  canApprove: boolean
  currentUserId: string
  currentRole: string
}

type ResponseMap = Record<string, { passed: boolean | null; notes: string; photo_url: string | null }>

const TIER_LABEL: Record<string, string> = {
  mandatory: 'Mandatory Requirements (Bronze)',
  silver: 'Silver Bonus',
  gold: 'Gold Bonus',
}

const TIER_ORDER = ['mandatory', 'silver', 'gold']

export default function AuditChecklist({
  audit,
  checklistItems,
  existingResponses,
  locale,
  isEditable,
  canApprove,
  currentUserId,
  currentRole,
}: Props) {
  const t = useTranslations('audits')
  const router = useRouter()
  const supabase = createClient()

  // Initialize responses from existing data
  const [responses, setResponses] = useState<ResponseMap>(() => {
    const map: ResponseMap = {}
    existingResponses.forEach(r => {
      map[r.checklist_item_id] = {
        passed: r.passed,
        notes: r.notes ?? '',
        photo_url: r.photo_url,
      }
    })
    return map
  })

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [approveLoading, setApproveLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Auto-save debounce
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)

  const triggerAutoSave = useCallback((newResponses: ResponseMap) => {
    if (!isEditable) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => saveResponses(newResponses, false), 2000)
  }, [isEditable])

  // Group items by tier then category
  const grouped = TIER_ORDER.map(tier => ({
    tier,
    items: checklistItems.filter(i => i.tier === tier),
  }))

  // Calculate score live
  const responsesWithItems = checklistItems.map(item => ({
    ...item,
    checklist_item_id: item.id,
    passed: responses[item.id]?.passed ?? null,
    notes: responses[item.id]?.notes ?? '',
    photo_url: responses[item.id]?.photo_url ?? null,
    audit_id: audit.id,
    id: item.id,
    created_at: '',
    updated_at: '',
    checklist_items: item,
  }))

  const score = calculateScore(responsesWithItems)

  // Count answered
  const answered = Object.values(responses).filter(r => r.passed !== null).length
  const total = checklistItems.length
  const progressPct = Math.round((answered / total) * 100)

  async function saveResponses(r: ResponseMap, showSuccess = true) {
    setSaving(true)
    setError('')

    const upserts = Object.entries(r).map(([itemId, resp]) => ({
      audit_id: audit.id,
      checklist_item_id: itemId,
      passed: resp.passed,
      notes: resp.notes || null,
      photo_url: resp.photo_url,
    }))

    const { error } = await supabase
      .from('audit_responses')
      .upsert(upserts, { onConflict: 'audit_id,checklist_item_id' })

    // Update audit status to in_progress and scores
    if (!error) {
      const scoreData = calculateScore(responsesWithItems)
      await supabase
        .from('audits')
        .update({
          status: 'in_progress',
          tier: scoreData.tier,
          mandatory_passed: scoreData.mandatoryPassed,
          mandatory_total: scoreData.mandatoryTotal,
          silver_passed: scoreData.silverPassed,
          silver_total: scoreData.silverTotal,
          gold_passed: scoreData.goldPassed,
          gold_total: scoreData.goldTotal,
        })
        .eq('id', audit.id)
    }

    setSaving(false)
    if (error) setError(error.message)
    else if (showSuccess) setSuccess('Progress saved')
  }

  async function handleSubmit() {
    setSubmitLoading(true)
    setError('')
    await saveResponses(responses, false)

    const { error } = await supabase
      .from('audits')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', audit.id)

    setSubmitLoading(false)
    if (error) setError(error.message)
    else {
      router.push(`/${locale}/audits`)
      router.refresh()
    }
  }

  async function handleApprove() {
    if (!score.eligible || !score.tier) {
      setError('Cannot approve: audit does not meet minimum requirements')
      return
    }
    setApproveLoading(true)
    setError('')

    const certNumber = generateCertNumber(score.tier)
    const issuedDate = new Date()
    const expiryDate = addYears(issuedDate, 2)

    const { error: certError } = await supabase.from('certificates').insert({
      cert_number: certNumber,
      hotel_id: audit.hotel_id,
      audit_id: audit.id,
      tier: score.tier as CertTier,
      issued_date: issuedDate.toISOString().split('T')[0],
      expiry_date: expiryDate.toISOString().split('T')[0],
      issued_by: currentUserId,
    })

    if (!certError) {
      await supabase
        .from('audits')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: currentUserId,
          tier: score.tier,
        })
        .eq('id', audit.id)
    }

    setApproveLoading(false)
    if (certError) setError(certError.message)
    else {
      router.push(`/${locale}/certificates`)
      router.refresh()
    }
  }

  async function handlePhotoUpload(itemId: string, file: File) {
    setUploading(itemId)
    const path = `${audit.id}/${itemId}-${Date.now()}.${file.name.split('.').pop()}`
    const { data, error } = await supabase.storage.from('audit-photos').upload(path, file)

    if (error) {
      setError(error.message)
    } else {
      const { data: url } = supabase.storage.from('audit-photos').getPublicUrl(data.path)
      const updated = {
        ...responses,
        [itemId]: { ...responses[itemId], photo_url: url.publicUrl },
      }
      setResponses(updated)
      triggerAutoSave(updated)
    }
    setUploading(null)
  }

  function setResponse(itemId: string, passed: boolean | null) {
    const updated = {
      ...responses,
      [itemId]: { ...(responses[itemId] ?? { notes: '', photo_url: null }), passed },
    }
    setResponses(updated)
    triggerAutoSave(updated)
  }

  function setNotes(itemId: string, notes: string) {
    const updated = {
      ...responses,
      [itemId]: { ...(responses[itemId] ?? { passed: null, photo_url: null }), notes },
    }
    setResponses(updated)
    triggerAutoSave(updated)
  }

  const labelKey = locale === 'ms' ? 'label_ms' : locale === 'ar' ? 'label_ar' : 'label_en'
  const descKey = locale === 'ms' ? 'description_ms' : locale === 'ar' ? 'description_ar' : 'description_en'

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <button onClick={() => router.back()} className="hover:text-gray-600">← Audits</button>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{(audit as any).hotels?.name}</h1>
          <p className="text-sm text-gray-500 capitalize">
            {audit.audit_type === 'self_audit' ? t('selfAudit') : t('conformityAssessment')}
            {' · '}
            {(audit as any).profiles?.full_name}
          </p>
        </div>
        {audit.tier && <TierBadge tier={audit.tier} size="md" />}
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="font-medium text-gray-700">{t('progress')}</span>
          <span className="text-gray-500">{answered}/{total} answered ({progressPct}%)</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-mybha-gold h-2 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Score preview */}
        <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
          <div className="text-center p-2 bg-red-50 rounded-lg">
            <div className="font-bold text-red-700">{score.mandatoryPassed}/{score.mandatoryTotal}</div>
            <div className="text-red-500">Mandatory</div>
          </div>
          <div className="text-center p-2 bg-slate-50 rounded-lg">
            <div className="font-bold text-slate-700">{score.silverPassed}/{score.silverTotal}</div>
            <div className="text-slate-500">Silver Bonus</div>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded-lg">
            <div className="font-bold text-yellow-700">{score.goldPassed}/{score.goldTotal}</div>
            <div className="text-yellow-500">Gold Bonus</div>
          </div>
        </div>

        {score.eligible && score.tier && (
          <div className="mt-3 flex items-center justify-center gap-2 p-2 bg-green-50 rounded-lg">
            <span className="text-green-600 text-xs font-medium">Eligible for:</span>
            <TierBadge tier={score.tier} size="sm" />
          </div>
        )}
        {!score.eligible && answered > 0 && (
          <div className="mt-3 p-2 bg-red-50 rounded-lg text-xs text-red-600 text-center">
            {score.reason}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success} {saving && '(auto-saving...)'}
        </div>
      )}

      {/* Checklist groups */}
      {grouped.map(({ tier, items }) => {
        if (items.length === 0) return null
        const categoryGroups = items.reduce((acc, item) => {
          if (!acc[item.category]) acc[item.category] = []
          acc[item.category].push(item)
          return acc
        }, {} as Record<string, ChecklistItem[]>)

        return (
          <div key={tier} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className={`px-5 py-3 border-b ${
              tier === 'mandatory' ? 'bg-red-50 border-red-100' :
              tier === 'silver' ? 'bg-slate-50 border-slate-100' : 'bg-yellow-50 border-yellow-100'
            }`}>
              <h2 className={`font-semibold text-sm ${
                tier === 'mandatory' ? 'text-red-800' :
                tier === 'silver' ? 'text-slate-700' : 'text-yellow-800'
              }`}>
                {TIER_LABEL[tier]}
                {tier !== 'mandatory' && (
                  <span className="font-normal text-gray-500 ml-2">
                    ({items.filter(i => responses[i.id]?.passed === true).length}/{items.length} passed)
                  </span>
                )}
              </h2>
            </div>

            <div className="divide-y divide-gray-50">
              {Object.entries(categoryGroups).map(([category, catItems]) => (
                <div key={category}>
                  <div className="px-5 py-2 bg-gray-50/50">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{category}</p>
                  </div>
                  {catItems.map(item => {
                    const resp = responses[item.id]
                    const label = (item as any)[labelKey] ?? item.label_en
                    const desc = (item as any)[descKey] ?? item.description_en

                    return (
                      <div key={item.id} className="px-5 py-4">
                        <div className="flex items-start gap-4">
                          {/* Item code */}
                          <span className="text-xs font-mono text-gray-300 mt-0.5 w-8 shrink-0">{item.code}</span>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 mb-0.5">{label}</p>
                            {desc && <p className="text-xs text-gray-400 mb-3">{desc}</p>}

                            {isEditable && (
                              <div className="space-y-2">
                                {/* Pass/Fail buttons */}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setResponse(item.id, true)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                      resp?.passed === true
                                        ? 'bg-green-500 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700'
                                    }`}
                                  >
                                    ✓ {t('pass')}
                                  </button>
                                  <button
                                    onClick={() => setResponse(item.id, false)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                      resp?.passed === false
                                        ? 'bg-red-500 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700'
                                    }`}
                                  >
                                    ✗ {t('fail')}
                                  </button>
                                  {resp?.passed !== null && (
                                    <button
                                      onClick={() => setResponse(item.id, null)}
                                      className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-gray-100"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>

                                {/* Notes */}
                                <input
                                  type="text"
                                  placeholder={t('notes') + '...'}
                                  value={resp?.notes ?? ''}
                                  onChange={e => setNotes(item.id, e.target.value)}
                                  className="w-full text-xs px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-mybha-gold"
                                />

                                {/* Photo upload */}
                                <div className="flex items-center gap-2">
                                  <label className="cursor-pointer flex items-center gap-1.5 text-xs text-mybha-gold hover:text-mybha-gold-dark font-medium">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      disabled={uploading === item.id}
                                      onChange={e => {
                                        const f = e.target.files?.[0]
                                        if (f) handlePhotoUpload(item.id, f)
                                      }}
                                    />
                                    {uploading === item.id ? '⏳ Uploading...' : resp?.photo_url ? '📷 ' + t('changePhoto') : '📷 ' + t('uploadPhoto')}
                                  </label>
                                  {resp?.photo_url && (
                                    <a
                                      href={resp.photo_url}
                                      target="_blank"
                                      className="text-xs text-gray-400 hover:text-gray-600 underline"
                                    >
                                      View
                                    </a>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Read-only view */}
                            {!isEditable && (
                              <div className="flex items-center gap-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  resp?.passed === true ? 'bg-green-50 text-green-700' :
                                  resp?.passed === false ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'
                                }`}>
                                  {resp?.passed === true ? '✓ Pass' : resp?.passed === false ? '✗ Fail' : '— Not answered'}
                                </span>
                                {resp?.notes && <span className="text-xs text-gray-500">{resp.notes}</span>}
                                {resp?.photo_url && (
                                  <a href={resp.photo_url} target="_blank" className="text-xs text-mybha-gold underline">Photo</a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Actions */}
      {isEditable && (
        <div className="flex gap-3 pb-8">
          <button
            onClick={() => saveResponses(responses)}
            disabled={saving}
            className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : t('save')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitLoading || answered < 14}
            className="px-5 py-2 bg-mybha-gold hover:bg-mybha-gold-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {submitLoading ? 'Submitting...' : t('submit')}
          </button>
        </div>
      )}

      {canApprove && (
        <div className="flex gap-3 pb-8">
          <button
            onClick={handleApprove}
            disabled={approveLoading || !score.eligible}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {approveLoading ? 'Issuing cert...' : t('approve')}
          </button>
          {!score.eligible && (
            <p className="text-sm text-red-500 self-center">{score.reason}</p>
          )}
        </div>
      )}
    </div>
  )
}
