import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/layout/providers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: "DigiMart — Premium Digital Products", template: "%s | DigiMart" },
  description: "Discover premium digital products — templates, tools, graphics, courses, and more. Built for creators, developers, and professionals.",
  keywords: ["digital products", "templates", "graphics", "tools", "marketplace"],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "DigiMart",
    title: "DigiMart — Premium Digital Products",
    description: "Discover premium digital products for creators and professionals.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
