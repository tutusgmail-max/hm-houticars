/**
 * validation.js
 * Pure validation functions — no side effects, fully testable.
 */
export { parseAuthError, AUTH_MESSAGES, isEmailAlreadyRegistered } from './authErrors'

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function validatePhone(phone) {
  return /^[+\d\s().-]{6,20}$/.test(phone.trim())
}

export function validatePassword(password) {
  return password.length >= 8
}

/** Signup minimum — matches Supabase default (6) for low friction */
export function validatePasswordSignup(password) {
  return (password || '').length >= 6
}

export function validateLoginForm({ email, password }) {
  const errors = {}
  if (!validateEmail(email)) errors.email = 'Adresse email invalide'
  if (!password) errors.password = 'Mot de passe requis'
  return errors
}

export function validateSignupForm({ fullName, phone, email, password, password2 }) {
  const errors = {}
  if (!fullName.trim()) errors.fullName = 'Nom complet requis'
  if (!validatePhone(phone)) errors.phone = 'Numéro de téléphone invalide'
  if (!validateEmail(email)) errors.email = 'Adresse email invalide'
  if (!validatePassword(password)) errors.password = 'Minimum 8 caractères'
  if (password !== password2) errors.password2 = 'Les mots de passe ne correspondent pas'
  return errors
}

/** Simplified signup — no password confirmation (lower friction) */
export function validateSignupFormSimple({ fullName, phone, email, password }) {
  const errors = {}
  if (!fullName?.trim()) errors.fullName = 'Nom complet requis'
  if (!validatePhone(phone || '')) errors.phone = 'Numéro de téléphone invalide (ex: +212 6XX XXX XXX)'
  if (!validateEmail(email || '')) errors.email = 'Adresse email invalide'
  if (!validatePassword(password || '')) errors.password = 'Minimum 8 caractères requis'
  return errors
}

/** Ultra-low friction — email + password only; name/phone optional */
export function validateSignupFormMinimal({ fullName, phone, email, password }) {
  const errors = {}
  if (!validateEmail(email || '')) errors.email = 'Email invalide'
  if (!validatePasswordSignup(password)) errors.password = 'Minimum 6 caractères'
  if (fullName?.trim() && fullName.trim().length < 2) errors.fullName = 'Nom trop court'
  if (phone?.trim() && !validatePhone(phone)) errors.phone = 'Numéro invalide'
  return errors
}

export function validateForgotForm({ email }) {
  const errors = {}
  if (!validateEmail(email)) errors.email = 'Adresse email invalide'
  return errors
}

export function validateResetForm({ password, password2 }) {
  const errors = {}
  if (!validatePassword(password)) errors.password = 'Minimum 8 caractères'
  if (password !== password2) errors.password2 = 'Les mots de passe ne correspondent pas'
  return errors
}

export function validateProfileForm({ full_name, phone }) {
  const errors = {}
  if (!full_name?.trim()) errors.full_name = 'Nom complet requis'
  if (phone && !validatePhone(phone)) errors.phone = 'Numéro de téléphone invalide'
  return errors
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0
}

