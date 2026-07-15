import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("orders")
    .select("*, items:order_items(*)")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { data, error } = await supabase
    .from("orders")
    .insert({
      customer_id: user.id,
      customer_email: body.customerEmail || user.email,
      customer_name: body.customerName,
      status: "awaiting_payment",
      payment_method: "manual",
      subtotal: body.subtotal,
      total: body.total,
      notes: body.notes,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insert order items
  if (body.items && body.items.length > 0) {
    const items = body.items.map((item: { product_id: string; product_title: string; product_price: number; quantity: number }) => ({
      order_id: data.id,
      product_id: item.product_id,
      product_title: item.product_title,
      product_price: item.product_price,
      quantity: item.quantity,
    }));
    await supabase.from("order_items").insert(items);
  }

  return NextResponse.json(data, { status: 201 });
}
