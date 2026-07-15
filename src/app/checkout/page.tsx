"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreditCard, Building2, Smartphone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/stores/cart";
import { useToast } from "@/components/ui/use-toast";
import { formatPrice } from "@/lib/utils";
import type { PaymentMethodConfig } from "@/types";

const checkoutSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  customerEmail: z.string().email("Valid email required"),
  paymentMethodId: z.string().min(1, "Select a payment method"),
  notes: z.string().optional(),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { items, getTotal, clearCart } = useCartStore();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
  });

  const selectedMethodId = watch("paymentMethodId");
  const selectedMethod = paymentMethods.find((m) => m.id === selectedMethodId);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/auth/login?redirect=/checkout");
        return;
      }
      setUser(user);
      setValue("customerEmail", user.email || "");
      supabase.from("profiles").select("full_name").eq("id", user.id).single().then(({ data }) => {
        if (data?.full_name) setValue("customerName", data.full_name);
      });
    });
    supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order").then(({ data }) => {
      setPaymentMethods(data || []);
      if (data && data.length > 0) setValue("paymentMethodId", data[0].id);
    });
  }, [router, setValue]);

  useEffect(() => {
    if (items.length === 0 && !submitting) {
      router.push("/cart");
    }
  }, [items, submitting, router]);

  const onSubmit = async (data: CheckoutForm) => {
    if (!user) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          customer_id: user.id,
          customer_email: data.customerEmail,
          customer_name: data.customerName,
          status: "awaiting_payment",
          payment_method: "manual",
          subtotal: getTotal(),
          total: getTotal(),
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_title: item.product?.title || "Product",
        product_price: item.product?.price || 0,
        quantity: item.quantity,
      }));

      await supabase.from("order_items").insert(orderItems);
      await clearCart(user.id);

      router.push(`/checkout/success?order=${order.order_number}`);
    } catch {
      toast.error("Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Checkout</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Full Name</Label>
                <Input id="customerName" {...register("customerName")} placeholder="John Doe" />
                {errors.customerName && <p className="text-xs text-destructive">{errors.customerName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input id="customerEmail" type="email" {...register("customerEmail")} placeholder="john@example.com" />
                {errors.customerEmail && <p className="text-xs text-destructive">{errors.customerEmail.message}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={selectedMethodId} onValueChange={(v) => setValue("paymentMethodId", v)}>
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <Label
                      key={method.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                        selectedMethodId === method.id ? "border-primary bg-primary/5" : "hover:bg-accent"
                      }`}
                    >
                      <RadioGroupItem value={method.id} className="mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {method.type === "bank_transfer" && <Building2 className="h-4 w-4 text-muted-foreground" />}
                          {method.type === "ewallet" && <Smartphone className="h-4 w-4 text-muted-foreground" />}
                          {method.type === "qris" && <CreditCard className="h-4 w-4 text-muted-foreground" />}
                          <span className="font-medium text-sm">{method.name}</span>
                        </div>
                        {method.account_number && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {method.account_number} — {method.account_name}
                          </p>
                        )}
                      </div>
                    </Label>
                  ))}
                </div>
              </RadioGroup>
              {errors.paymentMethodId && <p className="text-xs text-destructive mt-2">{errors.paymentMethodId.message}</p>}

              {selectedMethod?.instructions && (
                <div className="mt-4 rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">{selectedMethod.instructions}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea {...register("notes")} placeholder="Any special requests or notes for your order..." rows={3} />
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.product?.title}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <span className="font-medium ml-4">{formatPrice((item.product?.price || 0) * item.quantity)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatPrice(getTotal())}</span>
              </div>
              <Button type="submit" className="w-full gap-2 rounded-xl" size="lg" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  "Place Order"
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                By placing this order, you agree to our Terms of Service.
              </p>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
