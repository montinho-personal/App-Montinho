// ============================================================================
// Conquistas (gamificação ética) — regras PURAS, explícitas e testadas.
//
// • Cada conquista tem código + referência: o par é único no banco, então
//   recalcular (reabrir a tela, repetir a requisição) nunca duplica.
// • Só premia comportamento real registrado: treinos concluídos, metas
//   cumpridas, retomadas, recordes COMPARÁVEIS. Nada por carga absoluta,
//   comparação com outros alunos, peso perdido ou excesso de treino.
// • Treino extra não conta para marcos (até existir aprovação do personal);
//   sessão com dor relatada não vira recorde.
// ============================================================================

import { normalizarNome } from "@/lib/grupos";
import { classificarSessao, dataLocal, somarDias, type ResultadoAderencia, type SessaoAderencia } from "@/lib/aderencia/calcular";

export type CodigoConquista =
  | "primeiro_treino"
  | "primeira_meta_semanal"
  | "primeiro_mes"
  | "treinos_10"
  | "treinos_25"
  | "treinos_50"
  | "semanas_consistentes_4"
  | "semanas_consistentes_8"
  | "acompanhamento_12_semanas"
  | "recorde"
  | "relatorio_mensal"
  | "eu_voltei";

export const CATALOGO: Record<CodigoConquista, { titulo: string; criterio: string; repete: boolean }> = {
  primeiro_treino: { titulo: "Primeiro treino concluído", criterio: "Concluir o primeiro treino (metade ou mais das séries).", repete: false },
  primeira_meta_semanal: { titulo: "Primeira meta semanal", criterio: "Cumprir pela primeira vez a meta de treinos da semana combinada com o personal.", repete: false },
  primeiro_mes: { titulo: "Primeiro mês de participação", criterio: "Treinar de novo 28 dias ou mais depois do primeiro treino, com pelo menos 4 treinos no total.", repete: false },
  treinos_10: { titulo: "10 treinos concluídos", criterio: "Somar 10 treinos concluídos (treinos extras não entram).", repete: false },
  treinos_25: { titulo: "25 treinos concluídos", criterio: "Somar 25 treinos concluídos (treinos extras não entram).", repete: false },
  treinos_50: { titulo: "50 treinos concluídos", criterio: "Somar 50 treinos concluídos (treinos extras não entram).", repete: false },
  semanas_consistentes_4: { titulo: "4 semanas consistentes", criterio: "Cumprir a meta semanal 4 semanas seguidas (pausas combinadas não quebram a sequência).", repete: false },
  semanas_consistentes_8: { titulo: "8 semanas consistentes", criterio: "Cumprir a meta semanal 8 semanas seguidas (pausas combinadas não quebram a sequência).", repete: false },
  acompanhamento_12_semanas: { titulo: "12 semanas de acompanhamento", criterio: "Completar 12 semanas com treino prescrito e ao menos um treino registrado.", repete: false },
  recorde: { titulo: "Novo recorde pessoal", criterio: "Superar sua melhor marca no mesmo exercício (mais carga, ou mais repetições com a mesma carga), com pelo menos 2 registros anteriores comparáveis.", repete: true },
  relatorio_mensal: { titulo: "Primeiro relatório consultado", criterio: "Abrir a evolução completa pela primeira vez.", repete: false },
  eu_voltei: { titulo: "Eu voltei", criterio: "Voltar a treinar depois de 14 dias ou mais sem treino.", repete: true },
};

export const REGRAS_CONQUISTAS = { diasRetomada: 14, registrosParaRecorde: 2, diasPrimeiroMes: 28, treinosPrimeiroMes: 4 };

export type SerieConquista = { tipo: string; carga_kg: number | null; reps: number | null };
export type SessaoConquista = SessaoAderencia & {
  feedback_percepcao?: string | null;
  checkin_pre?: string | null;
  exercicios?: Array<{ exercicio_id: string | null; nome: string; series: SerieConquista[] }>;
};

export type ItemRecorde = { exercicio: string; tipo: "carga" | "reps"; antes: number; agora: number; carga?: number };

export type ConquistaDetectada = {
  codigo: CodigoConquista;
  referencia: string;
  /** Instante do fato que gerou a conquista (ISO). */
  data: string;
  sessaoId: string | null;
  titulo: string;
  descricao: string;
  dados?: { recordes?: ItemRecorde[]; diasAfastado?: number; meta?: number };
};

export type EntradaConquistas = {
  sessoes: SessaoConquista[];
  aderencia: ResultadoAderencia;
  relatorioVistoEm?: string | null;
};

const dias = (a: string, b: string) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86_400_000);
const fmtKg = (n: number) => `${String(n).replace(".", ",")} kg`;

function nova(codigo: CodigoConquista, referencia: string, data: string, sessaoId: string | null, descricao: string, dados?: ConquistaDetectada["dados"]): ConquistaDetectada {
  return { codigo, referencia, data, sessaoId, titulo: CATALOGO[codigo].titulo, descricao, dados };
}

