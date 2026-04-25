'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

export default function NewHotelPage() {
  const t = useTranslations('hotels')
  const tc = useTranslations('common')
  const router = useRouter()
  const { locale } = useParams()

  const [form, setForm] = useState({
    name: '', address: '', city: '', state: '', country: 'Malaysia',
    phone: '', email: '', pic_name: '', mybha_member_id: '', total_rooms: '',
    hotel_type: '' as '' | 'type_a' | 'type_b',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    if (!form.hotel_type) {
      setError('Please declare hotel F&B classification (Type A or Type B)')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('hotels').insert({
      ...form,
      hotel_type: form.hotel_type,
      total_rooms: form.total_rooms ? parseInt(form.total_rooms) : null,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push(`/${locale}/hotels`)
    }
  }

  const fields = [
    { key: 'name', label: t('name'), required: true },
    { key: 'address', label: t('address'), required: false },
    { key: 'city', label: t('city'), required: false },
    { key: 'state', label: t('state'), required: false },
    { key: 'country', label: t('country'), required: true },
    { key: 'phone', label: t('phone'), required: false },
    { key: 'email', label: t('email'), required: false, type: 'email' },
    { key: 'pic_name', label: t('pic'), required: false },
    { key: 'mybha_member_id', label: t('memberId'), required: false },
    { key: 'total_rooms', label: t('rooms'), required: false, type: 'number' },
  ]

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">←</button>
        <h1 className="text-2xl font-bold text-gray-900">{t('add')}</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Hotel type — MFHC mandatory declaration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              F&B Classification <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: 'type_a', label: 'Type A — Without In-house F&B', desc: 'No kitchen / food sourced externally' },
                { value: 'type_b', label: 'Type B — With In-house F&B', desc: 'Restaurant / café / kitchen / minibar' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, hotel_type: opt.value }))}
                  className={`p-3 rounded-xl border-2 text-left transition-all text-sm ${
                    form.hotel_type === opt.value
                      ? 'border-mybha-gold bg-yellow-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map(f => (
              <div key={f.key} className={f.key === 'name' || f.key === 'address' ? 'md:col-span-2' : ''}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={f.type ?? 'text'}
                  required={f.required}
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mybha-gold"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-mybha-gold hover:bg-mybha-gold-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              {loading ? tc('loading') : t('save')}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-sm"
            >
              {tc('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
