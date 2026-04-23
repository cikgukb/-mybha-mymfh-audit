import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'
import NewAuditForm from '@/components/NewAuditForm'

export default async function NewAuditPage({ params }: { params: { locale: string } }) {
  const t = await getTranslations('audits')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single()

  const { data: hotels } = await supabase
    .from('hotels')
    .select('id, name, city')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('new')}</h1>
        <p className="text-gray-500 text-sm mt-1">
          {t('selfAudit')} or {t('conformityAssessment')}
        </p>
      </div>
      <NewAuditForm
        hotels={hotels ?? []}
        locale={params.locale}
        auditorId={user!.id}
        role={profile?.role ?? 'hotel_manager'}
        hotelId={profile?.hotel_id ?? null}
      />
    </div>
  )
}
