import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AuditChecklist from '@/components/AuditChecklist'

export default async function AuditDetailPage({
  params,
}: {
  params: { locale: string; id: string }
}) {
  const supabase = await createClient()

  // Fetch audit separately from joins to isolate RLS issues
  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (auditError) console.error('Audit fetch error:', auditError)
  if (!audit) {
    console.error('Audit not found for id:', params.id)
    notFound()
  }

  // Fetch hotel separately
  const { data: hotel } = await supabase
    .from('hotels')
    .select('*')
    .eq('id', audit.hotel_id)
    .maybeSingle()

  // Fetch auditor profile separately
  const { data: auditorProfile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', audit.auditor_id)
    .maybeSingle()

  const { data: checklistItems } = await supabase
    .from('checklist_items')
    .select('*')
    .eq('is_active', true)
    .order('tier')
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
    hotels: hotel,
    profiles: auditorProfile,
  }

  const isEditable = ['draft', 'in_progress'].includes(audit.status)
  const canApprove = profile?.role === 'admin' && audit.status === 'submitted'

  return (
    <AuditChecklist
      audit={auditWithRelations as any}
      checklistItems={checklistItems ?? []}
      existingResponses={responses ?? []}
      locale={params.locale}
      isEditable={isEditable}
      canApprove={canApprove}
      currentUserId={user!.id}
      currentRole={profile?.role ?? 'hotel_manager'}
    />
  )
}
