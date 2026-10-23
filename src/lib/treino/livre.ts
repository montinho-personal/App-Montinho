// ============================================================================
// Treino livre (freestyle) do visitante: sem ficha pronta. A pessoa escolhe o
// exercício na hora, anota as séries (carga × repetições), se usou alguma
// técnica e o que mais quiser. PURO e testado; a gravação usa as mesmas
// tabelas do treino comum (training_sessions sem treino_id, com
// snapshot.livre = true), então conta para aderência, troféus e evolução.
// ============================================================================

import type { Tecnica } from "@/lib/volume/calcular";
import type { SerieTipo } from "@/lib/supabase/types-sessoes";

export const NOME_TREINO_LIVRE = "Treino livre";

/** Técnicas que a pessoa pode marcar no exercício. `serie` = tipo da série feita com a técnica. */
export const TECNICAS_LIVRE: Array<{ id: Tecnica; rotulo: string; serie?: SerieTipo; dica: string }> = [
  { id: "normal", rotulo: "Sem técnica", dica: "Séries normais." },
  { id: "dropset", rotulo: "Drop-set", serie: "dropset", dica: "Chegou na falha, tirou peso e continuou sem descanso." },
  { id: "rest_pause", rotulo: "Rest-pause", serie: "rest_pause", dica: "Chegou na falha, descansou poucos segundos e fez mais algumas." },
  { id: "biset", rotulo: "Bi-set", dica: "Dois exercícios seguidos, sem descanso entre eles." },
  { id: "triset", rotulo: "Tri-set", dica: "Três exercícios seguidos, sem descanso entre eles." },
  { id: "superset", rotulo: "Superset", dica: "Dois exercícios de músculos opostos seguidos." },
  { id: "piramide", rotulo: "Pirâmide", dica: "Aumentou o peso e diminuiu as repetições a cada série." },
  { id: "piramide_decrescente", rotulo: "Pirâmide decrescente", dica: "Começou pesado e foi tirando peso a cada série." },
  { id: "myo_reps", rotulo: "Myo-reps", serie: "myo_reps", dica: "Série longa e depois mini-séries com pausas curtas." },
  { id: "cluster", rotulo: "Cluster", serie: "cluster", dica: "Série dividida em pedaços com pausas curtas." },
  { id: "tres_sete", rotulo: "3/7", serie: "tres_sete", dica: "Séries crescentes de 3 a 7 repetições com pausas curtas." },
  { id: "negativo", rotulo: "Negativo", dica: "Descida bem lenta e controlada." },
  { id: "super_slow", rotulo: "Super slow", dica: "Subida e descida bem lentas." },
  { id: "isometria", rotulo: "Isometria", serie: "isometria", dica: "Segurou parado na posição." },
  { id: "unilateral", rotulo: "Unilateral", dica: "Um lado de cada vez." },
];
export const ehTecnicaLivre = (t: string | null | undefined): t is Tecnica => !!t && TECNICAS_LIVRE.some((x) => x.id === t);
export const rotuloTecnicaLivre = (t: string | null | undefined) => TECNICAS_LIVRE.find((x) => x.id === t)?.rotulo ?? "Sem técnica";

/** Tipos de série que a pessoa pode escolher no exercício (válida, aquecimento e, se tiver, a da técnica). */
export function tiposDeSerie(tecnica: string | null | undefined): Array<{ id: SerieTipo; rotulo: string }> {
  const t = TECNICAS_LIVRE.find((x) => x.id === tecnica);
  return [{ id: "valida", rotulo: "Normal" }, { id: "aquecimento", rotulo: "Aquecimento" }, ...(t?.serie ? [{ id: t.serie, rotulo: t.rotulo }] : [])];
}

/** Foto guardada na sessão: marca que é treino livre. */
export const snapshotLivre = () => ({ livre: true, treino: { id: null, letra: null, nome: NOME_TREINO_LIVRE, observacoes: null, tempos: {} }, exercicios: [] });

export const ehSessaoLivre = (s: { snapshot?: unknown } | null | undefined): boolean => !!(s?.snapshot as { livre?: boolean } | null | undefined)?.livre;

/** Para onde levar a pessoa para continuar uma sessão (treino livre tem tela própria). */
export function hrefDaSessao(s: { id: string; treino_id: string | null; snapshot?: unknown }): string {
  return ehSessaoLivre(s) || !s.treino_id ? `/aluno/livre/${s.id}` : `/aluno/treino/${s.treino_id}?sessao=${s.id}`;
}

