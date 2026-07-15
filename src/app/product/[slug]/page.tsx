"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ShoppingBag, FileText, Download, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PriceDisplay } from "@/components/shared/price-display";
import { ProductCard } from "@/components/shared/product-card";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/stores/cart";
import { useToast } from "@/components/ui/use-toast";
import { formatFileSize } from "@/lib/utils";
import type { Product } from "@/types";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("products")
      .select("*, category:categories(*), files:product_files(*)")
      .eq("slug", params.slug)
      .eq("status", "active")
      .single()
      .then(({ data }) => {
        if (data) {
          setProduct(data as Product);
          // Fetch related
          supabase
            .from("products")
            .select("*, category:categories(*)")
            .eq("status", "active")
            .eq("category_id", data.category_id)
            .neq("id", data.id)
            .limit(4)
            .then(({ data: related }) => setRelated((related as Product[]) || []));
        }
        setLoading(false);
      });
  }, [params.slug]);

  const addToCart = async () => {
    if (!product) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }
    const success = await useCartStore.getState().addToCart(user.id, product);
    if (success) toast.success("Added to cart!");
    else toast.error("Already in cart or failed");
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Product not found</h1>
        <p className="mt-2 text-muted-foreground">This product may have been removed or is no longer available.</p>
        <Button className="mt-6" onClick={() => router.push("/shop")}>Back to Shop</Button>
      </div>
    );
  }

  const images = product.images && product.images.length > 0
    ? product.images
    : product.thumbnail_url
    ? [product.thumbnail_url]
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Button variant="ghost" size="sm" className="mb-6 gap-2" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
            {images.length > 0 ? (
              <Image
                src={images[selectedImage]}
                alt={product.title}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <ShoppingBag className="h-20 w-20 text-muted-foreground/20" />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    i === selectedImage ? "border-primary" : "border-transparent hover:border-border"
                  }`}
                >
                  <Image src={img} alt="" fill className="object-cover" sizes="80px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.category && (
            <Badge variant="secondary" className="mb-3">{product.category.name}</Badge>
          )}
          <h1 className="text-3xl font-bold tracking-tight">{product.title}</h1>
          <div className="mt-4">
            <PriceDisplay price={product.price} comparePrice={product.compare_price} currency={product.currency} size="lg" />
          </div>
          {product.short_description && (
            <p className="mt-4 text-muted-foreground leading-relaxed">{product.short_description}</p>
          )}

          <Separator className="my-6" />

          <Button size="lg" className="w-full gap-2 rounded-xl" onClick={addToCart}>
            <ShoppingBag className="h-5 w-5" /> Add to Cart
          </Button>

          {product.tags && product.tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}

          {/* Files preview */}
          {product.files && product.files.length > 0 && (
            <Card className="mt-6">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">What&apos;s Included</h3>
                <div className="space-y-2">
                  {product.files.map((file) => (
                    <div key={file.id} className="flex items-center gap-3 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">{file.file_name}</span>
                      {file.file_size && (
                        <span className="text-muted-foreground">{formatFileSize(file.file_size)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="mt-12">
        <Tabs defaultValue="description">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="files">Files & Downloads</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="mt-6">
            <Card>
              <CardContent className="p-6 prose prose-sm dark:prose-invert max-w-none">
                {product.description ? (
                  <div className="whitespace-pre-wrap leading-relaxed">{product.description}</div>
                ) : (
                  <p className="text-muted-foreground">No description available.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="files" className="mt-6">
            <Card>
              <CardContent className="p-6">
                {product.files && product.files.length > 0 ? (
                  <div className="space-y-3">
                    {product.files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{file.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {file.file_type === "text" ? "Text content" : file.mime_type || "File"}
                              {file.file_size && ` • ${formatFileSize(file.file_size)}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground mt-4">
                      Files will be available for download after purchase.
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No files listed for this product.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight">Related Products</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
