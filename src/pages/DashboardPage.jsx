/**
 * DashboardPage.jsx  — v3
 *
 * BUGS FIXED vs original:
 * 1. useEffect navigated imperatively on every render if !user (missing memoization).
 * 2. profileForm state initialized once — stale after profile loaded async.
 * 3. No loading skeleton — raw empty state on every fresh load.
 * 4. No avatar upload — missing from original.
 * 5. No change password — missing from original.
 * 6. No delete account — missing from original.
 * 7. No profile form validation before saving.
 * 8. Edit mode didn't sync latest profile values if profile loaded after mount.
 */
import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiUser, FiCalendar, FiLogOut, FiEdit2, FiCheck, FiX,
  FiLock, FiTrash2, FiCamera, FiShield,
} from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useApp } from '../context/AppContext'
import { getUserReservations } from '../lib/supabase'
import { updateProfileData, uploadAvatar, deleteUserAccount } from '../services/profile.service'
import { authChangePassword } from '../services/auth.service'
import { validateProfileForm, validateResetForm, hasErrors } from '../utils/validation'
import AuthField from '../components/auth/AuthField'
import PasswordInput from '../components/auth/PasswordInput'
import { STATUS_STYLES } from '../data'
import IdentityDocumentsSection from '../components/profile/IdentityDocumentsSection'
import { areDocumentsComplete, parseDocuments } from '../services/documentUpload.service'

const TABS = [
  { id: 'reservations', label: 'Mes Réservations', icon: FiCalendar },
  { id: 'profile',      label: 'Mon Profil',       icon: FiUser },
  { id: 'security',     label: 'Sécurité',          icon: FiShield },
]

function Skeleton({ className }) {
  return <div className={`animate-pulse bg-white/10 rounded-lg ${className}`} />
}

