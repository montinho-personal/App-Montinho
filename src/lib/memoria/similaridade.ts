// ============================================================================
// Memória de prescrições — busca determinística + similaridade estruturada.
//
// Sem IA: filtros de compatibilidade obrigatórios → ranking explicável com
// pesos ajustáveis → busca textual → deduplicação. Tudo síncrono e testável.
// Os itens do acervo são DESIDENTIFICADOS (nunca contêm nome de aluno).
// ============================================================================

import type { BibliotecaPrograma, MetadadosPrograma, SnapshotPrograma } from "@/lib/supabase/types-sessoes";
import { normalizarNome } from "@/lib/grupos";

export type CriteriosBusca = {
  texto?: string | null;
  objetivo?: string | null;
  nivel?: string | null;
  dias?: number | null;
  split?: string | null;
  equipamentos?: string[] | null;       // o que o aluno TEM
  prioridades?: string[] | null;
  restricoes?: string[] | null;         // restrições de movimento do aluno
  duracao_min?: number | null;
  somenteFavoritos?: boolean;
};

export type PesosBusca = {
  dias: number;
  objetivo: number;
  nivel: number;
  split: number;
  prioridades: number;
  equipamentos: number;
  duracao: number;
  texto: number;
  feedback: number;
};

export const PESOS_PADRAO: PesosBusca = {
  dias: 25,
  objetivo: 20,
  nivel: 10,
  split: 15,
  prioridades: 15,
  equipamentos: 5,
  duracao: 5,
  texto: 15,
  feedback: 5,
};

export type ResultadoBusca = {
  item: BibliotecaPrograma;
  similaridade: number; // 0–100
  motivos: string[];    // "por que apareceu"
  alertas: string[];    // ex.: equipamento ausente
};

const SPLIT_ALIAS: Record<string, string> = {
  "upper lower": "upper/lower",
  "upper/lower": "upper/lower",
  "ul": "upper/lower",
  "superior inferior": "upper/lower",
  "superior/inferior": "upper/lower",
  "ppl": "ppl",
  "push pull legs": "ppl",
  "push/pull/legs": "ppl",
  "full body": "full body",
  "fullbody": "full body",
  "corpo inteiro": "full body",
  "abc": "abc",
  "abcd": "abcd",
  "abcde": "abcde",
};

export function normalizarSplit(s: string | null | undefined): string | null {
  if (!s) return null;
  const n = normalizarNome(s);
  return SPLIT_ALIAS[n] ?? n;
}

const SINONIMOS_TEXTO: Array<[RegExp, Partial<CriteriosBusca>]> = [
  [/\b(\d)\s*(dias|x|vezes)\b/, {}], // tratado à parte
  [/gluteo|gluteos|bumbum/, { prioridades: ["gluteo"] }],
  [/costas|dorsal/, { prioridades: ["costas"] }],
  [/peito|peitoral/, { prioridades: ["peito"] }],
  [/ombro/, { prioridades: ["ombros"] }],
  [/perna|quadriceps|coxa/, { prioridades: ["quadriceps"] }],
  [/hipertrofia|massa|ganhar musculo/, { objetivo: "hipertrofia" }],
  [/forca/, { objetivo: "forca" }],
  [/emagrec|secar|perder peso|definic/, { objetivo: "emagrecimento" }],
  [/condicionamento|resistencia/, { objetivo: "condicionamento" }],
  [/iniciante|comecando|nunca treinou/, { nivel: "iniciante" }],
  [/intermediari/, { nivel: "intermediario" }],
  [/avancad/, { nivel: "avancado" }],
  [/upper|lower|superior.*inferior/, { split: "upper/lower" }],
  [/ppl|push|pull/, { split: "ppl" }],
  [/full ?body|corpo inteiro/, { split: "full body" }],
  [/academia/, { equipamentos: ["barra", "halter", "maquina", "polia", "banco", "cabo"] }],
  [/casa|em casa|sem equipamento/, { equipamentos: ["peso_corporal", "elastico", "halter"] }],
];

