"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Upload, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { formatPrice, formatDateTime, getOrderStatusColor, getOrderStatusLabel } from "@/lib/utils";
import type { Order, OrderItem } from "@/types";

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.from("orders").select("*, customer:profiles(full_name, email)").eq("id", params.id).single().then(({ data }) => {
      if (data) { setOrder(data as Order); setAdminNotes(data.admin_notes || ""); }
    });
    supabase.from("order_items").select("*, product:products(*)").eq("order_id", params.id).then(({ data }) => {
      setItems((data as OrderItem[]) || []);
    });
  }, [params.id]);

  const updateStatus = async (status: string) => {
    const supabase = createClient();
    const updates: Record<string, unknown> = { status };
    if (status === "paid") updates.paid_at = new Date().toISOString();
    if (status === "completed") updates.completed_at = new Date().toISOString();
    await supabase.from("orders").update(updates).eq("id", params.id);
    setOrder(order ? { ...order, status: status as Order["status"] } : null);
    toast.success(`Status updated to ${getOrderStatusLabel(status)}`);
  };

  const approvePayment = async () => {
    if (!order) return;
    await updateStatus("paid");
    const supabase = createClient();
    for (const item of items) {
      if (item.product_id && order.customer_id) {
        await supabase.from("purchases").upsert({
          user_id: order.customer_id,
          order_id: order.id,
          product_id: item.product_id,
        }, { onConflict: "user_id,order_id,product_id" });
      }
    }
    toast.success("Payment approved! Purchases created.");
  };

  const saveNotes = async () => {
    const supabase = createClient();
    await supabase.from("orders").update({ admin_notes: adminNotes }).eq("id", params.id);
    toast.success("Notes saved");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !order) return;
    const supabase = createClient();
    const path = `order-files/${order.id}/${Date.now()}-${file.name}`;
    const { data } = await supabase.storage.from("product-files").upload(path, file);
    if (data) {
      // Create a purchase record with the file
      toast.success("File uploaded successfully");
    }
  };

  if (!order) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold">Order {order.order_number}</h1>
          <p className="text-sm text-muted-foreground">{formatDateTime(order.created_at)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader><CardTitle className="text-base">Order Items</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">{item.product_title}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-semibold">{formatPrice(item.product_price * item.quantity)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatPrice(order.total, order.currency)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Proof */}
          {order.payment_proof_url && (
            <Card>
              <CardHeader><CardTitle className="text-base">Payment Proof</CardTitle></CardHeader>
              <CardContent>
                <a href={order.payment_proof_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <FileText className="h-4 w-4" /> View Payment Proof
                </a>
              </CardContent>
            </Card>
          )}

          {/* Upload File for Order */}
          <Card>
            <CardHeader><CardTitle className="text-base">Deliver Files</CardTitle></CardHeader>
            <CardContent>
              <label className="inline-flex">
                <Button variant="outline" className="gap-2" asChild><span><Upload className="h-4 w-4" /> Upload File</span></Button>
                <input type="file" className="hidden" onChange={handleFileUpload} />
              </label>
              <p className="text-xs text-muted-foreground mt-2">Upload files to deliver to the customer.</p>
            </CardContent>
          </Card>

          {/* Admin Notes */}
          <Card>
            <CardHeader><CardTitle className="text-base">Admin Notes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Private notes about this order..." rows={3} />
              <Button size="sm" onClick={saveNotes}>Save Notes</Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Status</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Badge className={`${getOrderStatusColor(order.status)} w-full justify-center py-1.5`}>{getOrderStatusLabel(order.status)}</Badge>
              <Select value={order.status} onValueChange={updateStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["pending", "awaiting_payment", "paid", "processing", "completed", "cancelled", "refunded"].map((s) => (
                    <SelectItem key={s} value={s}>{getOrderStatusLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {order.status === "awaiting_payment" && (
                <Button className="w-full gap-2" onClick={approvePayment}>
                  <CheckCircle className="h-4 w-4" /> Approve Payment
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm font-medium">{order.customer_name || "N/A"}</p>
              <p className="text-sm text-muted-foreground">{order.customer_email}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Payment</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Method</span>
                <span className="capitalize">{order.payment_method}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-semibold">{formatPrice(order.total, order.currency)}</span>
              </div>
              {order.paid_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paid At</span>
                  <span>{formatDateTime(order.paid_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
