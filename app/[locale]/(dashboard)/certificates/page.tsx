import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import TierBadge from '@/components/TierBadge'
import { formatDate, getDaysUntilExpiry, getExpiryStatus } from '@/lib/utils'
import CertActions from '@/components/CertActions'

export default async function CertificatesPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations('certificates')
  const supabase = await createClient()

  const { data: certs } = await supabase
    .from('certificates')
    .select(`*, hotels(name, city, address, state, mybha_member_id), audits(id), profiles(full_name)`)
    .order('issued_date', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <CertActions locale={params.locale} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {certs?.map((cert: any) => {
          const daysUntil = getDaysUntilExpiry(cert.expiry_date)
          const expiryStatus = getExpiryStatus(daysUntil)

          return (
            <div
              key={cert.id}
              className={`bg-white rounded-xl border-2 p-5 ${
                cert.tier === 'gold' || cert.tier === 'five_star' ? 'border-yellow-200' :
                cert.tier === 'silver' || cert.tier === 'four_star' ? 'border-amber-200' :
                cert.tier === 'bronze' || cert.tier === 'three_star' ? 'border-orange-200' :
                'border-gray-200'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <TierBadge tier={cert.tier} size="md" />
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  cert.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                }`}>
                  {cert.is_active ? t('active') : t('revoked')}
                </span>
              </div>

              {/* Hotel */}
              <h3 className="font-semibold text-gray-900 text-sm mt-2">{cert.hotels?.name}</h3>
              <p className="text-gray-400 text-xs">{cert.hotels?.city}</p>

              {/* Cert number */}
              <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-400">{t('certNumber')}</p>
                <p className="text-xs font-mono font-semibold text-gray-700">{cert.cert_number}</p>
              </div>

              {/* Dates */}
              <div className="flex justify-between mt-3 text-xs">
                <div>
                  <p className="text-gray-400">{t('issuedDate')}</p>
                  <p className="font-medium text-gray-700">{formatDate(cert.issued_date, params.locale)}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400">{t('expiryDate')}</p>
                  <p className={`font-medium ${
                    expiryStatus === 'expired' ? 'text-red-600' :
                    expiryStatus === 'critical' ? 'text-red-500' :
                    expiryStatus === 'warning' ? 'text-orange-500' : 'text-gray-700'
                  }`}>
                    {formatDate(cert.expiry_date, params.locale)}
                  </p>
                </div>
              </div>

              {/* Expiry warning */}
              {cert.is_active && expiryStatus !== 'ok' && (
                <div className={`mt-2 text-xs px-2 py-1 rounded text-center font-medium ${
                  expiryStatus === 'expired' ? 'bg-red-50 text-red-600' :
                  expiryStatus === 'critical' ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-600'
                }`}>
                  {expiryStatus === 'expired'
                    ? 'Certificate expired'
                    : `Expires in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`
                  }
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                <a
                  href={`/api/certificates/generate?id=${cert.id}&locale=${params.locale}`}
                  target="_blank"
                  className="flex-1 text-center text-xs px-3 py-1.5 bg-mybha-gold hover:bg-mybha-gold-dark text-white font-medium rounded-lg transition-colors"
                >
                  {t('download')}
                </a>
                <a
                  href={`/api/export/excel?cert_id=${cert.id}`}
                  className="flex-1 text-center text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Excel
                </a>
              </div>
            </div>
          )
        })}
        {(!certs || certs.length === 0) && (
          <div className="col-span-3 py-12 text-center text-gray-400">
            No certificates issued yet.
          </div>
        )}
      </div>
    </div>
  )
}
