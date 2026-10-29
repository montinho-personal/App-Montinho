// ============================================================================
// Conquistas da Tribo (pedido do Montinho, 29/10/2026) — contas PURAS.
// Os números vêm de tribo_dados() (0115): contribuições válidas de cardio
// (mesma regra de src/lib/cardio/regras.ts) e treinos que valem carimbo
// (src/lib/conquistas/carimbos.ts), em ordem cronológica. Para o aluno, nada
// identifica os outros. A concessão de verdade é do banco (tribo_sincronizar);
// `concessoes` aqui é o MESMO algoritmo, usado na demo e para mostrar o
// progresso (testado contra os mesmos cenários).
//
//   participação = alguma contribuição do aluno cobre a faixa (marco anterior, marco];
//   recuperação  = 10% do marco (para cima, mínimo 1), acumulado para sempre.
// ============================================================================

export type Trilha = "cardio" | "treinos";

/** Uma contribuição válida (cardio: minutos de um registro; treino: 1 treino). */
export type Contribuicao = { t: "c" | "t"; em: string; min: number; mod: string | null; eu: boolean; a: string | null };
export type MarcoTribo = { trilha: Trilha; marco: number; nome: string };
export type MissaoTribo = {
  id: string;
  nome: string;
  descricao: string | null;
  meta_minutos: number | null;
  meta_treinos: number | null;
  inicio: string;
  fim: string;
  recorrente: boolean;
  ativa: boolean;
  participantes: number;
};
export type DadosTribo = {
  eu: string | null;
  treinador: boolean;
  contribuicoes: Contribuicao[];
  participantes: { cardio: number; treinos: number; total: number };
  marcos: MarcoTribo[];
  missoes: MissaoTribo[];
};

/** Marcos iniciais (os mesmos da migration 0115; marco novo = linha nova em tribo_marcos). */
export const MARCOS_PADRAO: MarcoTribo[] = [
  { trilha: "cardio", marco: 1000, nome: "A Tribo Despertou" },
  { trilha: "cardio", marco: 5000, nome: "Energia Coletiva" },
  { trilha: "cardio", marco: 10000, nome: "Dez Mil Razões" },
  { trilha: "cardio", marco: 15000, nome: "Tribo Incansável" },
  { trilha: "cardio", marco: 25000, nome: "Força da Tribo" },
  { trilha: "cardio", marco: 50000, nome: "Lenda do Chalalá" },
  { trilha: "cardio", marco: 100000, nome: "Uma Tribo, Uma Lenda" },
  { trilha: "treinos", marco: 10, nome: "Primeira Faísca" },
  { trilha: "treinos", marco: 25, nome: "Tribo em Movimento" },
  { trilha: "treinos", marco: 50, nome: "Ferro Coletivo" },
  { trilha: "treinos", marco: 100, nome: "Cem Vezes Juntos" },
  { trilha: "treinos", marco: 250, nome: "Tribo de Aço" },
  { trilha: "treinos", marco: 500, nome: "Muralha da Tribo" },
  { trilha: "treinos", marco: 1000, nome: "Mil Treinos, Uma Tribo" },
];

/** Regra dos 10% (definida pelo Montinho; não alterar): arredonda para cima, mínimo 1. */
export const FRACAO_RECUPERACAO = 0.1;
export const metaRecuperacao = (marco: number) => Math.max(1, Math.ceil(marco / 10));

export const codigoDoMarco = (trilha: Trilha, marco: number) => `tribo_${trilha}_${marco}`;
export const CODIGO_MISSAO = "tribo_missao";

const qtd = (c: Contribuicao) => (c.t === "c" ? c.min : 1);
const daTrilha = (trilha: Trilha) => (c: Contribuicao) => c.t === (trilha === "cardio" ? "c" : "t");
const ms = (iso: string) => Date.parse(iso);

export const fmt = (n: number) => Math.round(n).toLocaleString("pt-BR");
export const unidade = (trilha: Trilha, n: number) => (trilha === "cardio" ? `${fmt(n)} ${n === 1 ? "minuto" : "minutos"}` : `${fmt(n)} ${n === 1 ? "treino" : "treinos"}`);

