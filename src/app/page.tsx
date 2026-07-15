import Link from "next/link";
import { ArrowRight, Sparkles, Download, Shield, Zap, Star, Package, Palette, Type, GraduationCap, Wrench, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/shared/product-card";
import type { Product } from "@/types";

const categories = [
  { name: "Templates", slug: "templates", icon: Package, description: "Website & UI templates" },
  { name: "Graphics", slug: "graphics", icon: Palette, description: "Icons & illustrations" },
  { name: "Fonts", slug: "fonts", icon: Type, description: "Premium typefaces" },
  { name: "Courses", slug: "courses", icon: GraduationCap, description: "Learn from experts" },
  { name: "Tools", slug: "tools", icon: Wrench, description: "Software & utilities" },
  { name: "Audio", slug: "audio", icon: Music, description: "Music & sound effects" },
];

const features = [
  { icon: Download, title: "Instant Download", description: "Get your files immediately after purchase. No waiting." },
  { icon: Shield, title: "Secure Payments", description: "Your transactions are protected with bank-level security." },
  { icon: Zap, title: "Premium Quality", description: "Every product is reviewed to meet our quality standards." },
  { icon: Star, title: "Creator Support", description: "Direct support from product creators when you need help." },
];

const testimonials = [
  { name: "Sarah Chen", role: "UI Designer", content: "The templates here saved me weeks of work. Outstanding quality and attention to detail.", avatar: "SC" },
  { name: "Marcus Johnson", role: "Developer", content: "Best marketplace for dev tools. Clean code, great documentation, fair pricing.", avatar: "MJ" },
  { name: "Elena Rodriguez", role: "Creative Director", content: "We source all our design assets from DigiMart. Consistently impressed by the quality.", avatar: "ER" },
];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("*, category:categories(*)")
    .eq("status", "active")
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(4);

  const { count: productCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-6 gap-1.5">
              <Sparkles className="h-3 w-3" /> Premium Digital Marketplace
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Discover products that{" "}
              <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
                elevate your work
              </span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-2xl">
              Curated digital products from top creators. Templates, tools, graphics, and courses designed to help you build better, faster.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop">
                <Button size="lg" className="gap-2 rounded-xl">
                  Browse Products <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="lg" variant="outline" className="rounded-xl">
                  Start Selling
                </Button>
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">{productCount || 0}+</span> Products
              </span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">5K+</span> Downloads
              </span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
              <span className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">2K+</span> Customers
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {products && products.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Featured Products</h2>
              <p className="mt-2 text-muted-foreground">Handpicked products loved by our community</p>
            </div>
            <Link href="/shop">
              <Button variant="ghost" className="gap-1.5">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product as Product} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="border-y border-border/40 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Browse by Category</h2>
            <p className="mt-2 text-muted-foreground">Find exactly what you need</p>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((cat) => (
              <Link key={cat.slug} href={`/shop?category=${cat.slug}`}>
                <Card className="group cursor-pointer border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-md">
                  <CardContent className="flex flex-col items-center p-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <cat.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-3 text-sm font-semibold">{cat.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{cat.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Why DigiMart?</h2>
          <p className="mt-2 text-muted-foreground">Everything you need in a digital marketplace</p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title} className="border-border/50">
              <CardContent className="p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y border-border/40 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Loved by Creators</h2>
            <p className="mt-2 text-muted-foreground">See what our community says</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.name} className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex gap-1 text-primary">
                    {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">&ldquo;{t.content}&rdquo;</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5">
          <CardContent className="flex flex-col items-center p-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to get started?</h2>
            <p className="mt-3 max-w-md text-muted-foreground">
              Join thousands of creators and professionals who trust DigiMart for their digital product needs.
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/shop"><Button size="lg" className="rounded-xl">Browse Products</Button></Link>
              <Link href="/auth/register"><Button size="lg" variant="outline" className="rounded-xl">Create Account</Button></Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
