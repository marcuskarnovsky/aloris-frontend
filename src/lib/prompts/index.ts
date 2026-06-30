import { LANGUAGE_NAMES } from "./sprachen";
import { KERN } from "./kern";
import { ONBOARDING } from "./onboarding";
import { ARBEITSMODI } from "./arbeitsmodi";
import { SCHUTZ } from "./schutz";
import { ABSCHLUSS } from "./abschluss";
import { METHODENKOMPASS } from "./methodenkompass";
import { METHODENBAUSTEIN } from "./methodenbaustein";
import { TECHNIKEN_COACH_PROMPT } from "./techniken"; // <-- NEU

export function buildSystemPrompt(languageCode: string): string {
  const langName = LANGUAGE_NAMES[languageCode] ?? "Deutsch";

  const SPRACHE = `## SPRACHE
  Gewählte Sprache des Coachees: ${langName}. Beginne und antworte in dieser Sprache.
  Wechselt der Coachee die Sprache, folgst du ihm.
  Kurze, klare Sätze sind erlaubt. Stille darf stehen. Kein Pathos, keine Floskeln, keine Motivationszitate. Keine Meta-Kommentare über Systeme oder Modelle.`;

  return [
    KERN,
    SPRACHE,
    ONBOARDING,
    ARBEITSMODI,
    SCHUTZ,
    ABSCHLUSS,
    METHODENKOMPASS,
    METHODENBAUSTEIN,
    TECHNIKEN_COACH_PROMPT, // <-- NEU
  ].join("\n\n");
}