/** Recordes comparáveis de uma sessão contra todas as anteriores (mesmo exercício). */
export function recordesDaSessao(sessao: SessaoConquista, anteriores: SessaoConquista[]): ItemRecorde[] {
  if (sessao.feedback_percepcao === "dor" || sessao.checkin_pre === "desconforto") return [];
  const out: ItemRecorde[] = [];
  const chave = (e: { exercicio_id: string | null; nome: string }) => e.exercicio_id ?? `nome:${normalizarNome(e.nome)}`;
  const validas = (xs: SerieConquista[]) => xs.filter((x) => x.tipo === "valida" && (x.carga_kg ?? 0) > 0 && (x.reps ?? 0) > 0);
  for (const ex of sessao.exercicios ?? []) {
    const hoje = validas(ex.series);
    if (!hoje.length) continue;
    const k = chave(ex);
    const nomeK = normalizarNome(ex.nome);
    const historico = anteriores
      .map((s) => (s.exercicios ?? []).find((e) => chave(e) === k || normalizarNome(e.nome) === nomeK))
      .filter((e): e is NonNullable<typeof e> => !!e)
      .map((e) => validas(e.series))
      .filter((xs) => xs.length);
    if (historico.length < REGRAS_CONQUISTAS.registrosParaRecorde) continue;
    const antes = historico.flat();
    const maxAntes = Math.max(...antes.map((x) => x.carga_kg!));
    const maxHoje = Math.max(...hoje.map((x) => x.carga_kg!));
    if (maxHoje > maxAntes) {
      out.push({ exercicio: ex.nome, tipo: "carga", antes: maxAntes, agora: maxHoje });
      continue;
    }
    // Mais repetições com exatamente a mesma carga já usada antes.
    let melhor: ItemRecorde | null = null;
    for (const s of hoje) {
      const mesmas = antes.filter((x) => x.carga_kg === s.carga_kg);
      if (!mesmas.length) continue;
      const repsAntes = Math.max(...mesmas.map((x) => x.reps!));
      if (s.reps! > repsAntes && (!melhor || s.reps! - repsAntes > melhor.agora - melhor.antes)) melhor = { exercicio: ex.nome, tipo: "reps", antes: repsAntes, agora: s.reps!, carga: s.carga_kg! };
    }
    if (melhor) out.push(melhor);
  }
  return out.slice(0, 3);
}

export function textoRecorde(r: ItemRecorde): string {
  return r.tipo === "carga" ? `${r.exercicio}: ${fmtKg(r.agora)} (antes ${fmtKg(r.antes)})` : `${r.exercicio}: ${r.agora} repetições com ${fmtKg(r.carga ?? 0)} (antes ${r.antes})`;
}

