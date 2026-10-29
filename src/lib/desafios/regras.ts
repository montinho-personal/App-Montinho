// ============================================================================
// Desafios entre alunos (pedido do Montinho, 24/10/2026). Puro e testável.
//
// Só o que o app mede sozinho, para ninguém precisar provar nada. Conta treino
// concluído com séries, no máximo 1 por dia (horário de Brasília). Tipos:
//  • mais_treinos  — mais treinos no período (disputa);
//  • corrida       — quem chega primeiro a N treinos (disputa);
//  • meta_fixa     — chegar a N treinos até o fim (todos podem cumprir);
//  • semanas       — N treinos por semana em TODAS as semanas (meta);
//  • madrugador    — mais treinos começados antes das 6h (disputa);
//  • volume        — mais peso total (kg × repetições) no período (disputa);
//  • evolucao      — maior aumento do volume em relação à própria média das
//                    4 semanas anteriores (justo entre forte e iniciante);
//  • recordes      — mais recordes pessoais no período (disputa);
//  • musculo       — mais séries de um grupo (pernas, braços…) (disputa);
//  • dupla         — todos somam treinos para bater uma meta juntos (time);
//  • treino_desafio— o mesmo treino para todos: mais volume nesses exercícios.
// Volume = séries válidas (normais, drop-set, rest-pause, cluster) com carga ×
// repetições; aquecimento e isometria não entram.
// ============================================================================

export type TipoDesafio = "mais_treinos" | "corrida" | "meta_fixa" | "semanas" | "madrugador" | "volume" | "evolucao" | "recordes" | "musculo" | "dupla" | "treino_desafio";
export type FocoMuscular = "pernas" | "gluteo" | "bracos" | "peito" | "costas" | "ombros" | "abdomen";

type InfoTipo = { titulo: string; emoji: string; descricao: string; meta: { padrao: number; max: number; rotulo: string } | null; modo: "disputa" | "meta" | "time" };
export const TIPOS_DESAFIO: Record<TipoDesafio, InfoTipo> = {
  mais_treinos: { titulo: "Quem treina mais", emoji: "🏋️", descricao: "Ganha quem fizer mais treinos no período.", meta: null, modo: "disputa" },
  corrida: { titulo: "Corrida de treinos", emoji: "🏁", descricao: "Ganha quem chegar primeiro ao número de treinos.", meta: { padrao: 10, max: 40, rotulo: "treinos para chegar" }, modo: "disputa" },
  meta_fixa: { titulo: "Meta de treinos", emoji: "🎯", descricao: "Todo mundo que chegar à meta até o fim cumpre o desafio.", meta: { padrao: 12, max: 60, rotulo: "treinos no período" }, modo: "meta" },
  semanas: { titulo: "Semana em dia", emoji: "📅", descricao: "Cumpre quem treinar o combinado em todas as semanas.", meta: { padrao: 3, max: 7, rotulo: "treinos por semana" }, modo: "meta" },
  madrugador: { titulo: "Madrugadores", emoji: "🌅", descricao: "Ganha quem fizer mais treinos começados antes das 6h.", meta: null, modo: "disputa" },
  volume: { titulo: "Quem pega mais peso", emoji: "🏋️‍♂️", descricao: "Ganha quem somar mais peso no período (carga × repetições de cada série).", meta: null, modo: "disputa" },
  evolucao: { titulo: "Quem mais evolui", emoji: "📈", descricao: "Ganha quem mais aumentar o próprio volume em relação às 4 semanas anteriores. Justo para quem é forte e para quem está começando.", meta: null, modo: "disputa" },
  recordes: { titulo: "Caçador de recordes", emoji: "🏆", descricao: "Ganha quem bater mais recordes pessoais no período.", meta: null, modo: "disputa" },
  musculo: { titulo: "Músculo da vez", emoji: "💪", descricao: "Ganha quem fizer mais séries do grupo escolhido.", meta: null, modo: "disputa" },
  dupla: { titulo: "Time", emoji: "🤝", descricao: "Todo mundo soma treinos para bater a meta juntos. Ou todos ganham, ou ninguém.", meta: { padrao: 20, max: 200, rotulo: "treinos somados" }, modo: "time" },
  treino_desafio: { titulo: "Treino do desafio", emoji: "📋", descricao: "Todo mundo faz os mesmos exercícios. Ganha quem somar mais peso neles (carga × repetições).", meta: null, modo: "disputa" },
};

