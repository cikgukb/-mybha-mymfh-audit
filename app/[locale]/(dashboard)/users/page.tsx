import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UserManagement from '@/components/UserManagement'
import InviteUserForm from '@/components/InviteUserForm'

export default async function UsersPage({ params }: { params: { locale: string } }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()

  if (profile?.role !== 'admin') redirect(`/${params.locale}/dashboard`)

  const { data: users } = await supabase
    .from('profiles')
    .select('*, hotels(name)')
    .order('created_at', { ascending: false })

  const { data: hotels } = await supabase
    .from('hotels')
    .select('id, name, city')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <InviteUserForm hotels={hotels ?? []} />
      </div>
      <UserManagement users={users ?? []} hotels={hotels ?? []} currentUserId={user!.id} />
    </div>
  )
}
