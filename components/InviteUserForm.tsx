'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  hotels: { id: string; name: string; city: string | null }[]
}

export default function InviteUserForm({ hotels }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', role: 'hotel_manager', hotel_id: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const res = await fetch('/api/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authorization: 'Bearer admin' },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error)
    } else {
      setSuccess(`User ${form.email} created. They can log in and set a password via "Forgot Password".`)
      setForm({ email: '', full_name: '', role: 'hotel_manager', hotel_id: '' })
      router.refresh()
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="px-4 py-2 bg-mybha-gold hover:bg-mybha-gold-dark text-white text-sm font-medium rounded-lg transition-colors"
      >
        + Add User
      </button>

      {open && (
        <div className="mt-4 bg-white border border-gray-200 rounded-xl p-5 max-w-md">
          <h3 className="font-semibold text-gray-900 mb-4">Create New User</h3>

          {error && <div className="mb-3 p-2 bg-red-50 text-red-600 text-xs rounded-lg">{error}</div>}
          {success && <div className="mb-3 p-2 bg-green-50 text-green-700 text-xs rounded-lg">{success}</div>}

          <form onSubmit={handleInvite} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-mybha-gold"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-mybha-gold"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
              <select
                value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-mybha-gold"
              >
                <option value="hotel_manager">Hotel Manager</option>
                <option value="auditor">Auditor</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {form.role === 'hotel_manager' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Assign Hotel</label>
                <select
                  value={form.hotel_id}
                  onChange={e => setForm(p => ({ ...p, hotel_id: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-mybha-gold"
                >
                  <option value="">— Select hotel —</option>
                  {hotels.map(h => (
                    <option key={h.id} value={h.id}>{h.name} {h.city ? `(${h.city})` : ''}</option>
                  ))}
                </select>
              </div>
            )}

            <p className="text-xs text-gray-400">
              User will be created immediately. They must use "Forgot Password" on the login page to set their password.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-mybha-gold hover:bg-mybha-gold-dark text-white text-xs font-medium rounded-lg disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create User'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