export const FOCOS: Record<FocoMuscular, { rotulo: string; grupos: string[] }> = {
  pernas: { rotulo: "Pernas", grupos: ["quadriceps", "posteriores", "gluteo", "adutores", "abdutores", "panturrilha", "pernas"] },
  gluteo: { rotulo: "Glúteos", grupos: ["gluteo", "abdutores"] },
  bracos: { rotulo: "Braços", grupos: ["biceps", "triceps", "antebraco"] },
  peito: { rotulo: "Peito", grupos: ["peito"] },
  costas: { rotulo: "Costas", grupos: ["costas", "trapezio", "lombar"] },
  ombros: { rotulo: "Ombros", grupos: ["ombros", "ombro_anterior", "ombro_lateral", "ombro_posterior"] },
  abdomen: { rotulo: "Abdômen", grupos: ["abdomen", "core"] },
};

/**
 * Prêmio real para quem vence (ex.: desconto na consultoria) — engatilhado,
 * DESLIGADO por decisão do Montinho (24/10/2026): por enquanto só troféu.
 * Para ligar: ativa = true e o texto da oferta; aparece para o campeão no placar.
 */
export const RECOMPENSA_DESAFIO = { ativa: false, texto: "Você ganhou um desconto na consultoria do Montinho! Chame no WhatsApp para resgatar." } as const;

export const DURACOES_DESAFIO = [1, 3, 7, 14, 30] as const;
export const LIMITES_DESAFIO = { participantes: 30, horaMadrugada: 6, desafiosParaNato: 3, exerciciosTreino: 10, diasBase: 28 } as const;
export const TIPOS_SERIE_VOLUME = ["valida", "dropset", "rest_pause", "cluster"] as const;

/** Desafios prontos (o Montinho aprovou a lista em 24/10/2026). */
export type DesafioPronto = { id: string; nome: string; emoji: string; chamada: string; tipo: TipoDesafio; meta: number | null; dias: number; foco?: FocoMuscular };
export const DESAFIOS_PRONTOS: DesafioPronto[] = [
  { id: "peso_hoje", nome: "Quem pega mais peso hoje", emoji: "🏋️‍♂️", chamada: "Duelo de 1 dia: soma de carga × repetições do treino de hoje.", tipo: "volume", meta: null, dias: 1 },
  { id: "duelo_relampago", nome: "Duelo Relâmpago", emoji: "⚡", chamada: "Quem treina mais em 3 dias.", tipo: "mais_treinos", meta: null, dias: 3 },
  { id: "semana_espartana", nome: "Semana Espartana", emoji: "🏛️", chamada: "5 treinos em 7 dias. Todo mundo que conseguir, cumpre.", tipo: "meta_fixa", meta: 5, dias: 7 },
  { id: "corrida_10", nome: "Corrida dos 10", emoji: "🏁", chamada: "Quem chega a 10 treinos primeiro.", tipo: "corrida", meta: 10, dias: 30 },
  { id: "modo_monstro", nome: "Modo Monstro", emoji: "👹", chamada: "Maior volume total (kg × repetições) em 14 dias.", tipo: "volume", meta: null, dias: 14 },
  { id: "fenix", nome: "Fênix", emoji: "🔥", chamada: "Quem mais evolui o próprio volume em 30 dias.", tipo: "evolucao", meta: null, dias: 30 },
  { id: "rei_da_perna", nome: "Rei/Rainha da Perna", emoji: "🦵", chamada: "Mais séries de perna em 14 dias.", tipo: "musculo", meta: null, dias: 14, foco: "pernas" },
  { id: "cacador_recordes", nome: "Caçador de Recordes", emoji: "🏆", chamada: "Mais recordes pessoais em 30 dias.", tipo: "recordes", meta: null, dias: 30 },
  { id: "clube_5h", nome: "Clube das 5h", emoji: "🌅", chamada: "Mais treinos começados antes das 6h em 14 dias.", tipo: "madrugador", meta: null, dias: 14 },
  { id: "dupla_imbativel", nome: "Dupla Imbatível", emoji: "🤝", chamada: "20 treinos somados em 14 dias. Juntos!", tipo: "dupla", meta: 20, dias: 14 },
  { id: "mes_sem_falhar", nome: "Mês sem Falhar", emoji: "🗓️", chamada: "3 treinos por semana, o mês inteiro.", tipo: "semanas", meta: 3, dias: 28 },
  { id: "mesmo_treino", nome: "Mesmo treino, quem pega mais?", emoji: "📋", chamada: "Escolham os exercícios: ganha quem somar mais peso neles.", tipo: "treino_desafio", meta: null, dias: 7 },
];

