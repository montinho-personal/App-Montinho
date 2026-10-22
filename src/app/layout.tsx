import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { BRAND, brandCssVars } from "@/config/brand";
import { appMode } from "@/lib/env";
import { DemoBanner } from "@/components/layout/DemoBanner";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

// Endereço público para as prévias de link (capa em app/opengraph-image.tsx).
const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  openGraph: { type: "website", locale: "pt_BR", siteName: BRAND.fullName },
  title: { default: BRAND.fullName, template: `%s · ${BRAND.name}` },
  description: BRAND.description,
  applicationName: BRAND.fullName,
  appleWebApp: { capable: true, title: `${BRAND.name} Personal`, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: BRAND.colors.bg,
  width: "device-width",
  initialScale: 1,
  // maximumScale removido de propósito: o aluno pode aumentar o texto (acessibilidade)
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const demo = appMode() === "demo";
  return (
    <html lang="pt-BR" className={`${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg text-fg">
        {/* Cores da marca (src/config/brand.ts) injetadas em runtime */}
        <style dangerouslySetInnerHTML={{ __html: brandCssVars() }} />
        <a href="#conteudo" className="sr-only-focusable fixed top-2 left-2 z-[10000] rounded-md bg-accent px-3 py-2 text-sm font-bold text-bg">
          Pular para o conteúdo
        </a>
        {demo ? <DemoBanner /> : null}
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
