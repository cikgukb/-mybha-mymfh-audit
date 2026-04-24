export function formatDate(date: string | Date, locale = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const tag =
    locale === 'ms' ? 'ms-MY' :
    locale === 'zh' ? 'zh-CN' :
    locale === 'ja' ? 'ja-JP' : 'en-MY'
  return d.toLocaleDateString(tag, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function getDaysUntilExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate)
  const now = new Date()
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function getExpiryStatus(daysUntil: number): 'expired' | 'critical' | 'warning' | 'ok' {
  if (daysUntil < 0) return 'expired'
  if (daysUntil <= 30) return 'critical'
  if (daysUntil <= 90) return 'warning'
  return 'ok'
}

export function getExpiryColor(status: ReturnType<typeof getExpiryStatus>): string {
  switch (status) {
    case 'expired': return 'text-red-600 bg-red-50 border-red-200'
    case 'critical': return 'text-red-500 bg-red-50 border-red-200'
    case 'warning': return 'text-orange-500 bg-orange-50 border-orange-200'
    default: return 'text-green-600 bg-green-50 border-green-200'
  }
}

export function generateCertNumber(tier: string): string {
  const year = new Date().getFullYear()
  const tierCode = tier === 'gold' ? 'G' : tier === 'silver' ? 'S' : 'B'
  const random = Math.floor(Math.random() * 9000) + 1000
  return `MYBHA-${tierCode}-${year}-${random}`
}

export function addYears(date: Date, years: number): Date {
  const result = new Date(date)
  result.setFullYear(result.getFullYear() + years)
  return result
}
