import { NextResponse } from "next/server";
import { OpenAI } from "openai";
import { buildSystemPrompt } from "@/lib/prompts";
import { supabase } from "@/lib/supabase";
import { refineWithClaude } from "@/lib/llm/claudeRefiner";

const client = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  baseURL: "https://aloris-projekt-resource.services.ai.azure.com/openai/v1/",
});

// Funktion für variable, subtile Hinweise auf das 1:1 Coaching
function getSubtilerHinweis(): string {
  const hinweise = [
    "\n\n--- \n*Manchmal gewinnt ein Anliegen durch das direkte Gespräch an Klarheit. Falls du das Bedürfnis hast, tiefer zu blicken, begleite ich dich gerne auch in einem 1:1.*",
    "\n\n--- \n*KI bietet gute Impulse, doch systemische Tiefe entfaltet sich oft im Dialog. Lass uns bei Gelegenheit schauen, ob wir dein Thema in einer persönlichen Session weiterführen.*",
    "\n\n--- \n*Wenn wir hier an einen Punkt gelangen, der mehr Resonanz braucht, denk daran: Ein persönlicher Austausch kann oft Blockaden lösen, die im Text verborgen bleiben.*",
    "\n\n--- \n*Dein Anliegen entwickelt sich. Wenn du das Gefühl hast, die KI reicht für den nächsten Schritt nicht aus, bin ich für ein tiefergehendes 1:1 Coaching bereit.*",
    "\n\n--- \n*Systemische Dynamiken zeigen sich oft klarer im Gespräch. Wenn es für dich stimmig ist, können wir das gerne in einem Live-Format vertiefen.*"
  ];
  return hinweise[Math.floor(Math.random() * hinweise.length)];
}

// Findet die letzte Nachricht des Coachees (role: "user") im Verlauf
function getLastUserMessage(messages: any[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      return messages[i].content || "";
    }
  }
  return "";
}

// Ruhige Ausweich-Antworten, falls Azure die Anfrage aus Sicherheitsgründen blockiert
// (z. B. starke Wortwahl in Kombination mit einem emotional aufgeladenen Thema).
// Damit der Coachee NIE eine technische Fehlermeldung sieht.
function getAusweichantwort(): string {
  const antworten = [
    "Ich bin gerade kurz hängen geblieben. Magst du das, was du gesagt hast, nochmal in anderen Worten beschreiben?",
    "Lass uns das nochmal von vorne aufgreifen - was genau passiert in diesem Moment, den du gerade beschrieben hast?",
    "Ich möchte ganz bei dir bleiben - sag mir nochmal in deinen eigenen Worten, was du gerade am meisten spürst.",
  ];
  return antworten[Math.floor(Math.random() * antworten.length)];
}

export async function POST(req: Request) {
  try {
    const { messages, language, sessionId, lebensradEreignis, lebensradAnlass, lebensradErinnerungFaellig } = await req.json();

    // System-Prompt basierend auf der gewählten Sprache
    let systemPrompt = buildSystemPrompt(language);

    // Sonderfall: eine fällige Lebensrad-Erinnerung soll einfühlsam eingewoben werden
    if (lebensradErinnerungFaellig) {
      systemPrompt += `\n\n## AKTUELLER MOMENT\nSeit dem letzten Lebensrad ist eine Weile vergangen. Wenn es organisch in dieses Gespräch passt, lade den Coachee einfühlsam dazu ein, gemeinsam nochmal auf sein Lebensrad zu schauen, um zu sehen, wie sich die Dinge seitdem entwickelt haben. Kein Druck, keine Pflicht - eine warme, kurze Einladung. Direkt im Anschluss an deine Antwort erscheint das Lebensrad automatisch für ihn, du musst es nicht selbst technisch ankündigen.`;
    }

    // Sonderfall: Lebensrad wurde gerade eingereicht oder übersprungen
    if (lebensradEreignis === "eingereicht" || lebensradEreignis === "uebersprungen") {
      const istOnboarding = !lebensradAnlass || lebensradAnlass === "onboarding";
      if (istOnboarding) {
        systemPrompt += `\n\n## AKTUELLER MOMENT\nDas Lebensrad wurde soeben ${lebensradEreignis === "eingereicht" ? "eingereicht" : "übersprungen"}. Gehe kurz und wertfrei darauf ein (siehe ONBOARDING Punkt 4) und frage danach: "Mit welchem Thema möchtest du heute konkret starten?"`;
      } else {
        systemPrompt += `\n\n## AKTUELLER MOMENT\nDas Lebensrad wurde soeben ${lebensradEreignis === "eingereicht" ? "erneut ausgefüllt" : "für jetzt übersprungen"}. Gehe kurz und wertschätzend darauf ein. Frage NICHT erneut nach dem Thema der Sitzung, als wäre es ein Erstgespräch - knüpfe stattdessen organisch an das bisherige Gespräch an, oder frage offen, womit du heute helfen kannst.`;
      }
    }

    let rawReply: string;
    let vomFilterBlockiert = false;

    try {
      // API-Aufruf an Azure OpenAI
      const completion = await client.chat.completions.create({
        model: "gpt-4o-2",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
      });
      rawReply = completion.choices[0].message.content || "Keine Antwort.";
    } catch (azureFehler: any) {
      const istContentFilter =
        azureFehler?.code === "content_filter" || azureFehler?.error?.code === "content_filter";

      if (istContentFilter) {
        console.error(
          "Azure Content-Filter ausgelöst:",
          JSON.stringify(azureFehler?.error?.innererror?.content_filter_result || azureFehler)
        );
        rawReply = getAusweichantwort();
        vomFilterBlockiert = true;
      } else {
        throw azureFehler;
      }
    }

    // 1. Claude-Supervision: Systemische Qualität prüfen (überspringen bei Ausweich-Antwort,
    // da diese bereits feststeht und nicht weiter geprüft werden muss)
    let finalReply = rawReply;
    if (!vomFilterBlockiert) {
      const lastUserMessage = getLastUserMessage(messages);
      finalReply = await refineWithClaude(rawReply, lastUserMessage);
    }

    // 2. Subtile Hinweis-Logik:
    if (messages.length >= 20) {
      if (Math.random() < 0.15) {
        finalReply += getSubtilerHinweis();
      }
    }

    // Log in Supabase
    await supabase.from("chat_logs").insert({
      session_id: sessionId,
      messages: [...messages, { role: "assistant", content: finalReply }]
    });

    return NextResponse.json({ reply: finalReply });

  } catch (error) {
    console.error("API Fehler:", error);
    return NextResponse.json({ error: "Fehler bei der Verarbeitung" }, { status: 500 });
  }
}