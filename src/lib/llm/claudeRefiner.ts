import Anthropic from "@anthropic-ai/sdk";
import { TECHNIKEN_AUDITOR_PROMPT } from "@/lib/prompts/techniken";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  defaultHeaders: { "anthropic-version": "2023-06-01" },
});

// Erkennt typische Anzeichen, dass Analyse-Text mit in die finale Antwort
// gerutscht ist (auch wenn die <antwort>-Tags formal korrekt gesetzt wurden).
function wirktWieAnalyse(text: string): boolean {
  const verdachtsMuster = [
    /korrigierte antwort/i,
    /ich sehe hier/i,
    /diskrepanz/i,
    /kontraintuitiv/i,
    /das ist (ein|eine) \*\*/i,
    /worum es geht/i,
  ];
  if (verdachtsMuster.some((muster) => muster.test(text))) return true;

  // Mehr als zwei fett markierte Stellen deuten auf eine strukturierte
  // Analyse hin, nicht auf eine natürliche Coach-Antwort.
  const fettStellen = (text.match(/\*\*/g) || []).length;
  if (fettStellen > 4) return true;

  return false;
}

// Holt NUR den Inhalt zwischen <antwort> und </antwort> heraus.
// Fehlen die Tags, oder wirkt der Inhalt selbst noch wie Analyse,
// wird sicherheitshalber NIE der Rohtext gezeigt, sondern die
// unveränderte Original-Antwort des Coaches - so kann niemals
// eine interne Analyse beim Coachee landen.
function extrahiereAntwort(rohtext: string, fallback: string): string {
  const treffer = rohtext.match(/<antwort>([\s\S]*?)<\/antwort>/i);
  const kandidat = treffer && treffer[1].trim() !== "" ? treffer[1].trim() : null;

  if (!kandidat) {
    console.error("Claude Supervisor: <antwort>-Tag fehlte in der Ausgabe, Fallback genutzt.");
    return fallback;
  }

  if (wirktWieAnalyse(kandidat)) {
    console.error("Claude Supervisor: Analyse-Anzeichen im <antwort>-Block erkannt, Fallback genutzt.");
    return fallback;
  }

  return kandidat;
}

export async function refineWithClaude(originalAnswer: string, lastUserMessage: string) {
  // Die 20%-Stichprobe: Wenn Zufall > 0.2, gib Original zurück (spart API-Kosten)
  if (Math.random() > 0.2) return originalAnswer;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: `Du bist der stille Supervisor für den Coach Marcus Walter Karnovsky.
               Überprüfe die folgende Coach-Antwort auf systemische Kongruenz.
               Stil: Direkt, aktiv, systemisch, keine Opferhaltung, I-Perspektive.

               ${TECHNIKEN_AUDITOR_PROMPT}

               ## AUSGABEFORMAT (ZWINGEND, immer genau diese zwei Blöcke, nichts davor, nichts dahinter)

               <analyse>
               Hier darfst du frei prüfen und abwägen - Techniken referenzieren, Schwächen benennen, Trigger zuordnen. Dieser Block wird NIE angezeigt und NIE an den Klienten weitergegeben.
               </analyse>
               <antwort>
               Hier steht AUSSCHLIESSLICH die finale Antwort, Wort für Wort so, wie sie dem Klienten im Chat angezeigt wird.

               FALSCH wäre z.B.: "Ich sehe hier eine Diskrepanz... Korrigierte Antwort: Danke, dass du das sagst..." - das ist Analyse, die hier NICHTS verloren hat.
               RICHTIG ist NUR der reine Antwort-Satz selbst, z.B.: "Danke, dass du das sagst. Was genau hält dich zurück?"

               Keine Überschriften, keine Sternchen-Bewertungen, kein "Feedback:", kein "---", keine Erklärung deiner Änderung, kein "Korrigierte Antwort:". Wenn die Coach-Antwort schon gut war: gib sie hier unverändert wieder.
               </antwort>

               Alles außerhalb von <antwort>...</antwort> wird automatisch verworfen.`,
      messages: [{ 
        role: "user", 
        content: `Letzte Nachricht des Coachees: ${lastUserMessage}\n\nCoach-Antwort: ${originalAnswer}` 
      }],
    });

    const rohtext = response.content
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("");

    return extrahiereAntwort(rohtext, originalAnswer);
  } catch (e) {
    console.error("Claude Supervisor Fehler:", e);
    return originalAnswer; // Fallback bei API-Fehler
  }
}