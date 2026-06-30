import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lrgoqzwhbmgyiouhbzem.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

const email = process.argv[2];

if (!email) {
  console.error("Bitte E-Mail als Argument angeben, z.B.:");
  console.error("node --env-file=.env.local scripts/generate-link.mjs deine@email.de");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabaseAdmin.auth.admin.generateLink({
  type: "recovery",
  email: email,
  options: {
    redirectTo: `${baseUrl}/set-password`,
  },
});

if (error) {
  console.error("Fehler beim Erzeugen des Links:", error.message);
  process.exit(1);
}

console.log("\n✅ Link erfolgreich erzeugt:\n");
console.log(data.properties.action_link);
console.log("\nDiesen Link direkt im Browser öffnen.\n");