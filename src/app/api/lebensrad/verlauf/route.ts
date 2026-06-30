import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId ist erforderlich." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("lebensrad_eintraege")
      .select("id, erstellt_am, foto_pfad, ist_baseline, status, werte")
      .eq("user_id", userId)
      .order("erstellt_am", { ascending: true });

    if (error) throw error;

    // Für Foto-Einträge: signierte, zeitlich begrenzte URL erzeugen (Bucket ist privat)
    const eintraege = await Promise.all(
      (data || []).map(async (eintrag) => {
        let fotoUrl: string | null = null;
        if (eintrag.foto_pfad) {
          const { data: signiert } = await supabaseAdmin.storage
            .from("lebensrad-fotos")
            .createSignedUrl(eintrag.foto_pfad, 60 * 10); // 10 Minuten gültig
          fotoUrl = signiert?.signedUrl || null;
        }
        return { ...eintrag, fotoUrl };
      })
    );

    return NextResponse.json({ eintraege });
  } catch (error) {
    console.error("Lebensrad-Verlauf-Fehler:", error);
    return NextResponse.json({ error: "Fehler beim Laden des Lebensrads." }, { status: 500 });
  }
}