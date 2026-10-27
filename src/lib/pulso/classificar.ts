// ============================================================================
// Montinho Pulso — categorias de acompanhamento para o PERSONAL (regras puras).
//   Tudo bem · Acompanhar · Precisa de atenção
// Não é diagnóstico clínico nem previsão de abandono: cada categoria vem com os
// motivos (regra + datas). Não responder NÃO significa desmotivação e nunca
// gera alerta sozinho. Os rascunhos de mensagem nunca citam saúde.
// ============================================================================

import { diasEntre, diaSP, opcao, type Dimensao } from "./perguntas";
import type { RespostaPulso } from "./equivalencias";

export type CategoriaPulso = "tudo_bem" | "acompanhar" | "atencao";

export const CATEGORIA_ROTULO: Record<CategoriaPulso, { rotulo: string; emoji: string; explica: string }> = {
  tudo_bem: { rotulo: "Tudo bem", emoji: "🟢", explica: "Sem sinais recentes relevantes de dificuldade." },
  acompanhar: { rotulo: "Acompanhar", emoji: "🟡", explica: "Alguma mudança ou dificuldade merece observação." },
  atencao: { rotulo: "Precisa de atenção", emoji: "🔴", explica: "Sinais persistentes ou relatos que justificam contato individual." },
};

export type MotivoPulso = { texto: string; categoria: CategoriaPulso; dimensao: Dimensao | null; datas: string[] };

export type AcaoPulso = "revisao_humana" | "mensagem" | "revisar_treino" | "reconhecer";

/** `modelo` = modelo de mensagem do personal que substitui o rascunho (src/lib/acompanhamento/modelos.ts). */
export type SugestaoPulso = { acao: AcaoPulso; titulo: string; rascunho: string; modelo?: "cuidado" | "pouco_tempo" | "apoio" | "progresso" };

export type ResultadoPulso = {
  categoria: CategoriaPulso;
  motivos: MotivoPulso[];
  /** Relato de desconforto: ninguém muda o treino sem o personal olhar. */
  revisaoHumana: boolean;
  /** Sem respostas recentes (informação neutra; não é alerta). */
  semRespostas: boolean;
  ultimaResposta: string | null;
  sugestao: SugestaoPulso | null;
  /** O que o aluno contou que está dificultando (resposta ainda valendo no painel). */
  dificuldadesAtuais: string[];
};

/** Limites ajustáveis pelo personal. */
export type RegrasPulso = {
  /** Janela (dias) para relatos de desconforto. */
  diasDesconforto: number;
  /** Respostas negativas na janela curta para “Acompanhar”. */
  vezesNegativas: number;
  janelaCurta: number;
  /** Janela da vontade de treinar (vale 3 dias, então olhamos mais longe). */
  janelaMotivacao: number;
  /** Dificuldade relatada vale por estes dias no painel. */
  diasDificuldade: number;
  /** Sem respostas há estes dias = “sem respostas recentes”. */
  diasSemResposta: number;
  /** Melhora mínima (na escala −2…+2) entre as 2 últimas semanas e as 2 anteriores. */
  melhoraMinima: number;
};

export const REGRAS_PULSO: RegrasPulso = { diasDesconforto: 7, vezesNegativas: 2, janelaCurta: 7, janelaMotivacao: 14, diasDificuldade: 14, diasSemResposta: 21, melhoraMinima: 0.75 };

export type ContextoPulso = {
  /** Queda de frequência apontada pela Central de aderência. */
  quedaFrequencia?: boolean;
  /** Frequência mantida (meta cumprida nas últimas semanas), para reconhecer melhora. */
  frequenciaMantida?: boolean;
};

const nivel = (x: RespostaPulso) => opcao(x.dimensao, x.valor)?.nivel ?? null;
const dataBR = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
const ORDEM: Record<CategoriaPulso, number> = { tudo_bem: 0, acompanhar: 1, atencao: 2 };
const pior = (a: CategoriaPulso, b: CategoriaPulso) => (ORDEM[b] > ORDEM[a] ? b : a);

/** Uma resposta por dimensão e dia (a mais recente), já com o dia de Brasília. */
function porDia(respostas: RespostaPulso[]) {
  const m = new Map<string, RespostaPulso & { dia: string }>();
  for (const x of [...respostas].sort((a, b) => (a.em < b.em ? -1 : 1))) {
    const dia = diaSP(x.em);
    const k = x.dimensao === "dificuldade" ? `${x.dimensao}:${dia}:${x.valor}` : `${x.dimensao}:${dia}`;
    m.set(k, { ...x, dia });
  }
  return [...m.values()];
}

