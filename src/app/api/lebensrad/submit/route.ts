import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { berechneNaechsteErinnerung } from "@/lib/lebensradErinnerung";

export async function POST(req: Request) {
  try {
    const { userId, werte } = await req.json();

    if (!userId || !werte) {
      return NextResponse.json({ error: "userId und werte sind erforderlich." }, { status: 400 });
    }

    // Prüfen, ob es der allererste Lebensrad-Eintrag dieses Nutzers ist
    const { count, error: zaehlFehler } = await supabaseAdmin
      .from("lebensrad_eintraege")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (zaehlFehler) throw zaehlFehler;

    const istBaseline = (count ?? 0) === 0;

    // Eintrag speichern
    const { error: einfuegeFehler } = await supabaseAdmin
      .from("lebensrad_eintraege")
      .insert({
        user_id: userId,
        werte,
        status: "ausgewertet",
        ist_baseline: istBaseline,
      });

    if (einfuegeFehler) throw einfuegeFehler;

    // Profil-Status aktualisieren + nächste Erinnerung (10-15 Wochen) planen
    const naechsteErinnerung = berechneNaechsteErinnerung();
    const { error: profilFehler } = await supabaseAdmin
      .from("profiles")
      .update({ lebensrad_status: "erledigt", lebensrad_naechste_erinnerung: naechsteErinnerung })
      .eq("id", userId);

    if (profilFehler) throw profilFehler;

    return NextResponse.json({ success: true, istBaseline });
  } catch (error) {
    console.error("Lebensrad-Submit-Fehler:", error);
    return NextResponse.json({ error: "Fehler beim Speichern des Lebensrads." }, { status: 500 });
  }
}