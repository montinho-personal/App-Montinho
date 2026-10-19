import { requireTreinadorPage } from "@/lib/auth/session";
import { listMemoria } from "@/lib/data/memoria";
import { MemoriaClient } from "./MemoriaClient";
import { FEATURES } from "@/lib/env";

export const metadata = { title: "Memória de treinos" };

export default async function MemoriaPage() {
  await requireTreinadorPage();
  const acervo = await listMemoria();
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-accent font-bold">Memória de prescrições</p>
        <h1 className="text-3xl font-bold mt-1">Seus programas, organizados</h1>
        <p className="text-fg-muted text-sm mt-1 max-w-2xl">
          Toda vez que você salva um plano, uma cópia <strong className="text-fg">desidentificada</strong> (sem nome, observações ou cargas do aluno) entra aqui. A busca é estruturada e explicável — {FEATURES.iaMemoria ? "com camada de IA habilitada para consultas em linguagem natural." : "sem IA: funciona por filtros, similaridade e texto."}
        </p>
      </header>
      <MemoriaClient acervoInicial={acervo} />
    </div>
  );
}
