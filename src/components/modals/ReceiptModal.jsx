/**
 * ReceiptModal.jsx — v3 Enhanced
 * Works with new booking data shape from BookingModal:
 *   { car_name, customer_name, customer_phone, customer_email,
 *     pickup_location, return_location, start_date, end_date,
 *     days, total, payment_method, ref }
 */
import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaWhatsapp } from 'react-icons/fa'
import { FiDownload, FiX } from 'react-icons/fi'
import { useApp } from '../../context/AppContext'
import { PAYMENT_METHODS } from '../../data'

export default function ReceiptModal() {
  const { receipt, closeReceipt, addToast } = useApp()
  const [pdfLoading, setPdfLoading] = useState(false)

  const handleDownloadPdf = useCallback(async () => {
    setPdfLoading(true)
    try {
      const { downloadReservationContract } = await import('../../utils/contractPdf')
      await downloadReservationContract(receipt)
      addToast('Contrat PDF téléchargé.')
    } catch {
      addToast('Impossible de générer le PDF.', 'error')
    } finally {
      setPdfLoading(false)
    }
  }, [receipt, addToast])

  if (!receipt) return null

  // Support both old shape (car.name, form.*) and new shape (car_name, customer_*)
  const carName  = receipt.car_name  || receipt.car?.name || '—'
  const name     = receipt.customer_name  || receipt.form?.name  || '—'
  const phone    = receipt.customer_phone || receipt.form?.phone || '—'
  const email    = receipt.customer_email || receipt.form?.email || '—'
  const pickup   = receipt.pickup_location  || receipt.form?.pickupLocation || '—'
  const retLoc   = receipt.return_location  || receipt.form?.returnLocation  || '—'
  const start    = receipt.start_date || receipt.form?.start || '—'
  const end      = receipt.end_date   || receipt.form?.end   || '—'
  const days     = receipt.days   || 0
  const total    = receipt.total  || 0
  const ref      = receipt.ref    || '—'
  const payMethod = receipt.payment_method || receipt.form?.payment || 'cash'
  const payLabel = PAYMENT_METHODS.find(p => p.id === payMethod || p.value === payMethod)?.label || payMethod

  return (
    <AnimatePresence>
      <motion.div
        key="receipt-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/75 z-[550] flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && closeReceipt()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-[20px] max-w-[560px] w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="text-white px-8 py-6 flex justify-between items-center rounded-t-[20px]"
            style={{ background: 'linear-gradient(135deg, #0B4D26, #0d7a44)' }}>
            <div>
              <div className="font-condensed font-black text-[1.25rem]">✅ Réservation soumise!</div>
              <div className="text-white/70 text-[13px] mt-0.5">
                Référence: <strong className="text-white">{ref}</strong>
              </div>
            </div>
            <button onClick={closeReceipt}
              className="bg-white/10 border-none text-white w-8 h-8 rounded-full cursor-pointer text-lg flex items-center justify-center hover:bg-white/20 transition-colors">
              <FiX />
            </button>
          </div>

          <div className="p-8">
            {/* Success message */}
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🎉</div>
              <div className="font-condensed font-black text-navy text-[1.35rem]">
                Merci, {name}!
              </div>
              <p className="text-text-muted text-sm mt-1.5">
                Votre demande est enregistrée · Statut: <span className="text-yellow-600 font-semibold">En attente</span>
              </p>
            </div>

            {/* Summary card */}
            <div className="bg-navy text-white rounded-[14px] px-6 py-5 mb-5">
              <SRow label="🚗 Véhicule"     value={carName} />
              <SRow label="📅 Départ"        value={`${pickup} – ${start}`} />
              <SRow label="📅 Retour"        value={`${retLoc} – ${end}`} />
              <SRow label="⏱ Durée"         value={`${days} jour${days > 1 ? 's' : ''}`} />
              <SRow label="💳 Paiement"      value={payLabel} />
              <div className="flex justify-between font-condensed font-black text-[1.4rem] text-gold pt-3 mt-2 border-t border-white/[0.12]">
                <span>Total</span>
                <span>{total} DH</span>
              </div>
            </div>

            {/* Next steps */}
            <div className="bg-[#F5F6F8] rounded-[12px] p-5 text-sm text-navy mb-5">
              <strong>Prochaines étapes:</strong>
              <ul className="mt-2 pl-5 leading-loose list-disc">
                <li>Notre équipe examinera vos documents soumis</li>
                <li>Vous recevrez un appel au <strong>{phone}</strong> sous 30 min</li>
                <li>Confirmation envoyée à <strong>{email}</strong></li>
                <li>Présentez-vous avec votre CIN le jour de la prise en charge</li>
              </ul>
            </div>

            {/* Actions */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[10px] font-bold text-[0.95rem] cursor-pointer border-none mb-3 transition-opacity disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #C9A84C 0%, #E8C76A 100%)',
                color: '#0B1623',
              }}
            >
              <FiDownload className="text-lg shrink-0" />
              {pdfLoading ? 'Génération du PDF…' : 'Télécharger le contrat PDF'}
            </button>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="https://wa.me/212611460900" target="_blank" rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[10px] bg-[#25D366] text-white font-bold no-underline hover:opacity-90 transition-opacity">
                <FaWhatsapp className="text-lg" /> WhatsApp
              </a>
              <button onClick={closeReceipt}
                className="flex-1 py-3 rounded-[10px] border border-[#dde1e8] bg-transparent text-navy font-semibold cursor-pointer hover:bg-gray-50 transition-colors">
                Fermer
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function SRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm py-1.5 border-b border-white/[0.07] last:border-0">
      <span className="text-white/60">{label}</span>
      <span className="text-white text-right ml-4 truncate max-w-[60%]">{value}</span>
    </div>
  )
}
