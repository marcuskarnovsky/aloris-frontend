// ===================================================================
// LEBENSRAD-ÜBERSETZUNG – Texte, die per KI in die frei eingegebene
// Sprache des Coachees übersetzt werden. STANDARD_UEBERSETZUNG ist
// die deutsche Vorlage: dient als Übersetzungs-Grundlage UND als
// sofortiger Rückfall, solange die Übersetzung noch lädt oder falls
// sie fehlschlägt.
// ===================================================================

export type LebensradUebersetzung = {
  gesundheit: string;
  spiritualitaet: string;
  finanzen: string;
  partnerschaft_sexualitaet: string;
  soziales_netzwerk: string;
  freizeit: string;
  karriere: string;
  familie: string;
  titel: string;
  beschreibung: string;
  tabSchieberegler: string;
  tabFoto: string;
  fotoHinweis: string;
  fotoButton: string;
  fotoButtonAktiv: string;
  abschicken: string;
  abschickenAktiv: string;
  spaeter: string;
  zeitpunkt: string;
  start: string;
  vergleichshinweis: string;
  originalFoto: string;
  laedt: string;
  keinEintrag: string;
};

export const STANDARD_UEBERSETZUNG: LebensradUebersetzung = {
  gesundheit: "Gesundheit",
  spiritualitaet: "Spiritualität & Sinn",
  finanzen: "Finanzen",
  partnerschaft_sexualitaet: "Partnerschaft & Sexualität",
  soziales_netzwerk: "Soziales Netzwerk",
  freizeit: "Freizeit",
  karriere: "Karriere",
  familie: "Familie",
  titel: "Dein Lebensrad",
  beschreibung: "Es geht nicht darum, überall eine 10 zu erreichen – sondern darum, dass dein Rad rund läuft.",
  tabSchieberegler: "Schieberegler",
  tabFoto: "Foto hochladen",
  fotoHinweis: "Druck dein Lebensrad aus, markiere jeden Bereich von Hand und mach ein Foto. Achte darauf, dass alle 8 Bereiche gut erkennbar sind.",
  fotoButton: "📷 Foto aufnehmen oder auswählen",
  fotoButtonAktiv: "Wird ausgewertet...",
  abschicken: "Lebensrad abschicken",
  abschickenAktiv: "Wird gespeichert...",
  spaeter: "Später ausfüllen",
  zeitpunkt: "Zeitpunkt",
  start: "(Start)",
  vergleichshinweis: "Gestrichelt: dein Start-Wert vom",
  originalFoto: "Original-Foto:",
  laedt: "Lädt...",
  keinEintrag: "Du hast noch kein Lebensrad ausgefüllt. Es erscheint automatisch zu einem passenden Moment im Gespräch.",
};