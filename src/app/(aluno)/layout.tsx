import { Logo } from "@/components/brand/Logo";
import { MobileTabBar } from "@/components/layout/MobileTabBar";

const TABS = [
  { label: "Treino", href: "/aluno", icon: "🏋" },
  { label: "Dieta", href: "/aluno/dieta", icon: "🥗" },
  { label: "Evolução", href: "/aluno/evolucao", icon: "📈" },
  { label: "Perfil", href: "/aluno/perfil", icon: "👤" },
];

export default function AlunoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="px-5 py-4 border-b border-border bg-surface/50">
        <div className="max-w-md mx-auto">
          <Logo variant="full" color="white" height={28} priority />
        </div>
      </header>
      <main className="flex-1 pb-24">
        <div className="max-w-md mx-auto px-5 py-6">{children}</div>
      </main>
      <MobileTabBar items={TABS} />
    </div>
  );
}
