"use client";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingBag, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  index?: number;
  onAddToCart?: (product: Product) => void;
}

export function ProductCard({ product, index = 0, onAddToCart }: ProductCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Card className="group overflow-hidden border-border/50 hover:border-border transition-all duration-300 hover:shadow-lg">
        <Link href={`/product/${product.slug}`}>
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            {product.thumbnail_url ? (
              <Image
                src={product.thumbnail_url}
                alt={product.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <ShoppingBag className="h-12 w-12 opacity-20" />
              </div>
            )}
            {product.compare_price && product.compare_price > product.price && (
              <Badge className="absolute top-3 left-3 bg-red-500 hover:bg-red-500 text-white">
                -{Math.round(((product.compare_price - product.price) / product.compare_price) * 100)}%
              </Badge>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Button size="icon" className="h-9 w-9 rounded-full shadow-lg">
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Link>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {product.category && (
                <Badge variant="secondary" className="mb-2 text-[10px] font-medium">
                  {product.category.name}
                </Badge>
              )}
              <Link href={`/product/${product.slug}`}>
                <h3 className="font-semibold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                  {product.title}
                </h3>
              </Link>
              {product.short_description && (
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {product.short_description}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold">{formatPrice(product.price, product.currency)}</span>
              {product.compare_price && product.compare_price > product.price && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(product.compare_price, product.currency)}
                </span>
              )}
            </div>
            {onAddToCart && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={(e) => {
                  e.preventDefault();
                  onAddToCart(product);
                }}
              >
                <ShoppingBag className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
