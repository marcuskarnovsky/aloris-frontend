import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import { STANDARD_UEBERSETZUNG, type LebensradUebersetzung } from "@/lib/lebensradUebersetzung";

const client = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  baseURL: "https://aloris-projekt-resource.services.ai.azure.com/openai/v1/",
});

export async function POST(req: Request) {
  try {
    const { sprache } = await req.json();

    // Ohne Angabe oder bei Deutsch: deutsche Vorlage direkt zurückgeben, kein KI-Aufruf nötig
    const spracheKlein = (sprache || "").trim().toLowerCase();
    if (!sprache || spracheKlein === "" || spracheKlein === "deutsch" || spracheKlein === "de") {
      return NextResponse.json({ uebersetzung: STANDARD_UEBERSETZUNG });
    }

    const antwort = await client.chat.completions.create({
      model: "gpt-4o-2",
      messages: [
        {
          role: "system",
          content: `Übersetze die Werte des folgenden JSON-Objekts ins ${sprache}. Die Schlüssel bleiben exakt unverändert. Antworte AUSSCHLIESSLICH mit dem übersetzten JSON-Objekt, ohne Markdown-Codeblock, ohne jeden weiteren Text.`,
        },
        {
          role: "user",
          content: JSON.stringify(STANDARD_UEBERSETZUNG),
        },
      ],
    });

    const rohtext = antwort.choices[0].message.content || "{}";
    const bereinigt = rohtext.replace(/```json|```/g, "").trim();

    let uebersetzung: Partial<LebensradUebersetzung>;
    try {
      uebersetzung = JSON.parse(bereinigt);
    } catch {
      console.error("Lebensrad-Übersetzung: KI-Antwort war kein gültiges JSON, nutze Deutsch als Rückfall.");
      return NextResponse.json({ uebersetzung: STANDARD_UEBERSETZUNG });
    }

    // Lückenlos auffüllen: fehlt ein Schlüssel, deutschen Originaltext nutzen
    const vollstaendig: LebensradUebersetzung = { ...STANDARD_UEBERSETZUNG, ...uebersetzung };

    return NextResponse.json({ uebersetzung: vollstaendig });
  } catch (error) {
    console.error("Lebensrad-Übersetzung-Fehler:", error);
    return NextResponse.json({ uebersetzung: STANDARD_UEBERSETZUNG });
  }
}