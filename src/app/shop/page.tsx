"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/shared/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/stores/cart";
import { useToast } from "@/components/ui/use-toast";
import type { Product, Category } from "@/types";
import { ShoppingBag } from "lucide-react";

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [activeCategory, setActiveCategory] = useState(searchParams.get("category") || "");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 12;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from("products")
      .select("*, category:categories(*)", { count: "exact" })
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (search) query = query.ilike("title", `%${search}%`);
    if (activeCategory) query = query.eq("category.slug", activeCategory);

    const { data, count } = await query;
    setProducts((data as Product[]) || []);
    setTotal(count || 0);
    setLoading(false);
  }, [page, search, activeCategory]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("categories").select("*").eq("is_active", true).order("sort_order").then(({ data }) => {
      setCategories(data || []);
    });
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (search) params.set("q", search);
    else params.delete("q");
    router.push(`/shop?${params.toString()}`);
  };

  const handleCategorySelect = (categorySlug: string) => {
    const newCategory = activeCategory === categorySlug ? "" : categorySlug;
    setActiveCategory(newCategory);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (newCategory) params.set("category", newCategory);
    else params.delete("category");
    router.push(`/shop?${params.toString()}`);
  };

  const handleAddToCart = async (product: Product) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }
    const success = await useCartStore.getState().addToCart(user.id, product);
    if (success) toast.success("Added to cart!");
    else toast.error("Failed to add to cart");
  };

  const totalPages = Math.ceil(total / pageSize);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header & Search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shop Products</h1>
          <p className="text-muted-foreground mt-1">
            Browse our collection of high-quality digital assets.
          </p>
        </div>
        <form onSubmit={handleSearch} className="flex w-full max-w-sm gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
      </div>

      {/* Categories Filter */}
      <div className="flex flex-wrap gap-2 mb-8 items-center">
        <span className="text-sm font-medium text-muted-foreground mr-2 flex items-center gap-1.5">
          <SlidersHorizontal className="h-4 w-4" /> Filters:
        </span>
        <Badge
          variant={activeCategory === "" ? "default" : "outline"}
          className="cursor-pointer px-3 py-1 text-sm rounded-full"
          onClick={() => handleCategorySelect("")}
        >
          All Products
        </Badge>
        {categories.map((cat) => (
          <Badge
            key={cat.id}
            variant={activeCategory === cat.slug ? "default" : "outline"}
            className="cursor-pointer px-3 py-1 text-sm rounded-full"
            onClick={() => handleCategorySelect(cat.slug)}
          >
            {cat.name}
          </Badge>
        ))}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="aspect-video w-full rounded-xl" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title="No products found"
          description={search ? "Try adjusting your search terms or filter." : "There are no active products in this category."}
          icon={ShoppingBag}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={() => handleAddToCart(product)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-12">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              {pageNumbers.map((p) => (
                <Button
                  key={p}
                  variant={page === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ShopContent />
    </Suspense>
  );
}
