"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { t, getStoredLang, isRtl, type UiLang } from "@/lib/i18n";

function StartPageInner() {
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lang, setLang] = useState<UiLang>("en");
  const searchParams = useSearchParams();
  const isFriend = searchParams.get("friend") === "true";

  useEffect(() => {
    setLang(getStoredLang());
  }, []);

  async function handleCheckout() {
    if (!email.trim()) {
      setError(t(lang, "start_emailRequired"));
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan, friend: isFriend }),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(t(lang, "start_genericError"));
        setLoading(false);
      }
    } catch (e) {
      console.error("Checkout-Fehler:", e);
      setError(t(lang, "start_connectionError"));
      setLoading(false);
    }
  }

  const planBtn = (aktiv: boolean) => ({
    flex: 1,
    padding: "14px",
    borderRadius: "8px",
    border: aktiv ? "2px solid #16302b" : "1px solid #ccc",
    background: aktiv ? "#16302b" : "#fff",
    color: aktiv ? "#fff" : "#333",
    cursor: "pointer",
    fontSize: "15px",
  });

  return (
    <div dir={isRtl(lang) ? "rtl" : "ltr"} style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#16302b" }}>
      <div style={{ background: "#f2f1ec", padding: "40px", borderRadius: "12px", width: "100%", maxWidth: "420px", boxShadow: "0 4px 20px rgba(0,0,0,0.3)", position: "relative" }}>

        <h1 style={{ color: "#16302b", textAlign: "center", marginBottom: "10px" }}>{t(lang, "appName")}</h1>
        <p style={{ textAlign: "center", color: "#666", marginBottom: "10px", fontSize: "14px" }}>
          {t(lang, "start_tagline")}
        </p>
        {isFriend && (
          <p style={{ textAlign: "center", color: "#16302b", marginBottom: "20px", fontSize: "12px", fontWeight: 600 }}>
            ✦ Freundes-Zugang erkannt
          </p>
        )}

        <input
          type="email"
          placeholder={t(lang, "start_emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "8px", border: "1px solid #ccc" }}
        />

        <div style={{ display: "flex", gap: "10px", marginBottom: "25px" }}>
          <button style={planBtn(plan === "monthly")} onClick={() => setPlan("monthly")}>{t(lang, "start_monthly")}</button>
          <button style={planBtn(plan === "yearly")} onClick={() => setPlan("yearly")}>{t(lang, "start_yearly")}</button>
        </div>

        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading}
          style={{ width: "100%", padding: "14px", background: "#16302b", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "16px" }}
        >
          {loading ? t(lang, "setPassword_saving") : t(lang, "start_cta")}
        </button>

        {error && <p style={{ color: "#d9534f", marginTop: "15px", textAlign: "center" }}>{error}</p>}
      </div>
    </div>
  );
}

export default function StartPage() {
  return (
    <Suspense fallback={null}>
      <StartPageInner />
    </Suspense>
  );
}