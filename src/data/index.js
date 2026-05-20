// ─── Cars ────────────────────────────────────────────────────────────────────
const SUPABASE_CAR_IMG =
  'https://cmoioidgxealxfirkssc.supabase.co/storage/v1/object/public/image/houti%20cars'

/** Static fallback when Supabase cars table is unavailable */
export const FALLBACK_CARS = [
  {
    id: 1,
    name: 'Dacia Sandero',
    year: '2024',
    cat: 'Citadine',
    price: 350,
    seats: 5,
    fuel: 'Diesel',
    trans: 'Manuelle',
    img: `${SUPABASE_CAR_IMG}/dacia%20sandero.jpg`,
    available: true,
    badge: 'Populaire',
    specs: ['A/C', 'USB', 'Bluetooth'],
  },
  {
    id: 2,
    name: 'Renault Clio 5',
    year: '2024',
    cat: 'Citadine',
    price: 350,
    seats: 5,
    fuel: 'Diesel',
    trans: 'Manuelle',
    img: `${SUPABASE_CAR_IMG}/clio%205.jpg`,
    available: true,
    badge: null,
    specs: ['A/C', 'Apple CarPlay'],
  },
  {
    id: 4,
    name: 'Dacia Logan',
    year: '2023',
    cat: 'Berline',
    price: 350,
    seats: 5,
    fuel: 'Diesel',
    trans: 'Manuelle',
    img: `${SUPABASE_CAR_IMG}/dacia%20logan.jpg`,
    available: true,
    badge: null,
    specs: ['A/C', 'USB'],
  },
  {
    id: 5,
    name: 'Volkswagen T-Roc',
    year: '2024',
    cat: 'SUV',
    price: 600,
    seats: 5,
    fuel: 'Diesel',
    trans: 'Automatique',
    img: `${SUPABASE_CAR_IMG}/troc.jpg`,
    available: true,
    badge: 'Premium',
    specs: ['A/C', 'GPS', 'Bluetooth'],
  },
  {
    id: 9,
    name: 'Opel Corsa',
    year: '2024',
    cat: 'Citadine',
    price: 350,
    seats: 5,
    fuel: 'Diesel',
    trans: 'Manuelle',
    img: `${SUPABASE_CAR_IMG}/opelcorsa.jpg`,
    available: true,
    badge: null,
    specs: ['A/C', 'USB'],
  },
]

export const CARS = FALLBACK_CARS

export function getCarById(carId) {
  return FALLBACK_CARS.find((c) => c.id === Number(carId)) || null
}

export const CAR_CATEGORIES = ['Tous', 'Citadine', 'Berline', 'SUV', 'Prestige']

export const LOCATIONS = [
  'Oujda — Aéroport',
  'Oujda — Centre-ville',
  'Nador',
  'Berkane',
  'Autre adresse',
]

export const PAYMENT_METHODS = [
  { id: 'cash',     value: 'cash',     label: 'Cash à la livraison',  icon: '💵', desc: 'Payez en espèces à la remise du véhicule' },
  { id: 'virement', value: 'virement', label: 'Virement bancaire',     icon: '🏦', desc: 'Virement avant confirmation de réservation' },
  { id: 'online',   value: 'online',   label: 'Paiement en ligne',     icon: '💳', desc: 'Carte bancaire sécurisée (bientôt disponible)', disabled: true },
]

export const WHY_ITEMS = [
  {
    icon: '🛡️',
    title: 'Véhicules Assurés',
    desc: 'Tous nos véhicules sont couverts tous risques. Vous voyagez en toute sérénité.',
  },
  {
    icon: '⏰',
    title: 'Disponible 24h/24',
    desc: 'Notre équipe est joignable à toute heure pour vous accompagner.',
  },
  {
    icon: '📍',
    title: 'Livraison à domicile',
    desc: "Livraison et reprise à l'aéroport, hôtel ou à votre adresse.",
  },
  {
    icon: '💳',
    title: 'Paiement Flexible',
    desc: 'Cash, virement ou en ligne — vous choisissez ce qui vous convient.',
  },
  {
    icon: '🚗',
    title: 'Flotte Récente',
    desc: 'Nos voitures sont régulièrement renouvelées pour garantir confort et fiabilité.',
  },
  {
    icon: '✅',
    title: 'Zéro Surprise',
    desc: "Tarif tout compris affiché dès la recherche, pas de frais cachés.",
  },
]

