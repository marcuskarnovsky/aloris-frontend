// ===================================================================
// LEBENSRAD-GEOMETRIE – gemeinsame Berechnungen für alle
// Lebensrad-Komponenten (Ausfüllen, Ansicht/Verlauf).
// ===================================================================

export type AchsenId =
  | "gesundheit"
  | "spiritualitaet"
  | "finanzen"
  | "partnerschaft_sexualitaet"
  | "soziales_netzwerk"
  | "freizeit"
  | "karriere"
  | "familie";

export const ACHSEN: { id: AchsenId; label: string }[] = [
  { id: "gesundheit", label: "Gesundheit" },
  { id: "spiritualitaet", label: "Spiritualität & Sinn" },
  { id: "finanzen", label: "Finanzen" },
  { id: "partnerschaft_sexualitaet", label: "Partnerschaft & Sexualität" },
  { id: "soziales_netzwerk", label: "Soziales Netzwerk" },
  { id: "freizeit", label: "Freizeit" },
  { id: "karriere", label: "Karriere" },
  { id: "familie", label: "Familie" },
];

export const MITTE = 120;
export const MAX_RADIUS = 80;
export const LABEL_RADIUS = 102;

export function winkelFuer(index: number): number {
  return (Math.PI * 2 * index) / ACHSEN.length - Math.PI / 2;
}

export function berechnePunkte(werte: Record<string, number>): string {
  return ACHSEN.map((achse, i) => {
    const winkel = winkelFuer(i);
    const radius = (werte[achse.id] / 10) * MAX_RADIUS;
    const x = MITTE + radius * Math.cos(winkel);
    const y = MITTE + radius * Math.sin(winkel);
    return `${x},${y}`;
  }).join(" ");
}

export function ringPunkte(wert: number): string {
  return ACHSEN.map((_, i) => {
    const winkel = winkelFuer(i);
    const radius = (wert / 10) * MAX_RADIUS;
    const x = MITTE + radius * Math.cos(winkel);
    const y = MITTE + radius * Math.sin(winkel);
    return `${x},${y}`;
  }).join(" ");
}