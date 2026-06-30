"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { t, isRtl, type UiLang } from "@/lib/i18n";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [lang, setLang] = useState<UiLang>("en");

  useEffect(() => {
    async function init() {
      // Falls ein Einladungs-/Recovery-Link mit Token im Hash ankommt,
      // Sitzung manuell aus dem Hash setzen, statt auf Auto-Erkennung zu warten.
      if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
        const params = new URLSearchParams(window.location.hash.substring(1));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (access_token && refresh_token) {
          const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
          if (setErr) {
            console.error("Sitzung konnte nicht gesetzt werden:", setErr.message);
          }
          // Hash aus der URL entfernen, damit der Browser nicht erneut versucht,
          // beim Reload eine veraltete/leere Session wiederherzustellen.
          window.history.replaceState(null, "", window.location.pathname);
        }
      }

      const { data } = await supabase.auth.getSession();
      setHasSession(!!data.session);

      const metaLang = data.session?.user?.user_metadata?.preferred_lang as UiLang | undefined;
      const supported: UiLang[] = ["de", "en", "fr", "es", "ar"];
      if (metaLang && supported.includes(metaLang)) {
        setLang(metaLang);
      }

      setChecking(false);
    }
    init();
  }, []);

  async function handleSetPassword() {
    if (password.length < 8) {
      setError(t(lang, "setPassword_tooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t(lang, "setPassword_mismatch"));
      return;
    }

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);
    }
  }

  if (checking) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#16302b", color: "#fff" }}>
        {t(lang, "setPassword_checking")}
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div dir={isRtl(lang) ? "rtl" : "ltr"} style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#16302b" }}>
        <div style={{ background: "#f2f1ec", padding: "40px", borderRadius: "12px", width: "100%", maxWidth: "400px", textAlign: "center" }}>
          <h1 style={{ color: "#16302b", marginBottom: "20px" }}>{t(lang, "appName")}</h1>
          <p style={{ color: "#333" }}>
            {t(lang, "setPassword_invalidLink")}
          </p>
          <a href="/login" style={{ color: "#16302b", textDecoration: "underline" }}>{t(lang, "setPassword_backToLogin")}</a>
        </div>
      </div>
    );
  }

  return (
    <div dir={isRtl(lang) ? "rtl" : "ltr"} style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#16302b" }}>
      <div style={{ background: "#f2f1ec", padding: "40px", borderRadius: "12px", width: "100%", maxWidth: "400px", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
        <h1 style={{ color: "#16302b", textAlign: "center", marginBottom: "10px" }}>{t(lang, "appName")}</h1>
        <p style={{ textAlign: "center", color: "#666", marginBottom: "30px", fontSize: "14px" }}>
          {t(lang, "setPassword_tagline")}
        </p>

        {success ? (
          <p style={{ textAlign: "center", color: "#16302b" }}>{t(lang, "setPassword_success")}</p>
        ) : (
          <>
            <input
              type="password"
              placeholder={t(lang, "setPassword_new")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetPassword()}
              style={{ width: "100%", padding: "12px", marginBottom: "15px", borderRadius: "8px", border: "1px solid #ccc" }}
            />
            <input
              type="password"
              placeholder={t(lang, "setPassword_confirm")}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetPassword()}
              style={{ width: "100%", padding: "12px", marginBottom: "25px", borderRadius: "8px", border: "1px solid #ccc" }}
            />
            <button
              type="button"
              onClick={handleSetPassword}
              disabled={loading}
              style={{ width: "100%", padding: "14px", background: "#16302b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "16px" }}
            >
              {loading ? t(lang, "setPassword_saving") : t(lang, "setPassword_save")}
            </button>
            {error && <p style={{ color: "#d9534f", marginTop: "15px", textAlign: "center" }}>{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}