export default function DashboardPage() {
  const { user, profile, profileLoading, userDocuments, isAdmin, loadProfile, loadUserDocuments, signOut } = useAuth()
  const { addToast } = useApp()
  const navigate = useNavigate()

  const [tab, setTab] = useState('reservations')
  const [reservations, setReservations] = useState([])
  const [resLoading, setResLoading] = useState(true)

  // Profile edit
  const [editMode, setEditMode] = useState(false)
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '' })
  const [profileErrors, setProfileErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Avatar
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef(null)

  // Password
  const [pwForm, setPwForm] = useState({ password: '', password2: '' })
  const [pwErrors, setPwErrors] = useState({})
  const [pwSaving, setPwSaving] = useState(false)

  // Delete account modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) navigate('/', { replace: true })
  }, [user, navigate])

  // Fetch reservations
  useEffect(() => {
    if (!user) return
    setResLoading(true)
    getUserReservations(user.id)
      .then(setReservations)
      .catch(() => setReservations([]))
      .finally(() => setResLoading(false))
  }, [user])

  // FIX 8: sync profile form when profile loads (async)
  useEffect(() => {
    if (profile) {
      setProfileForm({ full_name: profile.full_name || '', phone: profile.phone || '' })
    }
  }, [profile])

  if (!user) return null

  // ── Avatar upload ─────────────────────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { addToast('Image max 2MB.', 'error'); return }
    setAvatarUploading(true)
    try {
      await uploadAvatar(user.id, file)
      await loadProfile(user.id)
      addToast('Photo de profil mise à jour !')
    } catch {
      addToast('Erreur lors du téléchargement.', 'error')
    } finally {
      setAvatarUploading(false)
    }
  }

  // ── Save profile ──────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    const errs = validateProfileForm(profileForm)
    if (hasErrors(errs)) { setProfileErrors(errs); return }

    setSaving(true)
    try {
      await updateProfileData(user.id, profileForm)
      await loadProfile(user.id)
      addToast('Profil mis à jour avec succès !')
      setEditMode(false)
      setProfileErrors({})
    } catch {
      addToast('Erreur lors de la mise à jour.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    setEditMode(false)
    setProfileErrors({})
    setProfileForm({ full_name: profile?.full_name || '', phone: profile?.phone || '' })
  }

  // ── Change password ───────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    const errs = validateResetForm(pwForm)
    if (hasErrors(errs)) { setPwErrors(errs); return }

    setPwSaving(true)
    try {
      await authChangePassword(pwForm.password)
      addToast('Mot de passe mis à jour avec succès !')
      setPwForm({ password: '', password2: '' })
      setPwErrors({})
    } catch (err) {
      addToast(err?.message || 'Erreur lors du changement de mot de passe.', 'error')
    } finally {
      setPwSaving(false)
    }
  }

  // ── Delete account ────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'SUPPRIMER') return
    setDeleting(true)
    try {
      await deleteUserAccount(user.id)
      navigate('/', { replace: true })
    } catch {
      addToast('Erreur lors de la suppression.', 'error')
      setDeleting(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    addToast('Déconnexion réussie.')
    navigate('/')
  }

  const initials = profile?.full_name?.charAt(0).toUpperCase()
    || user.email?.charAt(0).toUpperCase()
    || '?'

  const stats = [
    { label: 'Réservations', value: reservations.length },
    { label: 'En cours', value: reservations.filter(r => r.status === 'confirmed').length },
    { label: 'Complétées', value: reservations.filter(r => r.status === 'completed').length },
  ]

  return (
    <div className="min-h-screen bg-[#F5F6F8] pt-[108px]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-navy text-white px-4 sm:px-10 py-10">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gold/40 flex-shrink-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gold flex items-center justify-center
                      text-navy font-condensed font-black text-xl">
                      {initials}
                    </div>
                  )}
                </div>
                {avatarUploading && (
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div>
                {profileLoading ? (
                  <>
                    <Skeleton className="h-7 w-44 mb-1" />
                    <Skeleton className="h-4 w-36" />
                  </>
                ) : (
                  <>
                    <h1 className="font-condensed font-black text-white text-[1.8rem]">
                      {profile?.full_name || 'Mon espace'}
                    </h1>
                    <p className="text-text-muted text-sm">{user.email}</p>
                    {isAdmin && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-gold/20 text-gold text-[11px] font-bold rounded-full">
                        👑 Administrateur
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-2 bg-white/[0.08] text-white font-semibold
                text-[13px] px-4 py-2.5 rounded-[10px] border border-white/20 cursor-pointer
                transition-all duration-200 hover:bg-white/[0.15]">
              <FiLogOut /> Déconnexion
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-6">
            {stats.map(s => (
              <div key={s.label}>
                <div className="font-condensed font-black text-gold text-2xl">{s.value}</div>
                <div className="text-text-muted text-[11px] uppercase tracking-[1px]">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-8 bg-white/[0.07] rounded-xl p-1 w-fit flex-wrap">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-[10px] font-semibold text-[13px]
                  cursor-pointer transition-all duration-200 border-none
                  ${tab === id ? 'bg-gold text-navy' : 'text-white/60 hover:text-white bg-transparent'}`}>
                <Icon className="text-[14px]" /> <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="max-w-[1100px] mx-auto px-4 sm:px-10 py-10">
        <AnimatePresence mode="wait">

          {/* ─── RESERVATIONS TAB ─────────────────────────────── */}
          {tab === 'reservations' && (
            <motion.div key="res" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-condensed font-black text-navy text-[1.5rem]">Mes Réservations</h2>
                <button
                  onClick={() => { navigate('/'); setTimeout(() => document.getElementById('cars')?.scrollIntoView({ behavior: 'smooth' }), 100) }}
                  className="bg-gold text-navy font-bold text-[13px] px-5 py-2.5 rounded-[10px]
                    border-none cursor-pointer hover:bg-gold-light transition-colors">
                  + Nouvelle réservation
                </button>
              </div>

              {resLoading ? (
                <div className="flex flex-col gap-4">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-[140px] w-full bg-white border border-black/[0.06]" />)}
                </div>
              ) : reservations.length === 0 ? (
                <div className="bg-white rounded-[16px] p-12 text-center border border-black/[0.06]">
                  <div className="text-5xl mb-4">🚗</div>
                  <div className="font-condensed font-black text-navy text-[1.4rem] mb-2">Aucune réservation</div>
                  <p className="text-text-muted text-sm">Parcourez notre flotte et réservez votre prochain véhicule.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {reservations.map((res) => {
                    const status = STATUS_STYLES[res.status] || STATUS_STYLES.pending
                    return (
                      <motion.div key={res.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[16px] p-6 border border-black/[0.06] shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
                        <div className="flex items-start justify-between flex-wrap gap-4">
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-condensed font-black text-navy text-[1.2rem]">{res.car_name}</span>
                              <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${status.bg} ${status.text}`}>
                                {status.label}
                              </span>
                            </div>
                            <div className="text-text-muted text-sm">Réf: <strong className="text-navy">{res.ref}</strong></div>
                          </div>
                          <div className="font-condensed font-black text-gold text-[1.5rem]">{res.total} DH</div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-[#f0f2f5]">
                          <Info label="Départ" value={`${res.pickup_location} – ${res.start_date}`} />
                          <Info label="Retour" value={`${res.return_location} – ${res.end_date}`} />
                          <Info label="Durée" value={`${res.days} jour${res.days > 1 ? 's' : ''}`} />
                          <Info label="Paiement" value={res.payment_method} />
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ─── PROFILE TAB ──────────────────────────────────── */}
          {tab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="max-w-[560px]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-condensed font-black text-navy text-[1.5rem]">Mon Profil</h2>
                {!editMode ? (
                  <button onClick={() => setEditMode(true)}
                    className="flex items-center gap-2 bg-navy text-white font-semibold text-[13px]
                      px-4 py-2 rounded-[10px] border-none cursor-pointer hover:bg-gold hover:text-navy transition-colors">
                    <FiEdit2 /> Modifier
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={handleSaveProfile} disabled={saving}
                      className="flex items-center gap-1.5 bg-gold text-navy font-bold text-[13px]
                        px-4 py-2 rounded-[10px] border-none cursor-pointer disabled:opacity-60">
                      {saving ? '...' : <><FiCheck /> Sauvegarder</>}
                    </button>
                    <button onClick={cancelEdit}
                      className="flex items-center gap-1.5 bg-gray-100 text-navy font-semibold text-[13px]
                        px-4 py-2 rounded-[10px] border-none cursor-pointer">
                      <FiX /> Annuler
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-[16px] p-8 border border-black/[0.06]">
                {/* Avatar section */}
                <div className="flex items-center gap-5 pb-6 mb-6 border-b border-[#f0f2f5]">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gold/30">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gold flex items-center justify-center text-navy font-condensed font-black text-2xl">
                          {initials}
                        </div>
                      )}
                    </div>
                    {avatarUploading && (
                      <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-navy font-semibold text-sm mb-2">Photo de profil</p>
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                      className="flex items-center gap-2 bg-navy text-white text-[12px] font-semibold
                        px-3 py-2 rounded-[8px] border-none cursor-pointer hover:bg-gold hover:text-navy
                        transition-colors disabled:opacity-60">
                      <FiCamera className="text-xs" />
                      {avatarUploading ? 'Téléchargement...' : 'Changer la photo'}
                    </button>
                    <p className="text-text-muted text-[11px] mt-1">JPG, PNG · max 2MB</p>
                    <input ref={avatarInputRef} type="file" accept="image/*"
                      onChange={handleAvatarChange} className="hidden" />
                  </div>
                </div>

                {/* Profile fields */}
                <div className="flex flex-col gap-5">
                  <ProfileField label="Nom complet">
                    {editMode ? (
                      <AuthField error={profileErrors.full_name}>
                        <input type="text" value={profileForm.full_name}
                          onChange={(e) => setProfileForm(p => ({ ...p, full_name: e.target.value }))}
                          className="input-gold" />
                      </AuthField>
                    ) : (
                      <div className="text-navy font-semibold">{profile?.full_name || '—'}</div>
                    )}
                  </ProfileField>

                  <ProfileField label="Email">
                    <div className="text-navy font-semibold">{user.email}</div>
                    <div className="text-[11px] text-text-muted mt-0.5">L'email ne peut pas être modifié ici.</div>
                  </ProfileField>

                  <ProfileField label="Téléphone">
                    {editMode ? (
                      <AuthField error={profileErrors.phone}>
                        <input type="tel" value={profileForm.phone}
                          onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                          className="input-gold" />
                      </AuthField>
                    ) : (
                      <div className="text-navy font-semibold">{profile?.phone || '—'}</div>
                    )}
                  </ProfileField>

                  <ProfileField label="Rôle">
                    <span className={`inline-flex px-3 py-1 rounded-full text-[12px] font-bold
                      ${profile?.role === 'admin' ? 'bg-gold/20 text-gold-dark' : 'bg-blue-100 text-blue-700'}`}>
                      {profile?.role === 'admin' ? '👑 Administrateur' : '👤 Client'}
                    </span>
                  </ProfileField>

                  <ProfileField label="Membre depuis">
                    <div className="text-navy font-semibold">
                      {profile?.created_at
                        ? new Date(profile.created_at).toLocaleDateString('fr-MA', { year: 'numeric', month: 'long', day: 'numeric' })
                        : '—'}
                    </div>
                  </ProfileField>

                  <ProfileField label="Documents">
                    <span className={`inline-flex px-3 py-1 rounded-full text-[12px] font-bold
                      ${areDocumentsComplete(parseDocuments(userDocuments))
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                      {areDocumentsComplete(parseDocuments(userDocuments))
                        ? '✓ CIN & permis enregistrés'
                        : '⚠ À fournir lors de la prochaine réservation'}
                    </span>
                  </ProfileField>
                </div>

                <IdentityDocumentsSection
                  userId={user.id}
                  userDocuments={userDocuments}
                  addToast={addToast}
                  onUpdated={() => loadUserDocuments(user.id, profile)}
                />
              </div>
            </motion.div>
          )}

          {/* ─── SECURITY TAB ─────────────────────────────────── */}
          {tab === 'security' && (
            <motion.div key="security" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="max-w-[560px] flex flex-col gap-6">

              {/* Change password */}
              <div className="bg-white rounded-[16px] p-8 border border-black/[0.06]">
                <h3 className="font-condensed font-black text-navy text-[1.2rem] mb-1 flex items-center gap-2">
                  <FiLock className="text-gold" /> Changer le mot de passe
                </h3>
                <p className="text-text-muted text-sm mb-6">Choisissez un mot de passe sécurisé (minimum 8 caractères).</p>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[1px] mb-1.5">
                      Nouveau mot de passe
                    </label>
                    <PasswordInput
                      value={pwForm.password}
                      onChange={(e) => { setPwForm(p => ({ ...p, password: e.target.value })); setPwErrors(p => ({ ...p, password: undefined })) }}
                      placeholder="Minimum 8 caractères"
                      className={`${pwErrors.password ? 'border-red-400' : 'border-[#e0e4ea]'} bg-gray-custom-light text-navy placeholder-text-muted`}
                    />
                    {pwErrors.password && <p className="text-red-400 text-[11px] mt-1">⚠ {pwErrors.password}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-[1px] mb-1.5">
                      Confirmer le mot de passe
                    </label>
                    <PasswordInput
                      value={pwForm.password2}
                      onChange={(e) => { setPwForm(p => ({ ...p, password2: e.target.value })); setPwErrors(p => ({ ...p, password2: undefined })) }}
                      onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()}
                      className={`${pwErrors.password2 ? 'border-red-400' : 'border-[#e0e4ea]'} bg-gray-custom-light text-navy placeholder-text-muted`}
                    />
                    {pwErrors.password2 && <p className="text-red-400 text-[11px] mt-1">⚠ {pwErrors.password2}</p>}
                  </div>
                  <button
                    onClick={handleChangePassword}
                    disabled={pwSaving}
                    className="flex items-center justify-center gap-2 bg-navy text-white font-bold text-[14px]
                      px-6 py-3 rounded-[10px] border-none cursor-pointer transition-colors
                      hover:bg-gold hover:text-navy disabled:opacity-60 disabled:cursor-not-allowed">
                    {pwSaving ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Mise à jour...</>
                    ) : (
                      <><FiCheck /> Mettre à jour le mot de passe</>
                    )}
                  </button>
                </div>
              </div>

              {/* Delete account */}
              <div className="bg-white rounded-[16px] p-8 border border-red-100">
                <h3 className="font-condensed font-black text-red-600 text-[1.2rem] mb-1 flex items-center gap-2">
                  <FiTrash2 /> Zone dangereuse
                </h3>
                <p className="text-text-muted text-sm mb-4">
                  La suppression de votre compte est irréversible. Toutes vos données seront perdues.
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-2 bg-red-50 text-red-600 font-semibold text-[13px]
                    px-4 py-2.5 rounded-[10px] border border-red-200 cursor-pointer hover:bg-red-600 hover:text-white transition-colors">
                  <FiTrash2 /> Supprimer mon compte
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Delete Account Confirmation Modal ─────────────────────────────── */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[700] flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-[20px] max-w-[420px] w-full p-8 border border-red-100 shadow-xl"
            >
              <div className="text-4xl mb-4 text-center">⚠️</div>
              <h3 className="font-condensed font-black text-navy text-[1.4rem] text-center mb-2">
                Supprimer le compte ?
              </h3>
              <p className="text-text-muted text-sm text-center mb-6">
                Cette action est <strong className="text-red-600">irréversible</strong>.
                Tapez <strong>SUPPRIMER</strong> pour confirmer.
              </p>
              <input
                type="text" value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="SUPPRIMER"
                className="input-gold mb-4 text-center tracking-[2px] font-bold border-red-200 focus:border-red-400"
              />
              <div className="flex gap-3">
                <button onClick={() => { setShowDeleteModal(false); setDeleteConfirm('') }}
                  className="flex-1 bg-gray-100 text-navy font-semibold py-3 rounded-[10px] border-none cursor-pointer hover:bg-gray-200 transition-colors">
                  Annuler
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== 'SUPPRIMER' || deleting}
                  className="flex-1 bg-red-600 text-white font-bold py-3 rounded-[10px] border-none cursor-pointer
                    hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  {deleting ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-[10px] text-text-muted font-bold uppercase tracking-[1px] mb-0.5">{label}</div>
      <div className="text-[13px] text-navy font-semibold">{value}</div>
    </div>
  )
}

function ProfileField({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] text-text-muted font-bold uppercase tracking-[1px] mb-1.5">{label}</label>
      {children}
    </div>
  )
}
