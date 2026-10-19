import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { BRAND, brandCssVars } from "@/config/brand";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: BRAND.fullName,
  description: BRAND.tagline,
  applicationName: BRAND.name,
};

export const viewport: Viewport = {
  themeColor: BRAND.colors.bg,
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg text-fg">
        {/* Cores da marca (src/config/brand.ts) injetadas em runtime — sobrescrevem os padrões de globals.css */}
        <style dangerouslySetInnerHTML={{ __html: brandCssVars() }} />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
