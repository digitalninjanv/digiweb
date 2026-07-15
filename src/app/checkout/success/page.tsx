"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Package, ArrowRight, Copy, Building2, Smartphone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { formatPrice, formatDateTime } from "@/lib/utils";
import type { Order, PaymentMethodConfig } from "@/types";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const orderNumber = searchParams.get("order");

  useEffect(() => {
    if (!orderNumber) {
      router.push("/shop");
      return;
    }
    const supabase = createClient();
    supabase
      .from("orders")
      .select("*, items:order_items(*)")
      .eq("order_number", orderNumber)
      .single()
      .then(({ data }) => {
        if (data) setOrder(data as Order);
      });
    supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order").then(({ data }) => {
      setPaymentMethods(data || []);
    });
  }, [orderNumber, router]);

  const copyOrderNumber = () => {
    navigator.clipboard.writeText(orderNumber || "");
    toast.success("Order number copied!");
  };

  if (!order) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="mt-6 text-2xl font-bold">Order Placed Successfully!</h1>
        <p className="mt-2 text-muted-foreground">
          Please complete payment to receive your digital products.
        </p>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Order Details</CardTitle>
            <Badge variant="warning">Awaiting Payment</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Order Number</span>
            <button onClick={copyOrderNumber} className="flex items-center gap-1.5 text-sm font-mono font-medium hover:text-primary transition-colors">
              {order.order_number} <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Date</span>
            <span className="text-sm">{formatDateTime(order.created_at)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm">{order.customer_email}</span>
          </div>
          <Separator />
          {order.items?.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span>{item.product_title}</span>
              <span className="font-medium">{formatPrice(item.product_price)}</span>
            </div>
          ))}
          <Separator />
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatPrice(order.total, order.currency)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Instructions */}
      {paymentMethods.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Payment Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Transfer the total amount to one of the following accounts, then upload your payment proof from your order page.
            </p>
            {paymentMethods.filter(m => m.type === "bank_transfer").map((method) => (
              <div key={method.id} className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{method.name}</span>
                </div>
                <p className="text-sm font-mono">{method.account_number}</p>
                <p className="text-xs text-muted-foreground">{method.account_name}</p>
              </div>
            ))}
            {paymentMethods.filter(m => m.type === "ewallet").map((method) => (
              <div key={method.id} className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{method.name}</span>
                </div>
                <p className="text-sm font-mono">{method.account_number}</p>
                <p className="text-xs text-muted-foreground">{method.account_name}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/library">
          <Button variant="outline" className="gap-2">
            <Package className="h-4 w-4" /> View My Purchases
          </Button>
        </Link>
        <Link href="/shop">
          <Button className="gap-2">
            Continue Shopping <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
