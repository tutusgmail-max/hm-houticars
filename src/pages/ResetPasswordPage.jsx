/**
 * ResetPasswordPage.jsx
 * Handles the /reset-password route that Supabase redirects to after
 * clicking the password reset email link.
 *
 * Supabase embeds the recovery token in the URL fragment (#access_token=...).
 * The Supabase client auto-processes this fragment on load, so by the time
 * this component mounts, the user session is already set.
 *
 * We just need to show a "new password" form and call authResetPassword().
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiLock, FiCheck } from 'react-icons/fi'
import { authResetPassword } from '../services/auth.service'
import { validateResetForm, hasErrors } from '../utils/validation'
import AuthField from '../components/auth/AuthField'
import PasswordInput from '../components/auth/PasswordInput'
import AuthButton from '../components/auth/AuthButton'
import { useAuth } from '../auth/AuthContext'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [form, setForm] = useState({ password: '', password2: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [globalError, setGlobalError] = useState('')

  // If accessed without a valid recovery session, redirect home
  useEffect(() => {
    // Give Supabase a moment to process the URL hash
    const timer = setTimeout(() => {
      if (!user && !window.location.hash.includes('access_token')) {
        navigate('/', { replace: true })
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [user, navigate])

  const upd = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: e.target.value }))
    setErrors((p) => ({ ...p, [k]: undefined }))
    setGlobalError('')
  }

  const handleSubmit = async () => {
    const errs = validateResetForm(form)
    if (hasErrors(errs)) { setErrors(errs); return }

    setLoading(true)
    try {
      await authResetPassword(form.password)
      setDone(true)
      setTimeout(() => navigate('/dashboard', { replace: true }), 2500)
    } catch (err) {
      setGlobalError(err?.message || 'Erreur lors de la réinitialisation.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-navy-mid rounded-[24px] max-w-[420px] w-full
          border border-white/[0.08] shadow-[0_25px_80px_rgba(0,0,0,0.6)] overflow-hidden"
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="bg-gold text-navy font-condensed font-black text-lg px-2 py-0.5 rounded-md">HM</div>
            <span className="text-white font-bold text-lg">Houti Cars</span>
          </div>
          <h1 className="font-condensed font-black text-white text-[1.8rem]">
            {done ? 'Mot de passe mis à jour !' : 'Nouveau mot de passe'}
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {done ? 'Redirection vers votre tableau de bord...' : 'Choisissez un mot de passe sécurisé (minimum 8 caractères).'}
          </p>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          {done ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-16 h-16 bg-gold/20 rounded-full flex items-center justify-center">
                <FiCheck className="text-gold text-2xl" />
              </div>
              <p className="text-white/70 text-sm">Vous êtes maintenant connecté avec votre nouveau mot de passe.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <AuthField label="Nouveau mot de passe" error={errors.password}>
                <div className="relative">
                  <PasswordInput
                    value={form.password}
                    onChange={upd('password')}
                    placeholder="Minimum 8 caractères"
                    className={errors.password ? 'border-red-500' : ''}
                  />
                  <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm pointer-events-none" />
                </div>
              </AuthField>

              <AuthField label="Confirmer le mot de passe" error={errors.password2}>
                <PasswordInput
                  value={form.password2}
                  onChange={upd('password2')}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  className={errors.password2 ? 'border-red-500' : ''}
                />
              </AuthField>

              {globalError && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                  {globalError}
                </p>
              )}

              <AuthButton loading={loading} onClick={handleSubmit}>
                🔐 Mettre à jour le mot de passe
              </AuthButton>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
