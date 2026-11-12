import { createClient } from "@supabase/supabase-js";

// Publishable keys are meant for browser clients. Never place a service-role/secret key here.
const url = import.meta.env.VITE_SUPABASE_URL || "https://ntymdsrpmsxmrvwvuiad.supabase.co";
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_H-lHD1fZ_rMt798i_RmoRQ_Lzd1b3iW";

export const supabase = url && key
  ? createClient(url, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "pkce"
      }
    })
  : null;

export const supabaseConfigured = Boolean(supabase);