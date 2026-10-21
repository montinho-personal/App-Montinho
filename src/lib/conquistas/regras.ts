// ============================================================================
// Conquistas (gamificação ética) — regras PURAS, explícitas e testadas.
//
// • Cada conquista tem código + referência: o par é único no banco, então
//   recalcular (reabrir a tela, repetir a requisição) nunca duplica.
// • Só premia comportamento real registrado: treinos concluídos, metas
//   cumpridas, retomadas, recordes COMPARÁVEIS. Nada por carga absoluta,
//   comparação com outros alunos, peso perdido ou excesso de treino.
// • Treino extra não conta para os marcos da ficha; tem medalhas próprias
//   (“Além do necessário”), sempre dentro das regras que o personal liberou;
//   sessão com dor relatada não vira recorde.
// ============================================================================

import type { BaseCarga } from "@/lib/historico/resumo";
import { normalizarNome } from "@/lib/grupos";
import { classificarSessao, dataLocal, somarDias, type ResultadoAderencia, type SessaoAderencia } from "@/lib/aderencia/calcular";
import { avaliarJanela, avaliarPrimeiroMes, avaliarRaizes, avaliarRecomeco, LIMITES, type Avaliacao } from "./criterios";

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
  | "eu_voltei"
  | "criando_raizes"
  | "constancia_vida_real"
  | "constancia_verdade"
  | "recomeco_consistente"
  // Além do necessário (treino curto, treino extra, série extra)
  | "fiz_o_necessario"
  | "nunca_deixei_pra_depois"
  | "fui_alem"
  | "milha_extra"
  | "sempre_um_a_mais"
  | "uma_a_mais";

/** Medalhas “Além do necessário” (0037): gravadas à parte para nunca travar as antigas se o banco ainda não as aceitar. */
export const CODIGOS_ALEM: CodigoConquista[] = ["fiz_o_necessario", "nunca_deixei_pra_depois", "fui_alem", "milha_extra", "sempre_um_a_mais", "uma_a_mais"];
export const LIMITES_ALEM = { curtos: 5, extras: 5, extrasMuitos: 15, seriesExtras: 10 } as const;

// Títulos e critérios curtos (gravados na conquista). Os textos educativos
// completos ficam na biblioteca editorial (conteudo.ts).
export const CATALOGO: Record<CodigoConquista, { titulo: string; criterio: string; repete: boolean }> = {
  primeiro_treino: { titulo: "Primeiro passo", criterio: "Concluir o primeiro treino válido, com pelo menos metade das séries prescritas.", repete: false },
  primeira_meta_semanal: { titulo: "Primeira meta", criterio: "Cumprir pela primeira vez a meta semanal definida pelo personal.", repete: false },
  relatorio_mensal: { titulo: "Conhecendo minha evolução", criterio: "Abrir pela primeira vez a evolução completa.", repete: false },
  treinos_10: { titulo: "10 treinos", criterio: "Somar 10 treinos concluídos (treinos extras e parciais não entram).", repete: false },
  semanas_consistentes_4: { titulo: "Quatro semanas consistentes", criterio: "Cumprir a meta em 4 semanas elegíveis seguidas (pausas combinadas não quebram nem somam).", repete: false },
  primeiro_mes: { titulo: "Primeiro mês de participação", criterio: "Concluir 4 treinos em 3 semanas diferentes nos primeiros 35 dias, com pelo menos 28 dias desde o primeiro treino.", repete: false },
  treinos_25: { titulo: "25 treinos", criterio: "Somar 25 treinos concluídos (treinos extras e parciais não entram).", repete: false },
  semanas_consistentes_8: { titulo: "Oito semanas consistentes", criterio: "Cumprir a meta em 8 semanas elegíveis seguidas (pausas combinadas não quebram nem somam).", repete: false },
  acompanhamento_12_semanas: { titulo: "Doze semanas de acompanhamento", criterio: "Completar 12 semanas com treino prescrito e pelo menos um treino registrado em cada uma (não precisam ser seguidas).", repete: false },
  treinos_50: { titulo: "50 treinos", criterio: "Somar 50 treinos concluídos (treinos extras e parciais não entram).", repete: false },
  criando_raizes: { titulo: "Criando raízes", criterio: `Treinar em ${LIMITES.raizes.alvo} semanas diferentes dentro das ${LIMITES.raizes.semanas} primeiras semanas de acompanhamento (pausas combinadas estendem o prazo, até ${LIMITES.raizes.maxCalendario} semanas).`, repete: false },
  constancia_vida_real: { titulo: "Constância na vida real", criterio: `Cumprir a meta em ${LIMITES.vidaReal.alvo} de ${LIMITES.vidaReal.janela} semanas elegíveis seguidas.`, repete: false },
  constancia_verdade: { titulo: "Constância de verdade", criterio: `Cumprir a meta em ${LIMITES.verdade.alvo} de ${LIMITES.verdade.janela} semanas elegíveis seguidas.`, repete: false },
  recomeco_consistente: { titulo: "Recomeço consistente", criterio: `Depois de ${LIMITES.recomeco.diasPausa}+ dias sem treinar, treinar em ${LIMITES.recomeco.semanas} semanas diferentes em até ${LIMITES.recomeco.diasDepois} dias da volta.`, repete: false },
  fiz_o_necessario: { titulo: "Fiz o necessário", criterio: "Concluir um treino na versão curta (“meu treino possível hoje”), com pelo menos metade das séries planejadas para o dia.", repete: false },
  nunca_deixei_pra_depois: { titulo: "Nunca deixei pra depois", criterio: `Concluir ${LIMITES_ALEM.curtos} treinos na versão curta, com pelo menos metade das séries planejadas para o dia.`, repete: false },
  fui_alem: { titulo: "Fui além", criterio: "Concluir o primeiro treino extra liberado pelo personal.", repete: false },
  milha_extra: { titulo: "Milha extra", criterio: `Concluir ${LIMITES_ALEM.extras} treinos extras liberados pelo personal.`, repete: false },
  sempre_um_a_mais: { titulo: "Sempre um a mais", criterio: `Concluir ${LIMITES_ALEM.extrasMuitos} treinos extras liberados pelo personal.`, repete: false },
  uma_a_mais: { titulo: "Uma a mais", criterio: `Somar ${LIMITES_ALEM.seriesExtras} séries além das prescritas (“+ Série extra”) em treinos concluídos.`, repete: false },
  recorde: { titulo: "Novo recorde pessoal", criterio: "Superar sua melhor marca no mesmo exercício (mais carga, ou mais repetições com a mesma carga), com pelo menos 2 registros anteriores comparáveis.", repete: true },
  eu_voltei: { titulo: "Eu voltei", criterio: "Fazer um treino válido depois de 14 dias ou mais sem treinos registrados.", repete: true },
};

