import type { DashboardStats } from '@/types'

interface Props {
  stats: DashboardStats
}

export default function DashboardStats({ stats }: Props) {
  const cards = [
    { label: 'Total Hotels',      value: stats.totalHotels,   color: 'bg-blue-500',   icon: '⌂' },
    { label: 'Active Hotels',     value: stats.activeHotels,  color: 'bg-green-500',  icon: '✓' },
    { label: 'Total Audits',      value: stats.totalAudits,   color: 'bg-purple-500', icon: '✎' },
    { label: 'Pending Review',    value: stats.pendingAudits, color: 'bg-orange-500', icon: '⏱' },
    { label: 'Active Certs',      value: stats.activeCerts,   color: 'bg-teal-500',   icon: '★' },
    { label: 'Expiring (90d)',    value: stats.expiringCerts, color: stats.expiringCerts > 0 ? 'bg-red-500' : 'bg-gray-400', icon: '!' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map(card => (
        <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className={`w-8 h-8 ${card.color} rounded-lg flex items-center justify-center text-white text-sm mb-3`}>
            {card.icon}
          </div>
          <div className="text-2xl font-bold text-gray-900">{card.value}</div>
          <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
        </div>
      ))}
    </div>
  )
}
