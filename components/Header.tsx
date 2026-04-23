'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'
import LocaleSwitcher from './LocaleSwitcher'

interface HeaderProps {
  locale: string
  user: { email: string; name: string }
  role: string
}

export default function Header({ locale, user, role }: HeaderProps) {
  const t = useTranslations('nav')
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(`/${locale}/login`)
    router.refresh()
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
      <div />
      <div className="flex items-center gap-4">
        <LocaleSwitcher currentLocale={locale} />
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{user.name}</p>
          <p className="text-xs text-gray-400">{user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-gray-400 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
        >
          {t('logout')}
        </button>
      </div>
    </header>
  )
}