/** Interpreta um texto livre em PT-BR ("4 dias, glúteos, upper/lower, academia") em critérios. */
export function interpretarTexto(texto: string): CriteriosBusca {
  const n = normalizarNome(texto);
  const out: CriteriosBusca = { texto: texto.trim() || null };
  const dias = n.match(/\b([2-7])\s*(dias|x|vezes)\b/);
  if (dias) out.dias = Number(dias[1]);
  const dur = n.match(/\b(\d{2,3})\s*min/);
  if (dur) out.duracao_min = Number(dur[1]);
  for (const [rx, patch] of SINONIMOS_TEXTO) {
    if (!rx.test(n)) continue;
    if (patch.prioridades) out.prioridades = [...new Set([...(out.prioridades ?? []), ...patch.prioridades])];
    if (patch.equipamentos) out.equipamentos = [...new Set([...(out.equipamentos ?? []), ...patch.equipamentos])];
    if (patch.objetivo && !out.objetivo) out.objetivo = patch.objetivo;
    if (patch.nivel && !out.nivel) out.nivel = patch.nivel;
    if (patch.split && !out.split) out.split = patch.split;
  }
  return out;
}

function textoDoItem(item: BibliotecaPrograma): string {
  const m = item.metadados ?? ({} as MetadadosPrograma);
  const exs = item.estrutura?.treinos?.flatMap((t) => t.exercicios.map((e) => e.nome)) ?? [];
  return normalizarNome(
    [item.nome, item.resumo, item.justificativa, ...(item.tags ?? []), m.objetivo, m.nivel, m.split, ...(m.prioridades ?? []), ...(m.grupos_principais ?? []), ...exs].filter(Boolean).join(" ")
  );
}

/**
 * Busca com filtros obrigatórios (compatibilidade) e ranking explicável.
 * Regras duras: item não pode exigir equipamento que o aluno não tem (quando
 * informado) nem conter exercício marcado como restrito.
 */
