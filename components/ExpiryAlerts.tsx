import Link from 'next/link'
import { getDaysUntilExpiry } from '@/lib/utils'
import TierBadge from './TierBadge'
import type { CertTier } from '@/types'

interface ExpiryAlertsProps {
  certs: any[]
  locale: string
}

export default function ExpiryAlerts({ certs, locale }: ExpiryAlertsProps) {
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-orange-500 font-bold">⚠</span>
        <h3 className="font-semibold text-orange-800 text-sm">
          {certs.length} certificate{certs.length > 1 ? 's' : ''} expiring within 90 days
        </h3>
      </div>
      <div className="space-y-2">
        {certs.map((cert: any) => {
          const days = getDaysUntilExpiry(cert.expiry_date)
          return (
            <div key={cert.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm">
              <div className="flex items-center gap-3">
                <TierBadge tier={cert.tier as CertTier} size="sm" />
                <span className="font-medium text-gray-900">{cert.hotels?.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium ${days <= 30 ? 'text-red-600' : 'text-orange-600'}`}>
                  {days === 0 ? 'Expires today' : days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days} days left`}
                </span>
                <Link
                  href={`/${locale}/certificates`}
                  className="text-xs text-mybha-gold hover:underline"
                >
                  Renew →
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
