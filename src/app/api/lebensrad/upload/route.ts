import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { berechneNaechsteErinnerung } from "@/lib/lebensradErinnerung";

const client = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  baseURL: "https://aloris-projekt-resource.services.ai.azure.com/openai/v1/",
});

const ACHSEN = [
  "gesundheit",
  "spiritualitaet",
  "finanzen",
  "partnerschaft_sexualitaet",
  "soziales_netzwerk",
  "freizeit",
  "karriere",
  "familie",
] as const;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const datei = formData.get("foto") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!datei || !userId) {
      return NextResponse.json({ error: "Foto und userId sind erforderlich." }, { status: 400 });
    }

    // Foto in Base64 umwandeln, für die KI-Analyse
    const buffer = Buffer.from(await datei.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mimeType = datei.type || "image/jpeg";
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // KI-Analyse: Markierungen auf dem Lebensrad-Foto auslesen
    const analyse = await client.chat.completions.create({
      model: "gpt-4o-2",
      messages: [
        {
          role: "system",
          content: `Du analysierst ein Foto eines handschriftlich ausgefüllten Lebensrads mit 8 Achsen (Skala 0-10 pro Achse, Mittelpunkt = 0, Außenrand = 10).
Die 8 Achsen in dieser festen Reihenfolge: gesundheit, spiritualitaet, finanzen, partnerschaft_sexualitaet, soziales_netzwerk, freizeit, karriere, familie.
Lies pro Achse ab, wie weit die Markierung vom Mittelpunkt entfernt ist, gerundet auf eine ganze Zahl zwischen 0 und 10.
Antworte AUSSCHLIESSLICH mit einem JSON-Objekt mit genau diesen 8 Schlüsseln und ganzzahligen Werten, ohne jeden weiteren Text, ohne Markdown-Codeblock.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Hier ist das Foto des ausgefüllten Lebensrads." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    });

    const rohtext = analyse.choices[0].message.content || "{}";
    const bereinigt = rohtext.replace(/```json|```/g, "").trim();
    let werte: Record<string, number>;
    try {
      werte = JSON.parse(bereinigt);
    } catch {
      return NextResponse.json(
        { error: "Die Markierungen konnten nicht eindeutig erkannt werden. Bitte Foto erneut aufnehmen oder digital ausfüllen." },
        { status: 422 }
      );
    }

    // Plausibilitäts-Check: alle 8 Achsen müssen vorhanden sein
    const vollstaendig = ACHSEN.every((achse) => typeof werte[achse] === "number");
    if (!vollstaendig) {
      return NextResponse.json(
        { error: "Nicht alle 8 Achsen konnten erkannt werden. Bitte Foto erneut aufnehmen oder digital ausfüllen." },
        { status: 422 }
      );
    }

    // Foto im Storage-Bucket ablegen
    const dateiname = `${userId}/${Date.now()}.jpg`;
    const { error: uploadFehler } = await supabaseAdmin.storage
      .from("lebensrad-fotos")
      .upload(dateiname, buffer, { contentType: mimeType });

    if (uploadFehler) throw uploadFehler;

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
        foto_pfad: dateiname,
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

    return NextResponse.json({ success: true, werte, istBaseline });
  } catch (error) {
    console.error("Lebensrad-Upload-Fehler:", error);
    return NextResponse.json({ error: "Fehler bei der Verarbeitung des Fotos." }, { status: 500 });
  }
}