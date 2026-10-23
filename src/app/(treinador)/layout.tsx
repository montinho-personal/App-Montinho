export const dynamic = "force-dynamic";

import { FEATURES } from "@/lib/env";
import { Sidebar } from "@/components/layout/Sidebar";
import { requireTreinadorPage } from "@/lib/auth/session";

const NAV = [
  { label: "Visão geral", href: "/treinador", icon: "home" },
  { label: "Buscar", href: "/treinador/busca", icon: "search" },
  { label: "Alunos", href: "/treinador/alunos", icon: "users" },
  ...(FEATURES.modoVisitante ? [{ label: "Visitantes", href: "/treinador/visitantes", icon: "user" } as const, { label: "Leads", href: "/treinador/leads", icon: "chart" } as const] : []),
  { label: "Central de aderência", href: "/treinador/aderencia", icon: "chart" },
  { label: "Celebrar conquistas", href: "/treinador/conquistas", icon: "star" },
  { label: "Ranking de troféus", href: "/treinador/ranking", icon: "trophy" },
  { label: "Evoluções dos alunos", href: "/treinador/evolucoes", icon: "chart" },
  { label: "Montinho Desbloqueia", href: "/treinador/conhecimento", icon: "book" },
  { label: "Treinos extras", href: "/treinador/extras", icon: "plus" },
  { label: "Memória de treinos", href: "/treinador/memoria", icon: "sparkles" },
  { label: "Biblioteca", href: "/treinador/biblioteca", icon: "book" },
  { label: "Templates", href: "/treinador/templates", icon: "table" },
  { label: "Prescrição", href: "/treinador/prescricao", icon: "chart" },
  { label: "Ajustes", href: "/treinador/ajustes", icon: "menu" },
] as const;

export default async function TreinadorLayout({ children }: { children: React.ReactNode }) {
  const sessao = await requireTreinadorPage();
  return (
    // Celular: blocos empilhados (barra fixa + espaçador + conteúdo), rolagem só da página.
    // Computador: menu lateral fixo + conteúdo. Sem área de rolagem aninhada (travava no celular).
    <div className="min-h-screen bg-bg md:flex">
      <Sidebar items={[...NAV]} usuario={{ nome: sessao.nome }} />
      <main id="conteudo" className="min-w-0 overflow-x-clip md:flex-1">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">{children}</div>
      </main>
    </div>
  );
}
