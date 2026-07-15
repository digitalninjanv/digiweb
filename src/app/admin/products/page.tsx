"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, Trash2, Eye, EyeOff, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

export default function AdminProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = () => {
    const supabase = createClient();
    supabase.from("products").select("*, category:categories(*)").order("created_at", { ascending: false }).then(({ data }) => {
      setProducts((data as Product[]) || []);
      setLoading(false);
    });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const supabase = createClient();
    await supabase.from("products").delete().eq("id", deleteId);
    setProducts(products.filter((p) => p.id !== deleteId));
    setDeleteId(null);
    toast.success("Product deleted");
  };

  const toggleStatus = async (product: Product) => {
    const newStatus = product.status === "active" ? "draft" : "active";
    const supabase = createClient();
    await supabase.from("products").update({ status: newStatus }).eq("id", product.id);
    setProducts(products.map((p) => p.id === product.id ? { ...p, status: newStatus as "active" | "draft" } : p));
    toast.success(`Product ${newStatus === "active" ? "published" : "unpublished"}`);
  };

  const statusColor = (status: string) => {
    if (status === "active") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
    if (status === "draft") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  };

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
        <h1 className="text-2xl font-bold">Products</h1>
        <Link href="/admin/products/new"><Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Product</Button></Link>
      </div>

      {products.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">No products yet. Create your first product.</p></CardContent></Card>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <Card key={product.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                  {product.thumbnail_url ? (
                    <Image src={product.thumbnail_url} alt={product.title} fill className="object-cover" sizes="64px" />
                  ) : (
                    <div className="flex h-full items-center justify-center"><ShoppingBag className="h-6 w-6 text-muted-foreground/20" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{product.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {product.category && <Badge variant="secondary" className="text-[10px]">{product.category.name}</Badge>}
                    <Badge className={statusColor(product.status)}>{product.status}</Badge>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm">{formatPrice(product.price, product.currency)}</p>
                  {product.compare_price && product.compare_price > product.price && (
                    <p className="text-xs text-muted-foreground line-through">{formatPrice(product.compare_price, product.currency)}</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleStatus(product)} title={product.status === "active" ? "Unpublish" : "Publish"}>
                    {product.status === "active" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Link href={`/admin/products/${product.id}`}>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                  </Link>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(product.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>Are you sure? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
