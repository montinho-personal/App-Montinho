export const dynamic = "force-dynamic";

import { FEATURES } from "@/lib/env";
import { Sidebar } from "@/components/layout/Sidebar";
import { requireTreinadorPage } from "@/lib/auth/session";

// Menu em seções (20/11/2026, auditoria pedida pelo Montinho: eram 27 itens soltos). Nenhuma tela saiu:
// só a ordem — o que se usa todo dia em cima, depois alunos, montar treino, acompanhar, motivar, vender.
const NAV = [
  { grupo: "Hoje", label: "Visão geral", href: "/treinador", icon: "home" },
  { grupo: "Hoje", label: "Treinando agora", href: "/treinador/ao-vivo", icon: "play" },
  { grupo: "Hoje", label: "Treinos feitos", href: "/treinador/treinos-feitos", icon: "table" },
  { grupo: "Alunos", label: "Alunos", href: "/treinador/alunos", icon: "users" },
  { grupo: "Alunos", label: "Buscar aluno ou treino", href: "/treinador/busca", icon: "search" },
  { grupo: "Montar treino", label: "Treinos extras", href: "/treinador/extras", icon: "plus" },
  ...(FEATURES.multimodalidade ? [{ grupo: "Montar treino", label: "WOD do dia", href: "/treinador/wod", icon: "play" } as const] : []),
  { grupo: "Montar treino", label: "Templates", href: "/treinador/templates", icon: "table" },
  { grupo: "Montar treino", label: "Prescrição automática", href: "/treinador/prescricao", icon: "chart" },
  { grupo: "Montar treino", label: "Biblioteca de exercícios", href: "/treinador/biblioteca", icon: "book" },
  { grupo: "Montar treino", label: "Memória de treinos", href: "/treinador/memoria", icon: "sparkles" },
  { grupo: "Acompanhar", label: "Central de aderência", href: "/treinador/aderencia", icon: "chart" },
  { grupo: "Acompanhar", label: "Evoluções dos alunos", href: "/treinador/evolucoes", icon: "chart" },
  { grupo: "Acompanhar", label: "Montinho Cardio", href: "/treinador/cardio", icon: "timer" },
  { grupo: "Acompanhar", label: "Mobilidade", href: "/treinador/mobilidade", icon: "sparkles" },
  { grupo: "Motivar", label: "Celebrar conquistas", href: "/treinador/conquistas", icon: "star" },
  { grupo: "Motivar", label: "Ranking de troféus", href: "/treinador/ranking", icon: "trophy" },
  { grupo: "Motivar", label: "Desafios entre alunos", href: "/treinador/desafios", icon: "star" },
  { grupo: "Motivar", label: "Conquistas da Tribo", href: "/treinador/tribo", icon: "users" },
  { grupo: "Motivar", label: "Academia da Tribo", href: "/treinador/academia", icon: "users" },
  { grupo: "Motivar", label: "Mito ou verdade?", href: "/treinador/conhecimento", icon: "book" },
  ...(FEATURES.modoVisitante ? [{ grupo: "Vender", label: "Leads", href: "/treinador/leads", icon: "chart" } as const, { grupo: "Vender", label: "Visitantes", href: "/treinador/visitantes", icon: "user" } as const] : []),
  { grupo: "Vender", label: "Ofertas e planos", href: "/treinador/ofertas", icon: "star" },
  { grupo: "Eu", label: "Meu treino", href: "/treinador/meu-treino", icon: "dumbbell" },
  { grupo: "Eu", label: "Treinos do Montinho", href: "/treinador/treinos-montinho", icon: "star" },
  { grupo: "Eu", label: "Ajustes", href: "/treinador/ajustes", icon: "menu" },
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
