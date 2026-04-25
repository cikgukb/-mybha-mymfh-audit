import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import TierBadge from '@/components/TierBadge'
import { formatDate } from '@/lib/utils'

export default async function AuditsPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations('audits')
  const supabase = await createClient()

  const { data: audits, error: auditsError } = await supabase
    .from('audits')
    .select(`
      *,
      hotels(name, city),
      profiles:profiles!audits_auditor_id_fkey(full_name)
    `)
    .order('created_at', { ascending: false })

  if (auditsError) console.error('Audits query error:', auditsError)

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-50 text-blue-600',
    submitted: 'bg-orange-50 text-orange-600',
    approved: 'bg-green-50 text-green-700',
    rejected: 'bg-red-50 text-red-600',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <Link
          href={`/${params.locale}/audits/new`}
          className="px-4 py-2 bg-mybha-gold hover:bg-mybha-gold-dark text-white text-sm font-medium rounded-lg transition-colors"
        >
          + {t('new')}
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Hotel</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Auditor</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tier</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {audits?.map((audit: any) => (
              <tr key={audit.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{audit.hotels?.name}</div>
                  <div className="text-xs text-gray-400">{audit.hotels?.city}</div>
                </td>
                <td className="px-4 py-3 text-gray-600 capitalize">
                  {audit.audit_type === 'self_audit' ? t('selfAudit') : t('conformityAssessment')}
                </td>
                <td className="px-4 py-3 text-gray-600">{audit.profiles?.full_name}</td>
                <td className="px-4 py-3 text-gray-500">{formatDate(audit.created_at, params.locale)}</td>
                <td className="px-4 py-3">
                  {audit.mfhc_result && audit.mfhc_result !== 'pending' && audit.mfhc_result !== 'rejected' && audit.mfhc_result !== 'not_certified'
                    ? <TierBadge tier={audit.mfhc_result} size="sm" />
                    : audit.tier
                      ? <TierBadge tier={audit.tier} size="sm" />
                      : audit.mfhc_result === 'rejected'
                        ? <span className="text-xs text-red-600 font-medium">Rejected</span>
                        : audit.mfhc_result === 'not_certified'
                          ? <span className="text-xs text-gray-500">Not Certified</span>
                          : <span className="text-gray-300">—</span>}
                  {audit.total_score != null && (
                    <div className="text-[10px] text-gray-400 mt-0.5">{audit.total_score}/100</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[audit.status]}`}>
                    {t(`status.${audit.status}`)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/${params.locale}/audits/${audit.id}`}
                    className="text-mybha-gold hover:text-mybha-gold-dark text-sm font-medium"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
            {(!audits || audits.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No audits yet. Start your first audit.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