const JUNTAR = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} e ${xs.at(-1)}`);

export function classificarPulso(nome: string, respostas: RespostaPulso[], hoje: string, ctx: ContextoPulso = {}, regras: RegrasPulso = REGRAS_PULSO): ResultadoPulso {
  const primeiro = nome.trim().split(/\s+/)[0] || "aluno";
  const dias = porDia(respostas).filter((x) => { const n = diasEntre(x.dia, hoje); return n >= 0 && n <= 60; });
  const proprias = dias.filter((x) => x.origem !== "onboarding");
  const ultima = proprias.reduce<string | null>((m, x) => (m === null || x.em > m ? x.em : m), null);
  const dentro = (x: { dia: string }, janela: number) => diasEntre(x.dia, hoje) < janela;
  const motivos: MotivoPulso[] = [];

  const desconforto = proprias.filter((x) => x.dimensao === "recuperacao" && x.valor === "desconforto" && dentro(x, regras.diasDesconforto));
  if (desconforto.length)
    motivos.push({ texto: `Relatou desconforto em ${JUNTAR(desconforto.map((x) => dataBR(x.dia)))}. Revisão humana antes de qualquer ajuste no treino.`, categoria: "atencao", dimensao: "recuperacao", datas: desconforto.map((x) => x.dia) });

  const negativas = (d: Dimensao, janela: number, filtro: (x: RespostaPulso) => boolean = (x) => (nivel(x) ?? 0) < 0) => proprias.filter((x) => x.dimensao === d && dentro(x, janela) && filtro(x));
  const sinais: Array<{ d: Dimensao; lista: Array<{ dia: string }>; texto: (n: number) => string }> = [
    { d: "energia", lista: negativas("energia", regras.janelaCurta), texto: (n) => `Energia baixa em ${n} check-ins nos últimos ${regras.janelaCurta} dias.` },
    { d: "motivacao", lista: negativas("motivacao", regras.janelaMotivacao), texto: (n) => `Pouca vontade de treinar em ${n} check-ins recentes.` },
    { d: "recuperacao", lista: negativas("recuperacao", regras.janelaCurta, (x) => x.valor === "muito_cansado"), texto: (n) => `Muito cansaço relatado em ${n} check-ins nos últimos ${regras.janelaCurta} dias.` },
    { d: "sono", lista: negativas("sono", regras.janelaCurta), texto: (n) => `Sono ruim em ${n} check-ins nos últimos ${regras.janelaCurta} dias.` },
  ];
  for (const s of sinais) if (s.lista.length >= regras.vezesNegativas) motivos.push({ texto: s.texto(s.lista.length), categoria: "acompanhar", dimensao: s.d, datas: s.lista.map((x) => x.dia) });

  // Dificuldade relatada pelo próprio aluno no Pulso (o onboarding é só contexto).
  const difs = proprias.filter((x) => x.dimensao === "dificuldade" && x.valor !== "nada" && dentro(x, regras.diasDificuldade));
  const ultDif = proprias.filter((x) => x.dimensao === "dificuldade").sort((a, b) => (a.em < b.em ? 1 : -1))[0];
  const difAtual = ultDif && ultDif.valor !== "nada" ? difs : [];
  if (difAtual.length) {
    const nomes = [...new Set(difAtual.map((x) => opcao("dificuldade", x.valor)?.rotulo.toLowerCase() ?? x.valor))];
    motivos.push({ texto: `Contou o que está dificultando: ${JUNTAR(nomes)}.`, categoria: "acompanhar", dimensao: "dificuldade", datas: [...new Set(difAtual.map((x) => x.dia))] });
  }

  // Persistência: sinal negativo nas DUAS últimas semanas → precisa de atenção.
  const negs = proprias.filter((x) => (x.dimensao === "energia" || x.dimensao === "motivacao") ? (nivel(x) ?? 0) < 0 : x.dimensao === "recuperacao" && x.valor === "muito_cansado");
  const semana1 = negs.some((x) => diasEntre(x.dia, hoje) >= 0 && diasEntre(x.dia, hoje) < 7);
  const semana2 = negs.some((x) => diasEntre(x.dia, hoje) >= 7 && diasEntre(x.dia, hoje) < 14);
  if (semana1 && semana2 && motivos.some((m) => m.categoria === "acompanhar" && m.dimensao !== "dificuldade"))
    motivos.push({ texto: "Os sinais se repetem há pelo menos 2 semanas.", categoria: "atencao", dimensao: null, datas: [] });

  if (ctx.quedaFrequencia && motivos.some((m) => m.categoria === "acompanhar"))
    motivos.push({ texto: "Aconteceu no mesmo período de uma queda na frequência de treinos (não quer dizer que um causou o outro).", categoria: "atencao", dimensao: null, datas: [] });

  const categoria = motivos.reduce<CategoriaPulso>((c, m) => pior(c, m.categoria), "tudo_bem");
  const semRespostas = ultima === null || diasEntre(diaSP(ultima), hoje) >= regras.diasSemResposta;

  // Melhora: média de energia + vontade das 2 últimas semanas acima das 2 anteriores.
  const media = (de: number, ate: number) => {
    const v = proprias.filter((x) => (x.dimensao === "energia" || x.dimensao === "motivacao") && diasEntre(x.dia, hoje) >= de && diasEntre(x.dia, hoje) < ate).map((x) => nivel(x) ?? 0);
    return v.length >= 2 ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const recente = media(0, 14), antes = media(14, 28);
  const melhorou = categoria === "tudo_bem" && !!ctx.frequenciaMantida && recente !== null && antes !== null && recente - antes >= regras.melhoraMinima;

  let sugestao: SugestaoPulso | null = null;
  const tem = (d: Dimensao | null) => motivos.some((m) => m.dimensao === d);
  if (desconforto.length)
    sugestao = { acao: "revisao_humana", modelo: "cuidado", titulo: `${primeiro} relatou desconforto recentemente. Vale conversar antes de qualquer ajuste no treino.`, rascunho: `Oi, ${primeiro}! Passando para saber como você está. Me conta como foram os últimos treinos?` };
  else if (difAtual.some((x) => x.valor === "falta_tempo" || x.valor === "rotina_corrida"))
    sugestao = { acao: "revisar_treino", modelo: "pouco_tempo", titulo: `${primeiro} informou que está com dificuldade para encaixar os treinos na rotina. Talvez seja o momento de revisar a programação.`, rascunho: `Oi, ${primeiro}! Vi que a rotina está corrida. Quer que eu ajuste o treino para caber melhor no seu tempo?` };
  else if (difAtual.some((x) => x.valor === "exercicios"))
    sugestao = { acao: "revisar_treino", titulo: `${primeiro} contou que está com dificuldade em alguns exercícios. Vale revisar a execução ou trocar algum deles.`, rascunho: `Oi, ${primeiro}! Me conta quais exercícios estão mais difíceis? Posso te mandar uma dica ou trocar por outro.` };
  else if (tem("motivacao") || difAtual.some((x) => x.valor === "desmotivacao"))
    sugestao = { acao: "mensagem", modelo: "apoio", titulo: `${primeiro} relatou pouca vontade de treinar em check-ins recentes. Deseja conversar?`, rascunho: `Oi, ${primeiro}! Como você está? Estou aqui se quiser conversar sobre os treinos. 💛` };
  else if (tem("energia") || tem("recuperacao") || tem("sono") || difAtual.some((x) => x.valor === "cansaco"))
    sugestao = { acao: "mensagem", modelo: "apoio", titulo: `${primeiro} relatou cansaço ou energia baixa nos últimos dias. Deseja conversar?`, rascunho: `Oi, ${primeiro}! Como está a semana? Se precisar, a gente ajusta o treino para o seu momento.` };
  else if (melhorou)
    sugestao = { acao: "reconhecer", modelo: "progresso", titulo: `${primeiro} apresentou melhora na disposição e manteve a frequência. Que tal reconhecer essa evolução?`, rascunho: `${primeiro}, que fase boa! Sua disposição e sua constância estão fazendo diferença. Bora que bora! Chalalá! 💪` };

  return { categoria, motivos, revisaoHumana: desconforto.length > 0, semRespostas, ultimaResposta: ultima, sugestao, dificuldadesAtuais: [...new Set(difAtual.map((x) => x.valor))] };
}

// ---------------------------------------------------------------------------
// Tendências para o histórico (médias semanais na escala −2…+2).

export type SemanaPulso = { inicio: string; respostas: number } & Partial<Record<Exclude<Dimensao, "dificuldade">, number | null>>;

const segunda = (d: string) => {
  const dt = new Date(`${d}T12:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
  return dt.toISOString().slice(0, 10);
};