/** Versão do critério de cada conquista (gravada junto; mudar critério nunca apaga conquista antiga). */
export const VERSAO_CRITERIO: Record<CodigoConquista, number> = Object.fromEntries(Object.keys(CATALOGO).map((k) => [k, k === "primeiro_mes" ? 2 : 1])) as Record<CodigoConquista, number>;

export const REGRAS_CONQUISTAS = { diasRetomada: 14, registrosParaRecorde: 2, diasPrimeiroMes: 28, treinosPrimeiroMes: 4 };

export type SerieConquista = { tipo: string; carga_kg: number | null; reps: number | null };
export type SessaoConquista = SessaoAderencia & {
  feedback_percepcao?: string | null;
  checkin_pre?: string | null;
  /** false = histórico importado: serve de base para recordes, mas não gera conquistas. */
  conta_aderencia?: boolean;
  exercicios?: Array<{ exercicio_id: string | null; nome: string; series: SerieConquista[] }>;
  /** "app" ou "importado" (histórico de outro app). */
  origem?: string | null;
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
  versao: number;
  /** O que sustentou a conquista (semanas, datas) — para auditoria. */
  evidencia: Record<string, unknown>;
  origem: "app" | "importado";
};

export type EntradaConquistas = {
  sessoes: SessaoConquista[];
  aderencia: ResultadoAderencia;
  relatorioVistoEm?: string | null;
  /** Resumo do histórico de outro app: só carga máxima por dia (base para recorde de carga). */
  baseCarga?: BaseCarga[];
  /** AAAA-MM-DD (padrão: hoje em São Paulo). */
  hoje?: string;
};

const dias = (a: string, b: string) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86_400_000);
const fmtKg = (n: number) => `${String(n).replace(".", ",")} kg`;

let origens = new Map<string, string | null | undefined>();
function nova(codigo: CodigoConquista, referencia: string, data: string, sessaoId: string | null, descricao: string, dados?: ConquistaDetectada["dados"], evidencia: Record<string, unknown> = {}): ConquistaDetectada {
  const origem = sessaoId && origens.get(sessaoId) === "importado" ? "importado" : "app";
  return { codigo, referencia, data, sessaoId, titulo: CATALOGO[codigo].titulo, descricao, dados, versao: VERSAO_CRITERIO[codigo], evidencia, origem };
}
const deAvaliacao = (codigo: CodigoConquista, a: Avaliacao, descricao: string) => (a.conquistada && a.data ? [nova(codigo, "1", a.data, a.sessaoId, descricao, undefined, a.evidencia)] : []);

