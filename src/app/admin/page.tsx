"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { DollarSign, ShoppingCart, Package, Users, ArrowUpRight, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, formatDateTime, getOrderStatusColor, getOrderStatusLabel } from "@/lib/utils";
import type { Order } from "@/types";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalOrders: 0, completedOrders: 0, totalRevenue: 0, totalProducts: 0, totalCustomers: 0 });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["paid", "completed"]),
      supabase.from("orders").select("total").in("status", ["paid", "completed"]),
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("orders").select("*, customer:profiles(full_name, email)").order("created_at", { ascending: false }).limit(5),
    ]).then(([orders, completed, revenue, products, customers, recent]) => {
      const totalRevenue = (revenue.data || []).reduce((sum, o) => sum + Number(o.total), 0);
      setStats({
        totalOrders: orders.count || 0,
        completedOrders: completed.count || 0,
        totalRevenue,
        totalProducts: products.count || 0,
        totalCustomers: customers.count || 0,
      });
      setRecentOrders((recent.data as Order[]) || []);
      setLoading(false);
    });
  }, []);

  const statCards = [
    { label: "Total Revenue", value: formatPrice(stats.totalRevenue), icon: DollarSign, color: "text-emerald-500" },
    { label: "Total Orders", value: stats.totalOrders.toString(), icon: ShoppingCart, color: "text-blue-500" },
    { label: "Products", value: stats.totalProducts.toString(), icon: Package, color: "text-purple-500" },
    { label: "Customers", value: stats.totalCustomers.toString(), icon: Users, color: "text-orange-500" },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/admin/products"><Button size="sm">Add Product</Button></Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-muted ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Link href="/admin/orders"><Button variant="ghost" size="sm" className="gap-1">View All <ArrowUpRight className="h-3.5 w-3.5" /></Button></Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{order.customer_name || order.customer_email}</p>
                    <p className="text-xs text-muted-foreground font-mono">{order.order_number}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge className={getOrderStatusColor(order.status)}>{getOrderStatusLabel(order.status)}</Badge>
                    <span className="font-semibold text-sm">{formatPrice(order.total, order.currency)}</span>
                    <Link href={`/admin/orders/${order.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
