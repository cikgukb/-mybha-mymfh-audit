'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import TierBadge from './TierBadge'
import { formatDate } from '@/lib/utils'

interface AuditRow {
  id: string
  audit_type: 'self_audit' | 'conformity_assessment'
  status: string
  tier: string | null
  mfhc_result: string | null
  total_score: number | null
  hotel_type: string | null
  created_at: string
  hotels: { name: string; city: string | null } | null
  profiles: { full_name: string } | null
}

interface Props {
  audits: AuditRow[]
  locale: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-50 text-blue-600',
  submitted: 'bg-orange-50 text-orange-600',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
}

type StatusFilter = 'all' | 'draft' | 'in_progress' | 'submitted' | 'approved' | 'rejected'
type ResultFilter = 'all' | 'five_star' | 'four_star' | 'three_star' | 'rejected' | 'not_certified' | 'pending'
type TypeFilter = 'all' | 'type_a' | 'type_b'

export default function AuditsList({ audits, locale }: Props) {
  const t = useTranslations('audits')

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'score_desc' | 'score_asc'>('date_desc')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = audits.filter((a) => {
      // Search across hotel name, city, auditor
      if (q) {
        const hay = [
          a.hotels?.name,
          a.hotels?.city,
          a.profiles?.full_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      if (resultFilter !== 'all' && a.mfhc_result !== resultFilter) return false
      if (typeFilter !== 'all' && a.hotel_type !== typeFilter) return false
      return true
    })

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'date_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'score_desc':
          return (b.total_score ?? -1) - (a.total_score ?? -1)
        case 'score_asc':
          return (a.total_score ?? Infinity) - (b.total_score ?? Infinity)
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    return list
  }, [audits, search, statusFilter, resultFilter, typeFilter, sortBy])

  const counts = useMemo(() => {
    const c = { total: audits.length, approved: 0, pending: 0, draft: 0, rejected: 0 }
    audits.forEach((a) => {
      if (a.status === 'approved') c.approved++
      else if (a.status === 'submitted') c.pending++
      else if (a.status === 'draft' || a.status === 'in_progress') c.draft++
      if (a.mfhc_result === 'rejected') c.rejected++
    })
    return c
  }, [audits])

  const hasActiveFilter =
    !!search || statusFilter !== 'all' || resultFilter !== 'all' || typeFilter !== 'all'

  function clearFilters() {
    setSearch('')
    setStatusFilter('all')
    setResultFilter('all')
    setTypeFilter('all')
  }

  return (
    <div className="space-y-4">
      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Pill label="Total" value={counts.total} cls="bg-gray-50 text-gray-700" />
        <Pill label="Approved" value={counts.approved} cls="bg-green-50 text-green-700" />
        <Pill label="Pending" value={counts.pending} cls="bg-orange-50 text-orange-700" />
        <Pill label="Draft" value={counts.draft} cls="bg-blue-50 text-blue-700" />
        <Pill label="Rejected" value={counts.rejected} cls="bg-red-50 text-red-700" />
      </div>

      {/* Search + filter bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search hotel, city, auditor..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mybha-gold"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 px-2"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mybha-gold"
          >
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="score_desc">Highest score</option>
            <option value="score_asc">Lowest score</option>
          </select>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 items-center">
          <FilterGroup label="Status">
            <Chip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All</Chip>
            <Chip active={statusFilter === 'draft'} onClick={() => setStatusFilter('draft')}>Draft</Chip>
            <Chip active={statusFilter === 'in_progress'} onClick={() => setStatusFilter('in_progress')}>In Progress</Chip>
            <Chip active={statusFilter === 'submitted'} onClick={() => setStatusFilter('submitted')}>Submitted</Chip>
            <Chip active={statusFilter === 'approved'} onClick={() => setStatusFilter('approved')}>Approved</Chip>
            <Chip active={statusFilter === 'rejected'} onClick={() => setStatusFilter('rejected')}>Rejected</Chip>
          </FilterGroup>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <FilterGroup label="Tier">
            <Chip active={resultFilter === 'all'} onClick={() => setResultFilter('all')}>All</Chip>
            <Chip active={resultFilter === 'five_star'} onClick={() => setResultFilter('five_star')}>5★ Premium</Chip>
            <Chip active={resultFilter === 'four_star'} onClick={() => setResultFilter('four_star')}>4★ Enhanced</Chip>
            <Chip active={resultFilter === 'three_star'} onClick={() => setResultFilter('three_star')}>3★ Basic</Chip>
            <Chip active={resultFilter === 'not_certified'} onClick={() => setResultFilter('not_certified')}>Not Certified</Chip>
            <Chip active={resultFilter === 'rejected'} onClick={() => setResultFilter('rejected')}>Rejected</Chip>
            <Chip active={resultFilter === 'pending'} onClick={() => setResultFilter('pending')}>Pending</Chip>
          </FilterGroup>
        </div>

        <div className="flex flex-wrap gap-2 items-center justify-between">
          <FilterGroup label="Type">
            <Chip active={typeFilter === 'all'} onClick={() => setTypeFilter('all')}>All</Chip>
            <Chip active={typeFilter === 'type_a'} onClick={() => setTypeFilter('type_a')}>Type A (No F&B)</Chip>
            <Chip active={typeFilter === 'type_b'} onClick={() => setTypeFilter('type_b')}>Type B (With F&B)</Chip>
          </FilterGroup>

          {hasActiveFilter && (
            <button
              onClick={clearFilters}
              className="text-xs text-mybha-gold hover:text-mybha-gold-dark font-medium"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="text-xs text-gray-400 pt-1 border-t border-gray-50">
          Showing <span className="font-semibold text-gray-700">{filtered.length}</span> of {audits.length} audits
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Hotel</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Auditor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tier</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((audit) => (
                <tr key={audit.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{audit.hotels?.name}</div>
                    <div className="text-xs text-gray-400">
                      {audit.hotels?.city}
                      {audit.hotel_type && (
                        <span className="ml-1 text-[10px] px-1 py-0.5 bg-gray-100 rounded text-gray-500">
                          {audit.hotel_type === 'type_a' ? 'A' : 'B'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize text-xs">
                    {audit.audit_type === 'self_audit' ? t('selfAudit') : t('conformityAssessment')}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{audit.profiles?.full_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(audit.created_at, locale)}</td>
                  <td className="px-4 py-3">
                    {audit.mfhc_result &&
                    ['three_star', 'four_star', 'five_star'].includes(audit.mfhc_result) ? (
                      <TierBadge tier={audit.mfhc_result as any} size="sm" />
                    ) : audit.tier ? (
                      <TierBadge tier={audit.tier as any} size="sm" />
                    ) : audit.mfhc_result === 'rejected' ? (
                      <span className="text-xs text-red-600 font-medium">Rejected</span>
                    ) : audit.mfhc_result === 'not_certified' ? (
                      <span className="text-xs text-gray-500">Not Certified</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                    {audit.total_score != null && (
                      <div className="text-[10px] text-gray-400 mt-0.5">{audit.total_score}/100</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_COLORS[audit.status] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {audit.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/${locale}/audits/${audit.id}`}
                      className="text-mybha-gold hover:text-mybha-gold-dark text-sm font-medium"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                    {hasActiveFilter
                      ? 'No audits match the current filters.'
                      : 'No audits yet. Start your first audit.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Pill({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className={`px-3 py-2 rounded-lg ${cls}`}>
      <div className="text-xs opacity-70">{label}</div>
      <div className="font-bold text-base">{value}</div>
    </div>
  )
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-xs text-gray-400 font-medium mr-1">{label}:</span>
      {children}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
        active
          ? 'bg-mybha-gold border-mybha-gold text-white'
          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  )
}
