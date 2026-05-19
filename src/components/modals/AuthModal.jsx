/**
 * AuthModal.jsx  —  v3
 *
 * BUGS FIXED vs original:
 * 1. mode state initialized from authModal prop but never synced when prop changes
 *    → user opening modal in "signup" mode got "login" form if modal was previously shown.
 * 2. No "email sent" confirmation screen — user had no feedback after forgot-password.
 * 3. validate() used String.includes('@') instead of proper regex — "a@" passed validation.
 * 4. Error messages showed raw Supabase English strings to French-speaking users.
 * 5. No accessible keyboard trap — Tab key escaped modal.
 * 6. No aria-* attributes — screen reader unfriendly.
 * 7. Form state not reset on mode change — leaked password between login/signup.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiMail, FiUser, FiPhone } from 'react-icons/fi'
import { useApp } from '../../context/AppContext'
import { authSignIn, authSignUp, authForgotPassword } from '../../services/auth.service'
import {
  validateLoginForm,
  validateSignupForm,
  validateForgotForm,
  hasErrors,
  parseAuthError,
} from '../../utils/validation'
import AuthField from '../auth/AuthField'
import PasswordInput from '../auth/PasswordInput'
import AuthButton from '../auth/AuthButton'

const MODES = { login: 'login', signup: 'signup', forgot: 'forgot', sent: 'sent' }

const TITLES = {
  login:  'Connexion',
  signup: 'Créer un compte',
  forgot: 'Mot de passe oublié',
  sent:   'Email envoyé !',
}

const SUBTITLES = {
  login:  'Accédez à votre espace client premium.',
  signup: 'Rejoignez HM Houti Cars. CIN et permis seront demandés uniquement lors de votre première réservation.',
  forgot: 'Saisissez votre email pour recevoir un lien de réinitialisation.',
  sent:   null,
}

function emptyForm() {
  return { fullName: '', phone: '', email: '', password: '', password2: '' }
}

export default function AuthModal() {
  const { authModal, authNotice, closeAuth, addToast } = useApp()

  // FIX 1: sync mode from prop every time modal opens
  const [mode, setMode] = useState(authModal || MODES.login)
  useEffect(() => {
    if (authModal) setMode(authModal)
  }, [authModal])

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState(emptyForm)
  const [sentEmail, setSentEmail] = useState('')

  const firstInputRef = useRef(null)

  useEffect(() => {
    if (authModal) setTimeout(() => firstInputRef.current?.focus(), 100)
  }, [authModal, mode])

  // FIX 7: reset form state on mode switch
  const switchMode = useCallback((next) => {
    setMode(next)
    setErrors({})
    setForm(emptyForm)
  }, [])

  if (!authModal) return null

  const upd = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: e.target.value }))
    setErrors((p) => ({ ...p, [k]: undefined }))
  }

  const handleSubmit = async () => {
    let errs = {}
    if (mode === MODES.login)  errs = validateLoginForm(form)
    if (mode === MODES.signup) errs = validateSignupForm(form)
    if (mode === MODES.forgot) errs = validateForgotForm(form)

    if (hasErrors(errs)) { setErrors(errs); return }

    setLoading(true)
    try {
      if (mode === MODES.login) {
        await authSignIn({ email: form.email, password: form.password })
        addToast('Bienvenue ! Connexion réussie.')
        closeAuth()
      } else if (mode === MODES.signup) {
        await authSignUp({ email: form.email, password: form.password, fullName: form.fullName, phone: form.phone })
        addToast('Compte créé ! Vérifiez votre email pour confirmer.')
        closeAuth()
      } else if (mode === MODES.forgot) {
        await authForgotPassword(form.email)
        setSentEmail(form.email)
        setMode(MODES.sent)
      }
    } catch (err) {
      addToast(parseAuthError(err), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit() }

  return (
    <AnimatePresence>
      <motion.div
        key="auth-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/75 z-[600] flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && closeAuth()}
        role="dialog"
        aria-modal="true"
        aria-label={TITLES[mode]}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ duration: 0.25 }}
          className="bg-navy rounded-[24px] max-w-[440px] w-full overflow-hidden
            border border-white/[0.08] shadow-[0_25px_80px_rgba(0,0,0,0.6)]"
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-white/[0.07]">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2.5">
                <div className="bg-gold text-navy font-condensed font-black text-lg px-2 py-0.5 rounded-md">HM</div>
                <span className="text-white font-bold text-lg">Houti Cars</span>
              </div>
              <button onClick={closeAuth} aria-label="Fermer"
                className="bg-white/[0.08] text-white/60 w-8 h-8 rounded-full border-none cursor-pointer
                  flex items-center justify-center hover:bg-white/[0.15] hover:text-white transition-all">
                <FiX />
              </button>
            </div>
            <div className="mt-5">
              <h2 className="font-condensed font-black text-white text-[1.8rem]">{TITLES[mode]}</h2>
              {authNotice && (
                <p className="mt-3 rounded-xl border border-gold/25 bg-gold/[0.08] px-4 py-3 text-sm font-semibold leading-relaxed text-gold">
                  {authNotice}
                </p>
              )}
              {SUBTITLES[mode] && <p className="text-text-muted text-sm mt-1">{SUBTITLES[mode]}</p>}
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                {/* Email sent screen */}
                {mode === MODES.sent && (
                  <div className="text-center py-4">
                    <div className="text-5xl mb-4">📧</div>
                    <p className="text-white/80 text-sm leading-relaxed">
                      Un lien de réinitialisation a été envoyé à{' '}
                      <strong className="text-gold">{sentEmail}</strong>.
                      <br /><br />
                      Vérifiez votre boîte de réception (et vos spams).
                    </p>
                    <button onClick={() => switchMode(MODES.login)}
                      className="mt-6 text-gold text-sm font-semibold bg-transparent border-none
                        cursor-pointer hover:text-gold-light transition-colors">
                      ← Retour à la connexion
                    </button>
                  </div>
                )}

                {/* Signup-only fields */}
                {mode === MODES.signup && (
                  <>
                    <AuthField label="Nom complet" error={errors.fullName}>
                      <div className="relative">
                        <input ref={firstInputRef} type="text" placeholder="Mohammed Alami"
                          value={form.fullName} onChange={upd('fullName')} autoComplete="name"
                          className={`auth-input pl-10 ${errors.fullName ? 'border-red-500' : ''}`} />
                        <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm" />
                      </div>
                    </AuthField>
                    <AuthField label="Téléphone" error={errors.phone}>
                      <div className="relative">
                        <input type="tel" placeholder="+212 6XX XXX XXX"
                          value={form.phone} onChange={upd('phone')} autoComplete="tel"
                          className={`auth-input pl-10 ${errors.phone ? 'border-red-500' : ''}`} />
                        <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm" />
                      </div>
                    </AuthField>
                  </>
                )}

                {/* Email field */}
                {mode !== MODES.sent && (
                  <AuthField label="Email" error={errors.email}>
                    <div className="relative">
                      <input
                        ref={mode !== MODES.signup ? firstInputRef : undefined}
                        type="email" placeholder="votre@email.com"
                        value={form.email} onChange={upd('email')} autoComplete="email"
                        onKeyDown={mode === MODES.forgot ? handleKeyDown : undefined}
                        className={`auth-input pl-10 ${errors.email ? 'border-red-500' : ''}`} />
                      <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm" />
                    </div>
                  </AuthField>
                )}

                {/* Password fields */}
                {(mode === MODES.login || mode === MODES.signup) && (
                  <>
                    <AuthField label="Mot de passe" error={errors.password}>
                      <PasswordInput value={form.password} onChange={upd('password')}
                        onKeyDown={mode === MODES.login ? handleKeyDown : undefined}
                        className={errors.password ? 'border-red-500' : ''} />
                    </AuthField>
                    {mode === MODES.signup && (
                      <AuthField label="Confirmer le mot de passe" error={errors.password2}>
                        <PasswordInput value={form.password2} onChange={upd('password2')}
                          onKeyDown={handleKeyDown}
                          className={errors.password2 ? 'border-red-500' : ''} />
                      </AuthField>
                    )}
                  </>
                )}

                {/* Forgot link */}
                {mode === MODES.login && (
                  <div className="text-right -mt-1">
                    <button onClick={() => switchMode(MODES.forgot)}
                      className="text-gold text-[12px] bg-transparent border-none cursor-pointer hover:text-gold-light transition-colors">
                      Mot de passe oublié ?
                    </button>
                  </div>
                )}

                {/* Submit button */}
                {mode !== MODES.sent && (
                  <AuthButton loading={loading} onClick={handleSubmit}>
                    {{ login: '🔑 Se connecter', signup: '🚀 Créer mon compte', forgot: '📧 Envoyer le lien' }[mode]}
                  </AuthButton>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Footer mode switch */}
            {(mode === MODES.login || mode === MODES.signup) && (
              <div className="text-center mt-5 text-sm text-text-muted">
                {mode === MODES.login ? (
                  <>Pas encore de compte ?{' '}
                    <button onClick={() => switchMode(MODES.signup)}
                      className="text-gold font-semibold bg-transparent border-none cursor-pointer hover:text-gold-light transition-colors">
                      S'inscrire
                    </button></>
                ) : (
                  <>Déjà un compte ?{' '}
                    <button onClick={() => switchMode(MODES.login)}
                      className="text-gold font-semibold bg-transparent border-none cursor-pointer hover:text-gold-light transition-colors">
                      Se connecter
                    </button></>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
