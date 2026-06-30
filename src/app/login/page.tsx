"use client";
import { useState, KeyboardEvent, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { t, getStoredLang, setStoredLang, isRtl, SUPPORTED_LANGS, type UiLang } from "@/lib/i18n";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lang, setLang] = useState<UiLang>("en");

  useEffect(() => {
    setLang(getStoredLang());
  }, []);

  function changeLang(newLang: UiLang) {
    setLang(newLang);
    setStoredLang(newLang);
  }

  // Falls jemand über einen Einladungs- oder Passwort-Link hier landet
  // (Hash enthält access_token + refresh_token), Sitzung manuell setzen
  // und zur Passwort-Seite weiterleiten.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    if (!hash.includes("access_token")) return;

    const params = new URLSearchParams(hash.substring(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (access_token && refresh_token) {
      supabase.auth
        .setSession({ access_token, refresh_token })
        .then(({ error }) => {
          if (!error) {
            window.location.href = "/set-password";
          } else {
            console.error("Sitzung konnte nicht gesetzt werden:", error.message);
          }
        });
    }
  }, []);

  async function handleLogin() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.replace("/dashboard");
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div dir={isRtl(lang) ? "rtl" : "ltr"} style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#16302b" }}>
      <div style={{ background: "#f2f1ec", padding: "40px", borderRadius: "12px", width: "100%", maxWidth: "400px", boxShadow: "0 4px 20px rgba(0,0,0,0.3)", position: "relative" }}>

        <select
          value={lang}
          onChange={(e) => changeLang(e.target.value as UiLang)}
          style={{ position: "absolute", top: "16px", right: "16px", border: "1px solid #ccc", borderRadius: "6px", padding: "4px 6px", fontSize: "12px", background: "#fff", color: "#333" }}
        >
          {SUPPORTED_LANGS.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>

        <h1 style={{ color: "#16302b", textAlign: "center", marginBottom: "30px" }}>{t(lang, "appName")}</h1>
        <input
          type="email"
          placeholder={t(lang, "login_email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "8px", border: "1px solid #ccc" }}
        />
        <input
          type="password"
          placeholder={t(lang, "login_password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ width: "100%", padding: "12px", marginBottom: "25px", borderRadius: "8px", border: "1px solid #ccc" }}
        />
        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          style={{ width: "100%", padding: "12px", background: "#16302b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
        >
          {loading ? t(lang, "login_loading") : t(lang, "login_signIn")}
        </button>
        {error && <p style={{ color: "#d9534f", marginTop: "15px", textAlign: "center" }}>{error}</p>}
      </div>
    </div>
  );
}