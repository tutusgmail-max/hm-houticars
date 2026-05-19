/**
 * BookingExample.jsx
 * Complete example component showing how to use the booking service
 * with validate, confirm, and contract generation
 */

import { useState, useEffect } from 'react'
import {
  validateReservation,
  confirmReservation,
  completeBooking,
  getUserBookings,
} from '../services/booking.service'
import Toast from './ui/Toast'

export default function BookingExample({ car, currentUser }) {
  const [step, setStep] = useState(1) // 1: dates, 2: review, 3: confirm
  const [loading, setLoading] = useState(false)
  const [validation, setValidation] = useState(null)
  const [booking, setBooking] = useState(null)
  const [userBookings, setUserBookings] = useState([])

  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    pickup_location: 'Main Airport Terminal',
    dropoff_location: 'Main Airport Terminal',
    insurance_selected: false,
    special_requests: '',
  })

  // Load user's previous bookings
  useEffect(() => {
    if (currentUser?.id) {
      loadUserBookings()
    }
  }, [currentUser])

  const loadUserBookings = async () => {
    const bookings = await getUserBookings(currentUser.id)
    setUserBookings(bookings)
  }

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  // Step 1: Validate reservation
  const handleValidate = async () => {
    setLoading(true)
    try {
      const result = await validateReservation({
        car_id: car.id,
        user_id: currentUser.id,
        ...formData,
      })

      setValidation(result)

      if (result.valid) {
        setStep(2)
        Toast.success('Reservation is available!')
      } else {
        Toast.error(result.errors[0])
      }
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Confirm reservation
  const handleConfirm = async () => {
    setLoading(true)
    try {
      const result = await completeBooking({
        car_id: car.id,
        user_id: currentUser.id,
        passenger_name: currentUser.full_name,
        passenger_email: currentUser.email,
        passenger_phone: currentUser.phone,
        ...formData,
      })

      if (result.success) {
        setBooking(result)
        setStep(3)
        Toast.success('Booking confirmed successfully!')

        // Reload bookings
        await loadUserBookings()
      } else {
        Toast.error(result.error || 'Booking failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Book a Car</h1>

      {/* Step 1: Date Selection */}
      {step === 1 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-6">Select Dates & Location</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Pickup Date</label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Return Date</label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Pickup Location</label>
              <input
                type="text"
                name="pickup_location"
                value={formData.pickup_location}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Dropoff Location</label>
              <input
                type="text"
                name="dropoff_location"
                value={formData.dropoff_location}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="insurance_selected"
                checked={formData.insurance_selected}
                onChange={handleInputChange}
                className="w-4 h-4 mr-3"
              />
              <span className="text-sm">Add insurance coverage (+5% of rental)</span>
            </label>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Special Requests</label>
            <textarea
              name="special_requests"
              value={formData.special_requests}
              onChange={handleInputChange}
              placeholder="e.g., child seat, GPS, etc."
              className="w-full px-4 py-2 border rounded-lg"
              rows="3"
            />
          </div>

          <button
            onClick={handleValidate}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Checking Availability...' : 'Check Availability & Pricing'}
          </button>
        </div>
      )}

      {/* Step 2: Review Booking */}
      {step === 2 && validation && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-6">Review Your Booking</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Car Details */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-4">Vehicle</h3>
              <p className="text-lg font-bold mb-2">{validation.carDetails?.name}</p>
              <p className="text-sm text-gray-600">Year: {validation.carDetails?.model_year}</p>
              <p className="text-sm text-gray-600">
                Transmission: {validation.carDetails?.transmission}
              </p>
              <p className="text-sm text-gray-600">Fuel: {validation.carDetails?.fuel_type}</p>
            </div>

            {/* Pricing */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <h3 className="font-semibold mb-4">Pricing Breakdown</h3>
              {validation.pricing && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Daily Rate:</span>
                    <span>${validation.pricing.dailyRate.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{validation.pricing.durationDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${validation.pricing.subtotal.toFixed(2)}</span>
                  </div>
                  {validation.pricing.insurance > 0 && (
                    <div className="flex justify-between">
                      <span>Insurance:</span>
                      <span>${validation.pricing.insurance.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Taxes & Fees:</span>
                    <span>${validation.pricing.taxes.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-blue-600">${validation.pricing.total.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dates Summary */}
          <div className="border rounded-lg p-4 mb-8 bg-gray-50">
            <h3 className="font-semibold mb-3">Booking Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Pickup</p>
                <p className="font-semibold">
                  {new Date(formData.start_date).toLocaleDateString()}
                </p>
                <p className="text-gray-600">{formData.pickup_location}</p>
              </div>
              <div>
                <p className="text-gray-600">Return</p>
                <p className="font-semibold">
                  {new Date(formData.end_date).toLocaleDateString()}
                </p>
                <p className="text-gray-600">{formData.dropoff_location}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(1)}
              className="flex-1 border border-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? 'Confirming...' : 'Confirm Booking'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirmation */}
      {step === 3 && booking && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg shadow p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-3xl font-bold text-green-700 mb-2">Booking Confirmed!</h2>
          <p className="text-gray-600 mb-6">Your reservation has been successfully processed.</p>

          <div className="bg-white rounded-lg p-6 mb-6 text-left max-w-md mx-auto">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Booking Reference</p>
                <p className="font-bold text-lg">{booking.bookingId}</p>
              </div>
              <div>
                <p className="text-gray-600">Total Amount</p>
                <p className="font-bold text-lg">
                  ${validation?.pricing?.total.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {booking.contractUrl && (
            <a
              href={booking.contractUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 mb-4"
            >
              📄 Download Contract
            </a>
          )}

          <p className="text-sm text-gray-600 mb-6">
            A confirmation email has been sent to {currentUser?.email}
          </p>

          <button
            onClick={() => setStep(1)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700"
          >
            Book Another Car
          </button>
        </div>
      )}

      {/* Previous Bookings */}
      {userBookings.length > 0 && (
        <div className="mt-12">
          <h3 className="text-2xl font-semibold mb-4">Your Previous Bookings</h3>
          <div className="grid gap-4">
            {userBookings.map((b) => (
              <div key={b.id} className="border rounded-lg p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{b.car?.name}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(b.start_date).toLocaleDateString()} →{' '}
                    {new Date(b.end_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm font-semibold text-blue-600">{b.booking_reference}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">${b.total_price.toFixed(2)}</p>
                  <p className={`text-sm font-semibold ${
                    b.status === 'confirmed' ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {b.status.toUpperCase()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
