export const dynamic = "force-dynamic";

import Link from "next/link";
import { BrandLockup, FioMarca } from "@/components/brand/BrandLockup";
import { Icon } from "@/components/ui/Icon";
import { BRAND } from "@/config/brand";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { requireAlunoPage } from "@/lib/auth/session";
import { avatarDoUsuario } from "@/lib/data/perfil";
import { AvisoAcessoVisitante } from "@/components/visitante/AvisoAcessoVisitante";
import { RegistrarAcesso } from "@/components/aluno/RegistrarAcesso";

const TABS = [
  { label: "Início", href: "/aluno", icon: "home" },
  { label: "Treinar", href: "/aluno/treinar", icon: "dumbbell" },
  { label: "Jornada", href: "/aluno/jornada", icon: "map" },
  { label: "Conquistas", href: "/aluno/conquistas", icon: "trophy" },
  { label: "Evolução", href: "/aluno/evolucao", icon: "chart" },
  { label: "Perfil", href: "/aluno/perfil", icon: "user" },
] as const;

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const sessao = await requireAlunoPage();
  const iniciais = (sessao.nome ?? "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  const foto = await avatarDoUsuario(sessao.userId).catch(() => null);
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
              <a href={`https://instagram.com/${ig}`} target="_blank" rel="noopener noreferrer" aria-label={`Instagram do ${BRAND.name} (@${ig})`} className="grid h-11 w-11 place-items-center rounded-full border border-border text-fg-muted transition-colors hover:border-white/40 hover:text-fg">
                <Icon name="instagram" size={20} />
              </a>
            ) : null}
            <Link href="/aluno/perfil" aria-label="Meu perfil" className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-white/25 bg-[linear-gradient(180deg,#3a3a3a,#1c1c1c)] text-sm font-bold text-fg">
              {foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={foto} alt="" className="h-full w-full object-cover" />
              ) : (
                iniciais || "?"
              )}
            </Link>
          </div>
        </div>
        <FioMarca />
      </header>
      <main id="conteudo" className="flex-1 pb-28">
        <div className="max-w-md mx-auto px-4 py-5">
          {sessao.modalidade === "visitante" ? <AvisoAcessoVisitante alunoId={sessao.alunoId} fim={sessao.acessoFim ?? null} /> : null}
          {children}
        </div>
      </main>
      <MobileTabBar items={[...TABS]} />
      <RegistrarAcesso id={sessao.alunoId} />
    </div>
  );
}
