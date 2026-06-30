import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { sessionId, lang } = await req.json();

    if (!sessionId || !lang || typeof lang !== "string" || lang.trim() === "") {
      return NextResponse.json({ error: "sessionId und lang sind erforderlich." }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const email = session.customer_email || session.customer_details?.email;

    if (!email || session.status !== "complete") {
      return NextResponse.json({ error: "Ungültige oder unvollständige Sitzung." }, { status: 400 });
    }

    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    const sprache = lang.trim();

    let { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/set-password`,
        data: { preferred_lang: sprache },
      },
    });

    // Falls der Account schon existiert (z.B. erneutes Abo): Recovery-Link statt Invite
    if (linkError) {
      ({ data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/set-password`,
        },
      }));
    }

    if (linkError || !linkData || !linkData.user) {
      console.error("Aktivierungs-Link-Fehler:", linkError);
      return NextResponse.json({ error: "Aktivierung fehlgeschlagen." }, { status: 500 });
    }

    const nutzerId = linkData.user.id;
    const actionLink = linkData.properties.action_link;

    await supabaseAdmin.from("profiles").upsert({
      id: nutzerId,
      email,
      is_active: true,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      preferred_lang: sprache,
    });

    return NextResponse.json({ actionLink });
  } catch (error) {
    console.error("Aktivierung-Fehler:", error);
    return NextResponse.json({ error: "Aktivierung fehlgeschlagen." }, { status: 500 });
  }
}