export function buscarSemelhantes(
  acervo: BibliotecaPrograma[],
  criterios: CriteriosBusca,
  pesos: PesosBusca = PESOS_PADRAO,
  limite = 5
): ResultadoBusca[] {
  const textoCriterio = criterios.texto ? interpretarTexto(criterios.texto) : {};
  const c: CriteriosBusca = { ...textoCriterio, ...stripNulos(criterios) };
  const splitDesejado = normalizarSplit(c.split);
  const termos = c.texto ? normalizarNome(c.texto).split(/[^a-z0-9/]+/).filter((t) => t.length >= 3) : [];
  const equipamentosAluno = c.equipamentos?.length ? new Set(c.equipamentos.map(normalizarNome)) : null;
  const restricoes = (c.restricoes ?? []).map(normalizarNome).filter(Boolean);

  const resultados: ResultadoBusca[] = [];
  const vistos = new Set<string>();

  for (const item of acervo) {
    if (item.excluido_em || item.status === "arquivado") continue;
    if (c.somenteFavoritos && !item.favorito) continue;
    if (vistos.has(item.hash_estrutura)) continue; // dedupe por estrutura
    const m = item.metadados ?? ({} as MetadadosPrograma);
    const motivos: string[] = [];
    const alertas: string[] = [];
    let pontos = 0;
    let maximo = 0;

    // --- Filtros obrigatórios ---------------------------------------------
    if (equipamentosAluno) {
      const faltam = (m.equipamentos ?? []).map(normalizarNome).filter((e) => !equipamentosAluno.has(e));
      if (faltam.length) {
        // equipamento ausente → incompatível (não recomendar)
        continue;
      }
      motivos.push("equipamentos compatíveis");
    }
    if (restricoes.length) {
      const nomes = item.estrutura?.treinos?.flatMap((t) => t.exercicios.map((e) => normalizarNome(e.nome))) ?? [];
      const bate = restricoes.filter((r) => nomes.some((n) => n.includes(r)));
      if (bate.length) {
        continue; // contém movimento restrito
      }
    }
    if (c.dias && Math.abs((m.dias ?? 0) - c.dias) > 1) continue; // compatibilidade de dias (±1)

    // --- Ranking explicável -----------------------------------------------
    if (c.dias) {
      maximo += pesos.dias;
      if (m.dias === c.dias) {
        pontos += pesos.dias;
        motivos.push(`mesma frequência (${c.dias} dias)`);
      } else {
        pontos += pesos.dias * 0.5;
        motivos.push(`frequência próxima (${m.dias} dias)`);
      }
    }
    if (c.objetivo) {
      maximo += pesos.objetivo;
      if (normalizarNome(m.objetivo) === normalizarNome(c.objetivo)) {
        pontos += pesos.objetivo;
        motivos.push(`mesmo objetivo (${c.objetivo})`);
      }
    }
    if (c.nivel) {
      maximo += pesos.nivel;
      if (normalizarNome(m.nivel) === normalizarNome(c.nivel)) {
        pontos += pesos.nivel;
        motivos.push(`mesmo nível (${c.nivel})`);
      }
    }
    if (splitDesejado) {
      maximo += pesos.split;
      if (normalizarSplit(m.split) === splitDesejado) {
        pontos += pesos.split;
        motivos.push(`mesma divisão (${m.split})`);
      }
    }
    if (c.prioridades?.length) {
      maximo += pesos.prioridades;
      const p = new Set((m.prioridades ?? []).concat(m.grupos_principais ?? []).map(normalizarNome));
      const comuns = c.prioridades.map(normalizarNome).filter((x) => p.has(x));
      if (comuns.length) {
        pontos += pesos.prioridades * (comuns.length / c.prioridades.length);
        motivos.push(`mesmo foco (${comuns.join(", ")})`);
      }
    }
    if (c.duracao_min && m.duracao_min) {
      maximo += pesos.duracao;
      if (Math.abs(m.duracao_min - c.duracao_min) <= 15) {
        pontos += pesos.duracao;
        motivos.push(`duração parecida (${m.duracao_min} min)`);
      }
    }
    if (termos.length) {
      maximo += pesos.texto;
      const corpo = textoDoItem(item);
      const achados = termos.filter((t) => corpo.includes(t));
      if (achados.length) {
        pontos += pesos.texto * (achados.length / termos.length);
        motivos.push(`texto: ${achados.slice(0, 4).join(", ")}`);
      }
    }
    // feedback explícito do treinador (nunca "cientificamente melhor"; só preferência declarada)
    maximo += pesos.feedback;
    const fb = item.feedback ?? { util: 0, nao_util: 0, usei_adaptei: 0 };
    const saldo = (fb.util ?? 0) + (fb.usei_adaptei ?? 0) - (fb.nao_util ?? 0) + (item.favorito ? 1 : 0);
    if (saldo > 0) {
      pontos += Math.min(pesos.feedback, saldo);
      motivos.push(item.favorito ? "favorito" : "marcado como útil antes");
    } else if (saldo < 0) {
      alertas.push("marcado como não útil anteriormente");
    }

    if (maximo === 0) continue;
    const similaridade = Math.round((pontos / maximo) * 100);
    if (similaridade <= 0) continue;
    vistos.add(item.hash_estrutura);
    resultados.push({ item, similaridade, motivos, alertas });
  }

  return resultados.sort((a, b) => b.similaridade - a.similaridade || (b.item.uso_count ?? 0) - (a.item.uso_count ?? 0)).slice(0, limite);
}

