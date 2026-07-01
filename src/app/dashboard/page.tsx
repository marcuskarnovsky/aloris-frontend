"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import LebensradKarte from "@/components/LebensradKarte";
import LebensradAnsicht from "@/components/LebensradAnsicht";
import { IMPRESSUM_DE, IMPRESSUM_EN, DATENSCHUTZ_DE, DATENSCHUTZ_EN } from "@/lib/rechtstexte";

type Msg = { role: "user" | "assistant"; content: string };
type LebensradAnlass = "onboarding" | "manuell" | "erinnerung";

export default function Page() {
  const [sprache, setSprache] = useState("");
  const [spracheEingabe, setSpracheEingabe] = useState("");
  const [fontSize, setFontSize] = useState(16);
  const [helligkeit, setHelligkeit] = useState("#f2f1ec");
  const [settingsOffen, setSettingsOffen] = useState(false);
  const [zeige, setZeige] = useState("");
  const [rechtSprache, setRechtSprache] = useState<"de" | "en">("de");

  const [bereit, setBereit] = useState(false);
  const [spracheUnbekannt, setSpracheUnbekannt] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [sessionId, setSessionId] = useState("");

  const [userId, setUserId] = useState("");
  const [profilSprache, setProfilSprache] = useState("");
  const [lebensradStatus, setLebensradStatus] = useState<string | null>(null);
  const [lebensradNaechsteErinnerung, setLebensradNaechsteErinnerung] = useState<string | null>(null);
  const [zeigeLebensrad, setZeigeLebensrad] = useState(false);
  const [lebensradAnlass, setLebensradAnlass] = useState<LebensradAnlass>("onboarding");

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const gespeichert = localStorage.getItem("aloris_chat");
    if (gespeichert) {
      try {
        const data = JSON.parse(gespeichert);
        if (data.started) {
          setBereit(true);
          setSprache(data.sprache || "");
          setMessages(data.messages || []);
          setSessionId(data.sessionId || crypto.randomUUID());
        }
      } catch (e) {
        console.error("Fehler beim Laden des Speichers:", e);
      }
    }
  }, []);

  useEffect(() => {
    async function ladeNutzer() {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) return;
      setUserId(uid);

      const { data: profil } = await supabase
        .from("profiles")
        .select("lebensrad_status, preferred_lang, lebensrad_naechste_erinnerung")
        .eq("id", uid)
        .single();

      const status = profil?.lebensrad_status || "offen";
      setLebensradStatus(status);

      const gefundeneSprache = profil?.preferred_lang as string | undefined;
      if (gefundeneSprache) {
        setProfilSprache(gefundeneSprache);
      }

      const naechsteErinnerung = profil?.lebensrad_naechste_erinnerung as string | undefined;
      setLebensradNaechsteErinnerung(naechsteErinnerung || null);

      const erinnerungFaellig =
        status === "erledigt" &&
        !!naechsteErinnerung &&
        new Date(naechsteErinnerung) <= new Date();

      const gespeichertesChat = localStorage.getItem("aloris_chat");

      if (erinnerungFaellig) {
        localStorage.removeItem("aloris_chat");
        starteNeuesGespraech(gefundeneSprache || "en", true);
      } else if (!gespeichertesChat) {
        if (gefundeneSprache) {
          starteNeuesGespraech(gefundeneSprache);
        } else {
          setSpracheUnbekannt(true);
        }
      }
    }
    ladeNutzer();
  }, []);

  useEffect(() => {
    if (bereit) {
      localStorage.setItem(
        "aloris_chat",
        JSON.stringify({ started: true, sprache, messages, sessionId })
      );
    }
  }, [bereit, sprache, messages, sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages, laedt]);

  useEffect(() => {
    if (!bereit || !userId || lebensradStatus === null || laedt) return;
    const userAntworten = messages.filter((m) => m.role === "user").length;
    if (userAntworten === 5 && lebensradStatus === "offen" && !zeigeLebensrad) {
      setLebensradAnlass("onboarding");
      setZeigeLebensrad(true);
    }
  }, [messages, bereit, userId, lebensradStatus, zeigeLebensrad, laedt]);

  async function starteNeuesGespraech(lang: string, erinnerungFaellig: boolean = false) {
    const neueSessionId = crypto.randomUUID();
    setSprache(lang);
    setSessionId(neueSessionId);
    setBereit(true);
    setSpracheUnbekannt(false);
    await starteBegruessung(neueSessionId, lang, erinnerungFaellig);
    if (erinnerungFaellig) {
      setLebensradAnlass("erinnerung");
      setZeigeLebensrad(true);
    } else {
      setLebensradAnlass("onboarding");
    }
  }

  async function spracheFestlegen() {
    const lang = spracheEingabe.trim();
    if (lang === "") return;

    setProfilSprache(lang);
    if (userId) {
      try {
        await fetch("/api/profile/sprache", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, lang }),
        });
      } catch (e) {
        console.error("Sprache (Profil) konnte nicht aktualisiert werden:", e);
      }
    }
    starteNeuesGespraech(lang);
  }

  async function starteBegruessung(sid: string, lang: string, erinnerungFaellig: boolean = false) {
    setLaedt(true);
    const startNachricht = { role: "user" as const, content: "Hallo" };
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [startNachricht],
          language: lang,
          sessionId: sid,
          lebensradErinnerungFaellig: erinnerungFaellig,
        }),
      });
      const data = await res.json();
      setMessages([{ role: "assistant", content: data.reply || "Keine Antwort erhalten." }]);
    } catch (e) {
      console.error("Start-Fehler:", e);
      setMessages([{ role: "assistant", content: "Verbindungsfehler. Bitte erneut versuchen." }]);
    } finally {
      setLaedt(false);
    }
  }

  async function senden() {
    const text = input.trim();
    if (text === "" || laedt) return;

    const neueMessages: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(neueMessages);
    setInput("");
    setLaedt(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: neueMessages, 
          language: sprache,
          sessionId: sessionId
        }),
      });
      const data = await res.json();
      setMessages([
        ...neueMessages,
        { role: "assistant", content: data.reply || data.error || "Keine Antwort erhalten." },
      ]);
    } catch (e) {
      console.error("Senden-Fehler:", e);
      setMessages([
        ...neueMessages,
        { role: "assistant", content: "Verbindungsfehler. Bitte erneut versuchen." },
      ]);
    } finally {
      setLaedt(false);
    }
  }

  async function weiterNachLebensrad(ereignis: "eingereicht" | "uebersprungen") {
    setZeigeLebensrad(false);
    const anlass = lebensradAnlass;

    if (ereignis === "uebersprungen" && userId) {
      try {
        await fetch("/api/lebensrad/skip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            modus: anlass === "onboarding" ? undefined : anlass,
          }),
        });
      } catch (e) {
        console.error("Lebensrad-Skip-Fehler:", e);
      }
    }

    if (ereignis === "eingereicht") {
      setLebensradStatus("erledigt");
    } else if (anlass === "onboarding") {
      setLebensradStatus("uebersprungen");
    }

    setLaedt(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          language: sprache,
          sessionId,
          lebensradEreignis: ereignis,
          lebensradAnlass: anlass,
        }),
      });
      const data = await res.json();
      setMessages([
        ...messages,
        { role: "assistant", content: data.reply || data.error || "Keine Antwort erhalten." },
      ]);
    } catch (e) {
      console.error("Lebensrad-Übergang-Fehler:", e);
      setMessages([
        ...messages,
        { role: "assistant", content: "Verbindungsfehler. Bitte erneut versuchen." },
      ]);
    } finally {
      setLaedt(false);
      setLebensradAnlass("onboarding");
    }
  }

  function lebensradManuellOeffnen() {
    setLebensradAnlass("manuell");
    setZeigeLebensrad(true);
    setSettingsOffen(false);
  }

  function neuStarten() {
    localStorage.removeItem("aloris_chat");
    setMessages([]);
    setSessionId("");
    setSettingsOffen(false);
    setZeigeLebensrad(false);

    const erinnerungFaellig =
      lebensradStatus === "erledigt" &&
      !!lebensradNaechsteErinnerung &&
      new Date(lebensradNaechsteErinnerung) <= new Date();

    if (profilSprache) {
      starteNeuesGespraech(profilSprache, erinnerungFaellig);
    } else {
      setBereit(false);
      setSpracheUnbekannt(true);
    }
  }

  async function abmelden() {
    await supabase.auth.signOut();
    localStorage.removeItem("aloris_chat");
    window.location.href = "/login";
  }

  const optionBtn = (aktiv: boolean) => ({
    flex: 1,
    padding: "8px",
    borderRadius: "8px",
    border: aktiv ? "2px solid #16302b" : "1px solid #ccc",
    background: aktiv ? "#16302b" : "#fff",
    color: aktiv ? "#fff" : "#333",
    cursor: "pointer",
    fontSize: "14px",
  });

  const zahnrad = (
    <button
      onClick={() => setSettingsOffen(true)}
      title="Einstellungen"
      style={{
        position: "absolute",
        top: "16px",
        right: "16px",
        background: "none",
        border: "none",
        fontSize: "22px",
        cursor: "pointer",
        color: "#16302b",
      }}
    >
      ⚙️
    </button>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#16302b", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "sans-serif", padding: "20px" }}>
      <style>{`
        @keyframes aloris-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        .aloris-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #16302b;
          display: inline-block;
          animation: aloris-bounce 1.2s infinite ease-in-out;
        }
      `}</style>

      <div style={{ background: helligkeit, width: "100%", maxWidth: "800px", height: "85vh", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>

        <div style={{ padding: "20px", borderBottom: "1px solid #ddd", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ margin: 0, fontSize: "20px", color: "#16302b", letterSpacing: "2px", fontWeight: "normal" }}>ALORIS</h1>
          {bereit && zahnrad}
        </div>

        {spracheUnbekannt ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "40px", textAlign: "center" }}>
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
            <button
              onClick={spracheFestlegen}
              style={{ background: "#16302b", color: "#fff", padding: "12px 30px", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "16px" }}
            >
              Starten
            </button>
          </div>
        ) : !bereit ? (
          <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", color: "#16302b", fontSize: "14px" }}>
            ALORIS
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px", fontSize: `${fontSize}px` }} ref={scrollRef}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: "20px" }}>
                  <div style={{
                    background: m.role === "user" ? "#16302b" : "#fff",
                    color: m.role === "user" ? "#fff" : "#333",
                    padding: "16px", borderRadius: "12px", maxWidth: "80%",
                    boxShadow: m.role === "assistant" ? "0 2px 10px rgba(0,0,0,0.05)" : "none",
                    lineHeight: "1.5"
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}

              {zeigeLebensrad && userId && (
                <LebensradKarte
                  userId={userId}
                  sprache={sprache}
                  onFertig={() => weiterNachLebensrad("eingereicht")}
                  onSpaeter={() => weiterNachLebensrad("uebersprungen")}
                />
              )}

              {laedt && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div style={{ background: "#fff", padding: "16px", borderRadius: "12px", display: "flex", gap: "6px", alignItems: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
                    <span className="aloris-dot" style={{ animationDelay: "0s" }} />
                    <span className="aloris-dot" style={{ animationDelay: "0.2s" }} />
                    <span className="aloris-dot" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: "20px", borderTop: "1px solid #ddd", background: "rgba(255,255,255,0.5)" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && senden()}
                  placeholder="Nachricht..."
                  style={{ flex: 1, padding: "15px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "16px", background: "#ffffff", color: "#1a1a1a", WebkitTextFillColor: "#1a1a1a", colorScheme: "light" }}
                />
                <button
                  onClick={senden}
                  disabled={laedt || !input.trim()}
                  style={{ background: "#16302b", color: "#fff", border: "none", padding: "0 25px", borderRadius: "8px", cursor: "pointer" }}
                >
                  ➤
                </button>
              </div>
            </div>
          </>
        )}

        {settingsOffen && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 10 }}>
            <div style={{ background: "#fff", padding: "30px", borderRadius: "12px", width: "90%", maxWidth: "400px" }}>
              <h3 style={{ marginTop: 0, color: "#16302b" }}>Einstellungen</h3>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Schriftgröße</label>
                <input type="range" min="14" max="24" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} style={{ width: "100%" }} />
              </div>

              <div style={{ marginBottom: "30px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>Hintergrund</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button style={optionBtn(helligkeit === "#f2f1ec")} onClick={() => setHelligkeit("#f2f1ec")}>Hell</button>
                  <button style={optionBtn(helligkeit === "#e5e3d8")} onClick={() => setHelligkeit("#e5e3d8")}>Warm</button>
                </div>
              </div>

              <button onClick={() => { setZeige("lebensrad"); setSettingsOffen(false); }} style={{ width: "100%", padding: "12px", background: "#eee", color: "#16302b", border: "1px solid #ccc", borderRadius: "8px", cursor: "pointer", marginBottom: "10px" }}>Mein Lebensrad</button>
              <button onClick={lebensradManuellOeffnen} style={{ width: "100%", padding: "12px", background: "#eee", color: "#16302b", border: "1px solid #ccc", borderRadius: "8px", cursor: "pointer", marginBottom: "10px" }}>Lebensrad neu ausfüllen</button>
              <button onClick={neuStarten} style={{ width: "100%", padding: "12px", background: "#d9534f", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", marginBottom: "10px", fontWeight: "bold" }}>Gespräch neu starten</button>
              <button onClick={abmelden} style={{ width: "100%", padding: "12px", background: "#eee", color: "#16302b", border: "1px solid #ccc", borderRadius: "8px", cursor: "pointer", marginBottom: "10px" }}>Abmelden</button>
              <button onClick={() => setSettingsOffen(false)} style={{ width: "100%", padding: "12px", background: "#eee", color: "#333", border: "none", borderRadius: "8px", cursor: "pointer" }}>Schließen</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ position: "fixed", bottom: "10px", width: "100%", textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>
        <span style={{ cursor: "pointer", margin: "0 10px" }} onClick={() => setZeige("impressum")}>Impressum</span> |
        <span style={{ cursor: "pointer", margin: "0 10px" }} onClick={() => setZeige("datenschutz")}>Datenschutz</span>
      </div>

      {zeige !== "" && (
         <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 20 }}>
           <div style={{ background: "#fff", padding: "30px", borderRadius: "12px", width: "90%", maxWidth: "600px", maxHeight: "80vh", overflowY: "auto" }}>
             {zeige === "lebensrad" ? (
               <>
                 <h2 style={{ color: "#16302b" }}>Mein Lebensrad</h2>
                 <LebensradAnsicht userId={userId} sprache={sprache || profilSprache} />
               </>
             ) : (
               <>
                 <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                   <button style={optionBtn(rechtSprache === "de")} onClick={() => setRechtSprache("de")}>Deutsch</button>
                   <button style={optionBtn(rechtSprache === "en")} onClick={() => setRechtSprache("en")}>English</button>
                 </div>
                 <h2 style={{ color: "#16302b" }}>
                   {zeige === "impressum"
                     ? (rechtSprache === "de" ? "Impressum" : "Legal Notice")
                     : (rechtSprache === "de" ? "Datenschutzerklärung" : "Privacy Policy")}
                 </h2>
                 <div style={{ color: "#333", whiteSpace: "pre-wrap", fontSize: "14px", lineHeight: "1.6" }}>
                   {zeige === "impressum"
                     ? (rechtSprache === "de" ? IMPRESSUM_DE : IMPRESSUM_EN)
                     : (rechtSprache === "de" ? DATENSCHUTZ_DE : DATENSCHUTZ_EN)}
                 </div>
               </>
             )}
             <button onClick={() => setZeige("")} style={{ marginTop: "20px", padding: "10px 20px", background: "#16302b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}>Schließen</button>
           </div>
         </div>
      )}
    </div>
  );
}