export const PROCESS_STEPS = [
  {
    num: '01',
    title: 'Choisissez votre voiture',
    desc: 'Parcourez notre flotte et sélectionnez le véhicule qui correspond à vos besoins.',
  },
  {
    num: '02',
    title: 'Saisissez vos dates',
    desc: 'Indiquez les dates de départ et de retour ainsi que votre lieu de prise en charge.',
  },
  {
    num: '03',
    title: 'Confirmez & payez',
    desc: 'Réservez en ligne ou par WhatsApp. Paiement sécurisé à la confirmation.',
  },
  {
    num: '04',
    title: 'Prenez la route!',
    desc: 'Récupérez votre voiture prête à partir et profitez de votre voyage.',
  },
]

export const REVIEWS = [
  {
    name: 'Ahmed K.',
    city: 'Oujda',
    text: 'Service impeccable, voiture propre et en parfait état. Je recommande vivement HM Houti Cars à tous!',
    stars: 5,
  },
  {
    name: 'Fatima B.',
    city: 'Casablanca',
    text: "Prise en charge rapide à l'aéroport, personnel très sympathique. Prix imbattables dans la région.",
    stars: 5,
  },
  {
    name: 'Karim M.',
    city: 'Fès',
    text: 'Deuxième location avec eux, toujours aussi satisfait. Bon rapport qualité-prix et très professionnels.',
    stars: 5,
  },
  {
    name: 'Nadia S.',
    city: 'Nador',
    text: "Réservation en ligne simple, voiture livrée à l'heure. Dacia Duster en excellent état, parfait pour nos escapades!",
    stars: 4,
  },
  {
    name: 'Youssef T.',
    city: 'Oujda',
    text: 'Contact facile par WhatsApp, très réactifs. Mercedes classe A vraiment au top!',
    stars: 5,
  },
  {
    name: 'Sara L.',
    city: 'Tanger',
    text: "Location pour une semaine, aucun souci. Équipe professionnelle et tarifs clairs sans surprise.",
    stars: 5,
  },
]

export const HERO_STATS = [
  { num: '500+', label: 'Clients Satisfaits' },
  { num: '5',    label: 'Véhicules Disponibles' },
  { num: '24/7', label: 'Assistance' },
  { num: '5★',   label: 'Note Moyenne' },
]

export const CONTACT_INFO = [
  { icon: '📞', label: 'Téléphone',  val: '+212 611 460 900' },
  { icon: '💬', label: 'WhatsApp',   val: '+212 611 460 900' },
  { icon: '📍', label: 'Adresse',    val: 'Mont-Aroui, Nador, Morocco' },
  { icon: '✉️', label: 'Email',      val: 'Houtimarouan@gmail.com' },
  { icon: '🗺️', label: 'Zone de service', val: 'Oujda • Nador • Berkane' },
]

export const NAV_ITEMS = [
  { label: 'Accueil',       id: 'home' },
  { label: 'Nos Voitures',  id: 'cars' },
  { label: 'Pourquoi Nous', id: 'why' },
  { label: 'Avis Clients',  id: 'reviews' },
  { label: 'Contact',       id: 'contact' },
]

export const FOOTER_NAV = [
  { label: 'Accueil',      id: 'home' },
  { label: 'Nos voitures', id: 'cars' },
  { label: 'Pourquoi nous',id: 'why' },
  { label: 'Avis clients', id: 'reviews' },
]

export const FOOTER_CATS = ['Citadines', 'Berlines', 'SUV / 4x4', 'Prestige']

export const STATUS_STYLES = {
  pending:   { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'En attente' },
  confirmed: { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Confirmée' },
  completed: { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Terminée' },
  cancelled: { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Annulée' },
}