function stripNulos<T extends object>(o: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) continue;
    (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Metadados e hash a partir de um snapshot (desidentificação)
// ---------------------------------------------------------------------------
export function extrairMetadados(snapshot: SnapshotPrograma): MetadadosPrograma {
  const treinosAtivos = snapshot.treinos.filter((t) => t.ativo !== false);
  const freq = snapshot.programa.frequencia ?? {};
  const sessoes = Object.values(freq).reduce((n, v) => n + (Number(v) || 0), 0) || treinosAtivos.length;
  const grupos = new Map<string, number>();
  const tecnicas = new Set<string>();
  let total = 0;
  for (const t of treinosAtivos) {
    for (const e of t.exercicios) {
      total += e.series || 0;
      if (e.grupo_muscular) grupos.set(e.grupo_muscular, (grupos.get(e.grupo_muscular) ?? 0) + (e.series || 0));
      if (e.tecnica && e.tecnica !== "normal") tecnicas.add(e.tecnica);
    }
  }
  const principais = [...grupos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g]) => g);
  return {
    objetivo: snapshot.programa.objetivo ?? null,
    nivel: snapshot.programa.nivel ?? null,
    split: snapshot.programa.split ?? inferirSplit(treinosAtivos.length),
    dias: treinosAtivos.length,
    sessoes_semana: Math.round(sessoes * 100) / 100,
    duracao_min: snapshot.programa.duracao_min ?? null,
    equipamentos: snapshot.programa.equipamentos ?? [],
    prioridades: snapshot.programa.prioridades ?? [],
    tecnicas: [...tecnicas],
    restricoes: [],
    grupos_principais: principais,
    total_series: total,
    exercicios_por_dia: treinosAtivos.length ? Math.round(treinosAtivos.reduce((n, t) => n + t.exercicios.length, 0) / treinosAtivos.length) : 0,
  };
}

function inferirSplit(dias: number): string {
  if (dias <= 1) return "Treino único";
  if (dias === 2) return "AB";
  if (dias === 3) return "ABC";
  if (dias === 4) return "ABCD";
  if (dias === 5) return "ABCDE";
  return `${dias} dias`;
}

/** Hash determinístico da ESTRUTURA (nomes, séries, reps, ordem) — ignora dados do aluno. */
export function hashEstrutura(snapshot: SnapshotPrograma): string {
  const base = snapshot.treinos
    .filter((t) => t.ativo !== false)
    .map((t) => `${t.letra}:` + t.exercicios.map((e) => `${normalizarNome(e.nome)}|${e.series}|${normalizarNome(e.reps)}`).join(","))
    .join(";");
  const freq = JSON.stringify(snapshot.programa.frequencia ?? {});
  return fnv1a(`${base}#${freq}`);
}

function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0") + "-" + str.length.toString(36);
}

/** Nome/resumo legível e desidentificado: "Upper/Lower 4 dias • foco em glúteos • 60 min". */
export function resumoLegivel(m: MetadadosPrograma): string {
  const partes = [`${m.split ?? "Programa"} ${m.dias} dia${m.dias === 1 ? "" : "s"}`];
  if (m.prioridades?.length) partes.push(`foco em ${m.prioridades.slice(0, 2).join(" e ")}`);
  else if (m.grupos_principais?.length) partes.push(`ênfase em ${m.grupos_principais.slice(0, 2).join(" e ")}`);
  if (m.nivel) partes.push(m.nivel);
  if (m.objetivo) partes.push(m.objetivo);
  if (m.duracao_min) partes.push(`${m.duracao_min} min`);
  return partes.join(" • ");
}

/** Remove qualquer campo potencialmente identificável do snapshot antes de guardar no acervo. */
export function desidentificar(snapshot: SnapshotPrograma): SnapshotPrograma {
  return {
    programa: { ...snapshot.programa, nome: snapshot.programa.split ?? "Programa", observacoes: null },
    treinos: snapshot.treinos.map((t) => ({
      ...t,
      id: `${t.letra}`, // ids de origem não viajam para o acervo
      observacoes: null,
      exercicios: t.exercicios.map((e, i) => ({ ...e, id: `${t.letra}-${i}`, observacoes: null, carga_alvo: null })),
    })),
  };
}