const DIA = 86_400_000;
const FUSO = -3 * 3_600_000; // Brasília (sem horário de verão)

/** "2026-10-24" do instante, no horário de Brasília. */
export function diaBrasilia(iso: string | Date): string {
  const t = (typeof iso === "string" ? Date.parse(iso) : iso.getTime()) + FUSO;
  return new Date(t).toISOString().slice(0, 10);
}
const horaBrasilia = (iso: string) => new Date(Date.parse(iso) + FUSO).getUTCHours();
export const somarDias = (dia: string, n: number) => new Date(Date.parse(`${dia}T00:00:00Z`) + n * DIA).toISOString().slice(0, 10);
const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DIA);

/** Código do link: 6 letras/números sem 0/O e 1/I. */
export function gerarCodigoDesafio(aleatorio: () => number = Math.random): string {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += a[Math.floor(aleatorio() * a.length)];
  return s;
}

export type ExercicioDesafio = { id: string; nome: string };
/**
 * O que conta nos desafios de contar treinos (pedido do Montinho, 28/10/2026):
 * só musculação (padrão), só cardio, ou os dois — aí cada dia vale até 2
 * (1 musculação + 1 cardio). Cardio = 10 min ou mais, 1 por dia.
 */
export type AtividadesDesafio = "musculacao" | "cardio" | "ambos";
export const ATIVIDADES_DESAFIO: Record<AtividadesDesafio, { rotulo: string; emoji: string; ajuda: string }> = {
  musculacao: { rotulo: "Só musculação", emoji: "🏋️", ajuda: "Conta 1 treino de musculação por dia." },
  cardio: { rotulo: "Só cardio", emoji: "❤️‍🔥", ajuda: "Conta 1 cardio por dia (10 minutos ou mais)." },
  ambos: { rotulo: "Musculação e cardio", emoji: "💪❤️", ajuda: "Musculação e cardio contam: o dia vale até 2 (1 de cada)." },
};
/** Tipos que contam treinos (onde dá para escolher musculação, cardio ou os dois). */
export const TIPOS_COM_ATIVIDADES: TipoDesafio[] = ["mais_treinos", "corrida", "meta_fixa", "semanas", "dupla"];
export type DesafioBase = { tipo: TipoDesafio; meta: number | null; inicio: string; fim: string; foco?: FocoMuscular | null; exercicios?: ExercicioDesafio[] | null; atividades?: AtividadesDesafio | null };
/** Série registrada (só para os tipos de peso/músculo). `em` = início do treino. */
export type SerieDesafio = { em: string; bibliotecaId: string | null; grupo: string | null; carga: number | null; reps: number | null };
export type ParticipanteDados = {
  alunoId: string;
  nome: string;
  status: "convidado" | "aceito" | "recusado";
  eu: boolean;
  criador: boolean;
  /** Início de cada treino concluído com séries no período. */
  treinos: string[];
  /** Cardios de 10+ min no período (só quando o desafio conta cardio). */
  cardios?: string[];
  /** Séries do período (e das 4 semanas antes, para a evolução). */
  series?: SerieDesafio[];
  /** Datas dos recordes pessoais no período. */
  recordes?: string[];
};
export type LinhaPlacar = {
  alunoId: string;
  nome: string;
  eu: boolean;
  criador: boolean;
  /** Número principal do placar. */
  pontos: number;
  /** Texto do número (“5 treinos”, “2 de 3 semanas”, “12.345 kg”). */
  rotulo: string;
  posicao: number;
  cumpriu: boolean;
};

