export const dynamic = "force-dynamic";

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { requireAlunoPage } from "@/lib/auth/session";

const TABS = [
  { label: "Início", href: "/aluno", icon: "home" },
  { label: "Treinar", href: "/aluno/treinar", icon: "dumbbell" },
  { label: "Evolução", href: "/aluno/evolucao", icon: "chart" },
  { label: "Perfil", href: "/aluno/perfil", icon: "user" },
] as const;

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  await requireAlunoPage();
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="px-5 py-3 border-b border-border bg-surface/60 backdrop-blur">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link href="/aluno" aria-label="Ir para o início" className="rounded-md">
            <Logo variant="full" height={34} priority />
          </Link>
        </div>
      </header>
      <main id="conteudo" className="flex-1 pb-28">
        <div className="max-w-md mx-auto px-4 py-5">{children}</div>
      </main>
      <MobileTabBar items={[...TABS]} />
    </div>
  );
}
