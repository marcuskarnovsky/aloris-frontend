"use client";
import { useState, useRef, useEffect } from "react";
import {
  ACHSEN,
  AchsenId,
  MITTE,
  MAX_RADIUS,
  LABEL_RADIUS,
  winkelFuer,
  berechnePunkte,
  ringPunkte,
} from "@/lib/lebensradGeometrie";
import { STANDARD_UEBERSETZUNG, type LebensradUebersetzung } from "@/lib/lebensradUebersetzung";

const modusBtn = (aktiv: boolean) => ({
  flex: 1,
  padding: "8px",
  borderRadius: "8px",
  border: aktiv ? "2px solid #16302b" : "1px solid #ccc",
  background: aktiv ? "#16302b" : "#fff",
  color: aktiv ? "#fff" : "#333",
  cursor: "pointer",
  fontSize: "14px",
});

function cacheSchluessel(sprache: string): string {
  return `lebensrad_uebersetzung:${sprache.trim().toLowerCase()}`;
}

export default function LebensradKarte({
  userId,
  sprache,
  onFertig,
  onSpaeter,
}: {
  userId: string;
  sprache: string;
  onFertig: () => void;
  onSpaeter: () => void;
}) {
  const [modus, setModus] = useState<"digital" | "foto">("digital");
  const [werte, setWerte] = useState<Record<AchsenId, number>>(
    Object.fromEntries(ACHSEN.map((a) => [a.id, 5])) as Record<AchsenId, number>
  );
  const [sendetGerade, setSendetGerade] = useState(false);
  const [fehler, setFehler] = useState("");
  const [u, setU] = useState<LebensradUebersetzung>(STANDARD_UEBERSETZUNG);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Holt die Lebensrad-Texte in der freien Sprache des Coachees - per KI übersetzt,
  // einmal pro Sprache im Browser zwischengespeichert. Bis dahin/im Fehlerfall: Deutsch.
  useEffect(() => {
    if (!sprache || sprache.trim() === "") return;

    const schluessel = cacheSchluessel(sprache);
    const zwischengespeichert = localStorage.getItem(schluessel);
    if (zwischengespeichert) {
      try {
        setU(JSON.parse(zwischengespeichert));
        return;
      } catch {
        // fällt durch zur Neuanfrage
      }
    }

    fetch("/api/lebensrad/uebersetzen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sprache }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.uebersetzung) {
          setU(data.uebersetzung);
          localStorage.setItem(schluessel, JSON.stringify(data.uebersetzung));
        }
      })
      .catch((e) => console.error("Lebensrad-Übersetzung konnte nicht geladen werden:", e));
  }, [sprache]);

  async function digitalAbschicken() {
    setSendetGerade(true);
    setFehler("");
    try {
      const res = await fetch("/api/lebensrad/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, werte }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler beim Speichern.");
      onFertig();
    } catch (e: any) {
      setFehler(e.message || "Verbindungsfehler. Bitte erneut versuchen.");
    } finally {
      setSendetGerade(false);
    }
  }

  async function fotoHochladen(datei: File) {
    setSendetGerade(true);
    setFehler("");
    try {
      const formData = new FormData();
      formData.append("foto", datei);
      formData.append("userId", userId);
      const res = await fetch("/api/lebensrad/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler bei der Auswertung.");
      onFertig();
    } catch (e: any) {
      setFehler(e.message || "Verbindungsfehler. Bitte erneut versuchen.");
    } finally {
      setSendetGerade(false);
    }
  }

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "12px",
        padding: "20px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        marginBottom: "20px",
      }}
    >
      <h3 style={{ margin: "0 0 4px 0", color: "#16302b", fontSize: "18px" }}>
        {u.titel}
      </h3>
      <p style={{ margin: "0 0 16px 0", color: "#666", fontSize: "14px" }}>
        {u.beschreibung}
      </p>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button onClick={() => setModus("digital")} style={modusBtn(modus === "digital")}>
          {u.tabSchieberegler}
        </button>
        <button onClick={() => setModus("foto")} style={modusBtn(modus === "foto")}>
          {u.tabFoto}
        </button>
      </div>

      {modus === "digital" ? (
        <>
          <svg viewBox="0 0 240 240" style={{ width: "100%", maxWidth: "280px", display: "block", margin: "0 auto 20px" }}>
            {[2, 4, 6, 8, 10].map((stufe) => (
              <polygon key={stufe} points={ringPunkte(stufe)} fill="none" stroke="#e5e5e5" strokeWidth={1} />
            ))}
            {ACHSEN.map((achse, i) => {
              const winkel = winkelFuer(i);
              const x2 = MITTE + MAX_RADIUS * Math.cos(winkel);
              const y2 = MITTE + MAX_RADIUS * Math.sin(winkel);
              return <line key={achse.id} x1={MITTE} y1={MITTE} x2={x2} y2={y2} stroke="#e5e5e5" strokeWidth={1} />;
            })}
            <polygon points={berechnePunkte(werte)} fill="rgba(22,48,43,0.25)" stroke="#16302b" strokeWidth={2} />
            {ACHSEN.map((achse, i) => {
              const winkel = winkelFuer(i);
              const lx = MITTE + LABEL_RADIUS * Math.cos(winkel);
              const ly = MITTE + LABEL_RADIUS * Math.sin(winkel);
              const anker = lx < MITTE - 5 ? "end" : lx > MITTE + 5 ? "start" : "middle";
              return (
                <text key={achse.id} x={lx} y={ly} fontSize="8" fill="#16302b" textAnchor={anker} dominantBaseline="middle">
                  {u[achse.id]}
                </text>
              );
            })}
          </svg>

          {ACHSEN.map((achse) => (
            <div key={achse.id} style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "#333", marginBottom: "4px" }}>
                <span>{u[achse.id]}</span>
                <span style={{ fontWeight: "bold", color: "#16302b" }}>{werte[achse.id]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={werte[achse.id]}
                onChange={(e) => setWerte({ ...werte, [achse.id]: Number(e.target.value) })}
                style={{ width: "100%", accentColor: "#16302b" }}
              />
            </div>
          ))}

          {fehler && <p style={{ color: "#d9534f", fontSize: "14px" }}>{fehler}</p>}

          <button
            onClick={digitalAbschicken}
            disabled={sendetGerade}
            style={{ width: "100%", padding: "12px", background: "#16302b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "15px", marginTop: "10px" }}
          >
            {sendetGerade ? u.abschickenAktiv : u.abschicken}
          </button>
        </>
      ) : (
        <>
          <p style={{ fontSize: "14px", color: "#666", marginBottom: "12px" }}>
            {u.fotoHinweis}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const datei = e.target.files?.[0];
              if (datei) fotoHochladen(datei);
            }}
            style={{ display: "none" }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sendetGerade}
            style={{ width: "100%", padding: "12px", background: "#16302b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "15px" }}
          >
            {sendetGerade ? u.fotoButtonAktiv : u.fotoButton}
          </button>
          {fehler && <p style={{ color: "#d9534f", fontSize: "14px", marginTop: "10px" }}>{fehler}</p>}
        </>
      )}

      <button
        onClick={onSpaeter}
        disabled={sendetGerade}
        style={{ width: "100%", padding: "10px", background: "none", color: "#888", border: "none", cursor: "pointer", fontSize: "13px", marginTop: "14px", textDecoration: "underline" }}
      >
        {u.spaeter}
      </button>
    </div>
  );
}