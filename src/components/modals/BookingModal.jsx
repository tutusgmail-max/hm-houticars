/**
 * BookingModal.jsx — v3 Enhanced
 * 4-step luxury booking flow with Supabase integration.
 */
import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX } from 'react-icons/fi'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../auth/AuthContext'
import { createReservation, getCarBookedDates } from '../../lib/supabase'
import { LOCATIONS, PAYMENT_METHODS } from '../../data'
import { RESERVATION_DOC_KEYS, emptyDocsState } from '../../constants/identityDocuments'
import {
  parseDocuments,
  areDocumentsComplete,
  resolveDocumentUrls,
  docsToReservationUrlColumns,
  uploadAllReservationDocuments,
} from '../../services/documentUpload.service'
import ReservationDocumentUpload from '../booking/ReservationDocumentUpload'

const T = {
  gold:'#C9A84C', goldLight:'#E8C76A', goldGlow:'rgba(201,168,76,0.18)',
  navy:'#0B1623', navyMid:'#14253A', navyLight:'#1E3353',
  white:'#FFFFFF', muted:'#8A95A5',
  border:'rgba(201,168,76,0.15)', success:'#2DD4BF', danger:'#F87171',
}
const css = {
  input:   { background:T.navyLight, border:`1px solid ${T.border}`, borderRadius:10, color:T.white, width:'100%', padding:'12px 16px', fontSize:14, outline:'none' },
  label:   { fontSize:11, fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:T.muted, marginBottom:6, display:'block' },
  goldBtn: { background:`linear-gradient(135deg, ${T.gold} 0%, ${T.goldLight} 100%)`, color:T.navy, border:'none', borderRadius:10, fontWeight:700, cursor:'pointer' },
  ghostBtn:{ background:'transparent', color:T.gold, border:`1px solid ${T.border}`, borderRadius:10, fontWeight:600, cursor:'pointer' },
}

