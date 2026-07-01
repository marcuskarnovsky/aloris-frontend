import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    const { email, plan, friend } = await req.json();

    if (!email || !plan) {
      return NextResponse.json({ error: "E-Mail und Plan erforderlich" }, { status: 400 });
    }

    const priceId =
      plan === "yearly"
        ? process.env.STRIPE_PRICE_YEARLY!
        : process.env.STRIPE_PRICE_MONTHLY!;

    // Normaler Kauf: Karte wird immer erfasst (sichert die Abbuchung nach dem Trial).
    // Freundes-Link (friend === true): Karte wird nur abgefragt, falls tatsächlich etwas fällig ist -
    // bei einem 100%-Gutschein entfällt die Kartenabfrage dann komplett.
    const paymentMethodCollection = friend === true ? "if_required" : "always";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      payment_method_collection: paymentMethodCollection,
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 7,
      },
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/activate?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/start?status=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Checkout Fehler:", error);
    return NextResponse.json({ error: "Checkout konnte nicht erstellt werden" }, { status: 500 });
  }
}