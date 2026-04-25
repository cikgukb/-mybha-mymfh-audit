'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

interface Props {
  hotels: { id: string; name: string; city: string | null; hotel_type: string | null }[]
  locale: string
  auditorId: string
  role: string
  hotelId: string | null
}

export default function NewAuditForm({ hotels, locale, auditorId, role, hotelId }: Props) {
  const t = useTranslations('audits')
  const tc = useTranslations('common')
  const router = useRouter()

  const [selectedHotel, setSelectedHotel] = useState(hotelId ?? '')
  const [auditType, setAuditType] = useState<'self_audit' | 'conformity_assessment'>('self_audit')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isManager = role === 'hotel_manager'
  const canSelectHotel = !isManager

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedHotel) { setError('Select a hotel'); return }
    const hotel = hotels.find(h => h.id === selectedHotel)
    if (!hotel?.hotel_type) {
      setError('Selected hotel has no F&B classification declared. Update hotel record first.')
      return
    }
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error } = await supabase
      .from('audits')
      .insert({
        hotel_id: selectedHotel,
        auditor_id: auditorId,
        audit_type: auditType,
        status: 'draft',
        hotel_type: hotel.hotel_type,
      })
      .select('id')
      .single()

    setLoading(false)
    if (error) setError(error.message)
    else router.push(`/${locale}/audits/${data.id}`)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Hotel selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('selectHotel')} <span className="text-red-500">*</span>
          </label>
          {isManager ? (
            <p className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded-lg">
              {hotels.find(h => h.id === hotelId)?.name ?? 'Your hotel'}
            </p>
          ) : (
            <select
              value={selectedHotel}
              onChange={e => setSelectedHotel(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mybha-gold"
            >
              <option value="">— Select hotel —</option>
              {hotels.map(h => (
                <option key={h.id} value={h.id}>{h.name} {h.city ? `(${h.city})` : ''}</option>
              ))}
            </select>
          )}
        </div>

        {/* Audit type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('auditType')}</label>
          <div className="grid grid-cols-2 gap-3">
            {(['self_audit', 'conformity_assessment'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setAuditType(type)}
                disabled={type === 'conformity_assessment' && isManager}
                className={`p-3 rounded-xl border-2 text-left transition-all text-sm ${
                  auditType === type
                    ? 'border-mybha-gold bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${type === 'conformity_assessment' && isManager ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="font-medium text-gray-900">
                  {type === 'self_audit' ? t('selfAudit') : t('conformityAssessment')}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {type === 'self_audit'
                    ? 'Conducted by hotel staff'
                    : 'Conducted by MYBHA auditor'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Info box */}
        <div className="bg-mybha-cream rounded-lg p-3 text-xs text-gray-600">
          <p className="font-medium mb-1">MFHC questionnaire — 8 sections, 100 points total:</p>
          <ul className="space-y-0.5 text-gray-500">
            <li>• Sec 1 Guest Room (20) · Sec 2 Public Area (5)</li>
            <li>• Sec 3 F&B Type A or B (25) · Sec 4 Hygiene (10)</li>
            <li>• Sec 5 Premise Policy (15) · Sec 6 Staff (10)</li>
            <li>• Sec 7 Media (5) · Sec 8 Governance (10)</li>
          </ul>
          <p className="mt-2 text-gray-500">Tiers: 60–74 → 3-Star · 75–89 → 4-Star · 90–100 → 5-Star</p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 bg-mybha-gold hover:bg-mybha-gold-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? tc('loading') : 'Start Audit →'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg text-sm"
          >
            {tc('cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}
