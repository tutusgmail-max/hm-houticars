/**
 * contractPdf.js — Premium reservation contract / invoice PDF (jsPDF)
 */
import { jsPDF } from 'jspdf'
import { PAYMENT_METHODS, getCarById } from '../data'

const NAVY = [11, 22, 35]
const NAVY_MID = [20, 37, 58]
const GOLD = [201, 168, 76]
const GOLD_LIGHT = [232, 199, 106]
const MUTED = [120, 130, 145]
const WHITE = [255, 255, 255]

function formatDateFr(value) {
  if (!value || value === '—') return '—'
  const d = new Date(`${String(value).slice(0, 10)}T12:00:00`)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatGeneratedAt(iso) {
  const d = iso ? new Date(iso) : new Date()
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Normalize receipt / reservation object → contract fields */
export function normalizeContractData(receipt) {
  if (!receipt) return null

  const payMethod = receipt.payment_method || receipt.form?.payment || 'cash'
  const payLabel =
    PAYMENT_METHODS.find((p) => p.id === payMethod || p.value === payMethod)?.label || payMethod

  const days = receipt.days || 0
  const total = receipt.total ?? receipt.total_price ?? 0
  const carPrice = receipt.car_price ?? (days > 0 ? Math.round(total / days) : 0)

  return {
    ref: receipt.ref ?? receipt.reference ?? '—',
    clientName: receipt.customer_name || receipt.form?.name || '—',
    phone: receipt.customer_phone || receipt.form?.phone || '—',
    email: receipt.customer_email || receipt.form?.email || '—',
    carName: receipt.car_name || receipt.car?.name || '—',
    carImg: receipt.car_img || receipt.car?.img || getCarById(receipt.car_id)?.img || null,
    carPrice,
    pickup: receipt.pickup_location || receipt.form?.pickupLocation || '—',
    returnLoc: receipt.return_location || receipt.form?.returnLocation || '—',
    startDate: receipt.start_date || receipt.form?.start || '—',
    endDate: receipt.end_date || receipt.form?.end || '—',
    days,
    total,
    payLabel,
    createdAt: receipt.created_at || new Date().toISOString(),
  }
}

function drawHeader(doc, yStart = 0) {
  const w = doc.internal.pageSize.getWidth()

  doc.setFillColor(...NAVY)
  doc.rect(0, yStart, w, 42, 'F')

  doc.setFillColor(...GOLD)
  doc.rect(0, yStart + 42, w, 1.2, 'F')

  doc.setFillColor(...GOLD)
  doc.roundedRect(14, yStart + 10, 18, 18, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...NAVY)
  doc.text('HM', 17.5, yStart + 21.5)

  doc.setTextColor(...WHITE)
  doc.setFontSize(22)
  doc.text('HM HOUTI CARS', 36, yStart + 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GOLD_LIGHT)
  doc.text('Location de véhicules premium — Maroc', 36, yStart + 26)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...GOLD)
  doc.text('CONTRAT DE RÉSERVATION', w - 14, yStart + 16, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 210, 220)
  doc.text('Document officiel', w - 14, yStart + 22, { align: 'right' })

  return yStart + 52
}

function drawSectionTitle(doc, title, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...GOLD)
  doc.text(title.toUpperCase(), 14, y)
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.3)
  doc.line(14, y + 2, 50, y + 2)
  return y + 10
}

function drawRow(doc, label, value, y, maxWidth = 175) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text(label, 14, y)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  const lines = doc.splitTextToSize(String(value), maxWidth)
  doc.text(lines, 14, y + 5)
  return y + 5 + lines.length * 4.5 + 4
}

function drawFooter(doc) {
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()

  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.4)
  doc.line(14, h - 28, w - 14, h - 28)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...MUTED)
  const terms =
    'Ce document confirme votre demande de réservation. La location devient effective après validation de nos équipes et vérification des documents. ' +
    'Présentez une pièce d\'identité valide et votre permis de conduire le jour de la prise en charge.'
  const termLines = doc.splitTextToSize(terms, w - 28)
  doc.text(termLines, 14, h - 24)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...NAVY)
  doc.text('HM Houti Cars · +212 611 460 900 · contact@hmhouticars.ma', w / 2, h - 8, { align: 'center' })
}

