import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lrgoqzwhbmgyiouhbzem.supabase.co";

// WICHTIG: Dieser Client nutzt den Service-Role-Key und darf NIEMALS
// im Browser/Frontend verwendet werden - nur in serverseitigem Code (API-Routen).
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);