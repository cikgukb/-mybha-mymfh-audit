'use client'

import { useTranslations } from 'next-intl'

interface Props { locale: string }

export default function CertActions({ locale }: Props) {
  const t = useTranslations('certificates')

  function exportAll() {
    window.location.href = `/api/export/excel?all=true&locale=${locale}`
  }

  return (
    <button
      onClick={exportAll}
      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
    >
      ↓ {t('export')}
    </button>
  )
}
