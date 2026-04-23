'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLocale as useIntlLocale } from 'next-intl'

export default function ResetPasswordPage() {
  const router = useRouter()
  const locale = useIntlLocale()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }

    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) setError(error.message)
    else {
      setSuccess(true)
      setTimeout(() => router.push(`/${locale}/dashboard`), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-mybha-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-mybha-gold mb-4">
            <span className="text-3xl font-bold text-white">M</span>
          </div>
          <h1 className="text-2xl font-bold text-white">MYBHA MyMFH</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Set New Password</h2>
          <p className="text-sm text-gray-400 mb-6">Choose a strong password for your account.</p>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}

          {success ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center">
              Password set successfully. Redirecting to dashboard...
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mybha-gold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mybha-gold"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-mybha-gold hover:bg-mybha-gold-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Setting password...' : 'Set Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
