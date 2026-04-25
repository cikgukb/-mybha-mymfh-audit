import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import AuditsList from '@/components/AuditsList'

export default async function AuditsPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations('audits')
  const supabase = await createClient()

  const { data: audits, error: auditsError } = await supabase
    .from('audits')
    .select(`
      id, audit_type, status, tier, mfhc_result, total_score, hotel_type, created_at,
      hotels(name, city),
      profiles:profiles!audits_auditor_id_fkey(full_name)
    `)
    .order('created_at', { ascending: false })

  if (auditsError) console.error('Audits query error:', auditsError)

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

      <AuditsList audits={(audits ?? []) as any} locale={params.locale} />
    </div>
  )
}
