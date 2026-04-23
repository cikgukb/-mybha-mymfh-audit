import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import DashboardStats from '@/components/DashboardStats'
import ExpiryAlerts from '@/components/ExpiryAlerts'
import TierBadge from '@/components/TierBadge'
import { formatDate, getDaysUntilExpiry } from '@/lib/utils'
import type { DashboardStats as Stats } from '@/types'

export default async function DashboardPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations('dashboard')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  // Build queries based on role
  const isAdmin = profile?.role === 'admin'
  const isAuditor = profile?.role === 'auditor'
  const isManager = profile?.role === 'hotel_manager'

  const [hotelsRes, auditsRes, certsRes] = await Promise.all([
    supabase.from('hotels').select('id, is_active', { count: 'exact' }),
    supabase.from('audits')
      .select('id, status, created_at, tier, hotels(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('certificates')
      .select('*, hotels(name)')
      .eq('is_active', true)
      .order('expiry_date', { ascending: true }),
  ])

  const hotels = hotelsRes.data ?? []
  const recentAudits = auditsRes.data ?? []
  const certs = certsRes.data ?? []

  const now = new Date()
  const expiringCerts = certs.filter(c => {
    const days = getDaysUntilExpiry(c.expiry_date)
    return days >= 0 && days <= 90
  })

  const tierBreakdown = { bronze: 0, silver: 0, gold: 0 }
  certs.forEach(c => { tierBreakdown[c.tier as keyof typeof tierBreakdown]++ })

  const stats: Stats = {
    totalHotels: hotels.length,
    activeHotels: hotels.filter(h => h.is_active).length,
    totalAudits: auditsRes.count ?? 0,
    pendingAudits: recentAudits.filter(a => a.status === 'submitted').length,
    activeCerts: certs.length,
    expiringCerts: expiringCerts.length,
    tierBreakdown,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {t('welcome')}, {profile?.full_name}
        </p>
      </div>

      <DashboardStats stats={stats} />

      {expiringCerts.length > 0 && (
        <ExpiryAlerts certs={expiringCerts} locale={params.locale} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Audits */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">{t('recentAudits')}</h2>
          {recentAudits.length === 0 ? (
            <p className="text-gray-400 text-sm">{t('noData')}</p>
          ) : (
            <div className="space-y-3">
              {recentAudits.map((audit: any) => (
                <div key={audit.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {audit.hotels?.name ?? 'Unknown Hotel'}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(audit.created_at, params.locale)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {audit.tier && <TierBadge tier={audit.tier} size="sm" />}
                    <StatusBadge status={audit.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tier Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">{t('tierDistribution')}</h2>
          {certs.length === 0 ? (
            <p className="text-gray-400 text-sm">{t('noData')}</p>
          ) : (
            <div className="space-y-3">
              {(['gold', 'silver', 'bronze'] as const).map(tier => (
                <div key={tier} className="flex items-center gap-3">
                  <TierBadge tier={tier} size="sm" />
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        tier === 'gold' ? 'bg-yellow-400' :
                        tier === 'silver' ? 'bg-slate-400' : 'bg-amber-600'
                      }`}
                      style={{ width: `${certs.length > 0 ? (tierBreakdown[tier] / certs.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-6">
                    {tierBreakdown[tier]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-50 text-blue-600',
    submitted: 'bg-orange-50 text-orange-600',
    approved: 'bg-green-50 text-green-700',
    rejected: 'bg-red-50 text-red-600',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replace('_', ' ')}
    </span>
  )
}
