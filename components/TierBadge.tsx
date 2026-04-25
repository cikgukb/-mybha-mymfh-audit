import type { CertTier } from '@/types'

interface TierBadgeProps {
  tier: CertTier
  size?: 'sm' | 'md' | 'lg'
}

const tierConfig: Record<CertTier, { label: string; stars: number; classes: string; starColor: string }> = {
  gold:       { label: 'Gold',   stars: 5, classes: 'bg-yellow-50 text-yellow-700 border border-yellow-300', starColor: '#C9A84C' },
  silver:     { label: 'Silver', stars: 4, classes: 'bg-slate-50  text-slate-700  border border-slate-300',  starColor: '#A8A9AD' },
  bronze:     { label: 'Bronze', stars: 3, classes: 'bg-amber-50  text-amber-800  border border-amber-300',  starColor: '#CD7F32' },
  five_star:  { label: '5-Star Premium',  stars: 5, classes: 'bg-yellow-50 text-yellow-700 border border-yellow-300', starColor: '#C9A84C' },
  four_star:  { label: '4-Star Enhanced', stars: 4, classes: 'bg-amber-50  text-amber-800  border border-amber-300',  starColor: '#CD7F32' },
  three_star: { label: '3-Star Basic',    stars: 3, classes: 'bg-orange-50 text-orange-700 border border-orange-300', starColor: '#E67E22' },
}

export default function TierBadge({ tier, size = 'md' }: TierBadgeProps) {
  const cfg = tierConfig[tier]
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'
  const px = size === 'sm' ? 'px-2 py-0.5' : size === 'lg' ? 'px-4 py-1.5' : 'px-3 py-1'
  const starSize = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs'

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${textSize} ${px} ${cfg.classes}`}>
      {cfg.label}
      <span className={starSize} style={{ color: cfg.starColor }}>
        {'★'.repeat(cfg.stars)}
      </span>
    </span>
  )
}
