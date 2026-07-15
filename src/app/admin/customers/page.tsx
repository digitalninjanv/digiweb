"use client";
import { useState, useEffect } from "react";
import { Users, Mail, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { formatDate, getInitials } from "@/lib/utils";
import type { Profile } from "@/types";

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<(Profile & { order_count?: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .then(async ({ data }) => {
        if (data) {
          const withCounts = await Promise.all(
            data.map(async (profile) => {
              const { count } = await supabase
                .from("orders")
                .select("*", { count: "exact", head: true })
                .eq("customer_id", profile.id);
              return { ...profile, order_count: count || 0 };
            })
          );
          setCustomers(withCounts);
        }
        setLoading(false);
      });
  }, []);

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-sm text-muted-foreground">{customers.length} total</p>
      </div>

      {customers.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">No customers yet</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => (
            <Card key={customer.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={customer.avatar_url || undefined} />
                  <AvatarFallback>{getInitials(customer.full_name || customer.email)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{customer.full_name || "No name"}</h3>
                    <Badge variant="secondary" className="text-[10px]">{customer.role}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Mail className="h-3 w-3" /> {customer.email}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold">{customer.order_count} orders</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                    <Calendar className="h-3 w-3" /> {formatDate(customer.created_at)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
