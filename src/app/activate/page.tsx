"use client";
import { useState, useEffect } from "react";

export default function ActivatePage() {
  const [sessionId, setSessionId] = useState("");
  const [pruefen, setPruefen] = useState(true);
  const [gueltig, setGueltig] = useState(false);
  const [spracheEingabe, setSpracheEingabe] = useState("");
  const [sendetGerade, setSendetGerade] = useState(false);
  const [fehler, setFehler] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session_id");
    if (sid) {
      setSessionId(sid);
      setGueltig(true);
    }
    setPruefen(false);
  }, []);

  async function spracheFestlegen() {
    const lang = spracheEingabe.trim();
    if (lang === "" || sendetGerade) return;

    setSendetGerade(true);
    setFehler("");
    try {
      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, lang }),
      });
      const data = await res.json();
      if (!res.ok || !data.actionLink) throw new Error(data.error || "Aktivierung fehlgeschlagen.");
      window.location.href = data.actionLink;
    } catch (e: any) {
      setFehler(e.message || "Verbindungsfehler. Bitte erneut versuchen.");
      setSendetGerade(false);
    }
  }

  if (pruefen) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#16302b", color: "#fff" }}>
        ALORIS
      </div>
    );
  }

  if (!gueltig) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#16302b" }}>
        <div style={{ background: "#f2f1ec", padding: "40px", borderRadius: "12px", width: "100%", maxWidth: "400px", textAlign: "center" }}>
          <h1 style={{ color: "#16302b", marginBottom: "20px" }}>ALORIS</h1>
          <p style={{ color: "#333" }}>Invalid link. / Ungültiger Link.</p>
          <a href="/start" style={{ color: "#16302b", textDecoration: "underline" }}>Back to start / Zurück zum Start</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#16302b" }}>
      <div style={{ background: "#f2f1ec", padding: "40px", borderRadius: "12px", width: "100%", maxWidth: "400px", boxShadow: "0 4px 20px rgba(0,0,0,0.3)", textAlign: "center" }}>
        <h1 style={{ color: "#16302b", marginBottom: "10px", fontSize: "28px", fontWeight: "300" }}>ALORIS</h1>
        <p style={{ marginBottom: "30px", color: "#666", fontSize: "16px" }}>Deutsch, English, Français, Español, العربية, ...</p>

        <input
          type="text"
          placeholder="..."
          value={spracheEingabe}
          onChange={(e) => setSpracheEingabe(e.target.value)}
          style={{ padding: "12px", width: "100%", maxWidth: "300px", borderRadius: "8px", border: "1px solid #ccc", marginBottom: "20px", fontSize: "16px" }}
          onKeyDown={(e) => e.key === "Enter" && spracheFestlegen()}
        />
        <br />
        <button
          onClick={spracheFestlegen}
          disabled={sendetGerade}
          style={{ background: "#16302b", color: "#fff", padding: "12px 30px", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "16px" }}
        >
          {sendetGerade ? "..." : "Starten"}
        </button>

        {fehler && <p style={{ color: "#d9534f", marginTop: "15px" }}>{fehler}</p>}
      </div>
    </div>
  );
}