async function loadImageDataUrl(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Image non disponible')
  const blob = await res.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Generate and download the reservation contract PDF.
 * @param {object} receipt — same shape as ReceiptModal receipt state
 */
export async function downloadReservationContract(receipt) {
  const data = normalizeContractData(receipt)
  if (!data) return

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const pageW = doc.internal.pageSize.getWidth()

  let y = drawHeader(doc)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...NAVY)
  doc.text('Contrat de location', 14, y + 4)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text(`Référence : ${data.ref}`, 14, y + 12)
  doc.text(`Émis le : ${formatGeneratedAt(data.createdAt)}`, 14, y + 17)

  y += 26

  // Status badge
  doc.setFillColor(255, 248, 230)
  doc.setDrawColor(...GOLD)
  doc.roundedRect(14, y, pageW - 28, 10, 2, 2, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(140, 100, 20)
  doc.text('STATUT : EN ATTENTE DE CONFIRMATION', pageW / 2, y + 6.5, { align: 'center' })
  y += 18

  y = drawSectionTitle(doc, 'Informations client', y)
  y = drawRow(doc, 'Nom complet', data.clientName, y)
  y = drawRow(doc, 'Téléphone', data.phone, y)
  y = drawRow(doc, 'Email', data.email, y)

  y = drawSectionTitle(doc, 'Véhicule & tarification', y)
  if (data.carImg) {
    try {
      const dataUrl = await loadImageDataUrl(data.carImg)
      const format = String(dataUrl).includes('image/png') ? 'PNG' : 'JPEG'
      doc.addImage(dataUrl, format, pageW - 72, y, 58, 34, undefined, 'FAST')
      y += 38
    } catch {
      /* image optional */
    }
  }
  y = drawRow(doc, 'Véhicule', data.carName, y)
  y = drawRow(doc, 'Tarif journalier', `${data.carPrice} DH / jour`, y)
  y = drawRow(doc, 'Durée', `${data.days} jour${data.days > 1 ? 's' : ''}`, y)

  y = drawSectionTitle(doc, 'Dates & lieux', y)
  y = drawRow(doc, 'Date de départ', formatDateFr(data.startDate), y)
  y = drawRow(doc, 'Date de retour', formatDateFr(data.endDate), y)
  y = drawRow(doc, 'Prise en charge', data.pickup, y)
  y = drawRow(doc, 'Retour', data.returnLoc, y)

  y = drawSectionTitle(doc, 'Paiement', y)
  y = drawRow(doc, 'Mode de paiement', data.payLabel, y)

  // Total box
  y += 4
  doc.setFillColor(...NAVY_MID)
  doc.roundedRect(14, y, pageW - 28, 22, 3, 3, 'F')
  doc.setFillColor(...GOLD)
  doc.rect(14, y, 3, 22, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(200, 210, 220)
  doc.text('Montant total TTC', 22, y + 9)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...GOLD_LIGHT)
  doc.text(`${data.total} DH`, pageW - 20, y + 14, { align: 'right' })

  y += 32

  // Signatures
  y = drawSectionTitle(doc, 'Signatures', y)
  const colW = (pageW - 28 - 10) / 2
  doc.setDrawColor(220, 225, 230)
  doc.setLineWidth(0.2)
  doc.line(14, y + 18, 14 + colW, y + 18)
  doc.line(24 + colW, y + 18, pageW - 14, y + 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  doc.text('Le client', 14, y + 23)
  doc.text('HM Houti Cars', 24 + colW, y + 23)

  drawFooter(doc)

  const safeRef = String(data.ref).replace(/[^\w-]+/g, '_')
  doc.save(`Contrat-HM-Houti-Cars-${safeRef}.pdf`)
}
