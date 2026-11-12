// ============================================================================
// Conferência de marcação (PURO, testado): pega prováveis erros de digitação
// na hora de concluir a série e pede confirmação — nunca bloqueia.
//  • Carga muito acima/abaixo da referência do próprio aluno (série anterior
//    de hoje ou última vez): ex. 200 kg quando foi 20 kg → “Era 20 kg?”.
//  • Sem histórico: carga acima do esperado para o grupo muscular.
//  • Repetições muito acima do prescrito (100 em vez de 10).
//  • Carga e repetições trocadas de campo.
//  • Anilhas/halteres (04/11/2026, pedido do Montinho): exatamente o DOBRO (ou a
//    metade) do normal → provável troca entre “soma dos lados” e “um lado”;
//    e carga bem acima do normal (60%+ e 10 kg+) → pergunta se anotou certo.
// Erra para o lado de perguntar pouco: só valores bem fora do padrão.
// ============================================================================

import type { GrupoMuscular } from "@/lib/supabase/types-extended";

export type Alerta = { mensagem: string; sugestao: { carga?: number; reps?: number; rotulo: string } | null };

export type EntradaConferencia = {
  carga: number | null;
  reps: number | null;
  /** Repetições prescritas (ex.: "8-12", "10", "20/15/12"). */
  repsPrescritas?: string | null;
  /** Cargas de referência do próprio aluno neste exercício (hoje e da última vez). */
  cargasReferencia: number[];
  grupo?: GrupoMuscular | null;
  /** Isometria/tempo: “reps” são segundos — não confere repetições. */
  emSegundos?: boolean;
  /** Anilhas/halteres e o jeito que a pessoa anota (Perfil). */
  padrao?: { tipo: "anilhas" | "halteres"; modo: "total" | "por_lado" | null } | null;
};

