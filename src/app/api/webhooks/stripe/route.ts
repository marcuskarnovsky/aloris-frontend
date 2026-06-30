import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("Webhook Signatur-Fehler:", err.message);
    return NextResponse.json({ error: "Ungültige Signatur" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabaseAdmin
          .from("profiles")
          .update({ is_active: false })
          .eq("stripe_customer_id", customerId);

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook Verarbeitungsfehler:", error);
    return NextResponse.json({ error: "Verarbeitung fehlgeschlagen" }, { status: 500 });
  }
}