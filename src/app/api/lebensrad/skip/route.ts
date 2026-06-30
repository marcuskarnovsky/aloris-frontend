import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { userId, modus } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId ist erforderlich." }, { status: 400 });
    }

    // modus "erinnerung"/"manuell": Status bleibt unverändert (bereits "erledigt"
    // von einer früheren Füllung), nur der nächste Erinnerungstermin wird um 1 Woche
    // verschoben - damit es nicht bei jedem App-Öffnen erneut nachfragt.
    if (modus === "erinnerung" || modus === "manuell") {
      const verschobenerTermin = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ lebensrad_naechste_erinnerung: verschobenerTermin })
        .eq("id", userId);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // Ursprünglicher Onboarding-Fall: Status wird auf "übersprungen" gesetzt
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ lebensrad_status: "uebersprungen" })
      .eq("id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lebensrad-Skip-Fehler:", error);
    return NextResponse.json({ error: "Fehler beim Speichern." }, { status: 500 });
  }
}