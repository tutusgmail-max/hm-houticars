// ============================================================
// HoutiCars — Supabase Client & Typed API Layer
// src/lib/supabase/client.ts
// ============================================================

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";

// ── Singleton client ─────────────────────────────────────────
export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  }
);

// ============================================================
// CARS API
// ============================================================

export const carsApi = {
  /** Search available cars with filters and pagination */
  async search(params: {
    start_date?: string;
    end_date?: string;
    location?: string;
    min_price?: number;
    max_price?: number;
    transmission?: string;
    fuel_type?: string;
    search_term?: string;
    page?: number;
    limit?: number;
  }) {
    const limit  = params.limit ?? 12;
    const offset = ((params.page ?? 1) - 1) * limit;

    const { data, error } = await supabase.rpc("search_available_cars", {
      p_start_date:  params.start_date  ?? null,
      p_end_date:    params.end_date    ?? null,
      p_location:    params.location    ?? null,
      p_min_price:   params.min_price   ?? null,
      p_max_price:   params.max_price   ?? null,
      p_transmission: params.transmission ?? null,
      p_fuel_type:   params.fuel_type   ?? null,
      p_search_term: params.search_term ?? null,
      p_limit:       limit,
      p_offset:      offset,
    });

    if (error) throw new Error(error.message);

    const totalCount = data?.[0]?.total_count ?? 0;
    return {
      cars:        data ?? [],
      total:       Number(totalCount),
      page:        params.page ?? 1,
      total_pages: Math.ceil(Number(totalCount) / limit),
    };
  },

  /** Get single car with full details */
  async getById(carId: string) {
    const { data, error } = await supabase
      .from("cars")
      .select("*, reviews(rating, comment, created_at)")
      .eq("id", carId)
      .eq("active", true)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  /** Get unavailable dates for calendar */
  async getUnavailableDates(carId: string) {
    const { data, error } = await supabase
      .rpc("get_car_unavailable_dates", { p_car_id: carId });

    if (error) throw new Error(error.message);
    return data ?? [];
  },
};

// ============================================================
// RESERVATIONS API
// ============================================================

export const reservationsApi = {
  /** Step 1: Validate and get a price quote */
  async validate(params: {
    car_id: string;
    start_date: string;
    end_date: string;
    pickup_location: string;
    return_location: string;
    payment_method: string;
    client_notes?: string;
  }) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-reservation`,
      {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey":        import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(params),
      }
    );

    const json = await res.json();
    if (!res.ok) throw new Error(json.message ?? "Validation failed");
    return json;
  },

  /** Step 2: Confirm reservation with validation token */
  async confirm(validationToken: string, clientNotes?: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/confirm-reservation`,
      {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey":        import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          validation_token: validationToken,
          client_notes:     clientNotes,
        }),
      }
    );

    const json = await res.json();
    if (!res.ok) throw new Error(json.message ?? "Confirmation failed");
    return json;
  },

  /** Get user's own reservations */
  async getMyReservations(status?: string) {
    let query = supabase
      .from("reservations")
      .select(`
        id, start_date, end_date, reservation_status,
        payment_status, total_price, created_at,
        cars (id, brand, model, year, main_image, location)
      `)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("reservation_status", status as never);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  /** User cancels their own pending reservation */
  async cancelMine(reservationId: string) {
    const { error } = await supabase
      .from("reservations")
      .update({ reservation_status: "cancelled" })
      .eq("id", reservationId)
      .eq("reservation_status", "pending");  // RLS enforces this too

    if (error) throw new Error(error.message);
  },

  /** Get contract signed URL */
  async getContractUrl(reservationId: string): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Not authenticated");

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-contract`,
      {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${session.access_token}`,
          "apikey":        import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ reservation_id: reservationId }),
      }
    );

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    return json.contract_url;
  },
};

// ============================================================
// DOCUMENTS API
// ============================================================

