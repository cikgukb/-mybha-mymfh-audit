import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/${params.locale}/login`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar locale={params.locale} role={profile?.role ?? 'hotel_manager'} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="hidden md:block">
          <Header
            locale={params.locale}
            user={{ email: user.email ?? '', name: profile?.full_name ?? '' }}
            role={profile?.role ?? 'hotel_manager'}
          />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pt-16 md:pt-6">
          {children}
        </main>
      </div>
    </div>
  )
}
