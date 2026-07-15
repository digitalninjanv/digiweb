import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// Stripe webhook handler - ready for integration
// Uncomment and configure when Stripe is set up

export async function POST(request: Request) {
  // const body = await request.text();
  // const sig = request.headers.get("stripe-signature");

  // if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  // let event;
  // try {
  //   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  //   event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  // } catch (err) {
  //   return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  // }

  // const supabase = createAdminClient();

  // switch (event.type) {
  //   case "checkout.session.completed": {
  //     const session = event.data.object;
  //     const orderId = session.metadata?.order_id;
  //     if (orderId) {
  //       await supabase
  //         .from("orders")
  //         .update({
  //           status: "paid",
  //           stripe_session_id: session.id,
  //           stripe_payment_intent: session.payment_intent as string,
  //           paid_at: new Date().toISOString(),
  //         })
  //         .eq("id", orderId);
  //     }
  //     break;
  //   }
  // }

  // For now, return 200 to acknowledge
  return NextResponse.json({ received: true });
}
