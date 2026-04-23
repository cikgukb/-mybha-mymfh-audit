'use client'

import { useRouter, usePathname } from 'next/navigation'
import { locales } from '@/i18n'

const labels: Record<string, string> = { en: 'EN', ms: 'BM', ar: 'ع' }

export default function LocaleSwitcher({ currentLocale }: { currentLocale: string }) {
  const router = useRouter()
  const pathname = usePathname()

  function switchLocale(locale: string) {
    const newPath = pathname.replace(`/${currentLocale}`, `/${locale}`)
    router.push(newPath)
  }

  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
      {locales.map(locale => (
        <button
          key={locale}
          onClick={() => switchLocale(locale)}
          className={`px-2.5 py-1 text-xs font-medium transition-colors ${
            locale === currentLocale
              ? 'bg-mybha-gold text-white'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          {labels[locale]}
        </button>
      ))}
    </div>
  )
}
