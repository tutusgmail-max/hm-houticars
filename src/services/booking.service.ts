/**
 * booking.service.ts
 * Service layer for interacting with Supabase Edge Functions
 * Handles reservation validation, confirmation, and contract generation
 */

import { supabase } from '../../supabase/supabase-client'

// ============================================================
// TYPES
// ============================================================

export interface ReservationData {
  car_id: string
  user_id: string
  start_date: string
  end_date: string
  pickup_location: string
  dropoff_location: string
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  carDetails?: any
  pricing?: any
}

export interface ConfirmationData extends ReservationData {
  passenger_name: string
  passenger_phone: string
  passenger_email: string
  insurance_selected: boolean
  special_requests?: string
}

export interface BookingConfirmation {
  success: boolean
  bookingId?: string
  error?: string
  bookingDetails?: any
}

export interface ContractData {
  bookingId: string
  includeInsurance?: boolean
  format?: 'html' | 'pdf'
}

export interface ContractResult {
  success: boolean
  contractId?: string
  contractUrl?: string
  contractHtml?: string
  error?: string
}

// ============================================================
// EDGE FUNCTION CALLS
// ============================================================

/**
 * Validate a reservation before confirmation
 * Checks availability, pricing, and user eligibility
 */
export async function validateReservation(
  data: ReservationData
): Promise<ValidationResult> {
  try {
    const response = await supabase.functions.invoke('validate-reservation', {
      body: data,
    })

    if (response.error) {
      throw response.error
    }

    return response.data as ValidationResult
  } catch (error) {
    console.error('Validation error:', error)
    return {
      valid: false,
      errors: [error.message || 'Failed to validate reservation'],
      warnings: [],
    }
  }
}

/**
 * Confirm a reservation and create booking
 * Creates booking record and returns confirmation details
 */
export async function confirmReservation(
  data: ConfirmationData
): Promise<BookingConfirmation> {
  try {
    // First validate
    const validation = await validateReservation({
      car_id: data.car_id,
      user_id: data.user_id,
      start_date: data.start_date,
      end_date: data.end_date,
      pickup_location: data.pickup_location,
      dropoff_location: data.dropoff_location,
    })

    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
      }
    }

    // Then confirm
    const response = await supabase.functions.invoke('confirm-reservation', {
      body: data,
    })

    if (response.error) {
      throw response.error
    }

    return response.data as BookingConfirmation
  } catch (error) {
    console.error('Confirmation error:', error)
    return {
      success: false,
      error: error.message || 'Failed to confirm reservation',
    }
  }
}

/**
 * Generate contract for a booking
 * Creates HTML contract and stores it for download/printing
 */
export async function generateContract(
  data: ContractData
): Promise<ContractResult> {
  try {
    const response = await supabase.functions.invoke('generate-contract', {
      body: {
        ...data,
        format: data.format || 'html',
      },
    })

    if (response.error) {
      throw response.error
    }

    return response.data as ContractResult
  } catch (error) {
    console.error('Contract generation error:', error)
    return {
      success: false,
      error: error.message || 'Failed to generate contract',
    }
  }
}

/**
 * Full booking flow: validate → confirm → generate contract
 */
export async function completeBooking(data: ConfirmationData): Promise<{
  success: boolean
  bookingId?: string
  contractUrl?: string
  message?: string
  error?: string
}> {
  try {
    // Step 1: Validate
    console.log('Step 1: Validating reservation...')
    const validation = await validateReservation({
      car_id: data.car_id,
      user_id: data.user_id,
      start_date: data.start_date,
      end_date: data.end_date,
      pickup_location: data.pickup_location,
      dropoff_location: data.dropoff_location,
    })

    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join('; '),
        message: 'Reservation validation failed',
      }
    }

    // Step 2: Confirm
    console.log('Step 2: Confirming reservation...')
    const confirmation = await confirmReservation(data)

    if (!confirmation.success) {
      return {
        success: false,
        error: confirmation.error,
        message: 'Failed to confirm reservation',
      }
    }

    // Step 3: Generate Contract
    console.log('Step 3: Generating contract...')
    const contract = await generateContract({
      bookingId: confirmation.bookingId,
      format: 'html',
      includeInsurance: data.insurance_selected,
    })

    return {
      success: true,
      bookingId: confirmation.bookingId,
      contractUrl: contract.contractUrl,
      message: 'Booking completed successfully!',
    }
  } catch (error) {
    console.error('Booking flow error:', error)
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    }
  }
}

/**
 * Fetch existing booking details (from database)
 */
export async function getBooking(bookingId: string) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(
        `
      *,
      car:cars(*),
      user:profiles(*)
    `
      )
      .eq('id', bookingId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Failed to fetch booking:', error)
    return null
  }
}

/**
 * Fetch user's booking history
 */
export async function getUserBookings(userId: string) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(
        `
      *,
      car:cars(id, name, image_url, price_per_day)
    `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Failed to fetch bookings:', error)
    return []
  }
}

/**
 * Cancel a booking
 */
export async function cancelBooking(bookingId: string, reason?: string) {
  try {
    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancellation_reason: reason || null,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', bookingId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Failed to cancel booking:', error)
    return { success: false, error: error.message }
  }
}
