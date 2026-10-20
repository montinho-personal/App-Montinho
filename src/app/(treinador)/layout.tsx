export const dynamic = "force-dynamic";

import { Sidebar } from "@/components/layout/Sidebar";
import { requireTreinadorPage } from "@/lib/auth/session";

const NAV = [
  { label: "Visão geral", href: "/treinador", icon: "home" },
  { label: "Alunos", href: "/treinador/alunos", icon: "users" },
  { label: "Central de aderência", href: "/treinador/aderencia", icon: "chart" },
  { label: "Celebrar conquistas", href: "/treinador/conquistas", icon: "star" },
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
    <div className="min-h-screen flex bg-bg">
      <Sidebar items={[...NAV]} usuario={{ nome: sessao.nome }} />
      <main id="conteudo" className="flex-1 min-w-0 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">{children}</div>
      </main>
    </div>
  );
}
