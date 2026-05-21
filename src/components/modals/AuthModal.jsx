/**
 * AuthModal.jsx — v4 PREMIUM
 *
 * CHANGES vs v3:
 * 1. No email confirmation required — signup logs user in immediately
 * 2. Full glassmorphism redesign matching luxury HM aesthetic
 * 3. Mobile-first with improved spacing, typography, and touch targets
 * 4. Premium animated gradient background + shimmer effects
 * 5. Smooth staggered field animations
 * 6. Removed password2 confirm field (friction reduction)
 * 7. Guest reservation CTA in footer
 * 8. Inline strength indicator for password
 * 9. Premium CTA buttons with glow effects
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiMail, FiUser, FiPhone, FiLock, FiArrowRight } from 'react-icons/fi'
import { useApp } from '../../context/AppContext'
import { authSignIn, authSignUp, authForgotPassword } from '../../services/auth.service'
import {
  validateLoginForm,
  validateSignupFormMinimal,
  validateForgotForm,
  hasErrors,
  parseAuthError,
  AUTH_MESSAGES,
  isEmailAlreadyRegistered,
} from '../../utils/validation'
import { logAuthError } from '../../utils/authDebug'
import PasswordInput from '../auth/PasswordInput'
import {
  isAuthGloballyBlocked,
  getAuthBlockedMessage,
} from '../../utils/authRequestGuard'

const MODES = { login: 'login', signup: 'signup', forgot: 'forgot', sent: 'sent' }

function emptyForm() {
  return { fullName: '', phone: '', email: '', password: '' }
}

function PremiumField({ label, error, icon: Icon, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
    >
      <label className="block text-[10px] font-bold text-white/40 uppercase tracking-[2px] mb-1.5">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold/50 text-sm pointer-events-none z-10" />
        )}
        {children}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            key="err"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.15 }}
            className="text-red-400/90 text-[11px] mt-1.5 flex items-center gap-1 pl-1"
          >
            <span className="text-red-400">⚠</span> {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function PremiumInput({ icon, error, inputRef, ...props }) {
  return (
    <input
      ref={inputRef}
      {...props}
      className={`
        w-full px-4 py-3.5 rounded-xl text-sm text-white placeholder-white/25
        bg-white/[0.05] border transition-all duration-200 outline-none
        focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(201,168,76,0.12)]
        ${error
          ? 'border-red-400/50 focus:border-red-400/70'
          : 'border-white/[0.10] focus:border-gold/50'}
        ${icon ? 'pl-10' : ''}
      `}
    />
  )
}

export default function AuthModal() {
  const { authModal, authNotice, closeAuth, addToast } = useApp()

  const [mode, setMode] = useState(authModal || MODES.login)
  useEffect(() => {
    if (!authModal) return
    setMode(authModal)
    setErrors({})
    setSentEmail('')
  }, [authModal])

  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState(() => emptyForm())
  const [sentEmail, setSentEmail] = useState('')

  const firstInputRef = useRef(null)
  const submitLockRef = useRef(false)
  const submitCompletedRef = useRef(false)
  const submitGenerationRef = useRef(0)
  const formRef = useRef(null)

  useEffect(() => {
    if (!authModal) {
      submitLockRef.current = false
      submitCompletedRef.current = false
    }
  }, [authModal])

  useEffect(() => {
    if (authModal) setTimeout(() => firstInputRef.current?.focus(), 150)
  }, [authModal, mode])

  const switchMode = useCallback((next) => {
    if (loading || isSubmitting) return
    submitGenerationRef.current += 1
    setMode(next)
    setErrors({})
    setForm(emptyForm())
  }, [loading, isSubmitting])

  const isCooldownActive = isAuthGloballyBlocked()
  const isSubmitDisabled = loading || isSubmitting || isCooldownActive || submitCompletedRef.current

  const releaseSubmitLock = useCallback(() => {
    window.setTimeout(() => {
      submitLockRef.current = false
    }, 500)
  }, [])

  const upd = (k) => (e) => {
    setForm((p) => ({ ...p, [k]: e.target.value }))
    setErrors((p) => ({ ...p, [k]: undefined }))
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    if (submitLockRef.current || submitCompletedRef.current || loading || isSubmitting || isAuthGloballyBlocked()) {
      return
    }

    let errs = {}
    if (mode === MODES.login)  errs = validateLoginForm(form)
    if (mode === MODES.signup) errs = validateSignupFormMinimal(form)
    if (mode === MODES.forgot) errs = validateForgotForm(form)

    if (hasErrors(errs)) { setErrors(errs); return }

    const generation = ++submitGenerationRef.current
    const submitMode = mode
    submitLockRef.current = true
    setIsSubmitting(true)
    setLoading(true)
    setErrors((p) => ({ ...p, form: undefined }))

    try {
      if (submitMode === MODES.login) {
        const result = await authSignIn({ email: form.email, password: form.password })
        if (generation !== submitGenerationRef.current) return
        if (!result?.session) {
          logAuthError('signIn.noSession', { message: 'missing session after signIn' })
          setErrors({ form: AUTH_MESSAGES.serverError })
          addToast(AUTH_MESSAGES.serverError, 'error')
          return
        }
        submitCompletedRef.current = true
        addToast(AUTH_MESSAGES.loginSuccess, 'success')
        closeAuth()
      } else if (submitMode === MODES.signup) {
        const result = await authSignUp({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          phone: form.phone,
        })
        if (generation !== submitGenerationRef.current) return

        if (result?.session) {
          submitCompletedRef.current = true
          addToast(AUTH_MESSAGES.signupSuccess, 'success')
          closeAuth()
          return
        }

        if (result?.user) {
          submitCompletedRef.current = true
          const savedEmail = form.email
          setForm({ ...emptyForm(), email: savedEmail })
          setMode(MODES.login)
          addToast(AUTH_MESSAGES.signupConfirmLogin, 'success')
          return
        }

        logAuthError('signUp.emptyResult', { message: 'no user and no session' })
        setErrors({ form: AUTH_MESSAGES.serverError })
        addToast(AUTH_MESSAGES.serverError, 'error')
      } else if (submitMode === MODES.forgot) {
        await authForgotPassword(form.email)
        if (generation !== submitGenerationRef.current) return
        setSentEmail(form.email)
        setMode(MODES.sent)
      }
    } catch (err) {
      if (generation !== submitGenerationRef.current) return
      logAuthError(submitMode, err)

      const friendly = parseAuthError(err)
      setErrors({ form: friendly })

      if (isEmailAlreadyRegistered(err) && submitMode === MODES.signup) {
        setMode(MODES.login)
        setErrors({ form: AUTH_MESSAGES.emailInUse })
        addToast(AUTH_MESSAGES.emailInUse, 'error')
        return
      }

      addToast(friendly, 'error')
    } finally {
      if (generation === submitGenerationRef.current) {
        setLoading(false)
        setIsSubmitting(false)
        if (!isAuthGloballyBlocked()) {
          releaseSubmitLock()
        }
      }
    }
  }

  const blockEnterResubmit = (e) => {
    if (e.key === 'Enter' && (isSubmitting || loading || isCooldownActive)) {
      e.preventDefault()
    }
  }

  if (!authModal) return null

  const titles = {
    login:  'Connexion',
    signup: 'Compte gratuit',
    forgot: 'Mot de passe oublié',
    sent:   'Email envoyé',
  }
  const subtitles = {
    login:  'Email + mot de passe — accès immédiat.',
    signup: '30 secondes — email et mot de passe suffisent.',
    forgot: 'Lien de réinitialisation par email.',
    sent:   null,
  }

  return (
    <AnimatePresence>
      <motion.div
        key="auth-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[600] flex items-center justify-center p-4"
        style={{ background: 'rgba(5,10,20,0.88)', backdropFilter: 'blur(12px)' }}
        onClick={(e) => e.target === e.currentTarget && closeAuth()}
        role="dialog"
        aria-modal="true"
        aria-label={titles[mode]}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 24 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-[420px] w-full overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(20,37,58,0.95) 0%, rgba(11,22,35,0.98) 100%)',
            border: '1px solid rgba(201,168,76,0.18)',
            borderRadius: '24px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {/* Premium shimmer top bar */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.6), transparent)' }}
          />

          {/* Ambient glow */}
          <div
            className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-32 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(201,168,76,0.08) 0%, transparent 70%)' }}
          />

          {/* Header */}
          <div className="relative px-7 pt-7 pb-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div
                  className="font-condensed font-black text-[15px] px-2.5 py-1 rounded-lg text-navy"
                  style={{ background: 'linear-gradient(135deg, #E8C76A, #C9A84C)' }}
                >
                  HM
                </div>
                <span className="text-white font-semibold text-sm tracking-wide">Houti Cars</span>
              </div>
              <button
                onClick={closeAuth}
                aria-label="Fermer"
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-all duration-200 hover:bg-white/[0.08]"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <FiX size={14} />
              </button>
            </div>

            <div>
              <h2
                className="font-condensed font-black text-white leading-none"
                style={{ fontSize: 'clamp(1.6rem, 4vw, 2rem)' }}
              >
                {titles[mode]}
              </h2>
              {authNotice && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 rounded-xl px-4 py-3 text-xs font-semibold leading-relaxed text-gold"
                  style={{ border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.06)' }}
                >
                  {authNotice}
                </motion.p>
              )}
              {subtitles[mode] && (
                <p className="text-white/40 text-xs mt-1.5 leading-relaxed">{subtitles[mode]}</p>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="mx-7 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

          {/* Body */}
          <div className="px-7 py-6">
            {errors.form && mode !== MODES.sent && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 rounded-xl px-4 py-3 text-xs leading-relaxed text-amber-100/90"
                style={{ border: '1px solid rgba(251,191,36,0.25)', background: 'rgba(251,191,36,0.08)' }}
              >
                {errors.form}
              </motion.div>
            )}

            {isCooldownActive && (
              <p className="mb-4 text-center text-xs text-amber-200/90">
                {getAuthBlockedMessage()}
              </p>
            )}

            <form
              ref={formRef}
              noValidate
              onSubmit={handleSubmit}
              onKeyDown={blockEnterResubmit}
              className={isSubmitDisabled ? 'pointer-events-none opacity-95' : ''}
            >
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                {/* Email sent screen */}
                {mode === MODES.sent && (
                  <div className="text-center py-6">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                      style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}
                    >
                      <FiMail className="text-gold text-2xl" />
                    </div>
                    <p className="text-white/70 text-sm leading-relaxed">
                      Lien envoyé à{' '}
                      <strong className="text-gold">{sentEmail}</strong>
                      <br /><span className="text-white/40 text-xs">Vérifiez vos spams si besoin.</span>
                    </p>
                    <button
                      onClick={() => switchMode(MODES.login)}
                      className="mt-5 text-gold text-xs font-semibold bg-transparent border-none cursor-pointer hover:text-gold-light transition-colors"
                    >
                      ← Retour à la connexion
                    </button>
                  </div>
                )}

                {/* Email field */}
                {mode !== MODES.sent && (
                  <PremiumField label="Email" error={errors.email} icon={FiMail} delay={0.05}>
                    <PremiumInput
                      inputRef={firstInputRef}
                      type="email"
                      placeholder="votre@email.com"
                      value={form.email}
                      onChange={upd('email')}
                      autoComplete="email"
                      error={errors.email}
                      icon
                    />
                  </PremiumField>
                )}

                {/* Password */}
                {(mode === MODES.login || mode === MODES.signup) && (
                  <PremiumField
                    label={mode === MODES.signup ? 'Mot de passe (8+ lettres et chiffres)' : 'Mot de passe'}
                    error={errors.password}
                    icon={FiLock}
                    delay={0.08}
                  >
                    <PasswordInput
                      value={form.password}
                      onChange={upd('password')}
                      autoComplete={mode === MODES.signup ? 'new-password' : 'current-password'}
                      className={errors.password ? 'border-red-400/50' : ''}
                    />
                  </PremiumField>
                )}

                {/* Signup optional fields — collected at booking if skipped */}
                {mode === MODES.signup && (
                  <>
                    <PremiumField label="Nom (optionnel)" error={errors.fullName} icon={FiUser} delay={0.11}>
                      <PremiumInput
                        type="text"
                        placeholder="Pour la réservation"
                        value={form.fullName}
                        onChange={upd('fullName')}
                        autoComplete="name"
                        error={errors.fullName}
                        icon
                      />
                    </PremiumField>
                    <PremiumField label="WhatsApp (optionnel)" error={errors.phone} icon={FiPhone} delay={0.14}>
                      <PremiumInput
                        type="tel"
                        placeholder="+212 6XX XXX XXX"
                        value={form.phone}
                        onChange={upd('phone')}
                        autoComplete="tel"
                        error={errors.phone}
                        icon
                      />
                    </PremiumField>
                  </>
                )}

                {/* Forgot link */}
                {mode === MODES.login && (
                  <div className="text-right -mt-1">
                    <button
                      onClick={() => switchMode(MODES.forgot)}
                      className="text-gold/70 text-[11px] bg-transparent border-none cursor-pointer hover:text-gold transition-colors"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                )}

                {/* CTA Button */}
                {mode !== MODES.sent && (
                  <motion.button
                    type="submit"
                    disabled={isSubmitDisabled}
                    aria-busy={loading || isSubmitting}
                    whileHover={{ scale: isSubmitDisabled ? 1 : 1.01 }}
                    whileTap={{ scale: isSubmitDisabled ? 1 : 0.99 }}
                    className="w-full py-3.5 rounded-xl font-bold text-[14px] font-condensed uppercase tracking-[2px] border-none cursor-pointer mt-1 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
                    style={{
                      background: isSubmitDisabled ? 'rgba(201,168,76,0.6)' : 'linear-gradient(135deg, #E8C76A 0%, #C9A84C 100%)',
                      color: '#0B1623',
                      boxShadow: isSubmitDisabled ? 'none' : '0 8px 24px rgba(201,168,76,0.3)',
                    }}
                  >
                    {loading || isSubmitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
                        <span>
                          {mode === MODES.signup ? 'Création en cours...' : 'Un instant...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>
                          {mode === MODES.login && 'Se connecter'}
                          {mode === MODES.signup && 'Créer mon compte — gratuit'}
                          {mode === MODES.forgot && 'Envoyer le lien'}
                        </span>
                        <FiArrowRight size={14} />
                      </>
                    )}
                  </motion.button>
                )}
              </motion.div>
            </AnimatePresence>
            </form>

            {/* Footer links */}
            {(mode === MODES.login || mode === MODES.signup) && (
              <div className="mt-5 space-y-3">
                <div className="text-center text-xs text-white/30">
                  {mode === MODES.login ? (
                    <>
                      Pas encore de compte ?{' '}
                      <button
                        onClick={() => switchMode(MODES.signup)}
                        className="text-gold font-semibold bg-transparent border-none cursor-pointer hover:text-gold-light transition-colors"
                      >
                        S'inscrire gratuitement
                      </button>
                    </>
                  ) : (
                    <>
                      Déjà un compte ?{' '}
                      <button
                        onClick={() => switchMode(MODES.login)}
                        className="text-gold font-semibold bg-transparent border-none cursor-pointer hover:text-gold-light transition-colors"
                      >
                        Se connecter
                      </button>
                    </>
                  )}
                </div>

              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
