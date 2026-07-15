# DigiMart — Premium Digital Products Marketplace

A production-ready, full-stack e-commerce platform for selling digital products. Built with Next.js 15, Supabase, and Stripe. Designed with a premium, sophisticated aesthetic that rivals top-tier marketplace platforms.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)
![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe)

---

## Features

### Customer-Facing
- **Landing Page** — Hero section, featured products, categories, testimonials
- **Shop** — Product grid with category filters, search, pagination
- **Product Detail** — Image gallery, description, files list, related products
- **Cart & Checkout** — Add to cart, quantity management, checkout flow
- **Payment** — Manual payment (bank transfer, e-wallet, QRIS) with proof upload + Stripe ready
- **My Library** — All purchased products with secure download links
- **Auth** — Email/password + OAuth (Google) via Supabase Auth
- **Dark/Light Mode** — Elegant theme switching with system preference detection

### Admin Dashboard
- **Dashboard** — Revenue stats, order counts, recent activity
- **Product Management** — Full CRUD with image upload, file upload, text content, categories, tags, pricing
- **Order Management** — Status workflow (Pending → Awaiting Payment → Paid → Processing → Completed), payment proof review, manual file delivery
- **Customer Management** — Customer list with order history
- **Analytics** — Revenue charts, product performance

### Technical
- **Mobile-First Responsive** — Flawless on every screen size
- **Framer Motion Animations** — Subtle, professional micro-interactions
- **Type-Safe** — Full TypeScript coverage
- **Row Level Security** — Supabase RLS policies for data protection
- **Secure File Delivery** — Signed URLs with expiration for downloads
- **SEO Optimized** — Meta tags, Open Graph, semantic HTML
- **Vercel Ready** — Zero-config deployment

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + CSS Variables |
| UI Components | Radix UI primitives |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Payments | Stripe (auto) + Manual (bank transfer/e-wallet) |
| Animations | Framer Motion |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Notifications | React Hot Toast |

---

## Database Schema

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  profiles   │     │  categories  │     │ payment_methods  │
│─────────────│     │──────────────│     │─────────────────│
│ id (PK)     │     │ id (PK)      │     │ id (PK)          │
│ email       │     │ name         │     │ name             │
│ full_name   │     │ slug         │     │ type             │
│ role        │     │ description  │     │ provider         │
│ avatar_url  │     │ icon         │     │ account_number   │
│ phone       │     │ sort_order   │     │ account_name     │
└──────┬──────┘     │ is_active    │     │ instructions     │
       │            └──────┬───────┘     │ is_active        │
       │                   │             └──────────────────┘
       │            ┌──────┴───────┐
       │            │   products   │
       │            │──────────────│
       ├───────────►│ id (PK)      │
       │            │ seller_id FK │
       │            │ category_id  │◄────┘
       │            │ title        │
       │            │ slug         │     ┌──────────────────┐
       │            │ description  │     │  product_files   │
       │            │ price        │     │──────────────────│
       │            │ compare_price│     │ id (PK)          │
       │            │ status       │     │ product_id (FK)  │◄──┐
       │            │ is_featured  │     │ file_name        │   │
       │            │ thumbnail_url│     │ file_type        │   │
       │            │ images (JSON)│     │ file_url         │   │
       │            │ tags (TEXT[])│     │ text_content     │   │
       │            │ download_cnt │     │ file_size        │   │
       │            └──────┬───────┘     └──────────────────┘   │
       │                   │                                     │
       │            ┌──────┴───────┐                             │
       │            │  order_items │                             │
       │            │──────────────│                             │
       │            │ id (PK)      │                             │
       │            │ order_id FK  │◄──┐                        │
       │            │ product_id FK│───┼────────────────────────┘
       │            │ product_title│   │
       │            │ product_price│   │
       │            │ quantity     │   │
       │            └──────────────┘   │
       │                               │
       │            ┌──────────────┐   │
       │            │    orders    │   │
       │            │──────────────│   │
       ├───────────►│ id (PK)      │   │
       │            │ order_number │   │
       │            │ customer_id  │   │
       │            │ status       │   │
       │            │ payment_method   │
       │            │ payment_proof│   │
       │            │ subtotal     │   │
       │            │ total        │   │
       │            └──────┬───────┘   │
       │                   │           │
       │            ┌──────┴───────┐   │
       │            │  purchases   │   │
       │            │──────────────│   │
       └───────────►│ id (PK)      │   │
                    │ user_id (FK) │   │
                    │ order_id FK  │───┘
                    │ product_id FK│
                    │ download_cnt │
                    │ max_downloads│
                    └──────────────┘

                    ┌──────────────┐
                    │  cart_items  │
                    │──────────────│
                    │ id (PK)      │
                    │ user_id (FK) │
                    │ product_id FK│
                    │ quantity     │
                    └──────────────┘
