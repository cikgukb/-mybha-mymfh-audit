'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import LocaleSwitcher from './LocaleSwitcher'
import type { UserRole } from '@/types'

interface SidebarProps {
  locale: string
  role: UserRole
}

export default function Sidebar({ locale, role }: SidebarProps) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(`/${locale}/login`)
    router.refresh()
  }

  const links = [
    { href: `/${locale}/dashboard`,    label: t('dashboard'),    icon: '⊞', roles: ['admin', 'auditor', 'hotel_manager'] },
    { href: `/${locale}/hotels`,       label: t('hotels'),       icon: '⌂', roles: ['admin', 'auditor'] },
    { href: `/${locale}/audits`,       label: t('audits'),       icon: '✓', roles: ['admin', 'auditor', 'hotel_manager'] },
    { href: `/${locale}/certificates`, label: t('certificates'), icon: '★', roles: ['admin', 'auditor', 'hotel_manager'] },
    { href: `/${locale}/users`,        label: 'Users',           icon: '⚙', roles: ['admin'] },
  ].filter(l => l.roles.includes(role))

  const NavLinks = ({ onClose }: { onClose?: () => void }) => (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {links.map(link => {
        const active = pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              active
                ? 'bg-mybha-gold text-white font-medium'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-base w-5 text-center">{link.icon}</span>
            {link.label}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-56 bg-mybha-black text-white flex-col shrink-0">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="MyBHA" className="w-10 h-10 rounded-lg shrink-0" />
            <div>
              <div className="text-xs font-bold leading-none">MyBHA</div>
              <div className="text-[10px] text-mybha-gold leading-none mt-0.5">Muslim Friendly Hospitality</div>
            </div>
          </div>
        </div>
        <NavLinks />
        <div className="px-5 py-4 border-t border-white/10">
          <span className="text-[10px] uppercase tracking-wider text-white/30 font-medium">
            {role.replace('_', ' ')}
          </span>
        </div>
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-mybha-black text-white flex items-center justify-between px-4 py-3 shadow-lg">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="MyBHA" className="w-8 h-8 rounded-lg" />
          <span className="text-sm font-bold">MyBHA</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="[&>div]:border-white/20 [&_button:not(.active)]:text-white/60">
            <LocaleSwitcher currentLocale={locale} />
          </div>
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Open menu"
          >
            <div className="w-5 h-0.5 bg-white mb-1" />
            <div className="w-5 h-0.5 bg-white mb-1" />
            <div className="w-5 h-0.5 bg-white" />
          </button>
        </div>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-64 bg-mybha-black flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-mybha-gold rounded-lg flex items-center justify-center text-sm font-bold">M</div>
                <div>
                  <div className="text-xs font-bold text-white leading-none">MYBHA</div>
                  <div className="text-[10px] text-mybha-gold leading-none mt-0.5">MyMFH Audit</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white text-xl">✕</button>
            </div>
            <NavLinks onClose={() => setOpen(false)} />
            <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-white/30 font-medium">
                {role.replace('_', ' ')}
              </span>
              <button
                onClick={handleLogout}
                className="text-xs text-white/40 hover:text-white transition-colors"
              >
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
