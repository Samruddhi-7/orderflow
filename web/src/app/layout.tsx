import type { Metadata } from "next";
import { Fraunces, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../components/AuthProvider";
import { CartProvider } from "@/lib/cart";
import { Toaster } from "sonner";

const fontDisplay = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const fontSans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fontMono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OrderFlow",
  description: "A soft, premium multi-vendor order experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable}`}
    >
      <body className="min-h-full flex flex-col bg-bg text-ink font-sans">
        <AuthProvider>
          <CartProvider>
            <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
              {children}
            </main>
          </CartProvider>
        </AuthProvider>
        <Toaster position="bottom-right" toastOptions={{
          style: {
            background: 'var(--color-bg)',
            color: 'var(--color-ink)',
            border: '1px solid var(--color-muted)',
            borderRadius: '12px',
          }
        }} />
      </body>
    </html>
  );
}
