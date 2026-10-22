// Estratégia → plano inicial do aluno (programa + dias sem exercícios).
// Os exercícios ficam para o personal escolher no montador; aqui vão a
// divisão, a frequência, as metas de séries por músculo e o foco de cada dia.
import type { SalvarPlanoInput, TreinoInput } from "@/lib/data/programas";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import type { TreinoLetra } from "@/lib/supabase/types-sessoes";
import { diasDaEstrategia, diasPorDiaDaSemana } from "./divisao";
import { grupoDoRotulo, type EstrategiaImportada } from "./ler";

const corta = (s: string | null | undefined, n: number) => (s ? (s.length > n ? `${s.slice(0, n - 1)}…` : s) : null);

/** Prioridades do relatório → grupos do app (“Ombros” vira ombros). */
export function prioridadesEmGrupos(e: EstrategiaImportada): GrupoMuscular[] {
  const out: GrupoMuscular[] = [];
  for (const p of e.prioridades) {
    const g = grupoDoRotulo(p);
    if (g && !out.includes(g)) out.push(g);
  }
  return out.slice(0, 6);
}

export function planoDaEstrategia(e: EstrategiaImportada): SalvarPlanoInput | null {
  const dias = diasDaEstrategia(e);
  if (!dias.length) return null;
  const metas: Partial<Record<GrupoMuscular, { min: number; max: number }>> = {};
  for (const v of e.volume) if (v.grupo && v.series > 0) metas[v.grupo] = { min: v.series, max: Math.max(v.series, v.max ?? v.series) };
  const letras = dias.map((d) => d.letra as TreinoLetra);
  const obs = [
    e.intensidade && `Intensidade: ${e.intensidade}.`,
    e.adaptacoes && `Adaptações: ${e.adaptacoes}`,
    e.preparacao.length ? `Antes de cada treino: ${e.preparacao.join(", ")}.` : null,
    e.aerobico && `Aeróbico: ${e.aerobico}.`,
    e.fases.length ? `Fases: ${e.fases.map((f) => `${f.numero} · ${f.nome}${f.semanas ? ` (${f.semanas} sem)` : ""}`).join("; ")}.` : null,
  ].filter(Boolean).join("\n");
  const treinos: TreinoInput[] = dias.map((d) => ({
    letra: d.letra as TreinoLetra,
    nome: corta(d.nome, 80)!,
    ativo: true,
    observacoes: null,
    exercicios: [],
  }));
  return {
    programa: {
      nome: corta(e.titulo, 80) ?? "Estratégia importada",
      objetivo: corta(e.objetivo, 40),
      nivel: corta(e.experiencia, 40),
      split: corta(e.divisao, 40),
      modo_semana: "rotativo",
      frequencia: Object.fromEntries(letras.map((l) => [l, 1])),
      // Divisão por dia da semana: a meta é o número de dias de musculação (o dia de cardio não conta).
      calendario: { modo: "rotativo", sequencia: letras, diasPorSemana: e.divisao && diasPorDiaDaSemana(e.divisao) ? letras.length : (e.diasPorSemana ?? letras.length) },
      metas_volume: metas,
      prioridades: prioridadesEmGrupos(e),
      equipamentos: [],
      duracao_min: e.minutosPorTreino,
      permite_versao_reduzida: false,
      observacoes: corta(obs, 1000),
    },
    treinos,
    motivo: corta(`Estratégia importada do Montinho Strategy${e.titulo ? `: ${e.titulo}` : ""}`, 300),
  };
}