/** Semanas do período (blocos de 7 dias a partir do início; a última só conta se for completa). */
export function semanasDoDesafio(inicio: string, fim: string): Array<{ inicio: string; fim: string }> {
  const out: Array<{ inicio: string; fim: string }> = [];
  for (let d = inicio; d <= fim; d = somarDias(d, 7)) {
    const f = somarDias(d, 6);
    if (f <= fim) out.push({ inicio: d, fim: f });
  }
  return out.length ? out : [{ inicio, fim }];
}

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
export const kgBR = (n: number) => `${Math.round(n).toLocaleString("pt-BR")} kg`;
const volumeDe = (ss: SerieDesafio[]) => ss.reduce((t, s) => t + (s.carga && s.reps && s.carga > 0 && s.reps > 0 ? s.carga * s.reps : 0), 0);

/** Placar dos que aceitaram. */
export function placarDesafio(d: DesafioBase, participantes: ParticipanteDados[], hoje?: string): LinhaPlacar[] {
  const info = TIPOS_DESAFIO[d.tipo];
  const aceitos = participantes.filter((p) => p.status === "aceito");
  const semanas = semanasDoDesafio(d.inicio, d.fim);
  const noPeriodo = (iso: string) => {
    const x = diaBrasilia(iso);
    return x >= d.inicio && x <= d.fim;
  };
  const meta = d.meta ?? info.meta?.padrao ?? 1;

  type Linha = LinhaPlacar & { desempate: number };
  const linhas: Linha[] = aceitos.map((p) => {
    const atv = TIPOS_COM_ATIVIDADES.includes(d.tipo) ? (d.atividades ?? "musculacao") : "musculacao";
    const diasMusc = [...new Set(p.treinos.filter(noPeriodo).map(diaBrasilia))].sort();
    const diasCardio = [...new Set((p.cardios ?? []).filter(noPeriodo).map(diaBrasilia))].sort();
    // Cada dia conta 1 musculação e/ou 1 cardio, conforme a regra escolhida.
    const dias = atv === "cardio" ? diasCardio : atv === "ambos" ? [...diasMusc, ...diasCardio].sort() : diasMusc;
    const unidade = atv === "cardio" ? (["cardio", "cardios"] as const) : atv === "ambos" ? (["atividade", "atividades"] as const) : (["treino", "treinos"] as const);
    const detalhe = atv === "ambos" && dias.length ? ` (${diasMusc.length} musc. + ${diasCardio.length} cardio)` : "";
    const series = (p.series ?? []).filter((s) => noPeriodo(s.em));
    let pontos = dias.length;
    let rotulo = plural(pontos, unidade[0], unidade[1]) + detalhe;
    let cumpriu = false;
    let desempate = dias.length;
    switch (d.tipo) {
      case "madrugador": {
        const cedo = new Set(p.treinos.filter((t) => noPeriodo(t) && horaBrasilia(t) < LIMITES_DESAFIO.horaMadrugada).map(diaBrasilia));
        pontos = cedo.size;
        rotulo = `${plural(pontos, "treino", "treinos")} antes das 6h`;
        break;
      }
      case "corrida": {
        const chegou = dias.length >= meta ? dias[meta - 1] : null;
        pontos = Math.min(dias.length, meta);
        rotulo = chegou ? `🏁 chegou aos ${meta} em ${chegou.split("-").reverse().slice(0, 2).join("/")}` : `${pontos} de ${meta} ${unidade[1]}`;
        // Quem chegou antes fica na frente: desempate pelo dia (quanto antes, maior).
        desempate = chegou ? -diasEntre(d.inicio, chegou) : -9999;
        break;
      }
      case "meta_fixa":
        rotulo = `${Math.min(pontos, meta)} de ${meta} ${unidade[1]}`;
        cumpriu = pontos >= meta;
        break;
      case "semanas": {
        const ok = semanas.filter((w) => dias.filter((x) => x >= w.inicio && x <= w.fim).length >= meta).length;
        pontos = ok;
        rotulo = `${ok} de ${plural(semanas.length, "semana", "semanas")}`;
        cumpriu = ok === semanas.length;
        break;
      }
      case "volume":
        pontos = Math.round(volumeDe(series));
        rotulo = kgBR(pontos);
        break;
      case "treino_desafio": {
        const ids = new Set((d.exercicios ?? []).map((e) => e.id));
        pontos = Math.round(volumeDe(series.filter((s) => s.bibliotecaId && ids.has(s.bibliotecaId))));
        rotulo = kgBR(pontos);
        break;
      }
      case "evolucao": {
        const inicioBase = somarDias(d.inicio, -LIMITES_DESAFIO.diasBase);
        const base = volumeDe((p.series ?? []).filter((s) => {
          const x = diaBrasilia(s.em);
          return x >= inicioBase && x < d.inicio;
        }));
        // Só os dias que já passaram (auditoria 29/10/2026: dividir pelo período inteiro
        // mostrava cerca de −77% para todo mundo nos primeiros dias).
        const ate = hoje && hoje < d.fim ? (hoje < d.inicio ? d.inicio : hoje) : d.fim;
        const diasPeriodo = diasEntre(d.inicio, ate) + 1;
        const atualPorSemana = (volumeDe(series) / diasPeriodo) * 7;
        const basePorSemana = (base / LIMITES_DESAFIO.diasBase) * 7;
        if (basePorSemana <= 0) {
          pontos = 0;
          rotulo = "sem treinos nas 4 semanas antes para comparar";
          desempate = -1;
        } else {
          pontos = Math.round((atualPorSemana / basePorSemana - 1) * 100);
          rotulo = `${pontos > 0 ? "+" : ""}${pontos}% de volume por semana`;
        }
        break;
      }
      case "recordes":
        pontos = new Set((p.recordes ?? []).filter(noPeriodo)).size;
        rotulo = plural(pontos, "recorde", "recordes");
        break;
      case "musculo": {
        const grupos = new Set(FOCOS[d.foco ?? "pernas"].grupos);
        pontos = series.filter((s) => s.grupo && grupos.has(s.grupo)).length;
        rotulo = `${plural(pontos, "série", "séries")} de ${FOCOS[d.foco ?? "pernas"].rotulo.toLowerCase()}`;
        break;
      }
    }
    return { alunoId: p.alunoId, nome: p.nome, eu: p.eu, criador: p.criador, pontos, rotulo, posicao: 0, cumpriu, desempate };
  });

  linhas.sort((a, b) => (d.tipo === "corrida" ? b.desempate - a.desempate || b.pontos - a.pontos : b.pontos - a.pontos || b.desempate - a.desempate) || a.nome.localeCompare(b.nome, "pt-BR"));
  let pos = 0;
  linhas.forEach((l, i) => {
    const anterior = linhas[i - 1];
    if (i === 0 || l.pontos !== anterior.pontos || l.desempate !== anterior.desempate) pos = i + 1;
    l.posicao = pos;
  });
  if (info.modo === "disputa") {
    for (const l of linhas) l.cumpriu = l.posicao === 1 && linhas.length >= 2 && (d.tipo === "corrida" ? l.pontos >= meta : l.pontos > 0);
  } else if (info.modo === "time") {
    const total = linhas.reduce((t, l) => t + l.pontos, 0);
    for (const l of linhas) l.cumpriu = total >= meta && linhas.length >= 2;
  }
  return linhas.map(({ desempate: _d, ...l }) => (void _d, l));
}