// ---------------------------------------------------------------------------
// Totais
// ---------------------------------------------------------------------------
export type ResumoTribo = {
  minutos: number;
  sessoesCardio: number;
  treinos: number;
  participantes: number;
  meus: { minutos: number; sessoesCardio: number; treinos: number };
};

export function resumoTribo(d: Pick<DadosTribo, "contribuicoes" | "participantes">): ResumoTribo {
  let minutos = 0, sessoesCardio = 0, treinos = 0;
  const meus = { minutos: 0, sessoesCardio: 0, treinos: 0 };
  for (const c of d.contribuicoes) {
    if (c.t === "c") {
      minutos += c.min;
      sessoesCardio++;
      if (c.eu) { meus.minutos += c.min; meus.sessoesCardio++; }
    } else {
      treinos++;
      if (c.eu) meus.treinos++;
    }
  }
  return { minutos, sessoesCardio, treinos, participantes: d.participantes.total, meus };
}

// ---------------------------------------------------------------------------
// Marcos: quando a tribo chegou, quem participou, quem pode recuperar
// ---------------------------------------------------------------------------
export type SituacaoMarco = {
  trilha: Trilha;
  marco: number;
  nome: string;
  codigo: string;
  /** Instante em que a tribo chegou (null = ainda não). */
  alcancadoEm: string | null;
  /** Minutos/treinos do aluno dentro da faixa deste marco (0 = não participou). */
  minhaParte: number;
  participei: boolean;
  metaRecuperacao: number;
  /** Instante em que o aluno chegou nos 10% (null = ainda não). */
  recuperadoEm: string | null;
  /** Quanto o aluno tem acumulado na trilha (nunca zera). */
  meuAcumulado: number;
};

export function situacaoDosMarcos(d: Pick<DadosTribo, "contribuicoes" | "marcos">, trilha: Trilha): SituacaoMarco[] {
  const lista = d.contribuicoes.filter(daTrilha(trilha));
  // acumulado da tribo depois de cada contribuição
  const acum: number[] = [];
  let soma = 0;
  for (const c of lista) acum.push((soma += qtd(c)));
  let meuAcum = 0;
  const meuEm: Array<{ em: string; total: number }> = [];
  for (const c of lista) if (c.eu) meuEm.push({ em: c.em, total: (meuAcum += qtd(c)) });

  const marcos = d.marcos.filter((m) => m.trilha === trilha).sort((a, b) => a.marco - b.marco);
  return marcos.map((m, i) => {
    const anterior = i ? marcos[i - 1].marco : 0;
    const k = acum.findIndex((v) => v >= m.marco);
    const alcancadoEm = k >= 0 ? lista[k].em : null;
    let minhaParte = 0;
    lista.forEach((c, j) => {
      if (!c.eu || !alcancadoEm) return;
      const antes = acum[j] - qtd(c);
      if (antes < m.marco && acum[j] > anterior) minhaParte += qtd(c);
    });
    const meta = metaRecuperacao(m.marco);
    const chegou = meuEm.find((x) => x.total >= meta)?.em ?? null;
    const recuperadoEm = alcancadoEm && chegou ? (ms(chegou) > ms(alcancadoEm) ? chegou : alcancadoEm) : null;
    return { trilha, marco: m.marco, nome: m.nome, codigo: codigoDoMarco(trilha, m.marco), alcancadoEm, minhaParte, participei: minhaParte > 0, metaRecuperacao: meta, recuperadoEm, meuAcumulado: meuAcum };
  });
}

export type ProximoMarco = { trilha: Trilha; marco: MarcoTribo | null; total: number; faltam: number; pct: number; anterior: number };

export function proximoMarco(d: Pick<DadosTribo, "contribuicoes" | "marcos">, trilha: Trilha): ProximoMarco {
  const total = d.contribuicoes.filter(daTrilha(trilha)).reduce((t, c) => t + qtd(c), 0);
  const marcos = d.marcos.filter((m) => m.trilha === trilha).sort((a, b) => a.marco - b.marco);
  const prox = marcos.find((m) => m.marco > total) ?? null;
  const anterior = [...marcos].reverse().find((m) => m.marco <= total)?.marco ?? 0;
  if (!prox) return { trilha, marco: null, total, faltam: 0, pct: 100, anterior };
  const pct = Math.max(0, Math.min(100, Math.floor(((total - anterior) / (prox.marco - anterior)) * 100)));
  return { trilha, marco: prox, total, faltam: prox.marco - total, pct, anterior };
}

