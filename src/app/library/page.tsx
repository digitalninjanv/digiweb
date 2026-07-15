"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Download, Package, FileText, Clock, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { formatPrice, formatDateTime, formatFileSize } from "@/lib/utils";
import type { Purchase, Product, ProductFile } from "@/types";

interface PurchaseWithProduct extends Purchase {
  product: Product & { files?: ProductFile[] };
}

export default function LibraryPage() {
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<PurchaseWithProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("purchases")
        .select("*, product:products(*, files:product_files(*))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          setPurchases((data as PurchaseWithProduct[]) || []);
          setLoading(false);
        });
    });
  }, []);

  const handleDownload = async (file: ProductFile, purchase: PurchaseWithProduct) => {
    const supabase = createClient();
    if (file.file_type === "text" && file.text_content) {
      const blob = new Blob([file.text_content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } else if (file.file_url) {
      const { data } = await supabase.storage.from("product-files").createSignedUrl(file.file_url, 3600);
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      } else {
        toast.error("Failed to generate download link");
      }
    }
    // Update download count
    await supabase.from("purchases").update({ download_count: (purchase.download_count || 0) + 1 }).eq("id", purchase.id);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Library</h1>
        <p className="mt-2 text-muted-foreground">All your purchased digital products</p>
      </div>

      {purchases.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No purchases yet"
          description="Your purchased digital products will appear here."
          action={{ label: "Browse Products", href: "/shop" }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {purchases.map((purchase) => (
            <Card key={purchase.id} className="overflow-hidden">
              <div className="relative aspect-[16/9] bg-muted">
                {purchase.product?.thumbnail_url ? (
                  <Image src={purchase.product.thumbnail_url} alt={purchase.product.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ShoppingBag className="h-12 w-12 text-muted-foreground/20" />
                  </div>
                )}
                <Badge className="absolute top-3 right-3 bg-emerald-600 hover:bg-emerald-600">Purchased</Badge>
              </div>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{purchase.product?.title}</CardTitle>
                <p className="text-xs text-muted-foreground">Purchased {formatDateTime(purchase.created_at)}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const visibleFiles = purchase.product?.files?.filter(
                    (file: any) => !file.order_id || file.order_id === purchase.order_id
                  ) || [];
                  return visibleFiles.length > 0 ? (
                    <div className="space-y-2">
                      {visibleFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between rounded-lg border p-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{file.file_name}</p>
                              {file.file_size && <p className="text-[10px] text-muted-foreground">{formatFileSize(file.file_size)}</p>}
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 flex-shrink-0" onClick={() => handleDownload(file, purchase)}>
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No files available</p>
                  );
                })()}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {purchase.download_count} downloads</span>
                  {purchase.max_downloads && <span>Max: {purchase.max_downloads}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
