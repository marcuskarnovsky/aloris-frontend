import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    console.log("STEP 1: Request received");

    const { session_id, content } = await req.json();
    console.log("STEP 2: Body parsed:", session_id, content);

    if (!session_id || !content) {
      return NextResponse.json(
        { error: "Missing session_id or content" },
        { status: 400 }
      );
    }

    // ✅ 1. Emotion + Belief Analyse
    const analysisCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a psychological analysis system.

Analyze the user's message and return JSON only:

{
  "emotional_score": number (0-10),
  "detected_belief": string or null,
  "topic": short topic label
}

Rules:
- emotional_score = emotional intensity (0 = neutral, 10 = extreme distress)
- detected_belief = only if a limiting belief is clearly expressed (use exact wording)
- topic = short 1-3 word label
- Return valid JSON only. No explanations.
`
        },
        {
          role: "user",
          content
        }
      ],
      temperature: 0,
    });

    const analysisText =
      analysisCompletion.choices[0].message?.content || "{}";

    let emotional_score: number | null = null;
    let detected_belief: string | null = null;
    let topic: string | null = null;

    try {
      const parsed = JSON.parse(analysisText);
      emotional_score = parsed.emotional_score ?? null;
      detected_belief = parsed.detected_belief ?? null;
      topic = parsed.topic ?? null;
    } catch (err) {
      console.error("JSON PARSE ERROR:", err);
    }

    console.log("✅ Analysis:", emotional_score, detected_belief, topic);

    // ✅ 2. User Message speichern
    const { error: userInsertError } = await supabase
      .from("messages")
      .insert([
        {
          session_id,
          role: "user",
          content,
          emotional_score,
          detected_belief,
          topic,
        },
      ]);

    if (userInsertError) {
      console.error("USER INSERT ERROR:", userInsertError);
      return NextResponse.json(
        { error: userInsertError.message },
        { status: 500 }
      );
    }

    console.log("✅ User message stored");

    // ✅ 3. Chat History laden
    const { data: messages, error: fetchError } = await supabase
      .from("messages")
      .select("role, content")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true })
      .limit(20);

    if (fetchError) {
      console.error("FETCH ERROR:", fetchError);
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    // ✅ 4. AI Antwort generieren
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful coaching assistant." },
        ...(messages || []),
      ],
    });

    const reply = completion.choices[0].message?.content || "";

    console.log("✅ AI response generated");

    // ✅ 5. AI Antwort speichern
    await supabase.from("messages").insert([
      {
        session_id,
        role: "assistant",
        content: reply,
      },
    ]);

    console.log("✅ AI message stored");

    return NextResponse.json({
      reply,
    });

  } catch (err: any) {
    console.error("CRASH:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}