function daysBetween(a,b){ if(!a||!b) return 0; return Math.max(0,Math.round((new Date(b)-new Date(a))/86400000)) }
function todayStr(){ return new Date().toISOString().split('T')[0] }
function formatDate(d){ if(!d) return '—'; return new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'}) }

const STEPS=[{label:'Dates',icon:'📅'},{label:'Infos',icon:'👤'},{label:'Docs',icon:'🪪'},{label:'Paiement',icon:'💳'}]

export default function BookingModal() {
  const { bookingModal, closeBooking, openReceipt, addToast } = useApp()
  const { user, profile, userDocuments, loadProfile, loadUserDocuments } = useAuth()
  const [step, setStep]   = useState(0)
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [form, setForm] = useState({ start:'', end:'', pickup:LOCATIONS[0], returnLoc:LOCATIONS[0], name:'', email:'', phone:'', payment:'cash', notes:'' })
  const [docs, setDocs] = useState(emptyDocsState)
  const [docPreviews, setDocPreviews] = useState({})
  const [errors, setErrors] = useState({})
  const [savedDocUrls, setSavedDocUrls] = useState({})
  const [forceDocUpload, setForceDocUpload] = useState(false)

  const hasSavedIdentity = areDocumentsComplete(parseDocuments(userDocuments))
  const useProfileDocs = hasSavedIdentity && !forceDocUpload

  useEffect(() => {
    if (!userDocuments || !hasSavedIdentity) {
      setSavedDocUrls({})
      return
    }
    let cancelled = false
    resolveDocumentUrls(userDocuments)
      .then((resolved) => {
        if (!cancelled) {
          const parsed = parseDocuments(resolved)
          const urls = {}
          for (const key of RESERVATION_DOC_KEYS) {
            if (parsed[key]?.url) urls[key] = parsed[key].url
          }
          setSavedDocUrls(urls)
        }
      })
      .catch(() => { if (!cancelled) setSavedDocUrls({}) })
    return () => { cancelled = true }
  }, [userDocuments, hasSavedIdentity])

  useEffect(() => {
    if (!bookingModal) return
    setStep(0)
    setErrors({})
    setUploadProgress({})
    setDocs(emptyDocsState())
    setDocPreviews({})
    setForceDocUpload(false)
    setForm((p) => ({
      ...p,
      start: bookingModal.prefStart || '',
      end: bookingModal.prefEnd || '',
      name: profile?.full_name || user?.user_metadata?.full_name || '',
      email: profile?.email || user?.email || '',
      phone: profile?.phone || user?.user_metadata?.phone || '',
    }))
  }, [bookingModal, user?.id, user?.email, profile?.full_name, profile?.phone, profile?.email])

  if (!bookingModal) return null
  const { car } = bookingModal
  const days  = daysBetween(form.start, form.end)
  const total = days * car.price
  const upd   = (k,v) => { setForm(p=>({...p,[k]:v})); setErrors(p=>({...p,[k]:null})) }

  const validate = () => {
    const e = {}
    if (step===0){
      if(!form.start) e.start='Date de départ requise'
      if(!form.end) e.end='Date de retour requise'
      if(form.start&&form.end&&days<=0) e.end='Date de retour invalide'
    }
    if (step===1){ if(!form.name.trim()) e.name='Nom requis'; if(!form.phone.trim()) e.phone='Téléphone requis'; if(!form.email.trim()) e.email='Email requis'; if(form.email&&!/\S+@\S+\.\S+/.test(form.email)) e.email='Email invalide' }
    if (step===2 && !useProfileDocs) {
      RESERVATION_DOC_KEYS.forEach((key) => {
        if (!docs[key] || !(docs[key] instanceof File)) e[key] = 'Document requis'
      })
    }
    setErrors(e); return Object.keys(e).length===0
  }

  const handleDocFile = useCallback((key, file, errorMsg) => {
    if (errorMsg) {
      setErrors((p) => ({ ...p, [key]: errorMsg }))
      setDocs((p) => ({ ...p, [key]: null }))
      setDocPreviews((p) => ({ ...p, [key]: null }))
      return
    }
    setErrors((p) => ({ ...p, [key]: null }))
    setDocs((p) => ({ ...p, [key]: file }))
    if (!file) return
    if (file.type === 'application/pdf') {
      setDocPreviews((p) => ({ ...p, [key]: 'pdf' }))
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => setDocPreviews((p) => ({ ...p, [key]: e.target.result }))
    reader.readAsDataURL(file)
  }, [])

  const handleNext = async () => {
    if (!validate()) return
    setStep((s) => s + 1)
  }

  const handleConfirm = async () => {
    if(!user){ addToast('Veuillez vous connecter pour réserver.','error'); return }
    setLoading(true)
    setUploadProgress({})
    try {
      let urlColumns = {}

      if (useProfileDocs && userDocuments) {
        const resolved = await resolveDocumentUrls(userDocuments)
        urlColumns = docsToReservationUrlColumns(resolved)
      } else {
        const missing = RESERVATION_DOC_KEYS.filter((k) => !(docs[k] instanceof File))
        if (missing.length > 0) {
          addToast('Veuillez fournir les 4 documents (CIN recto/verso, permis recto/verso).', 'error')
          setLoading(false)
          return
        }

        RESERVATION_DOC_KEYS.forEach((k) => setUploadProgress((p) => ({ ...p, [k]: 5 })))

        try {
          const { urlColumns: uploaded } = await uploadAllReservationDocuments(
            user.id,
            docs,
            (key, pct) => setUploadProgress((p) => ({ ...p, [key]: pct })),
          )
          urlColumns = uploaded
          await loadUserDocuments(user.id, profile)
        } catch (err) {
          console.error('[document-upload]', err)
          addToast(err?.message || 'Échec du téléchargement des documents.', 'error')
          setLoading(false)
          return
        }
      }

      const requiredCols = ['cin_front_url', 'cin_back_url', 'permis_front_url', 'permis_back_url']
      if (requiredCols.some((c) => !urlColumns[c])) {
        addToast('Documents incomplets. Vérifiez CIN et permis (recto + verso).', 'error')
        setLoading(false)
        return
      }

      const ref = 'HM' + Date.now().toString().slice(-6)
      const reservation = {
        user_id:user.id, ref, car_id:car.id, car_name:`${car.name}${car.year?' '+car.year:''}`,
        car_price:car.price, pickup_location:form.pickup, return_location:form.returnLoc,
        start_date:form.start, end_date:form.end, days, total, payment_method:form.payment,
        customer_name:form.name, customer_email:form.email, customer_phone:form.phone,
        notes:form.notes, status:'pending',
        ...urlColumns,
        documents: {
          cin_front: urlColumns.cin_front_url,
          cin_back: urlColumns.cin_back_url,
          permis_front: urlColumns.permis_front_url,
          permis_back: urlColumns.permis_back_url,
        },
      }
      const saved = await createReservation(reservation)
      openReceipt({
        ...reservation,
        car_img: car.img,
        id: saved?.id || Date.now(),
        created_at: new Date().toISOString(),
      })
      addToast('Réservation soumise avec succès! 🎉')
    } catch(err) {
      const msg = err?.message || ''
      if (msg.includes('customer_email') || msg.includes('schema cache')) {
        addToast('Schéma base de données incomplet. Exécutez la migration Supabase (customer_email).', 'error')
      } else if (msg.includes('row-level security')) {
        addToast('Connexion requise ou permissions insuffisantes.', 'error')
      } else {
        addToast(msg || 'Erreur lors de la réservation.', 'error')
      }
    } finally { setLoading(false) }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:500,overflowY:'auto',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'20px 16px 60px' }}
        onClick={e=>e.target===e.currentTarget&&closeBooking()}
      >
        <motion.div
          initial={{opacity:0,y:32,scale:0.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:16}}
          style={{ background:T.navy,borderRadius:20,width:'100%',maxWidth:840,border:`1px solid ${T.border}`,overflow:'hidden',marginTop:20 }}
        >
          {/* Header */}
          <div style={{ background:T.navyMid,padding:'18px 26px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
            <div style={{ display:'flex',alignItems:'center',gap:16 }}>
              <img src={car.img} alt={car.name} style={{ width:88,height:52,objectFit:'contain',flexShrink:0 }} />
              <div>
                <div style={{ fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.35rem',color:T.white }}>{car.name} {car.year}</div>
                <div style={{ color:T.muted,fontSize:13 }}>{car.cat} · {car.fuel} · {car.trans}</div>
              </div>
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:16 }}>
              {days>0&&(
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:"'Barlow Condensed',sans-serif",fontSize:'1.7rem',fontWeight:900,color:T.gold,lineHeight:1 }}>{total} DH</div>
                  <div style={{ fontSize:11,color:T.muted }}>{days}j × {car.price} DH</div>
                </div>
              )}
              <button onClick={closeBooking} style={{ background:'rgba(255,255,255,0.06)',border:`1px solid ${T.border}`,color:T.white,width:34,height:34,borderRadius:'50%',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                <FiX />
              </button>
            </div>
          </div>

          {/* Steps */}
          <div style={{ padding:'18px 26px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center' }}>
            {STEPS.map((s,i)=>(
              <div key={i} style={{ display:'flex',alignItems:'center',flex:i<STEPS.length-1?1:'none' }}>
                <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
                  <div style={{ width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,background:i<=step?T.gold:T.navyLight,color:i<=step?T.navy:T.muted,boxShadow:i===step?`0 0 0 4px ${T.goldGlow}`:'none',transition:'all .3s' }}>
                    {i<step?'✓':s.icon}
                  </div>
                  <span style={{ fontSize:10,fontWeight:700,letterSpacing:1,color:i<=step?T.gold:T.muted,textTransform:'uppercase',whiteSpace:'nowrap' }}>{s.label}</span>
                </div>
                {i<STEPS.length-1&&<div style={{ flex:1,height:1,background:i<step?T.gold:T.border,margin:'0 8px 18px',transition:'background .3s' }} />}
              </div>
            ))}
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} style={{ padding:'30px 26px' }}>
              {step===0&&<StepCalendar form={form} upd={upd} errors={errors} car={car} />}
              {step===1&&<StepInfo form={form} upd={upd} errors={errors} isLoggedIn={!!user} />}
              {step===2&&(
                <ReservationDocumentUpload
                  docs={docs}
                  docPreviews={docPreviews}
                  errors={errors}
                  uploadProgress={uploadProgress}
                  useSavedDocs={useProfileDocs}
                  savedDocUrls={savedDocUrls}
                  onFile={handleDocFile}
                  onForceUpload={() => setForceDocUpload(true)}
                  disabled={loading}
                />
              )}
              {step===3&&<StepPayment  form={form} upd={upd} car={car} days={days} total={total} />}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div style={{ display:'flex',gap:12,padding:'18px 26px',borderTop:`1px solid ${T.border}`,background:T.navyMid }}>
            <button onClick={step===0?closeBooking:()=>setStep(s=>s-1)} style={{ ...css.ghostBtn,padding:'12px 24px',fontSize:14 }}>
              ← {step===0?'Annuler':'Précédent'}
            </button>
            <div style={{ flex:1 }} />
            {step<3?(
              <button onClick={handleNext} style={{ ...css.goldBtn,padding:'12px 32px',fontSize:15 }}>Continuer →</button>
            ):(
              <button onClick={handleConfirm} disabled={loading} style={{ ...css.goldBtn,padding:'12px 32px',fontSize:15,opacity:loading?0.7:1 }}>
                {loading?'Envoi en cours...':'✅ Confirmer la réservation'}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function StepCalendar({ form, upd, errors, car }) {
  const today = new Date()
  const [viewMonth, setViewMonth] = useState(today)
  const [bookedDates, setBookedDates] = useState([])
  const [datesLoading, setDatesLoading] = useState(true)

  useEffect(() => {
    if (!car?.id) return
    let cancelled = false
    setDatesLoading(true)
    getCarBookedDates(car.id)
      .then((dates) => { if (!cancelled) setBookedDates(dates) })
      .catch(() => { if (!cancelled) setBookedDates([]) })
      .finally(() => { if (!cancelled) setDatesLoading(false) })
    return () => { cancelled = true }
  }, [car?.id])

  const year=viewMonth.getFullYear(); const month=viewMonth.getMonth()
  const firstDay=new Date(year,month,1).getDay(); const daysInMonth=new Date(year,month+1,0).getDate()
  const MONTHS=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
  const DAYS=['Di','Lu','Ma','Me','Je','Ve','Sa']
  const toStr=(y,m,d)=>`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
  const handleDayClick=(dateStr)=>{
    if(bookedDates.includes(dateStr)||new Date(dateStr)<new Date(todayStr())) return
    if(!form.start||(form.start&&form.end)){ upd('start',dateStr); upd('end','') }
    else { if(dateStr<form.start){ upd('start',dateStr); upd('end','') } else upd('end',dateStr) }
  }
  const days=daysBetween(form.start,form.end); const total=days*car.price
  return (
    <div>
      <h3 style={{ fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.6rem',color:T.white,marginBottom:6 }}>Sélectionnez vos dates</h3>
      <p style={{ color:T.muted,fontSize:14,marginBottom:24 }}>Cliquez sur la date de départ puis sur la date de retour</p>
      <div style={{ display:'flex',gap:16,marginBottom:12,fontSize:12,color:T.muted }}>
        <span><span style={{ display:'inline-block',width:10,height:10,borderRadius:2,background:'rgba(45,212,191,0.35)',marginRight:6,verticalAlign:'middle' }} />Disponible</span>
        <span><span style={{ display:'inline-block',width:10,height:10,borderRadius:2,background:'rgba(248,113,113,0.35)',marginRight:6,verticalAlign:'middle' }} />Réservé</span>
        {datesLoading && <span style={{ marginLeft:'auto',color:T.gold }}>Chargement…</span>}
      </div>
      <div style={{ background:T.navyLight,border:`1px solid ${T.border}`,borderRadius:14,padding:22,marginBottom:20 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18 }}>
          <button onClick={()=>setViewMonth(m=>new Date(m.getFullYear(),m.getMonth()-1,1))} style={{ background:T.navyMid,border:`1px solid ${T.border}`,color:T.white,width:32,height:32,borderRadius:8,cursor:'pointer',fontSize:15 }}>‹</button>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif",fontWeight:800,fontSize:'1.15rem',color:T.white }}>{MONTHS[month]} {year}</span>
          <button onClick={()=>setViewMonth(m=>new Date(m.getFullYear(),m.getMonth()+1,1))} style={{ background:T.navyMid,border:`1px solid ${T.border}`,color:T.white,width:32,height:32,borderRadius:8,cursor:'pointer',fontSize:15 }}>›</button>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:5 }}>
          {DAYS.map(d=><div key={d} style={{ textAlign:'center',fontSize:10,fontWeight:800,color:T.muted,letterSpacing:1,padding:'3px 0' }}>{d}</div>)}
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2 }}>
          {Array(firstDay===0?6:firstDay-1).fill(null).map((_,i)=><div key={'e'+i}/>)}
          {Array.from({length:daysInMonth},(_,i)=>{
            const d=i+1; const dateStr=toStr(year,month,d)
            const isPast=new Date(dateStr)<new Date(todayStr()); const isBooked=bookedDates.includes(dateStr)
            const isStart=dateStr===form.start; const isEnd=dateStr===form.end
            const isSelected=isStart||isEnd; const isInRange=form.start&&form.end&&dateStr>form.start&&dateStr<form.end
            const isAvailable=!isPast&&!isBooked&&!isSelected&&!isInRange
            return (
              <motion.div key={d} onClick={()=>!isPast&&!isBooked&&handleDayClick(dateStr)}
                style={{ height:36,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:isStart?'8px 0 0 8px':isEnd?'0 8px 8px 0':8,fontSize:12,fontWeight:isSelected?800:400,color:isBooked?T.danger:isSelected?T.navy:isAvailable?T.success:isPast?T.muted:T.white,background:isBooked?'rgba(248,113,113,0.25)':isSelected?T.gold:isInRange?T.goldGlow:isAvailable?'rgba(45,212,191,0.15)':'transparent',cursor:isPast||isBooked?'not-allowed':'pointer',opacity:isPast?0.3:1,transition:'all .15s' }}>
                {d}
              </motion.div>
            )
          })}
        </div>
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
        {[{k:'start',label:'Date de départ',min:todayStr(),other:null},{k:'end',label:'Date de retour',min:form.start||todayStr(),other:null}].map(({k,label,min})=>(
          <div key={k}>
            <label style={css.label}>{label}</label>
            <input type="date" min={min} value={form[k]} onChange={e=>upd(k,e.target.value)} style={{ ...css.input,borderColor:errors[k]?T.danger:T.border }} />
            {errors[k]&&<div style={{ color:T.danger,fontSize:11,marginTop:3 }}>{errors[k]}</div>}
          </div>
        ))}
        {[{k:'pickup',label:'Lieu de prise en charge'},{k:'returnLoc',label:'Lieu de retour'}].map(({k,label})=>(
          <div key={k}>
            <label style={css.label}>{label}</label>
            <select value={form[k]} onChange={e=>upd(k,e.target.value)} style={{ ...css.input,cursor:'pointer' }}>
              {LOCATIONS.map(l=><option key={l} value={l} style={{ background:T.navyMid }}>{l}</option>)}
            </select>
          </div>
        ))}
      </div>
      {days>0&&(
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} style={{ padding:'16px 20px',background:T.goldGlow,border:`1px solid ${T.gold}44`,borderRadius:12,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <div>
            <div style={{ fontSize:12,color:T.muted,marginBottom:2 }}>Estimation</div>
            <div style={{ fontSize:13,color:T.white }}>{formatDate(form.start)} → {formatDate(form.end)} · {days} jour{days>1?'s':''}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'2rem',color:T.gold,lineHeight:1 }}>{total} DH</div>
            <div style={{ fontSize:11,color:T.muted }}>{car.price} DH × {days}j</div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

function StepInfo({ form, upd, errors, isLoggedIn }) {
  return (
    <div>
      <h3 style={{ fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.6rem',color:T.white,marginBottom:6 }}>Vos informations</h3>
      <p style={{ color:T.muted,fontSize:14,marginBottom:24 }}>
        {isLoggedIn
          ? 'Informations de votre compte (préremplies automatiquement)'
          : 'Ces informations nous permettent de confirmer votre réservation'}
      </p>
      <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
        {[{k:'name',label:'Nom complet',type:'text',ph:'Votre nom et prénom'},{k:'email',label:'Email',type:'email',ph:'votre@email.com'},{k:'phone',label:'Téléphone',type:'tel',ph:'+212 6XX XXX XXX'}].map(({k,label,type,ph})=>(
          <div key={k}>
            <label style={css.label}>{label}</label>
            <input
              type={type}
              value={form[k]}
              placeholder={ph}
              readOnly={isLoggedIn}
              onChange={e=>!isLoggedIn&&upd(k,e.target.value)}
              style={{ ...css.input,borderColor:errors[k]?T.danger:T.border,opacity:isLoggedIn?0.85:1,cursor:isLoggedIn?'default':'text' }}
            />
            {errors[k]&&<div style={{ color:T.danger,fontSize:11,marginTop:3 }}>⚠ {errors[k]}</div>}
          </div>
        ))}
        <div>
          <label style={css.label}>Notes (optionnel)</label>
          <textarea value={form.notes} onChange={e=>upd('notes',e.target.value)} placeholder="Demandes spéciales..." rows={3} style={{ ...css.input,resize:'vertical' }} />
        </div>
      </div>
    </div>
  )
}

function StepPayment({ form, upd, car, days, total }) {
  return (
    <div>
      <h3 style={{ fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.6rem',color:T.white,marginBottom:6 }}>Mode de paiement</h3>
      <p style={{ color:T.muted,fontSize:14,marginBottom:24 }}>Choisissez votre méthode de règlement préférée</p>
      <div style={{ display:'flex',flexDirection:'column',gap:12,marginBottom:24 }}>
        {PAYMENT_METHODS.map(m=>(
          <div key={m.id} onClick={()=>!m.disabled&&upd('payment',m.id)}
            style={{ border:`1px solid ${form.payment===m.id?T.gold:T.border}`,borderRadius:14,padding:'14px 18px',display:'flex',alignItems:'center',gap:16,background:form.payment===m.id?T.goldGlow:'transparent',opacity:m.disabled?0.5:1,cursor:m.disabled?'not-allowed':'pointer',transition:'all .2s' }}>
            <div style={{ fontSize:24,flexShrink:0 }}>{m.icon}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700,fontSize:14,color:T.white,marginBottom:2 }}>{m.label}</div>
              <div style={{ fontSize:12,color:T.muted }}>{m.desc}</div>
            </div>
            <div style={{ width:18,height:18,borderRadius:'50%',border:`2px solid ${form.payment===m.id?T.gold:T.border}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              {form.payment===m.id&&<div style={{ width:8,height:8,background:T.gold,borderRadius:'50%' }}/>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ background:T.navyMid,border:`1px solid ${T.gold}44`,borderRadius:14,padding:'20px 24px' }}>
        <div style={{ fontSize:11,fontWeight:700,letterSpacing:2,color:T.gold,marginBottom:14,textTransform:'uppercase' }}>Récapitulatif</div>
        {[['Véhicule',`${car.name}${car.year?' '+car.year:''}`],['Prise en charge',form.pickup],['Retour',form.returnLoc],['Dates',`${formatDate(form.start)} → ${formatDate(form.end)}`],['Durée',`${days} jour${days>1?'s':''}`],['Client',form.name],['Paiement',PAYMENT_METHODS.find(p=>p.id===form.payment)?.label||'—']].map(([l,v])=>(
          <div key={l} style={{ display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:`1px solid ${T.border}` }}>
            <span style={{ color:T.muted,fontSize:13 }}>{l}</span>
            <span style={{ color:T.white,fontSize:13,fontWeight:600,textAlign:'right',maxWidth:'55%',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{v}</span>
          </div>
        ))}
        <div style={{ display:'flex',justifyContent:'space-between',paddingTop:12,marginTop:4 }}>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.4rem',color:T.white }}>Total</span>
          <span style={{ fontFamily:"'Barlow Condensed',sans-serif",fontWeight:900,fontSize:'1.8rem',color:T.gold }}>{total} DH</span>
        </div>
      </div>
      <div style={{ marginTop:12,padding:'10px 14px',background:'rgba(234,179,8,0.08)',border:'1px solid rgba(234,179,8,0.2)',borderRadius:10 }}>
        <div style={{ fontSize:12,color:T.muted }}>⏱️ <strong style={{ color:T.white }}>Confirmation sous 30 minutes.</strong> Notre équipe vous contactera par WhatsApp ou téléphone.</div>
      </div>
    </div>
  )
}
