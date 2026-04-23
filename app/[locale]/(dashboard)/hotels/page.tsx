import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import TierBadge from '@/components/TierBadge'

export default async function HotelsPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations('hotels')
  const supabase = await createClient()

  const { data: hotels } = await supabase
    .from('hotels')
    .select(`
      *,
      certificates(tier, is_active, expiry_date)
    `)
    .order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <Link
          href={`/${params.locale}/hotels/new`}
          className="px-4 py-2 bg-mybha-gold hover:bg-mybha-gold-dark text-white text-sm font-medium rounded-lg transition-colors"
        >
          + {t('add')}
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('name')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('city')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('memberId')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Certification</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('status')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {hotels?.map((hotel: any) => {
              const activeCert = hotel.certificates?.find((c: any) => c.is_active)
              return (
                <tr key={hotel.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{hotel.name}</td>
                  <td className="px-4 py-3 text-gray-600">{hotel.city ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{hotel.mybha_member_id ?? '—'}</td>
                  <td className="px-4 py-3">
                    {activeCert ? (
                      <TierBadge tier={activeCert.tier} size="sm" />
                    ) : (
                      <span className="text-gray-400 text-xs">Not certified</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      hotel.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {hotel.is_active ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/${params.locale}/hotels/${hotel.id}`}
                      className="text-mybha-gold hover:text-mybha-gold-dark text-sm font-medium"
                    >
                      {t('edit')} →
                    </Link>
                  </td>
                </tr>
              )
            })}
            {(!hotels || hotels.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No hotels registered yet.
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
