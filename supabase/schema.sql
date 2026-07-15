-- ============================================
-- DigiMart - Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES
-- ============================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'seller')),
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper function to check if user is admin (runs with SECURITY DEFINER to bypass RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. CATEGORIES
-- ============================================
CREATE TABLE public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 3. PRODUCTS
-- ============================================
CREATE TABLE public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  short_description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  compare_price DECIMAL(10,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  is_featured BOOLEAN DEFAULT false,
  thumbnail_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  download_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_seller ON public.products(seller_id);
CREATE INDEX idx_products_slug ON public.products(slug);

-- ============================================
-- 4. PRODUCT FILES (digital downloads)
-- ============================================
CREATE TABLE public.product_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('upload', 'text')),
  file_url TEXT,
  file_size BIGINT,
  mime_type TEXT,
  text_content TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_files_product ON public.product_files(product_id);

-- ============================================
-- 5. ORDERS
-- ============================================
CREATE TABLE public.orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'awaiting_payment', 'paid', 'processing', 'completed', 'cancelled', 'refunded'
  )),
  payment_method TEXT DEFAULT 'manual' CHECK (payment_method IN ('manual', 'stripe', 'free')),
  payment_proof_url TEXT,
  payment_notes TEXT,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT,
  admin_notes TEXT,
  paid_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_number ON public.orders(order_number);

-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number = 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- ============================================
-- 6. ORDER ITEMS
-- ============================================
CREATE TABLE public.order_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_title TEXT NOT NULL,
  product_price DECIMAL(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);

-- ============================================
-- 7. PURCHASES (completed downloads)
-- ============================================
CREATE TABLE public.purchases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  download_count INT DEFAULT 0,
  max_downloads INT DEFAULT 10,
  download_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, order_id, product_id)
);

CREATE INDEX idx_purchases_user ON public.purchases(user_id);
CREATE INDEX idx_purchases_product ON public.purchases(product_id);

-- ============================================
-- 8. CART ITEMS
-- ============================================
CREATE TABLE public.cart_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX idx_cart_user ON public.cart_items(user_id);

-- ============================================
-- 9. PAYMENT METHODS CONFIG
-- ============================================
CREATE TABLE public.payment_methods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bank_transfer', 'ewallet', 'qris', 'other')),
  provider TEXT,
  account_number TEXT,
  account_name TEXT,
  instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 10. ANALYTICS VIEWS
-- ============================================
CREATE OR REPLACE VIEW public.order_stats AS
SELECT
  COUNT(*) as total_orders,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
  COUNT(*) FILTER (WHERE status = 'awaiting_payment') as awaiting_payment_orders,
  COALESCE(SUM(total) FILTER (WHERE status IN ('paid', 'completed')), 0) as total_revenue,
  COALESCE(SUM(total) FILTER (WHERE status IN ('paid', 'completed') AND created_at >= NOW() - INTERVAL '30 days'), 0) as revenue_30d,
  COALESCE(SUM(total) FILTER (WHERE status IN ('paid', 'completed') AND created_at >= NOW() - INTERVAL '7 days'), 0) as revenue_7d
FROM public.orders;

CREATE OR REPLACE VIEW public.product_stats AS
SELECT
  COUNT(*) as total_products,
  COUNT(*) FILTER (WHERE status = 'active') as active_products,
  COALESCE(SUM(download_count), 0) as total_downloads
FROM public.products;

-- ============================================
-- 11. RLS POLICIES
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Profiles: users see own profile, admins see all
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin view all profiles" ON public.profiles FOR SELECT USING (
  public.is_admin(auth.uid())
);

-- Categories: public read, admin write
CREATE POLICY "Categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL USING (
  public.is_admin(auth.uid())
);

-- Products: public read active, admin/seller manage
CREATE POLICY "Products public read active" ON public.products FOR SELECT USING (status = 'active' OR seller_id = auth.uid());
CREATE POLICY "Admin manage products" ON public.products FOR ALL USING (
  public.is_admin(auth.uid())
);
CREATE POLICY "Seller manage own products" ON public.products FOR ALL USING (seller_id = auth.uid());

