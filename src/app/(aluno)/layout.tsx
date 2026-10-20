export const dynamic = "force-dynamic";

import Link from "next/link";
import { BrandLockup, FioDourado } from "@/components/brand/BrandLockup";
import { Icon } from "@/components/ui/Icon";
import { BRAND } from "@/config/brand";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { requireAlunoPage } from "@/lib/auth/session";

const TABS = [
  { label: "Início", href: "/aluno", icon: "home" },
  { label: "Treinar", href: "/aluno/treinar", icon: "dumbbell" },
  { label: "Evolução", href: "/aluno/evolucao", icon: "chart" },
  { label: "Perfil", href: "/aluno/perfil", icon: "user" },
] as const;

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const sessao = await requireAlunoPage();
  const iniciais = (sessao.nome ?? "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  const ig = BRAND.contact.instagram;
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="relative bg-[linear-gradient(180deg,#161616_0%,#0a0a0a_100%)]">
        <div className="relative max-w-md mx-auto flex items-center justify-between gap-3 px-4 py-2.5">
          <Link href="/aluno" aria-label="Ir para o início" className="rounded-md">
            <BrandLockup priority />
          </Link>
          <div className="flex items-center gap-2">
            {ig ? (
              <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer" aria-label={`Instagram do ${BRAND.name} (@${ig})`} className="grid h-11 w-11 place-items-center rounded-full border border-border text-fg-muted transition-colors hover:border-accent/60 hover:text-accent">
                <Icon name="instagram" size={20} />
              </a>
            ) : null}
            <Link href="/aluno/perfil" aria-label="Meu perfil" className="grid h-11 w-11 place-items-center rounded-full border border-accent/50 bg-accent/10 text-sm font-bold text-accent">
              {iniciais || "?"}
            </Link>
          </div>
        </div>
        <FioDourado />
      </header>
      <main id="conteudo" className="flex-1 pb-28">
        <div className="max-w-md mx-auto px-4 py-5">{children}</div>
      </main>
      <MobileTabBar items={[...TABS]} />
    </div>
  );
}
