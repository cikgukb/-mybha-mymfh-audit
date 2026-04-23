'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'forgot'

export default function LoginPage() {
  const t = useTranslations('auth')
  const locale = useLocale()
  const router = useRouter()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push(`/${locale}/dashboard`)
      router.refresh()
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/${locale}/reset-password`,
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSuccess('Password reset email sent. Check your inbox.')
  }

  return (
    <div className="min-h-screen bg-mybha-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-mybha-gold mb-4">
            <span className="text-3xl font-bold text-white">M</span>
          </div>
          <h1 className="text-2xl font-bold text-white">MYBHA MyMFH</h1>
          <p className="text-mybha-gold text-sm mt-1">My Muslim Friendly Hotel</p>
          <div className="flex justify-center gap-1 mt-1">
            {'★★★★★'.split('').map((s, i) => (
              <span key={i} className="text-mybha-gold text-sm">{s}</span>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">

          {mode === 'login' ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">{t('login')}</h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mybha-gold focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">{t('password')}</label>
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError('') }}
                      className="text-xs text-mybha-gold hover:text-mybha-gold-dark"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mybha-gold focus:border-transparent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-mybha-gold hover:bg-mybha-gold-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? t('loading') : t('signIn')}
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400">
                  New user? Contact your MYBHA admin to get access.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-6">
                <button onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                  className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
                <h2 className="text-xl font-semibold text-gray-900">Reset Password</h2>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>
              )}
              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{success}</div>
              )}

              {!success && (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mybha-gold focus:border-transparent"
                      placeholder="you@example.com"
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    Enter your email. We will send a link to set your password.
                  </p>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-mybha-gold hover:bg-mybha-gold-dark text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">
          MYBHA © {new Date().getFullYear()} · MyMFH Certification System
        </p>
      </div>
    </div>
  )
}
