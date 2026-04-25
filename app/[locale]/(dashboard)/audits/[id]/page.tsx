import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import MFHCQuestionnaire from '@/components/MFHCQuestionnaire'

export default async function AuditDetailPage({
  params,
}: {
  params: { locale: string; id: string }
}) {
  const supabase = await createClient()

  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (auditError) console.error('Audit fetch error:', auditError)
  if (!audit) notFound()

  const { data: hotel } = await supabase
    .from('hotels')
    .select('*')
    .eq('id', audit.hotel_id)
    .maybeSingle()

  const { data: auditorProfile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', audit.auditor_id)
    .maybeSingle()

  // Determine hotel type: audit override → hotel default
  const hotelType = audit.hotel_type ?? hotel?.hotel_type ?? null
  if (!hotelType) {
    // Hotel must declare type before audit can run
    return (
      <div className="max-w-2xl mx-auto p-8 bg-white rounded-xl border border-amber-200">
        <h2 className="text-lg font-bold text-amber-800 mb-2">Hotel type not declared</h2>
        <p className="text-sm text-gray-600 mb-4">
          This hotel has not declared its F&B classification (Type A or Type B). The audit cannot start until the
          hotel record is updated.
        </p>
        <a
          href={`/${params.locale}/hotels/${audit.hotel_id}`}
          className="inline-block px-4 py-2 bg-mybha-gold text-white rounded-lg text-sm font-medium"
        >
          Set hotel type →
        </a>
      </div>
    )
  }

  const { data: parameters } = await supabase
    .from('mfhc_parameters')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')

  const { data: responses } = await supabase
    .from('audit_responses')
    .select('*')
    .eq('audit_id', params.id)

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .maybeSingle()

  const auditWithRelations = {
    ...audit,
    hotel_type: hotelType,
    hotels: hotel,
    profiles: auditorProfile,
  }

  const isEditable = ['draft', 'in_progress'].includes(audit.status)
  const canApprove = profile?.role === 'admin' && audit.status === 'submitted'

  return (
    <MFHCQuestionnaire
      audit={auditWithRelations}
      parameters={parameters ?? []}
      existingResponses={responses ?? []}
      isEditable={isEditable}
      canApprove={canApprove}
      currentUserId={user!.id}
    />
  )
}
