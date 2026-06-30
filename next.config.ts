import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // turbopack.root wird nur lokal für 'next dev' benötigt (Workaround
  // gegen Speicher-Explosion durch fehlgeleitetes node_modules-Scanning).
  // In der Produktion (Vercel) ist diese Einstellung nicht nötig und
  // wird deshalb nur gesetzt, wenn wir uns im Entwicklungs-Modus befinden.
  ...(process.env.NODE_ENV === "development"
    ? { turbopack: { root: path.join(__dirname) } }
    : {}),
};

export default nextConfig;