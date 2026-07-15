import { formatPrice, cn } from "@/lib/utils";

interface PriceDisplayProps {
  price: number;
  comparePrice?: number | null;
  currency?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PriceDisplay({ price, comparePrice, currency = "USD", size = "md", className }: PriceDisplayProps) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-2xl",
  };
  const compareSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("font-bold", sizeClasses[size])}>{formatPrice(price, currency)}</span>
      {comparePrice && comparePrice > price && (
        <span className={cn("text-muted-foreground line-through", compareSizeClasses[size])}>
          {formatPrice(comparePrice, currency)}
        </span>
      )}
    </div>
  );
}
