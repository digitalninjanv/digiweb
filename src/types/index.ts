export type UserRole = 'customer' | 'admin' | 'seller';
export type ProductStatus = 'draft' | 'active' | 'archived';
export type OrderStatus = 'pending' | 'awaiting_payment' | 'paid' | 'processing' | 'completed' | 'cancelled' | 'refunded';
export type PaymentMethod = 'manual' | 'stripe' | 'free';
export type FileType = 'upload' | 'text';
export type PaymentMethodType = 'bank_transfer' | 'ewallet' | 'qris' | 'other';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  seller_id: string | null;
  category_id: string | null;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: number;
  compare_price: number | null;
  currency: string;
  status: ProductStatus;
  is_featured: boolean;
  thumbnail_url: string | null;
  images: string[];
  tags: string[];
  download_count: number;
  view_count: number;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  category?: Category;
  seller?: Profile;
  files?: ProductFile[];
}

export interface ProductFile {
  id: string;
  product_id: string;
  file_name: string;
  file_type: FileType;
  file_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  text_content: string | null;
  sort_order: number;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  customer_email: string;
  customer_name: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_proof_url: string | null;
  payment_notes: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  subtotal: number;
  discount_amount: number;
  total: number;
  currency: string;
  notes: string | null;
  admin_notes: string | null;
  paid_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  items?: OrderItem[];
  customer?: Profile;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_title: string;
  product_price: number;
  quantity: number;
  created_at: string;
  product?: Product;
}

export interface Purchase {
  id: string;
  user_id: string;
  order_id: string;
  product_id: string;
  download_count: number;
  max_downloads: number;
  download_expires_at: string | null;
  created_at: string;
  product?: Product;
  order?: Order;
}

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  product?: Product;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  type: PaymentMethodType;
  provider: string | null;
  account_number: string | null;
  account_name: string | null;
  instructions: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}