export const documentsApi = {
  /** Upload a document file to private storage */
  async upload(
    userId: string,
    docType: "driving_license" | "id_card" | "passport" | "other",
    file: File
  ) {
    // Validate client-side before upload
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED  = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

    if (file.size > MAX_SIZE) throw new Error("File too large (max 10MB)");
    if (!ALLOWED.includes(file.type)) throw new Error("Invalid file type");

    const ext      = file.name.split(".").pop();
    const path     = `${userId}/${docType}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("documents")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadErr) throw new Error(uploadErr.message);

    // Upsert document record
    const { data, error } = await supabase
      .from("documents")
      .upsert({
        user_id:             userId,
        document_type:       docType,
        file_path:           path,
        verification_status: "pending",
        verified_by:         null,
        verified_at:         null,
        rejection_reason:    null,
      }, { onConflict: "user_id,document_type" })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  /** Get signed URL for private document (own documents only) */
  async getSignedUrl(filePath: string, expiresIn = 300) {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(filePath, expiresIn);

    if (error) throw new Error(error.message);
    return data.signedUrl;
  },

  /** Get user's documents */
  async getMyDocuments() {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data ?? [];
  },
};

// ============================================================
// NOTIFICATIONS API
// ============================================================

export const notificationsApi = {
  async getAll(limit = 20) {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async markRead(notificationId: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    if (error) throw new Error(error.message);
  },

  async markAllRead() {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("read", false);

    if (error) throw new Error(error.message);
  },

  /** Subscribe to realtime notifications */
  subscribe(userId: string, callback: (notification: unknown) => void) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => callback(payload.new)
      )
      .subscribe();
  },
};

// ============================================================
// ADMIN API
// ============================================================

export const adminApi = {
  async getDashboardStats() {
    const { data, error } = await supabase.rpc("get_dashboard_stats");
    if (error) throw new Error(error.message);
    return data;
  },

  async getAllReservations(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const limit  = params?.limit ?? 20;
    const offset = ((params?.page ?? 1) - 1) * limit;

    let query = supabase
      .from("reservations")
      .select(`
        id, start_date, end_date, reservation_status, payment_status,
        total_price, created_at, admin_notes,
        profiles!reservations_user_id_fkey (full_name, email, phone),
        cars (brand, model, year, main_image)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (params?.status) {
      query = query.eq("reservation_status", params.status as never);
    }

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);
    return { data: data ?? [], total: count ?? 0 };
  },

  async updateReservationStatus(
    reservationId: string,
    status: string,
    adminNotes?: string
  ) {
    const { error } = await supabase.rpc("admin_update_reservation_status", {
      p_reservation_id: reservationId,
      p_new_status:     status,
      p_admin_notes:    adminNotes ?? null,
    });

    if (error) throw new Error(error.message);
  },

  async verifyDocument(
    documentId: string,
    status: "verified" | "rejected",
    rejectionReason?: string
  ) {
    const { error } = await supabase.rpc("admin_verify_document", {
      p_document_id:      documentId,
      p_status:           status,
      p_rejection_reason: rejectionReason ?? null,
    });

    if (error) throw new Error(error.message);
  },

  async getDocumentSignedUrl(filePath: string) {
    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(filePath, 300);

    if (error) throw new Error(error.message);
    return data.signedUrl;
  },

  async getAllUsers(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const { data, count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);
    return { data: data ?? [], total: count ?? 0 };
  },

  /** Realtime: subscribe to new reservations */
  subscribeToReservations(callback: (reservation: unknown) => void) {
    return supabase
      .channel("admin:reservations")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reservations" },
        (payload) => callback(payload.new)
      )
      .subscribe();
  },
};

// ============================================================
// PROFILE API
// ============================================================

export const profileApi = {
  async getMe() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async update(updates: {
    full_name?: string;
    phone?: string;
    city?: string;
    country?: string;
  }) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async uploadAvatar(userId: string, file: File) {
    const MAX_SIZE = 2 * 1024 * 1024;
    const ALLOWED  = ["image/jpeg", "image/png", "image/webp"];

    if (file.size > MAX_SIZE) throw new Error("Avatar too large (max 2MB)");
    if (!ALLOWED.includes(file.type)) throw new Error("Invalid file type");

    const ext  = file.name.split(".").pop();
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadErr) throw new Error(uploadErr.message);

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    // Update profile
    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    return publicUrl;
  },
};