// ---------------------------------------------------------------------------
// Missões coletivas
// ---------------------------------------------------------------------------
export type StatusMissao = "futura" | "ativa" | "concluida" | "encerrada" | "desativada";
export type ProgressoMissao = MissaoTribo & {
  tipo: "cardio" | "treinos" | "combinada";
  minutos: number;
  treinos: number;
  pctMinutos: number | null;
  pctTreinos: number | null;
  pct: number;
  status: StatusMissao;
  concluidaEm: string | null;
  meus: { minutos: number; treinos: number };
  /** O aluno contribuiu antes de a missão ser concluída (ganha o troféu). */
  ajudei: boolean;
};

/** Início do dia em Brasília (sem horário de verão desde 2019). */
export const inicioDoDia = (data: string) => `${data}T00:00:00-03:00`;
const diaSeguinte = (data: string) => {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

export function progressoMissao(m: MissaoTribo, contribuicoes: Contribuicao[], hoje: string): ProgressoMissao {
  const de = ms(inicioDoDia(m.inicio));
  const ate = ms(inicioDoDia(diaSeguinte(m.fim)));
  const conta = (c: Contribuicao) => (c.t === "c" ? m.meta_minutos != null : m.meta_treinos != null);
  const dentro = contribuicoes.filter((c) => ms(c.em) >= de && ms(c.em) < ate && conta(c));
  let minutos = 0, treinos = 0;
  let emC: string | null = null, emT: string | null = null;
  for (const c of dentro) {
    if (c.t === "c") {
      minutos += c.min;
      if (!emC && m.meta_minutos != null && minutos >= m.meta_minutos) emC = c.em;
    } else {
      treinos++;
      if (!emT && m.meta_treinos != null && treinos >= m.meta_treinos) emT = c.em;
    }
  }
  const okC = m.meta_minutos == null || !!emC;
  const okT = m.meta_treinos == null || !!emT;
  const concluidaEm = m.ativa && okC && okT ? [emC, emT].filter((x): x is string => !!x).sort((a, b) => ms(a) - ms(b)).at(-1) ?? null : null;
  const pctMinutos = m.meta_minutos ? Math.min(100, Math.floor((minutos / m.meta_minutos) * 100)) : null;
  const pctTreinos = m.meta_treinos ? Math.min(100, Math.floor((treinos / m.meta_treinos) * 100)) : null;
  const pcts = [pctMinutos, pctTreinos].filter((x): x is number => x != null);
  const meus = { minutos: 0, treinos: 0 };
  for (const c of dentro) {
    if (!c.eu) continue;
    if (c.t === "c") meus.minutos += c.min;
    else meus.treinos++;
  }
  const ajudei = !!concluidaEm && dentro.some((c) => c.eu && ms(c.em) <= ms(concluidaEm));
  const status: StatusMissao = !m.ativa ? "desativada" : concluidaEm ? "concluida" : hoje < m.inicio ? "futura" : hoje > m.fim ? "encerrada" : "ativa";
  return {
    ...m,
    tipo: m.meta_minutos != null && m.meta_treinos != null ? "combinada" : m.meta_minutos != null ? "cardio" : "treinos",
    minutos,
    treinos,
    pctMinutos,
    pctTreinos,
    pct: pcts.length ? Math.min(...pcts) : 0,
    status,
    concluidaEm,
    meus,
    ajudei,
  };
}

// ---------------------------------------------------------------------------
// Concessão (mesmo algoritmo do banco; usado na demo)
// ---------------------------------------------------------------------------
export type Concessao = { codigo: string; referencia: string; metodo: "participacao" | "recuperacao" | "missao"; em: string; dados: Record<string, unknown> };

export function concessoes(d: Pick<DadosTribo, "contribuicoes" | "marcos" | "missoes">, hoje: string): Concessao[] {
  const out: Concessao[] = [];
  for (const trilha of ["cardio", "treinos"] as const) {
    for (const s of situacaoDosMarcos(d, trilha)) {
      if (!s.alcancadoEm) continue;
      if (s.participei) out.push({ codigo: s.codigo, referencia: String(s.marco), metodo: "participacao", em: s.alcancadoEm, dados: { trilha, marco: s.marco, nome: s.nome, contribuicao: s.minhaParte } });
      else if (s.recuperadoEm) out.push({ codigo: s.codigo, referencia: String(s.marco), metodo: "recuperacao", em: s.recuperadoEm, dados: { trilha, marco: s.marco, nome: s.nome, meta: s.metaRecuperacao, acumulado: s.meuAcumulado } });
    }
  }
  for (const m of d.missoes) {
    const p = progressoMissao(m, d.contribuicoes, hoje);
    if (p.ajudei && p.concluidaEm) out.push({ codigo: CODIGO_MISSAO, referencia: m.id, metodo: "missao", em: p.concluidaEm, dados: { missao_id: m.id, nome: m.nome, meta_minutos: m.meta_minutos, meta_treinos: m.meta_treinos, minutos: p.meus.minutos, treinos: p.meus.treinos } });
  }
  return out.sort((a, b) => ms(a.em) - ms(b.em));
}

// ---------------------------------------------------------------------------
// Curiosidades (equivalências ilustrativas)
// ---------------------------------------------------------------------------
/** Gasto por modalidade (MET, Compêndio de Atividades Físicas — Ainsworth 2011, valores moderados). */
export const MET: Record<string, number> = {
  caminhada: 3.5, walk: 3.5, hike: 5.3,
  corrida: 9.8, run: 9.8, trailrun: 9.8, virtualrun: 9.8,
  esteira: 6, bike_ergometrica: 6.8, bike: 7.5, ride: 7.5, virtualride: 6.8, ebikeride: 4,
  eliptico: 5, elliptical: 5, escada: 8.8, stairstepper: 8.8, remo: 7, rowing: 7,
  natacao: 7, swim: 7, corda: 11, hiit: 8, outro: 5,
};
/** Peso de referência das estimativas (deixado claro na tela). */
export const PESO_REFERENCIA_KG = 70;

export type Curiosidade = { id: string; emoji: string; titulo: string; texto: string; nota?: string };

export function curiosidades(r: Pick<ResumoTribo, "minutos" | "sessoesCardio" | "treinos" | "participantes">, contribuicoes: Contribuicao[] = []): Curiosidade[] {
  const out: Curiosidade[] = [];
  if (r.minutos <= 0 && r.treinos <= 0) return out;
  const horas = r.minutos / 60;
  if (r.minutos > 0) {
    const dias = horas / 24;
    out.push({
      id: "tempo",
      emoji: "⏱️",
      titulo: `${fmt(r.minutos)} minutos de cardio`,
      texto: dias >= 1
        ? `A Tribo Montinho já acumulou ${fmt(horas)} horas de cardio. Isso equivale a ${dias >= 2 ? `${fmt(Math.floor(dias))} dias inteiros` : "1 dia inteiro"} de movimento!`
        : `A Tribo Montinho já acumulou ${horas >= 1 ? `${fmt(horas)} ${Math.round(horas) === 1 ? "hora" : "horas"}` : `${fmt(r.minutos)} minutos`} de cardio. E cada minuto conta!`,
    });
    out.push({
      id: "distancia",
      emoji: "🗺️",
      titulo: `${fmt(horas * 5)} km de caminhada`,
      texto: `Se todo esse tempo fosse uma caminhada a 5 km/h, seria como percorrer ${fmt(horas * 5)} km!`,
      nota: "Equivalência ilustrativa: não é a distância realmente percorrida.",
    });
    if (r.minutos >= 48) {
      out.push({ id: "sessoes", emoji: "🔁", titulo: `${fmt(r.minutos / 24)} cardios de 24 min`, texto: `Esse esforço equivale a ${fmt(r.minutos / 24)} sessões de cardio de 24 minutos!` });
    }
    const kcal = contribuicoes.filter((c) => c.t === "c").reduce((t, c) => t + (MET[(c.mod ?? "outro").toLowerCase()] ?? MET.outro) * PESO_REFERENCIA_KG * (c.min / 60), 0);
    if (kcal >= 100) {
      out.push({
        id: "energia",
        emoji: "🔥",
        titulo: `Cerca de ${fmt(Math.round(kcal / 100) * 100)} kcal`,
        texto: `Pela modalidade e pela duração de cada cardio, a tribo movimentou cerca de ${fmt(Math.round(kcal / 100) * 100)} kcal.`,
        nota: `Estimativa (MET do Compêndio de Atividades Físicas, pessoa de ${PESO_REFERENCIA_KG} kg). Não é medição e não se converte em quilos perdidos.`,
      });
    }
  }
  if (r.treinos > 0) {
    out.push({ id: "treinos", emoji: "🏋️", titulo: `${fmt(r.treinos)} treinos de musculação`, texto: `Juntos, já foram ${fmt(r.treinos)} treinos de musculação concluídos. Cada um deles conta!` });
  }
  if (r.participantes > 1) {
    out.push({ id: "gente", emoji: "🤝", titulo: `${fmt(r.participantes)} pessoas na tribo`, texto: `${fmt(r.participantes)} pessoas já somaram treino ou cardio nesta história. Ninguém vai sozinho.` });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Mensagens contextuais (reforço positivo; nunca culpa nem “treine mais”)
// ---------------------------------------------------------------------------
export function mensagensDaTribo(d: Pick<DadosTribo, "contribuicoes" | "marcos">, hoje: string, recuperouAgora = false): string[] {
  const out: string[] = [];
  if (recuperouAgora) out.push("Você recuperou uma conquista histórica da tribo!");
  const deHoje = d.contribuicoes.filter((c) => c.eu && c.t === "c" && dataBR(c.em) === hoje).reduce((t, c) => t + c.min, 0);
  if (deHoje > 0) {
    out.push(`Você adicionou ${unidade("cardio", deHoje)} à Tribo Montinho hoje!`);
    out.push("Seu cardio de hoje ajudou toda a tribo a avançar!");
  }
  const treinoHoje = d.contribuicoes.some((c) => c.eu && c.t === "t" && dataBR(c.em) === hoje);
  if (treinoHoje) out.push("Seu treino de hoje já está somado na tribo!");
  for (const trilha of ["cardio", "treinos"] as const) {
    const p = proximoMarco(d, trilha);
    if (p.marco && p.pct >= 50) out.push(`Faltam apenas ${unidade(trilha, p.faltam)} para a próxima conquista da tribo: ${p.marco.nome}!`);
  }
  return out;
}

/** AAAA-MM-DD em Brasília. */
export function dataBR(iso: string): string {
  return new Date(ms(iso) - 3 * 3_600_000).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Troféu: nome, selo e card para compartilhar
// ---------------------------------------------------------------------------
export type ConquistaTribo = { id: string; codigo: string; referencia: string; metodo: Concessao["metodo"]; conquistado_em: string; dados: Record<string, unknown>; vista_em?: string | null };

const SELOS_CARDIO = ["🌅", "⚡", "🔟", "🔥", "💪", "🦁", "👑"];
const SELOS_TREINOS = ["✨", "🚶", "🛡️", "💯", "⚙️", "🧱", "🏛️"];

export function seloDaTribo(codigo: string, marcos: MarcoTribo[] = MARCOS_PADRAO): string {
  if (codigo === CODIGO_MISSAO) return "🎯";
  const m = /^tribo_(cardio|treinos)_(\d+)$/.exec(codigo);
  if (!m) return "🏅";
  const lista = marcos.filter((x) => x.trilha === m[1]).sort((a, b) => a.marco - b.marco);
  const i = Math.max(0, lista.findIndex((x) => x.marco === Number(m[2])));
  const selos = m[1] === "cardio" ? SELOS_CARDIO : SELOS_TREINOS;
  return selos[Math.min(i, selos.length - 1)];
}

/** Os dois maiores marcos de cada trilha têm visual de troféu lendário. */
export function lendariaDaTribo(codigo: string, marcos: MarcoTribo[] = MARCOS_PADRAO): boolean {
  const m = /^tribo_(cardio|treinos)_(\d+)$/.exec(codigo);
  if (!m) return false;
  const lista = marcos.filter((x) => x.trilha === m[1]).map((x) => x.marco).sort((a, b) => a - b);
  return lista.slice(-2).includes(Number(m[2]));
}

export function nomeDaConquistaTribo(c: Pick<ConquistaTribo, "codigo" | "dados">, marcos: MarcoTribo[] = MARCOS_PADRAO): string {
  if (c.codigo === CODIGO_MISSAO) return String(c.dados.nome ?? "Missão da Tribo");
  const m = /^tribo_(cardio|treinos)_(\d+)$/.exec(c.codigo);
  return String(c.dados.nome ?? marcos.find((x) => m && x.trilha === m[1] && x.marco === Number(m[2]))?.nome ?? "Conquista da Tribo");
}

/** Linha da conquista: o que a tribo alcançou. */
export function feitoDaTribo(c: Pick<ConquistaTribo, "codigo" | "dados">): string {
  if (c.codigo === CODIGO_MISSAO) {
    const partes = [c.dados.meta_minutos ? `${fmt(Number(c.dados.meta_minutos))} minutos de cardio` : null, c.dados.meta_treinos ? `${fmt(Number(c.dados.meta_treinos))} treinos` : null].filter(Boolean);
    return `Juntos, cumprimos a missão: ${partes.join(" e ")}!`;
  }
  const trilha = c.dados.trilha === "treinos" ? "treinos" : "cardio";
  const marco = Number(c.dados.marco ?? 0);
  return trilha === "cardio" ? `Juntos, alcançamos ${fmt(marco)} minutos de cardio!` : `Juntos, alcançamos ${fmt(marco)} treinos de musculação!`;
}

/** Linha pessoal: por que o aluno ganhou. */
export function motivoDaTribo(c: Pick<ConquistaTribo, "codigo" | "metodo" | "dados">): string {
  const trilha = c.dados.trilha === "treinos" ? "treinos" : "cardio";
  if (c.metodo === "missao") {
    const p = [Number(c.dados.minutos ?? 0) ? unidade("cardio", Number(c.dados.minutos)) : null, Number(c.dados.treinos ?? 0) ? unidade("treinos", Number(c.dados.treinos)) : null].filter(Boolean);
    return p.length ? `Sua parte na missão: ${p.join(" e ")}.` : "Você ajudou a tribo a cumprir esta missão.";
  }
  if (c.metodo === "recuperacao") return `Conquista histórica recuperada: você somou ${unidade(trilha, Number(c.dados.acumulado ?? c.dados.meta ?? 0))} (a meta era ${unidade(trilha, Number(c.dados.meta ?? 0))}, 10% do marco).`;
  return `Você fez parte: ${unidade(trilha, Number(c.dados.contribuicao ?? 0))} seus nesta etapa.`;
}

export type CardTribo = { selo: string; titulo: string; destaque: string | null; frase: string; porque: string; nome: string; data: string; legenda: string; lendaria?: boolean };

/** Card no mesmo formato do card de medalha (src/lib/conquistas/compartilhavel.ts). */
export function cardDaTribo(c: ConquistaTribo, nome: string, marcos: MarcoTribo[] = MARCOS_PADRAO): CardTribo {
  const titulo = nomeDaConquistaTribo(c, marcos).toUpperCase();
  const data = c.conquistado_em.slice(0, 10);
  const feito = feitoDaTribo(c);
  return {
    selo: seloDaTribo(c.codigo, marcos),
    titulo,
    destaque: feito,
    frase: c.metodo === "recuperacao" ? "Recuperei uma conquista da tribo!" : "Eu fiz parte dessa conquista!",
    porque: `${motivoDaTribo(c)} Jornada do Chalalá — Tribo Montinho.`,
    nome: nome.trim().split(/\s+/)[0] ?? "",
    data: `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`,
    legenda: `CONQUISTA DESBLOQUEADA! ${titulo} — ${feito} Eu fiz parte dessa conquista! Jornada do Chalalá — treinando com @montinho_personal`,
    lendaria: lendariaDaTribo(c.codigo, marcos),
  };
}
