// ============================================================================
// Critérios com janela de semanas (Conquistas 3.0) — funções PURAS usadas
// tanto para conceder (regras.ts) quanto para mostrar o progresso (vitrine.ts):
// uma única fonte de verdade.
//
// Semana elegível = tem meta prescrita, não está em pausa combinada e já
// terminou (a semana atual só entra se a meta já foi cumprida). Pausas e
// semanas sem prescrição ficam de fora — “congelam” a janela, sem contar como
// cumpridas. Para não juntar semanas muito distantes, cada janela tem um
// limite explícito de extensão no calendário (LIMITES.*.folga).
// ============================================================================

import { classificarSessao, dataLocal, inicioDaSemana, somarDias, type Semana } from "@/lib/aderencia/calcular";
import type { SessaoConquista } from "./regras";

export const LIMITES = {
  /** Criando raízes: treino em 2 semanas diferentes nas 4 primeiras semanas (pausas estendem até 8). */
  raizes: { semanas: 4, alvo: 2, maxCalendario: 8 },
  /** Constância na vida real: 3 de 4 semanas elegíveis seguidas, em no máximo 4 + 4 semanas de calendário. */
  vidaReal: { janela: 4, alvo: 3, folga: 4 },
  /** Constância de verdade: 8 de 12 semanas elegíveis seguidas, em no máximo 12 + 6 semanas de calendário. */
  verdade: { janela: 12, alvo: 8, folga: 6 },
  /** A Jornada Começou (critério v3, 23/10/2026): 28 primeiros dias completos, com treinos em 3 semanas diferentes. */
  primeiroMes: { diasJanela: 28, diasMinimos: 28, treinos: 3, semanas: 3 },
  /** Recomeço consistente: depois de 14+ dias parado, treinar em 2 semanas diferentes em até 21 dias. */
  recomeco: { diasPausa: 14, diasDepois: 21, semanas: 2 },
} as const;

export type Avaliacao = {
  conquistada: boolean;
  /** Instante (ISO) do fato que completou o critério. */
  data: string | null;
  sessaoId: string | null;
  atual: number | null;
  alvo: number;
  /** false = a janela desta medalha já passou (ou ainda não se aplica). */
  disponivel: boolean;
  evidencia: Record<string, unknown>;
};

const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
const semanasEntre = (a: string, b: string) => Math.round(diasEntre(a, b) / 7);
const meioDia = (d: string) => `${d}T15:00:00Z`; // 12h em São Paulo

/** Sessões que valem para conquistas de participação (concluídas ou parciais; sem extras nem histórico não autorizado). */
export function sessoesValidas(sessoes: SessaoConquista[]): SessaoConquista[] {
  return sessoes
    .filter((s) => s.status !== "em_andamento" && s.conta_aderencia !== false && ["concluida", "parcial"].includes(classificarSessao(s)))
    .sort((a, b) => (a.iniciado_em < b.iniciado_em ? -1 : 1));
}

export function semanasElegiveis(semanas: Semana[]): Semana[] {
  return semanas.filter((w) => !!w.meta && !w.pausada && (w.status === "cumprida" || !w.atual));
}

const sessaoNaSemana = (validas: SessaoConquista[], inicio: string) => [...validas].reverse().find((s) => inicioDaSemana(dataLocal(s.iniciado_em)) === inicio) ?? null;

/** “X de N semanas elegíveis seguidas com a meta cumprida.” */
export function avaliarJanela(semanas: Semana[], validas: SessaoConquista[], cfg: { janela: number; alvo: number; folga: number }): Avaliacao {
  const eleg = semanasElegiveis(semanas);
  const janelaAte = (i: number) => {
    const fim = eleg[i].inicio;
    return eleg.slice(Math.max(0, i - cfg.janela + 1), i + 1).filter((w) => semanasEntre(w.inicio, fim) < cfg.janela + cfg.folga);
  };
  for (let i = 0; i < eleg.length; i++) {
    if (eleg[i].status !== "cumprida") continue;
    const j = janelaAte(i);
    const cumpridas = j.filter((w) => w.status === "cumprida");
    if (cumpridas.length >= cfg.alvo) {
      const s = sessaoNaSemana(validas, eleg[i].inicio);
      return { conquistada: true, data: s?.iniciado_em ?? meioDia(somarDias(eleg[i].inicio, 6)), sessaoId: s?.id ?? null, atual: cfg.alvo, alvo: cfg.alvo, disponivel: true, evidencia: { semanas: j.map((w) => ({ inicio: w.inicio, meta: w.meta, cumprida: w.status === "cumprida" })) } };
    }
  }
  const atual = eleg.length ? janelaAte(eleg.length - 1).filter((w) => w.status === "cumprida").length : 0;
  return { conquistada: false, data: null, sessaoId: null, atual: Math.min(atual, cfg.alvo), alvo: cfg.alvo, disponivel: true, evidencia: {} };
}