```

### Order Status Flow

```
Pending → Awaiting Payment → Paid → Processing → Completed
   │            │              │                         │
   │            │              └──→ Refunded             │
   │            └──→ Cancelled (timeout/manual)          │
   └──→ Cancelled                                        │
                                                        │
   Buyer can download files when status = Paid/Completed┘
```

---

## Setup Guide

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- (Optional) A [Stripe](https://stripe.com) account

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd digimart
npm install
```

### 2. Supabase Setup

#### Create Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be ready (~2 minutes)

#### Run Schema
1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the entire contents of `supabase/schema.sql`
3. Paste and run the query
4. Verify tables are created in **Table Editor**

#### Get API Keys
1. Go to **Settings → API**
2. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

#### Configure Auth
1. Go to **Authentication → Providers**
2. Enable **Email** (email/password)
3. (Optional) Enable **Google** OAuth:
   - Create OAuth credentials in Google Cloud Console
   - Add your Supabase callback URL: `https://<project>.supabase.co/auth/v1/callback`
   - Add Client ID and Secret in Supabase dashboard

#### Create Admin User
After a user signs up, promote them to admin:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

### 3. Environment Variables

```bash
cp .env.example .env.local
```

Fill in your values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=DigiMart
ADMIN_EMAILS=your-email@example.com
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Stripe Setup (Optional)

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Add keys to `.env.local`:
   ```env
   STRIPE_SECRET_KEY=sk_test_xxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```
4. Forward webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### 6. Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add environment variables in Vercel dashboard under **Settings → Environment Variables**.

---

## Project Structure

```
digimart/
├── public/
│   └── images/              # Static images
├── src/
│   ├── app/
│   │   ├── api/             # API routes
│   │   │   ├── orders/      # Order CRUD
│   │   │   ├── products/    # Product CRUD
│   │   │   ├── upload/      # File upload
│   │   │   └── webhooks/    # Stripe webhooks
│   │   ├── auth/            # Auth pages
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── callback/
│   │   ├── admin/           # Admin dashboard
│   │   │   ├── products/
│   │   │   ├── orders/
│   │   │   ├── customers/
│   │   │   └── analytics/
│   │   ├── shop/            # Shop page
│   │   ├── product/         # Product detail
│   │   ├── cart/            # Cart page
│   │   ├── checkout/        # Checkout flow
│   │   ├── library/         # My purchases
│   │   ├── globals.css      # Global styles + theme
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Landing page
│   ├── components/
│   │   ├── ui/              # Base UI components (shadcn-style)
│   │   ├── layout/          # Header, Footer, Providers
│   │   ├── product/         # Product-specific components
│   │   ├── cart/            # Cart components
│   │   ├── checkout/        # Checkout components
│   │   ├── admin/           # Admin components
│   │   └── shared/          # Shared components
│   ├── hooks/               # Custom React hooks
│   ├── lib/
│   │   ├── supabase/        # Supabase client setup
│   │   └── utils.ts         # Utility functions
│   ├── stores/              # Zustand stores
│   └── types/               # TypeScript types
├── supabase/
│   └── schema.sql           # Full database schema + RLS
├── .env.example             # Environment template
├── next.config.ts           # Next.js configuration
└── package.json
```

---

## Customization

### Adding Products
1. Login as admin
2. Go to `/admin/products`
3. Click "Add Product"
4. Fill in details, upload images/files or add text content
5. Set status to "Active" to make it visible

### Payment Methods
Edit the `payment_methods` table in Supabase to add/update bank accounts and e-wallet details. These appear during checkout.

### Styling
- Theme colors: Edit CSS variables in `src/app/globals.css`
- The design uses a deep charcoal + emerald accent palette by default
- Switch to light mode: Click the theme toggle in the header

### Adding Categories
Insert into the `categories` table or manage via admin dashboard.

---

## Production Checklist

- [ ] Set all environment variables in Vercel
- [ ] Enable RLS on all tables (done by schema.sql)
- [ ] Configure custom domain in Supabase
- [ ] Set up Stripe webhooks for production
- [ ] Add real payment method details
- [ ] Upload real product content
- [ ] Configure email templates in Supabase Auth
- [ ] Set up monitoring (Sentry, LogRocket, etc.)
- [ ] Add rate limiting to API routes
- [ ] Configure CORS if needed

---

## License

MIT