/** Todas as conquistas que os dados sustentam (a persistência deduplica). */
export function detectarConquistas(e: EntradaConquistas): ConquistaDetectada[] {
  const out: ConquistaDetectada[] = [];
  const ordenadas = [...e.sessoes].filter((s) => s.status !== "em_andamento").sort((a, b) => (a.iniciado_em < b.iniciado_em ? -1 : 1));
  const concluidas = ordenadas.filter((s) => classificarSessao(s) === "concluida");
  const validas = ordenadas.filter((s) => ["concluida", "parcial"].includes(classificarSessao(s)));

  if (concluidas[0]) out.push(nova("primeiro_treino", "1", concluidas[0].iniciado_em, concluidas[0].id, "Você concluiu seu primeiro treino no app."));
  for (const n of [10, 25, 50] as const) {
    const s = concluidas[n - 1];
    if (s) out.push(nova(`treinos_${n}`, "1", s.iniciado_em, s.id, `Você chegou a ${n} treinos concluídos.`));
  }

  // Primeiro mês: um treino 28+ dias depois do primeiro, com 4+ treinos no total.
  if (validas.length) {
    const d0 = dataLocal(validas[0].iniciado_em);
    const idx = validas.findIndex((s, i) => i + 1 >= REGRAS_CONQUISTAS.treinosPrimeiroMes && dias(d0, dataLocal(s.iniciado_em)) >= REGRAS_CONQUISTAS.diasPrimeiroMes);
    if (idx >= 0) out.push(nova("primeiro_mes", "1", validas[idx].iniciado_em, validas[idx].id, "Um mês treinando com acompanhamento."));
  }

  // Semanas: meta cumprida, sequência (pausa/sem prescrição não quebram) e acompanhamento.
  const sessaoDaSemana = (inicio: string) => [...validas].reverse().find((s) => { const d = dataLocal(s.iniciado_em); return d >= inicio && d <= somarDias(inicio, 6); });
  let seq = 0;
  let participando = 0;
  let primeiraMeta = false;
  const marcos = new Set<number>();
  for (const w of e.aderencia.semanas) {
    if (w.status === "cumprida") {
      seq++;
      const s = sessaoDaSemana(w.inicio);
      if (!primeiraMeta && s) {
        primeiraMeta = true;
        out.push(nova("primeira_meta_semanal", "1", s.iniciado_em, s.id, `Meta de ${w.meta} treino(s) cumprida na semana de ${w.inicio.slice(8, 10)}/${w.inicio.slice(5, 7)}.`, { meta: w.meta ?? undefined }));
      }
      for (const n of [4, 8] as const) {
        if (seq === n && !marcos.has(n) && s) {
          marcos.add(n);
          out.push(nova(`semanas_consistentes_${n}`, "1", s.iniciado_em, s.id, `${n} semanas seguidas cumprindo a meta.`));
        }
      }
    } else if (w.status !== "pausada" && w.status !== "sem_prescricao" && !w.atual) {
      seq = 0;
    }
    if (w.meta && !w.pausada && (w.concluidas + w.parciais) > 0) {
      participando++;
      const s = sessaoDaSemana(w.inicio);
      if (participando === 12 && s) out.push(nova("acompanhamento_12_semanas", "1", s.iniciado_em, s.id, "12 semanas treinando com acompanhamento."));
    }
  }

  // Retomadas: treino depois de 14+ dias sem treinar.
  for (let i = 1; i < validas.length; i++) {
    const a = dataLocal(validas[i - 1].iniciado_em);
    const b = dataLocal(validas[i].iniciado_em);
    const gap = dias(a, b);
    if (gap >= REGRAS_CONQUISTAS.diasRetomada) out.push(nova("eu_voltei", b, validas[i].iniciado_em, validas[i].id, "Você voltou a treinar.", { diasAfastado: gap }));
  }

  // Recordes (uma conquista por sessão, até 3 marcas).
  for (let i = 0; i < validas.length; i++) {
    const r = recordesDaSessao(validas[i], validas.slice(0, i));
    if (r.length) out.push(nova("recorde", validas[i].id, validas[i].iniciado_em, validas[i].id, r.map(textoRecorde).join(" · "), { recordes: r }));
  }

  if (e.relatorioVistoEm) out.push(nova("relatorio_mensal", "1", e.relatorioVistoEm, null, "Você abriu sua evolução completa."));
  return out;
}

// ---------------------------------------------------------------------------
// Mensagem contextual da conclusão (sempre identificada como automática)
// ---------------------------------------------------------------------------
export type ModeloCard = "A" | "B" | "C" | "D";

export type ContextoConclusao = {
  sessao: SessaoConquista;
  /** Conquistas ligadas a esta sessão. */
  conquistas: Array<{ codigo: CodigoConquista | string }>;
  meta: number | null;
  /** Treinos válidos da semana (concluídas + 0,5 × parciais, sem extras), já com esta sessão. */
  pontosSemana: number;
};

export type ResultadoMensagem = { mensagem: string; modeloSugerido: ModeloCard; metaCumpridaAgora: boolean };

export function mensagemConclusao(c: ContextoConclusao): ResultadoMensagem {
  const classe = classificarSessao(c.sessao);
  const tem = (k: CodigoConquista) => c.conquistas.some((x) => x.codigo === k);
  const valor = classe === "concluida" ? 1 : classe === "parcial" ? 0.5 : 0;
  const metaCumpridaAgora = !!c.meta && valor > 0 && c.pontosSemana >= c.meta && c.pontosSemana - valor < c.meta;

  if (c.sessao.feedback_percepcao === "dor" || c.sessao.checkin_pre === "desconforto")
    return { mensagem: "Treino registrado. Como você relatou desconforto, o personal vai ver isso antes do próximo treino.", modeloSugerido: "A", metaCumpridaAgora };
  if (classe === "extra") return { mensagem: "Hoje teve um chalalá extra!", modeloSugerido: "A", metaCumpridaAgora: false };
  if (tem("eu_voltei")) return { mensagem: "Você voltou. E isso já é uma conquista.", modeloSugerido: "D", metaCumpridaAgora };
  if (tem("primeiro_treino")) return { mensagem: "Todo resultado começa com um primeiro passo.", modeloSugerido: "A", metaCumpridaAgora };
  if (metaCumpridaAgora) return { mensagem: "Você cumpriu sua meta da semana. Constância em construção!", modeloSugerido: "B", metaCumpridaAgora };
  if (tem("recorde")) return { mensagem: "Mais uma evolução registrada. Seu esforço está aparecendo nos números.", modeloSugerido: "C", metaCumpridaAgora };
  if (classe === "parcial" || c.sessao.modo === "reduzido") return { mensagem: "Hoje você adaptou a rotina e conseguiu treinar.", modeloSugerido: "A", metaCumpridaAgora };
  return { mensagem: "Mais um passo na sua evolução.", modeloSugerido: "A", metaCumpridaAgora };
}
