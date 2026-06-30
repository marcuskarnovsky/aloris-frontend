import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { userId, lang } = await req.json();

    if (!userId || !lang || typeof lang !== "string" || lang.trim() === "") {
      return NextResponse.json({ error: "userId und lang sind erforderlich." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ preferred_lang: lang.trim() })
      .eq("id", userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sprache-Speichern-Fehler:", error);
    return NextResponse.json({ error: "Fehler beim Speichern der Sprache." }, { status: 500 });
  }
}