/** Criando raízes: treino válido em 2 semanas diferentes dentro das 4 primeiras semanas (sem pausa) de acompanhamento. */
export function avaliarRaizes(semanas: Semana[], validas: SessaoConquista[], hoje: string): Avaliacao {
  const L = LIMITES.raizes;
  const inicio = semanas[0]?.inicio ?? null;
  if (!inicio) return { conquistada: false, data: null, sessaoId: null, atual: 0, alvo: L.alvo, disponivel: true, evidencia: {} };
  const janela: string[] = [];
  for (let k = 0; k < L.maxCalendario && janela.length < L.semanas; k++) {
    const w = somarDias(inicio, 7 * k);
    const sem = semanas.find((x) => x.inicio === w);
    if (!sem?.pausada) janela.push(w);
  }
  const vistas: string[] = [];
  for (const s of validas) {
    const w = inicioDaSemana(dataLocal(s.iniciado_em));
    if (!janela.includes(w) || vistas.includes(w)) continue;
    vistas.push(w);
    if (vistas.length >= L.alvo) return { conquistada: true, data: s.iniciado_em, sessaoId: s.id, atual: L.alvo, alvo: L.alvo, disponivel: true, evidencia: { semanas: vistas } };
  }
  const aberta = janela.length < L.semanas ? semanasEntre(inicio, inicioDaSemana(hoje)) < L.maxCalendario : janela.at(-1)! >= inicioDaSemana(hoje);
  return { conquistada: false, data: null, sessaoId: null, atual: vistas.length, alvo: L.alvo, disponivel: aberta, evidencia: {} };
}

/** Primeiro mês de participação (critério v2). */
export function avaliarPrimeiroMes(validas: SessaoConquista[], hoje: string): Avaliacao {
  const L = LIMITES.primeiroMes;
  const concluidas = validas.filter((s) => classificarSessao(s) === "concluida");
  if (!concluidas.length) return { conquistada: false, data: null, sessaoId: null, atual: 0, alvo: L.treinos, disponivel: true, evidencia: {} };
  const d0 = dataLocal(concluidas[0].iniciado_em);
  const limite = somarDias(d0, L.diasJanela - 1);
  const naJanela = concluidas.filter((s) => dataLocal(s.iniciado_em) <= limite);
  const semanasVistas = new Set<string>();
  let completou: SessaoConquista | null = null;
  naJanela.forEach((s, i) => {
    semanasVistas.add(inicioDaSemana(dataLocal(s.iniciado_em)));
    if (!completou && i + 1 >= L.treinos && semanasVistas.size >= L.semanas) completou = s;
  });
  const minimo = somarDias(d0, L.diasMinimos);
  if (completou && hoje >= minimo) {
    const c = completou as SessaoConquista;
    const dataSessao = dataLocal(c.iniciado_em);
    const [data, sessaoId] = dataSessao >= minimo ? [c.iniciado_em, c.id] : [meioDia(minimo), null];
    return { conquistada: true, data, sessaoId, atual: L.treinos, alvo: L.treinos, disponivel: true, evidencia: { primeiroTreino: d0, treinos: naJanela.length, semanas: semanasVistas.size } };
  }
  return { conquistada: false, data: null, sessaoId: null, atual: Math.min(naJanela.length, L.treinos), alvo: L.treinos, disponivel: hoje <= limite || !!completou, evidencia: { primeiroTreino: d0, semanas: semanasVistas.size, diasPassados: diasEntre(d0, hoje) } };
}

/** Recomeço consistente: depois de 14+ dias sem treino, treinar em 2 semanas diferentes em até 21 dias da volta. */
export function avaliarRecomeco(validas: SessaoConquista[], hoje: string): Avaliacao {
  const L = LIMITES.recomeco;
  let emCurso: string | null = null;
  for (let i = 1; i < validas.length; i++) {
    const volta = dataLocal(validas[i].iniciado_em);
    if (diasEntre(dataLocal(validas[i - 1].iniciado_em), volta) < L.diasPausa) continue;
    const ate = somarDias(volta, L.diasDepois);
    const outra = validas.slice(i + 1).find((s) => {
      const d = dataLocal(s.iniciado_em);
      return d <= ate && inicioDaSemana(d) !== inicioDaSemana(volta);
    });
    if (outra) return { conquistada: true, data: outra.iniciado_em, sessaoId: outra.id, atual: L.semanas, alvo: L.semanas, disponivel: true, evidencia: { volta, diasParado: diasEntre(dataLocal(validas[i - 1].iniciado_em), volta), segundaSemana: dataLocal(outra.iniciado_em) } };
    if (hoje <= ate) emCurso = volta;
  }
  return { conquistada: false, data: null, sessaoId: null, atual: emCurso ? 1 : null, alvo: L.semanas, disponivel: !!emCurso, evidencia: emCurso ? { volta: emCurso, ate: somarDias(emCurso, L.diasDepois) } : {} };
}