export function tendenciaSemanal(respostas: RespostaPulso[], hoje: string, semanas = 8): SemanaPulso[] {
  const ini = segunda(hoje);
  const lista = porDia(respostas).filter((x) => x.origem !== "onboarding");
  const out: SemanaPulso[] = [];
  for (let i = semanas - 1; i >= 0; i--) {
    const dt = new Date(`${ini}T12:00:00Z`);
    dt.setUTCDate(dt.getUTCDate() - 7 * i);
    const inicio = dt.toISOString().slice(0, 10);
    const daSemana = lista.filter((x) => segunda(x.dia) === inicio);
    const linha: SemanaPulso = { inicio, respostas: daSemana.length };
    for (const d of ["energia", "motivacao", "recuperacao", "sono"] as const) {
      const v = daSemana.filter((x) => x.dimensao === d).map((x) => nivel(x)).filter((n): n is number => n !== null);
      linha[d] = v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null;
    }
    out.push(linha);
  }
  return out;
}

/** Dificuldades mais citadas no período (sem “nada no momento”). */
export function dificuldadesFrequentes(respostas: RespostaPulso[], hoje: string, dias = 60): Array<{ valor: string; rotulo: string; vezes: number }> {
  const cont = new Map<string, number>();
  for (const x of porDia(respostas)) {
    if (x.dimensao !== "dificuldade" || x.valor === "nada" || x.origem === "onboarding") continue;
    const n = diasEntre(x.dia, hoje);
    if (n < 0 || n >= dias) continue;
    cont.set(x.valor, (cont.get(x.valor) ?? 0) + 1);
  }
  return [...cont.entries()].map(([valor, vezes]) => ({ valor, vezes, rotulo: opcao("dificuldade", valor)?.rotulo ?? valor })).sort((a, b) => b.vezes - a.vezes);
}
