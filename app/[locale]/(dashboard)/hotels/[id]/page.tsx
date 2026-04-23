import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TierBadge from '@/components/TierBadge'
import { formatDate, getDaysUntilExpiry } from '@/lib/utils'

export default async function HotelDetailPage({
  params,
}: {
  params: { locale: string; id: string }
}) {
  const t = await getTranslations('hotels')
  const supabase = await createClient()

  const { data: hotel } = await supabase
    .from('hotels')
    .select(`*`)
    .eq('id', params.id)
    .single()

  if (!hotel) notFound()

  const { data: audits } = await supabase
    .from('audits')
    .select(`*, profiles(full_name)`)
    .eq('hotel_id', params.id)
    .order('created_at', { ascending: false })

  const { data: certs } = await supabase
    .from('certificates')
    .select('*')
    .eq('hotel_id', params.id)
    .order('issued_date', { ascending: false })

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-50 text-blue-600',
    submitted: 'bg-orange-50 text-orange-600',
    approved: 'bg-green-50 text-green-700',
    rejected: 'bg-red-50 text-red-600',
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${params.locale}/hotels`} className="text-gray-400 hover:text-gray-600 text-sm">← Hotels</Link>
      </div>

      {/* Hotel info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{hotel.name}</h1>
            <p className="text-gray-500 text-sm mt-1">
              {[hotel.address, hotel.city, hotel.state, hotel.country].filter(Boolean).join(', ')}
            </p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${hotel.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {hotel.is_active ? t('active') : t('inactive')}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
          {[
            [t('phone'), hotel.phone],
            [t('email'), hotel.email],
            [t('pic'), hotel.pic_name],
            [t('memberId'), hotel.mybha_member_id],
          ].map(([k, v]) => (
            <div key={k as string}>
              <p className="text-xs text-gray-400">{k}</p>
              <p className="text-sm font-medium text-gray-700">{v ?? '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Active certificate */}
      {certs && certs.filter(c => c.is_active).length > 0 && (
        <div className="bg-white rounded-xl border-2 border-mybha-gold p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Active Certificate</h2>
          {certs.filter(c => c.is_active).map(cert => {
            const days = getDaysUntilExpiry(cert.expiry_date)
            return (
              <div key={cert.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TierBadge tier={cert.tier as any} size="md" />
                  <div>
                    <p className="text-xs font-mono text-gray-500">{cert.cert_number}</p>
                    <p className="text-xs text-gray-400">Expires {formatDate(cert.expiry_date, params.locale)} ({days} days)</p>
                  </div>
                </div>
                <a
                  href={`/api/certificates/generate?id=${cert.id}&locale=${params.locale}`}
                  target="_blank"
                  className="text-xs px-3 py-1.5 bg-mybha-gold text-white rounded-lg hover:bg-mybha-gold-dark"
                >
                  Download
                </a>
              </div>
            )
          })}
        </div>
      )}

      {/* Audit history */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{t('auditHistory')}</h2>
          <Link
            href={`/${params.locale}/audits/new`}
            className="text-xs px-3 py-1.5 bg-mybha-gold text-white rounded-lg hover:bg-mybha-gold-dark"
          >
            New Audit
          </Link>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Date</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Type</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Auditor</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Score</th>
              <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {audits?.map((audit: any) => (
              <tr key={audit.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">{formatDate(audit.created_at, params.locale)}</td>
                <td className="px-4 py-3 text-gray-600 capitalize text-xs">{audit.audit_type.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-gray-600">{audit.profiles?.full_name}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {audit.mandatory_passed}/{audit.mandatory_total} mandatory
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[audit.status]}`}>
                    {audit.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/${params.locale}/audits/${audit.id}`} className="text-mybha-gold text-xs hover:underline">
                    View →
                  </Link>
                </td>
              </tr>
            ))}
            {(!audits || audits.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400 text-sm">No audits yet</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
