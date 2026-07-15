"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Eye, CheckCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { formatPrice, formatDateTime, getOrderStatusColor, getOrderStatusLabel } from "@/lib/utils";
import type { Order } from "@/types";

export default function AdminOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const fetchOrders = () => {
    const supabase = createClient();
    supabase.from("orders").select("*, customer:profiles(full_name, email), items:order_items(*)").order("created_at", { ascending: false }).then(({ data }) => {
      setOrders((data as Order[]) || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (orderId: string, status: string) => {
    const supabase = createClient();
    const updates: Record<string, unknown> = { status };
    if (status === "paid") updates.paid_at = new Date().toISOString();
    if (status === "completed") updates.completed_at = new Date().toISOString();
    await supabase.from("orders").update(updates).eq("id", orderId);
    setOrders(orders.map((o) => o.id === orderId ? { ...o, status: status as Order["status"] } : o));
    toast.success(`Order status updated to ${getOrderStatusLabel(status)}`);
  };

  const approvePayment = async (order: Order) => {
    await updateStatus(order.id, "paid");
    // Create purchases
    if (order.items) {
      const supabase = createClient();
      for (const item of order.items) {
        if (item.product_id && order.customer_id) {
          await supabase.from("purchases").upsert({
            user_id: order.customer_id,
            order_id: order.id,
            product_id: item.product_id,
          }, { onConflict: "user_id,order_id,product_id" });
        }
      }
    }
    toast.success("Payment approved! Purchases created.");
    fetchOrders();
  };

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Orders</h1>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {["all", "pending", "awaiting_payment", "paid", "processing", "completed", "cancelled", "refunded"].map((s) => (
          <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)} className="whitespace-nowrap">
            {s === "all" ? "All" : getOrderStatusLabel(s)}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">No orders found</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{order.customer_name || order.customer_email}</p>
                    <p className="text-xs text-muted-foreground font-mono">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge className={getOrderStatusColor(order.status)}>{getOrderStatusLabel(order.status)}</Badge>
                    <span className="font-bold">{formatPrice(order.total, order.currency)}</span>
                    {order.status === "awaiting_payment" && (
                      <Button size="sm" className="gap-1" onClick={() => approvePayment(order)}>
                        <CheckCircle className="h-3.5 w-3.5" /> Approve Payment
                      </Button>
                    )}
                    <Select value={order.status} onValueChange={(v) => updateStatus(order.id, v)}>
                      <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["pending", "awaiting_payment", "paid", "processing", "completed", "cancelled", "refunded"].map((s) => (
                          <SelectItem key={s} value={s}>{getOrderStatusLabel(s)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Link href={`/admin/orders/${order.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