/** Total do time (desafio “dupla”). */
export function totalDoTime(placar: LinhaPlacar[]): number {
  return placar.reduce((t, l) => t + l.pontos, 0);
}

export type SituacaoDesafio = "agendado" | "andamento" | "encerrado";
export function situacaoDesafio(d: { inicio: string; fim: string; cancelado: boolean }, hoje: string): SituacaoDesafio {
  if (d.cancelado || hoje > d.fim) return "encerrado";
  return hoje < d.inicio ? "agendado" : "andamento";
}

/** Texto curto da regra (“Quem treina mais · 24/10 a 06/11”). */
export function resumoDesafio(d: DesafioBase): string {
  const t = TIPOS_DESAFIO[d.tipo];
  const br = (x: string) => x.split("-").reverse().slice(0, 2).join("/");
  const extra =
    d.tipo === "meta_fixa" ? ` · meta de ${d.meta} treinos`
    : d.tipo === "semanas" ? ` · ${d.meta}× por semana`
    : d.tipo === "corrida" ? ` · até ${d.meta} treinos`
    : d.tipo === "dupla" ? ` · ${d.meta} treinos somados`
    : d.tipo === "musculo" ? ` · ${FOCOS[d.foco ?? "pernas"].rotulo}`
    : d.tipo === "treino_desafio" ? ` · ${plural((d.exercicios ?? []).length, "exercício", "exercícios")}`
    : "";
  const atv = TIPOS_COM_ATIVIDADES.includes(d.tipo) && d.atividades && d.atividades !== "musculacao" ? ` · ${ATIVIDADES_DESAFIO[d.atividades].rotulo.toLowerCase()}` : "";
  const quando = d.inicio === d.fim ? `só em ${br(d.inicio)}` : `${br(d.inicio)} a ${br(d.fim)}`;
  return `${t.titulo}${extra}${atv} · ${quando}`;
}

