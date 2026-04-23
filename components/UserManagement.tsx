'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  users: any[]
  hotels: { id: string; name: string; city: string | null }[]
  currentUserId: string
}

const ROLES = ['admin', 'auditor', 'hotel_manager'] as const
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  auditor: 'Auditor',
  hotel_manager: 'Hotel Manager',
}
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-50 text-purple-700 border-purple-200',
  auditor: 'bg-blue-50 text-blue-700 border-blue-200',
  hotel_manager: 'bg-green-50 text-green-700 border-green-200',
}

export default function UserManagement({ users, hotels, currentUserId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function updateRole(userId: string, role: string) {
    setSaving(userId)
    setError('')
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
    setSaving(null)
    if (error) setError(error.message)
    else router.refresh()
  }

  async function assignHotel(userId: string, hotelId: string | null) {
    setSaving(userId)
    setError('')
    const { error } = await supabase
      .from('profiles')
      .update({ hotel_id: hotelId || null })
      .eq('id', userId)
    setSaving(null)
    if (error) setError(error.message)
    else router.refresh()
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Current Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Change Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Assigned Hotel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u: any) => (
              <tr key={u.id} className={`hover:bg-gray-50 ${u.id === currentUserId ? 'bg-yellow-50/30' : ''}`}>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{u.full_name}</div>
                  {u.id === currentUserId && (
                    <span className="text-xs text-mybha-gold">(you)</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[u.role]}`}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    {ROLES.map(role => (
                      <button
                        key={role}
                        disabled={u.role === role || saving === u.id || u.id === currentUserId}
                        onClick={() => updateRole(u.id, role)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                          u.role === role
                            ? ROLE_COLORS[role]
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 disabled:opacity-40'
                        }`}
                      >
                        {saving === u.id ? '...' : ROLE_LABELS[role]}
                      </button>
                    ))}
                  </div>
                  {u.id === currentUserId && (
                    <p className="text-xs text-gray-400 mt-1">Cannot change own role</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.role === 'hotel_manager' ? (
                    <select
                      value={u.hotel_id ?? ''}
                      disabled={saving === u.id}
                      onChange={e => assignHotel(u.id, e.target.value || null)}
                      className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-mybha-gold min-w-[160px]"
                    >
                      <option value="">— No hotel —</option>
                      {hotels.map(h => (
                        <option key={h.id} value={h.id}>
                          {h.name} {h.city ? `(${h.city})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-gray-400">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div className="bg-mybha-cream rounded-xl p-4 text-sm">
        <p className="font-medium text-gray-700 mb-2">Role permissions:</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-600">
          <div>
            <p className="font-semibold text-purple-700 mb-1">Admin</p>
            <ul className="space-y-0.5">
              <li>• Manage all hotels</li>
              <li>• Approve audits</li>
              <li>• Issue certificates</li>
              <li>• Manage users</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-blue-700 mb-1">Auditor</p>
            <ul className="space-y-0.5">
              <li>• View all hotels</li>
              <li>• Conduct any audit</li>
              <li>• Conformity assessment</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-green-700 mb-1">Hotel Manager</p>
            <ul className="space-y-0.5">
              <li>• View own hotel only</li>
              <li>• Self-audit only</li>
              <li>• View own certs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
