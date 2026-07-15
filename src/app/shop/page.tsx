"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
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

export default function ShopPage() {
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
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (activeCategory) params.set("category", activeCategory);
    router.push(`/shop?${params.toString()}`);
  };

  const handleCategoryClick = (slug: string) => {
    const next = slug === activeCategory ? "" : slug;
    setActiveCategory(next);
    setPage(1);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (next) params.set("category", next);
    router.push(`/shop?${params.toString()}`);
  };

  const addToCart = async (product: Product) => {
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Shop</h1>
        <p className="mt-2 text-muted-foreground">Browse our collection of premium digital products</p>
      </div>

      {/* Filters */}
      <div className="mb-8 space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeCategory === "" ? "default" : "outline"}
            size="sm"
            onClick={() => handleCategoryClick("")}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.slug}
              variant={activeCategory === cat.slug ? "default" : "outline"}
              size="sm"
              onClick={() => handleCategoryClick(cat.slug)}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/3] rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No products found"
          description="Try adjusting your search or filters to find what you're looking for."
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">{total} product{total !== 1 ? "s" : ""} found</p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} onAddToCart={addToCart} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
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
