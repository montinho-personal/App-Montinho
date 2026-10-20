export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireTreinadorPage } from "@/lib/auth/session";
import { listMemoria } from "@/lib/data/memoria";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { listTemplates } from "@/lib/db";
import { preferenciasRecorrentes, type Contagem } from "@/lib/memoria/preferencias";
import { GRUPO_LABEL, GRUPOS_ORDEM } from "@/lib/grupos";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import { MemoriaClient } from "./MemoriaClient";
import { FEATURES } from "@/lib/env";

export const metadata = { title: "Memória de treinos" };

const TECNICA_LABEL: Record<string, string> = {
  superset: "Superset", biset: "Bi-set", dropset: "Drop set", rest_pause: "Rest-pause", cluster: "Cluster",
  piramide: "Pirâmide", isometria: "Isometria", unilateral: "Unilateral", myo_reps: "Myo-reps",
};

export default async function MemoriaPage() {
  await requireTreinadorPage();
  const [acervo, biblioteca, templates] = await Promise.all([listMemoria(), listarBiblioteca(), listTemplates().catch(() => [])]);
  const pref = preferenciasRecorrentes(acervo);
  const fmt = (xs: Contagem[], rotulo?: (v: string) => string) => (xs.length ? xs.map((x) => `${rotulo ? rotulo(x.valor) : x.valor} (${x.vezes})`).join(" · ") : "—");
  const grupos = (Object.keys(pref.exerciciosPorGrupo) as GrupoMuscular[]).sort((a, b) => GRUPOS_ORDEM.indexOf(a) - GRUPOS_ORDEM.indexOf(b));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-wider text-accent font-bold">Memória de prescrições</p>
        <h1 className="text-3xl font-bold mt-1">Seus programas, organizados</h1>
        <p className="text-fg-muted text-sm mt-1 max-w-2xl">
          Toda vez que você salva um plano, uma cópia <strong className="text-fg">desidentificada</strong> (exercícios, ordem, séries, repetições, técnicas, frequência, objetivo e contexto — sem nome, observações ou cargas do aluno) entra aqui. A busca é estruturada e explicável — {FEATURES.iaMemoria ? "com camada de IA habilitada para consultas em linguagem natural." : "sem IA: funciona por filtros, similaridade e texto."}
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-bold">De onde vêm as sugestões</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Fonte nome="Biblioteca de exercícios" valor={`${biblioteca.length} exercícios`} detalhe={<Link href="/treinador/biblioteca" className="alvo text-accent hover:underline">abrir</Link>} />
            <Fonte nome="Templates reutilizáveis" valor={`${templates.length} template(s)`} detalhe={<Link href="/treinador/templates" className="alvo text-accent hover:underline">abrir</Link>} />
            <Fonte nome="Treinos já prescritos (memória)" valor={`${acervo.length} programa(s) salvos`} />
            <Fonte nome="Suas preferências recorrentes" valor={pref.baseadoEm ? `calculadas de ${pref.baseadoEm} prescrição(ões)` : "sem dados ainda"} />
            <Fonte nome="Sugestões automáticas" valor={FEATURES.iaMemoria ? "regras + camada de IA" : "regras explícitas (sem IA)"} detalhe={<span className="text-fg-subtle">substituições e busca</span>} />
          </dl>
          <p className="mt-3 text-[11px] text-fg-subtle">Uma prescrição antiga nunca é aplicada automaticamente: o montador sempre considera o perfil atual do aluno (anamnese, nível, equipamentos e objetivo) e você decide.</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-bold">Seus padrões recorrentes</h2>
          {pref.baseadoEm === 0 ? (
            <p className="mt-3 text-sm text-fg-muted">Ainda não há prescrições salvas. Os padrões aparecem aqui a partir do primeiro plano salvo no montador.</p>
          ) : (
            <>
              <p className="mt-1 text-[11px] text-fg-subtle">Descritivo, a partir de {pref.baseadoEm} prescrição(ões) salvas. Para corrigir, edite ou exclua itens da memória abaixo.</p>
              <dl className="mt-3 space-y-2 text-sm">
                <Fonte nome="Divisões" valor={fmt(pref.splits)} />
                <Fonte nome="Objetivos" valor={fmt(pref.objetivos)} />
                <Fonte nome="Frequência" valor={fmt(pref.sessoesSemana)} />
                <Fonte nome="Séries por exercício (mediana)" valor={pref.seriesPorExercicioMediana != null ? String(pref.seriesPorExercicioMediana).replace(".", ",") : "—"} />
                <Fonte nome="Faixas de repetição" valor={fmt(pref.repeticoes)} />
                <Fonte nome="Técnicas avançadas" valor={fmt(pref.tecnicas, (v) => TECNICA_LABEL[v] ?? v)} />
              </dl>
              {grupos.length ? (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-semibold">Exercícios que você mais usa por músculo</summary>
                  <ul className="mt-2 space-y-1 text-fg-muted">
                    {grupos.map((g) => (
                      <li key={g}>
                        <span className="text-fg">{GRUPO_LABEL[g]}:</span> {fmt(pref.exerciciosPorGrupo[g] ?? [])}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </>
          )}
        </div>
      </section>

      <MemoriaClient acervoInicial={acervo} />
    </div>
  );
}

function Fonte({ nome, valor, detalhe }: { nome: string; valor: string; detalhe?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
      <dt className="text-fg-muted">{nome}</dt>
      <dd className="text-right font-medium">
        {valor} {detalhe ? <span className="ml-1 text-xs">{detalhe}</span> : null}
      </dd>
    </div>
  );
}