-- Product Files: read with purchase, admin manage
CREATE POLICY "Product files public read" ON public.product_files FOR SELECT USING (
  (order_id IS NULL AND EXISTS (SELECT 1 FROM public.products WHERE id = product_id AND status = 'active')) OR
  (order_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND customer_id = auth.uid())) OR
  public.is_admin(auth.uid())
);
CREATE POLICY "Admin manage product files" ON public.product_files FOR ALL USING (
  public.is_admin(auth.uid())
);

-- Orders: users see own orders, admin sees all
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Users create orders" ON public.orders FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Users update own orders" ON public.orders FOR UPDATE USING (customer_id = auth.uid());
CREATE POLICY "Admin manage orders" ON public.orders FOR ALL USING (
  public.is_admin(auth.uid())
);

-- Order Items: with order access
CREATE POLICY "Users view own order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND customer_id = auth.uid())
);
CREATE POLICY "Users create order items" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND customer_id = auth.uid())
);
CREATE POLICY "Admin manage order items" ON public.order_items FOR ALL USING (
  public.is_admin(auth.uid())
);

-- Purchases: users see own
CREATE POLICY "Users view own purchases" ON public.purchases FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin manage purchases" ON public.purchases FOR ALL USING (
  public.is_admin(auth.uid())
);

-- Cart: users manage own cart
CREATE POLICY "Users manage own cart" ON public.cart_items FOR ALL USING (user_id = auth.uid());

-- Payment Methods: public read, admin write
CREATE POLICY "Payment methods public read" ON public.payment_methods FOR SELECT USING (is_active = true);
CREATE POLICY "Admin manage payment methods" ON public.payment_methods FOR ALL USING (
  public.is_admin(auth.uid())
);

-- ============================================
-- 12. STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('products', 'products', true, 52428800, '{"image/jpeg","image/png","image/webp","image/gif"}'),
  ('product-files', 'product-files', false, 104857600, null),
  ('payment-proofs', 'payment-proofs', false, 10485760, '{"image/jpeg","image/png","image/webp","application/pdf"}');

-- Storage policies
CREATE POLICY "Product images public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

CREATE POLICY "Admin upload product images" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'products' AND public.is_admin(auth.uid()));

CREATE POLICY "Product files download with auth" ON storage.objects FOR SELECT
  USING (bucket_id = 'product-files' AND auth.role() = 'authenticated');

CREATE POLICY "Admin upload product files" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-files' AND public.is_admin(auth.uid()));

CREATE POLICY "Users upload payment proofs" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-proofs' AND auth.role() = 'authenticated');

CREATE POLICY "Users read own payment proofs" ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs' AND auth.role() = 'authenticated');

-- ============================================
-- 13. SEED DATA
-- ============================================
INSERT INTO public.categories (name, slug, description, icon, sort_order) VALUES
  ('Templates', 'templates', 'Website, UI, and document templates', 'layout-template', 1),
  ('Graphics', 'graphics', 'Icons, illustrations, and design assets', 'palette', 2),
  ('Fonts', 'fonts', 'Premium typefaces and font families', 'type', 3),
  ('Courses', 'courses', 'Educational content and tutorials', 'graduation-cap', 4),
  ('Tools', 'tools', 'Software tools and utilities', 'wrench', 5),
  ('Audio', 'audio', 'Music, sound effects, and audio assets', 'music', 6);

INSERT INTO public.payment_methods (name, type, provider, account_number, account_name, instructions, sort_order) VALUES
  ('Bank Transfer - BCA', 'bank_transfer', 'BCA', '1234567890', 'PT DigiMart Indonesia', 'Transfer ke rekening BCA di atas, lalu upload bukti transfer.', 1),
  ('Bank Transfer - Mandiri', 'bank_transfer', 'Mandiri', '0987654321', 'PT DigiMart Indonesia', 'Transfer ke rekening Mandiri di atas, lalu upload bukti transfer.', 2),
  ('GoPay', 'ewallet', 'GoPay', '081234567890', 'DigiMart', 'Transfer via GoPay ke nomor di atas.', 3),
  ('QRIS', 'qris', 'QRIS', NULL, 'DigiMart', 'Scan QRIS yang diberikan saat checkout.', 4);
