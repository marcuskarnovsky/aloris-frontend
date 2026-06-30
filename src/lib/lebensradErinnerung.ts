// ===================================================================
// LEBENSRAD-ERINNERUNG – berechnet den nächsten Termin für eine
// erneute Betrachtung des Lebensrads (Verlaufsvergleich).
// ===================================================================

export function berechneNaechsteErinnerung(): string {
  const minWochen = 10;
  const maxWochen = 15;
  const wochen = minWochen + Math.floor(Math.random() * (maxWochen - minWochen + 1));
  const millisekunden = wochen * 7 * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + millisekunden).toISOString();
}