/** Recordes comparáveis de uma sessão contra todas as anteriores (mesmo exercício). */
export function recordesDaSessao(sessao: SessaoConquista, anteriores: SessaoConquista[], baseCarga: BaseCarga[] = []): ItemRecorde[] {
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
    // Dias do resumo importado contam como registros, mas só informam a carga máxima.
    const diaSessao = dataLocal(sessao.iniciado_em);
    const resumo = baseCarga.filter((b) => b.data < diaSessao && normalizarNome(b.nome) === nomeK);
    if (historico.length + resumo.length < REGRAS_CONQUISTAS.registrosParaRecorde) continue;
    const antes = historico.flat();
    const maxAntes = Math.max(...antes.map((x) => x.carga_kg!), ...resumo.map((b) => b.carga_max));
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
  const hoje = e.hoje ?? dataLocal(new Date());
  origens = new Map(e.sessoes.map((x) => [x.id, x.origem]));
  const todas = [...e.sessoes].filter((s) => s.status !== "em_andamento").sort((a, b) => (a.iniciado_em < b.iniciado_em ? -1 : 1));
  // Base de comparação para recordes: inclui o histórico importado.
  const baseRecordes = todas.filter((s) => ["concluida", "parcial"].includes(classificarSessao(s)));
  const ordenadas = todas.filter((s) => s.conta_aderencia !== false);
  const concluidas = ordenadas.filter((s) => classificarSessao(s) === "concluida");
  const validas = ordenadas.filter((s) => ["concluida", "parcial"].includes(classificarSessao(s)));

  if (concluidas[0]) out.push(nova("primeiro_treino", "1", concluidas[0].iniciado_em, concluidas[0].id, "Você concluiu seu primeiro treino no app."));
  for (const n of [10, 25, 50] as const) {
    const s = concluidas[n - 1];
    if (s) out.push(nova(`treinos_${n}`, "1", s.iniciado_em, s.id, `Você chegou a ${n} treinos concluídos.`));
  }

  // Primeiro mês (critério v2): 4 treinos em 3 semanas nos 35 primeiros dias, 28+ dias passados.
  out.push(...deAvaliacao("primeiro_mes", avaliarPrimeiroMes(validas, hoje), "Um mês treinando com acompanhamento, em semanas diferentes."));
  // Janelas de semanas (Conquistas 3.0).
  out.push(...deAvaliacao("criando_raizes", avaliarRaizes(e.aderencia.semanas, validas, hoje), "Você treinou em duas semanas diferentes logo no começo."));
  out.push(...deAvaliacao("constancia_vida_real", avaliarJanela(e.aderencia.semanas, validas, LIMITES.vidaReal), "Meta cumprida em 3 de 4 semanas seguidas."));
  out.push(...deAvaliacao("constancia_verdade", avaliarJanela(e.aderencia.semanas, validas, LIMITES.verdade), "Meta cumprida em 8 de 12 semanas seguidas."));
  out.push(...deAvaliacao("recomeco_consistente", avaliarRecomeco(validas, hoje), "Depois de uma pausa, você voltou e treinou de novo em outra semana."));

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
  for (let i = 0; i < baseRecordes.length; i++) {
    const s = baseRecordes[i];
    if (s.conta_aderencia === false) continue; // histórico importado não vira conquista
    const r = recordesDaSessao(s, baseRecordes.slice(0, i), e.baseCarga);
    if (r.length) out.push(nova("recorde", s.id, s.iniciado_em, s.id, r.map(textoRecorde).join(" · "), { recordes: r }));
  }

  if (e.relatorioVistoEm) out.push(nova("relatorio_mensal", "1", e.relatorioVistoEm, null, "Você abriu sua evolução completa."));

  // Além do necessário: treino curto concluído, treinos extras e séries extras.
  const curtos = concluidas.filter((s) => s.modo === "reduzido");
  if (curtos[0]) out.push(nova("fiz_o_necessario", "1", curtos[0].iniciado_em, curtos[0].id, "Dia corrido, treino feito na versão curta."));
  const c5 = curtos[LIMITES_ALEM.curtos - 1];
  if (c5) out.push(nova("nunca_deixei_pra_depois", "1", c5.iniciado_em, c5.id, `${LIMITES_ALEM.curtos} treinos na versão curta: nos dias corridos, você não deixou pra depois.`));
  const extras = ordenadas.filter((s) => classificarSessao(s) === "extra");
  const marcosExtra: Array<[CodigoConquista, number, string]> = [["fui_alem", 1, "Seu primeiro treino extra, dentro do combinado com o personal."], ["milha_extra", LIMITES_ALEM.extras, `${LIMITES_ALEM.extras} treinos extras concluídos.`], ["sempre_um_a_mais", LIMITES_ALEM.extrasMuitos, `${LIMITES_ALEM.extrasMuitos} treinos extras concluídos.`]];
  for (const [codigo, n, txt] of marcosExtra) {
    const s = extras[n - 1];
    if (s) out.push(nova(codigo, "1", s.iniciado_em, s.id, txt));
  }
  let somaExtras = 0;
  for (const s of concluidas) {
    if (s.modo === "extra") continue;
    somaExtras += Math.max(0, (s.series_concluidas || 0) - (s.series_planejadas || 0));
    if (somaExtras >= LIMITES_ALEM.seriesExtras) {
      out.push(nova("uma_a_mais", "1", s.iniciado_em, s.id, `${LIMITES_ALEM.seriesExtras} séries além das prescritas, somando os treinos.`));
      break;
    }
  }
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
