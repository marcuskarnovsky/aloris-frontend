"use client";
import { useEffect, useState } from "react";
import {
  ACHSEN,
  MITTE,
  MAX_RADIUS,
  LABEL_RADIUS,
  winkelFuer,
  berechnePunkte,
  ringPunkte,
} from "@/lib/lebensradGeometrie";
import { STANDARD_UEBERSETZUNG, type LebensradUebersetzung } from "@/lib/lebensradUebersetzung";

type Eintrag = {
  id: string;
  erstellt_am: string;
  foto_pfad: string | null;
  fotoUrl: string | null;
  ist_baseline: boolean;
  status: string;
  werte: Record<string, number> | null;
};

function formatDatum(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function cacheSchluessel(sprache: string): string {
  return `lebensrad_uebersetzung:${sprache.trim().toLowerCase()}`;
}

export default function LebensradAnsicht({ userId, sprache }: { userId: string; sprache: string }) {
  const [eintraege, setEintraege] = useState<Eintrag[]>([]);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState("");
  const [ausgewaehlteId, setAusgewaehlteId] = useState<string>("");
  const [u, setU] = useState<LebensradUebersetzung>(STANDARD_UEBERSETZUNG);

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

  useEffect(() => {
    async function laden() {
      try {
        const res = await fetch(`/api/lebensrad/verlauf?userId=${userId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Fehler beim Laden.");
        setEintraege(data.eintraege || []);
        const letzter = data.eintraege?.[data.eintraege.length - 1];
        if (letzter) setAusgewaehlteId(letzter.id);
      } catch (e: any) {
        setFehler(e.message || "Verbindungsfehler.");
      } finally {
        setLaedt(false);
      }
    }
    laden();
  }, [userId]);

  if (laedt) {
    return <p style={{ color: "#666", fontSize: "14px" }}>{u.laedt}</p>;
  }

  if (fehler) {
    return <p style={{ color: "#d9534f", fontSize: "14px" }}>{fehler}</p>;
  }

  if (eintraege.length === 0) {
    return (
      <p style={{ color: "#666", fontSize: "14px" }}>
        {u.keinEintrag}
      </p>
    );
  }

  const baseline = eintraege.find((e) => e.ist_baseline) || eintraege[0];
  const ausgewaehlt = eintraege.find((e) => e.id === ausgewaehlteId) || eintraege[eintraege.length - 1];
  const zeigtBaseline = ausgewaehlt.id !== baseline.id;

  return (
    <div>
      {eintraege.length > 1 && (
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", marginBottom: "6px", fontSize: "13px", color: "#666" }}>
            {u.zeitpunkt}
          </label>
          <select
            value={ausgewaehlteId}
            onChange={(e) => setAusgewaehlteId(e.target.value)}
            style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "14px" }}
          >
            {eintraege.map((e) => (
              <option key={e.id} value={e.id}>
                {formatDatum(e.erstellt_am)} {e.ist_baseline ? u.start : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <svg viewBox="0 0 240 240" style={{ width: "100%", maxWidth: "280px", display: "block", margin: "0 auto 16px" }}>
        {[2, 4, 6, 8, 10].map((stufe) => (
          <polygon key={stufe} points={ringPunkte(stufe)} fill="none" stroke="#e5e5e5" strokeWidth={1} />
        ))}
        {ACHSEN.map((achse, i) => {
          const winkel = winkelFuer(i);
          const x2 = MITTE + MAX_RADIUS * Math.cos(winkel);
          const y2 = MITTE + MAX_RADIUS * Math.sin(winkel);
          return <line key={achse.id} x1={MITTE} y1={MITTE} x2={x2} y2={y2} stroke="#e5e5e5" strokeWidth={1} />;
        })}

        {zeigtBaseline && baseline.werte && (
          <polygon
            points={berechnePunkte(baseline.werte)}
            fill="none"
            stroke="#999"
            strokeWidth={2}
            strokeDasharray="4,3"
          />
        )}

        {ausgewaehlt.werte && (
          <polygon points={berechnePunkte(ausgewaehlt.werte)} fill="rgba(22,48,43,0.25)" stroke="#16302b" strokeWidth={2} />
        )}

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

      {zeigtBaseline && (
        <p style={{ fontSize: "12px", color: "#999", textAlign: "center", marginBottom: "16px" }}>
          {u.vergleichshinweis} {formatDatum(baseline.erstellt_am)}
        </p>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "13px", color: "#333" }}>
        {ACHSEN.map((achse) => (
          <div key={achse.id} style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{u[achse.id]}</span>
            <span style={{ fontWeight: "bold", color: "#16302b" }}>
              {ausgewaehlt.werte?.[achse.id] ?? "–"}
            </span>
          </div>
        ))}
      </div>

      {ausgewaehlt.fotoUrl && (
        <div style={{ marginTop: "16px" }}>
          <p style={{ fontSize: "12px", color: "#999", marginBottom: "6px" }}>{u.originalFoto}</p>
          <img src={ausgewaehlt.fotoUrl} alt="Lebensrad-Foto" style={{ width: "100%", borderRadius: "8px" }} />
        </div>
      )}
    </div>
  );
}