export type SerieLivre = { tipo: SerieTipo; carga_kg: number | null; reps: number | null };
export type ExercicioLivre = { nome: string; biblioteca_id: string | null; tecnica: string | null; series: SerieLivre[] };

/** Conta como série de trabalho tudo que não é aquecimento. */
const deTrabalho = (s: SerieLivre) => s.tipo !== "aquecimento" && (s.reps != null || s.carga_kg != null);

export type ResumoLivre = { exercicios: number; series: number; volumeKg: number; tecnicas: string[]; maiorCarga: { nome: string; carga: number } | null };

export function resumoLivre(exs: ExercicioLivre[]): ResumoLivre {
  const feitos = exs.filter((e) => e.series.some(deTrabalho));
  let volume = 0;
  let maior: ResumoLivre["maiorCarga"] = null;
  for (const e of feitos) for (const s of e.series.filter(deTrabalho)) {
    volume += (s.carga_kg ?? 0) * (s.reps ?? 0);
    if (s.carga_kg != null && (!maior || s.carga_kg > maior.carga)) maior = { nome: e.nome, carga: s.carga_kg };
  }
  const tecnicas = [...new Set(feitos.map((e) => e.tecnica).filter((t): t is string => !!t && t !== "normal").map(rotuloTecnicaLivre))];
  return { exercicios: feitos.length, series: feitos.reduce((n, e) => n + e.series.filter(deTrabalho).length, 0), volumeKg: Math.round(volume), tecnicas, maiorCarga: maior };
}

/**
 * Treino livre → treino para Meus treinos (repetir depois): séries de
 * trabalho feitas, repetições de menor a maior (8-12) e a maior carga.
 * Exercício sem nenhuma série de trabalho fica de fora.
 */
export function treinoDoLivre(exs: ExercicioLivre[]): Array<{ biblioteca_id: string | null; nome_livre: string | null; series: number; reps: string; descanso_seg: number; carga_kg: number | null }> {
  return exs
    .filter((e) => e.series.some(deTrabalho))
    .slice(0, 15)
    .map((e) => {
      const trabalho = e.series.filter(deTrabalho);
      const reps = trabalho.map((s) => s.reps).filter((r): r is number => r != null && r > 0);
      const min = reps.length ? Math.min(...reps) : 10;
      const max = reps.length ? Math.max(...reps) : 10;
      const cargas = trabalho.map((s) => s.carga_kg).filter((c): c is number => c != null && c > 0);
      return {
        biblioteca_id: e.biblioteca_id,
        nome_livre: e.biblioteca_id ? null : e.nome.slice(0, 60),
        series: Math.min(10, Math.max(1, trabalho.length)),
        reps: min === max ? String(min) : `${min}-${max}`,
        descanso_seg: 90,
        carga_kg: cargas.length ? Math.min(500, Math.max(...cargas)) : null,
      };
    });
}

const kg = (n: number) => `${String(n).replace(".", ",")} kg`;
/** “Última vez (21/10): 40 kg × 10 · 40 kg × 8” — para lembrar a carga na hora de escolher. */
export function textoUltimaVez(u: { data: string; series: Array<{ carga_kg: number | null; reps: number | null; tipo: string }> } | null | undefined): string | null {
  if (!u) return null;
  const ss = u.series.filter((s) => s.tipo !== "aquecimento" && (s.carga_kg != null || s.reps != null)).slice(0, 4);
  if (!ss.length) return null;
  const dia = u.data.slice(0, 10).split("-").reverse().slice(0, 2).join("/");
  return `Última vez (${dia}): ${ss.map((s) => (s.carga_kg != null && s.reps != null ? `${kg(s.carga_kg)} × ${s.reps}` : s.carga_kg != null ? kg(s.carga_kg) : `${s.reps} reps`)).join(" · ")}`;
}

/** Carga digitada no padrão do Brasil (“42,5”) → número; vazio/inválido = null. */
export function lerCarga(txt: string): number | null {
  const n = Number(txt.trim().replace(/\s|kg/gi, "").replace(",", "."));
  return txt.trim() && Number.isFinite(n) && n >= 0 && n <= 1000 ? Math.round(n * 100) / 100 : null;
}
export function lerReps(txt: string): number | null {
  const n = Number(txt.trim());
  return txt.trim() && Number.isInteger(n) && n >= 0 && n <= 500 ? n : null;
}