/** Mensagem do convite no WhatsApp (link com o código). */
export function mensagemConviteDesafio(p: { nome: string; criador: string; resumo: string; link: string }): string {
  return [`Olá! Bora encarar um desafio no app do Montinho? 💪`, `“${p.nome}” — ${p.resumo}`, `Entra por aqui: ${p.link}`].join("\n\n");
}

/** Recado do placar para quem está participando (“faltam 2 dias e o João está 1 treino na frente”). */
export function recadoDoPlacar(d: DesafioBase & { nome: string }, placar: LinhaPlacar[], hoje: string): string | null {
  const eu = placar.find((l) => l.eu);
  if (!eu || hoje < d.inicio || hoje > d.fim) return null;
  const faltam = diasEntre(hoje, d.fim);
  const prazo = faltam === 0 ? "termina hoje" : faltam === 1 ? "termina amanhã" : `faltam ${faltam} dias`;
  const modo = TIPOS_DESAFIO[d.tipo].modo;
  if (modo === "time") {
    const total = totalDoTime(placar);
    const meta = d.meta ?? 1;
    return total >= meta ? `🤝 Meta do time batida em “${d.nome}”!` : `🤝 “${d.nome}”: o time tem ${total} de ${meta}, ${prazo}.`;
  }
  if (modo === "meta") return eu.cumpriu ? `✅ Meta cumprida em “${d.nome}”!` : `🎯 “${d.nome}”: ${eu.rotulo}, ${prazo}.`;
  if (placar.length < 2) return `⚔️ “${d.nome}”: chame alguém para disputar, ${prazo}.`;
  if (eu.posicao === 1) return `🥇 Você lidera “${d.nome}”, ${prazo}. Não deixe ninguém passar!`;
  const lider = placar.find((l) => l.posicao === 1)!;
  return `⚔️ ${lider.nome} está na frente em “${d.nome}” (você em ${eu.posicao}º), ${prazo}. Bora virar!`;
}

// ---------------------------------------------------------------------------
// Troféus dos desafios (para a sala de troféus)
// ---------------------------------------------------------------------------
export type ResultadoDesafio = { id: string; fim: string; souCriador: boolean; aceitos: number; venci: boolean; cumpri: boolean; aceitei: boolean };
export type MarcosDesafios = { criador: string | null; campeao: string | null; palavra: string | null; nato: string | null; ids: { criador: string | null; campeao: string | null; palavra: string | null; nato: string | null } };

/** Datas (fim do desafio) em que cada troféu foi ganho; só desafios já encerrados. */
export function marcosDesafios(rs: ResultadoDesafio[]): MarcosDesafios {
  const enc = [...rs].sort((a, b) => (a.fim < b.fim ? -1 : 1));
  const primeiro = (f: (r: ResultadoDesafio) => boolean) => enc.find(f) ?? null;
  const criador = primeiro((r) => r.souCriador && r.aceitos >= 2);
  const campeao = primeiro((r) => r.venci);
  const palavra = primeiro((r) => r.cumpri);
  const nato = enc.filter((r) => r.aceitei)[LIMITES_DESAFIO.desafiosParaNato - 1] ?? null;
  return {
    criador: criador?.fim ?? null,
    campeao: campeao?.fim ?? null,
    palavra: palavra?.fim ?? null,
    nato: nato?.fim ?? null,
    ids: { criador: criador?.id ?? null, campeao: campeao?.id ?? null, palavra: palavra?.id ?? null, nato: nato?.id ?? null },
  };
}
