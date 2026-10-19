import { Sidebar } from "@/components/layout/Sidebar";

const NAV = [
  { label: "Visão geral", href: "/treinador" },
  { label: "Alunos", href: "/treinador/alunos" },
  { label: "Biblioteca", href: "/treinador/biblioteca" },
  { label: "Templates", href: "/treinador/templates" },
  { label: "Prescrição", href: "/treinador/prescricao" },
  { label: "Ajustes", href: "/treinador/ajustes" },
];

export default function TreinadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-bg">
      <Sidebar items={NAV} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