/** “a soma dos dois lados”, “um lado só”… (para o recado da conferência). */
function jeito(p: NonNullable<EntradaConferencia["padrao"]>, modo: "total" | "por_lado"): string {
  if (p.tipo === "anilhas") return modo === "total" ? "a soma dos dois lados" : "só um lado";
  return modo === "total" ? "os dois halteres somados" : "o peso de um halter";
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

/** Grupos em que cargas muito altas sem histórico são improváveis. */
const GRUPOS_LEVES = new Set<string>(["biceps", "triceps", "ombros", "ombro_anterior", "ombro_lateral", "ombro_posterior", "antebraco", "abdomen", "core"]);

function maxReps(prescritas?: string | null): number | null {
  const nums = (prescritas ?? "").match(/\d+/g)?.map(Number).filter((n) => n > 0) ?? [];
  return nums.length ? Math.max(...nums) : null;
}

function mediana(v: number[]): number {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const perto = (a: number, b: number, tol = 0.35) => b > 0 && Math.abs(a - b) / b <= tol;

export function conferirSerie(e: EntradaConferencia): Alerta | null {
  const refs = e.cargasReferencia.filter((c) => Number.isFinite(c) && c > 0);
  const ref = refs.length ? mediana(refs) : null;
  const max = maxReps(e.repsPrescritas);

  // 1) Carga e repetições trocadas (ex.: 12 kg × 40 reps quando costuma ser 40 kg × 12).
  if (!e.emSegundos && ref && e.carga != null && e.reps != null && max && perto(e.reps, ref, 0.2) && e.carga <= max + 3 && !perto(e.carga, ref, 0.5) && e.reps > max * 1.8) {
    return { mensagem: `Parece que carga e repetições ficaram trocadas: ${fmt(e.carga)} kg × ${e.reps} repetições. Confere?`, sugestao: { carga: e.reps, reps: e.carga, rotulo: `Trocar: ${fmt(e.reps)} kg × ${e.carga}` } };
  }

  // 2) Anilhas/halteres: o dobro ou a metade exata do normal = provável troca de jeito de anotar.
  if (e.padrao && e.carga != null && e.carga > 0 && ref && ref >= 2) {
    const r = e.carga / ref;
    const comoAnota = e.padrao.modo ? ` Você anota ${jeito(e.padrao, e.padrao.modo)}.` : "";
    if (r >= 1.85 && r <= 2.15 && e.carga - ref >= 4) {
      const outro = e.padrao.modo === "total" ? null : jeito(e.padrao, "total");
      return {
        mensagem: `${fmt(e.carga)} kg é o dobro do seu normal neste exercício (${fmt(ref)} kg).${comoAnota} ${outro ? `Será que anotou ${outro}?` : "Anotou certo?"}`,
        sugestao: { carga: e.carga / 2, rotulo: `Era ${fmt(e.carga / 2)} kg` },
      };
    }
    if (r >= 0.45 && r <= 0.55 && ref - e.carga >= 4) {
      const outro = e.padrao.modo === "por_lado" ? null : jeito(e.padrao, "por_lado");
      return {
        mensagem: `${fmt(e.carga)} kg é a metade do seu normal neste exercício (${fmt(ref)} kg).${comoAnota} ${outro ? `Será que anotou ${outro}?` : "Anotou certo?"}`,
        sugestao: { carga: e.carga * 2, rotulo: `Era ${fmt(e.carga * 2)} kg` },
      };
    }
  }

  // 3) Carga fora da referência do próprio aluno.
  if (e.carga != null && e.carga > 0 && ref && ref >= 2) {
    if (e.carga >= ref * 2.5 && e.carga - ref >= 15) {
      const dez = e.carga / 10;
      const sugestao = perto(dez, ref) ? { carga: dez, rotulo: `Era ${fmt(dez)} kg` } : null;
      return { mensagem: `${fmt(e.carga)} kg é bem mais que o seu normal neste exercício (${fmt(ref)} kg). Confere?`, sugestao };
    }
    // Bem acima do normal (mas não absurdo): só pergunta, sem sugerir número.
    if (e.carga >= ref * 1.6 && e.carga - ref >= 10) {
      return { mensagem: `${fmt(e.carga)} kg é bem acima do que você costuma pegar neste exercício (${fmt(ref)} kg). Anotou certo?`, sugestao: null };
    }
    if (e.carga <= ref * 0.3 && ref - e.carga >= 10) {
      const dez = e.carga * 10;
      const sugestao = perto(dez, ref) ? { carga: dez, rotulo: `Era ${fmt(dez)} kg` } : null;
      return { mensagem: `${fmt(e.carga)} kg é bem menos que o seu normal neste exercício (${fmt(ref)} kg). Confere?`, sugestao };
    }
  }

  // 4) Sem histórico: carga improvável.
  if (e.carga != null && !ref) {
    const limite = e.grupo && GRUPOS_LEVES.has(e.grupo) ? 100 : 300;
    if (e.carga > limite) {
      const dez = e.carga / 10;
      return { mensagem: `${fmt(e.carga)} kg é muito alto para este exercício. Confere?`, sugestao: dez >= 1 ? { carga: dez, rotulo: `Era ${fmt(dez)} kg` } : null };
    }
  }

  // 5) Repetições muito acima do prescrito.
  if (!e.emSegundos && e.reps != null) {
    if (max && e.reps >= Math.max(30, max * 3)) {
      const dez = Math.round(e.reps / 10);
      const sugestao = dez >= 1 && dez <= max * 1.5 ? { reps: dez, rotulo: `Eram ${dez} repetições` } : null;
      return { mensagem: `${e.reps} repetições é bem mais que o previsto (${e.repsPrescritas}). Confere?`, sugestao };
    }
    if (!max && e.reps > 60) return { mensagem: `${e.reps} repetições numa série. Confere?`, sugestao: null };
  }
  return null;
}

/**
 * Vírgula que sumiu (12/11/2026, caso da Brigida: o teclado do celular dela não
 * tinha vírgula e 58,5 virou 585). Devolve a carga ÷ 10 quando o número só faz
 * sentido assim: com referência do aluno, 5× ou mais acima e o ÷ 10 perto dela;
 * sem referência, acima do limite do grupo (o mesmo da conferência). Senão, null.
 * Usado para corrigir sozinho onde não dá para perguntar (concluir tudo de uma
 * vez, séries em blocos); na série comum a conferência pergunta “Era X kg?”.
 */
export function virgulaPerdida(carga: number | null, referencias: number[], grupo?: GrupoMuscular | null): number | null {
  if (carga == null || !Number.isFinite(carga) || carga < 20) return null;
  const todas = referencias.filter((c) => Number.isFinite(c) && c > 0);
  // Tira das referências as que também parecem erro (bem acima do normal das outras).
  const refs = todas.length ? todas.filter((c) => c <= mediana(todas) * 3) : [];
  const dez = Math.round(carga) / 10;
  if (refs.length) {
    // 5× acima até da MAIOR referência (aquecimento leve não engana) e o ÷ 10 perto do normal.
    return carga >= Math.max(...refs) * 5 && perto(dez, mediana(refs)) ? dez : null;
  }
  const limite = grupo && GRUPOS_LEVES.has(grupo) ? 100 : 300;
  return carga > limite ? dez : null;
}
