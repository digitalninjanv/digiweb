import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { CartItem, Product } from "@/types";

interface CartStore {
  items: CartItem[];
  isLoading: boolean;
  fetchCart: (userId: string) => Promise<void>;
  addToCart: (userId: string, product: Product) => Promise<boolean>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: (userId: string) => Promise<void>;
  getTotal: () => number;
  getCount: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  isLoading: false,

  fetchCart: async (userId: string) => {
    set({ isLoading: true });
    const supabase = createClient();
    const { data, error } = await supabase
      .from("cart_items")
      .select("*, product:products(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      set({ items: data as CartItem[] });
    }
    set({ isLoading: false });
  },

  addToCart: async (userId: string, product: Product) => {
    const supabase = createClient();
    const existing = get().items.find((i) => i.product_id === product.id);

    if (existing) return true; // already in cart

    const { data, error } = await supabase
      .from("cart_items")
      .insert({ user_id: userId, product_id: product.id, quantity: 1 })
      .select("*, product:products(*)")
      .single();

    if (!error && data) {
      set({ items: [(data as CartItem), ...get().items] });
      return true;
    }
    return false;
  },

  removeFromCart: async (itemId: string) => {
    const supabase = createClient();
    await supabase.from("cart_items").delete().eq("id", itemId);
    set({ items: get().items.filter((i) => i.id !== itemId) });
  },

  clearCart: async (userId: string) => {
    const supabase = createClient();
    await supabase.from("cart_items").delete().eq("user_id", userId);
    set({ items: [] });
  },

  getTotal: () => {
    return get().items.reduce((sum, item) => {
      return sum + (item.product?.price || 0) * item.quantity;
    }, 0);
  },

  getCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));
