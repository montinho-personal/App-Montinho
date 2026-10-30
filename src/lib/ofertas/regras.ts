// ============================================================================
// Ofertas dos planos dentro do app (pedido do Montinho, 30/10/2026). Regras
// PURAS. Só convite para o WhatsApp do Montinho (sem pagamento no app).
//  • Visitante: Consultoria online e, para quem pode ir a Alphaville, o
//    Pacote Flexível. Aluno da consultoria: o Pacote Flexível (se pode ir).
//  • O personal liga/desliga cada oferta e escreve uma vantagem opcional.
//  • Limite: visitante vê no máximo 1 oferta por dia; aluno, 1 por semana.
//    “Agora não” some por 7 dias (aluno 14); tocou no WhatsApp, 14 dias.
//  • Nunca com dor/desconforto recente nem no meio do treino.
// ============================================================================
import type { OfertaConfig, OfertaConfigId } from "@/lib/supabase/types-extended";

export type OfertaId = "consultoria" | "pacote";
export type Publico = "visitante" | "aluno";

export type Oferta = { id: OfertaId; config: OfertaConfigId; promo: string | null };

export const LIMITES_OFERTA = {
  /** Intervalo mínimo entre duas ofertas mostradas (qualquer lugar). */
  intervaloHoras: { visitante: 20, aluno: 24 * 7 },
  dispensaDias: { visitante: 7, aluno: 14 },
  cliqueDias: 14,
} as const;

/** As ofertas que valem para a pessoa, na ordem em que devem aparecer. */
export function ofertasPara(e: { publico: Publico; podePresencial: boolean; config: Array<Pick<OfertaConfig, "id" | "ativo" | "promo">> }): Oferta[] {
  const cfg = new Map(e.config.map((c) => [c.id, c]));
  const ligada = (id: OfertaConfigId) => cfg.get(id)?.ativo !== false;
  const promo = (id: OfertaConfigId) => cfg.get(id)?.promo?.trim() || null;
  const out: Oferta[] = [];
  if (e.publico === "visitante") {
    if (ligada("consultoria_visitantes")) out.push({ id: "consultoria", config: "consultoria_visitantes", promo: promo("consultoria_visitantes") });
    if (e.podePresencial && ligada("pacote_visitantes")) out.push({ id: "pacote", config: "pacote_visitantes", promo: promo("pacote_visitantes") });
  } else if (e.podePresencial && ligada("pacote_alunos")) {
    out.push({ id: "pacote", config: "pacote_alunos", promo: promo("pacote_alunos") });
  }
  return out;
}

/** O que o aparelho lembra (localStorage): quando mostrou, dispensou ou tocou. */
export type HistoricoOferta = { ultimaVista?: number; dispensada?: Partial<Record<OfertaId, number>>; clicada?: Partial<Record<OfertaId, number>> };

const H = 3_600_000;
const D = 24 * H;

/**
 * A oferta a mostrar agora (ou null). Respeita o intervalo entre ofertas, as
 * pausas de “agora não” e do clique, e alterna entre as ofertas pelo dia.
 * `jaNestaTela` = a mesma oferta já está sendo mostrada (não conta de novo).
 */
export function escolherOferta(e: { ofertas: Oferta[]; publico: Publico; agora: number; historico: HistoricoOferta; dor: boolean; diaDoAno: number; /** Oferta do motivo do momento (vence a alternância se estiver livre). */ preferida?: OfertaId | null }): Oferta | null {
  if (e.dor || !e.ofertas.length) return null;
  const h = e.historico;
  if (h.ultimaVista && e.agora - h.ultimaVista < LIMITES_OFERTA.intervaloHoras[e.publico] * H) return null;
  const livres = e.ofertas.filter((o) => {
    const d = h.dispensada?.[o.id];
    const c = h.clicada?.[o.id];
    return !(d && e.agora - d < LIMITES_OFERTA.dispensaDias[e.publico] * D) && !(c && e.agora - c < LIMITES_OFERTA.cliqueDias * D);
  });
  if (!livres.length) return null;
  return livres.find((o) => o.id === e.preferida) ?? livres[e.diaDoAno % livres.length];
}

/** Texto do cartão, com os números da própria pessoa quando houver. */
export function textoDaOferta(o: Oferta, e: { publico: Publico; nome: string; treinos: number }): { titulo: string; texto: string; botao: string } {
  const nome = e.nome.split(" ")[0];
  const feitos = e.treinos >= 2 ? `${e.treinos} treinos` : null;
  if (o.id === "consultoria") {
    return {
      titulo: feitos ? `${nome}, ${feitos} por conta própria. Bora com acompanhamento?` : `${nome}, que tal treinar com o Montinho?`,
      texto: "Na consultoria eu monto o seu treino, acompanho cada semana e ajusto quando a carga trava ou a rotina muda. Tudo pelo app e pelo WhatsApp.",
      botao: "💬 Quero saber como funciona",
    };
  }
  return {
    titulo: e.publico === "aluno" ? `${nome}, já pensou em umas aulas comigo?` : `${nome}, 5 meses de consultoria + 10 aulas comigo`,
    texto: e.publico === "aluno" ? "No Pacote Flexível você continua com a consultoria e ganha 10 aulas presenciais para usar quando der, sem horário fixo. Uma aula afina a técnica e destrava a carga." : "Consultoria online + 10 aulas presenciais em Alphaville, para usar quando der, sem horário fixo. Dá para parcelar.",
    botao: "💬 Quero o Pacote Flexível",
  };
}

// ---------------------------------------------------------------------------
// Gatilhos (Fase 2): o “porquê agora” da oferta, com os dados da pessoa.
// ---------------------------------------------------------------------------
export type Motivo = { oferta: OfertaId; chave: string; titulo: string; texto: string };

export type EntradaMotivo = {
  publico: Publico;
  nome: string;
  /** Visitante: dias desde o início do acesso (0 = hoje). */
  diasDeAcesso: number | null;
  /** Aluno: dias até o fim do acesso/plano (renovação). */
  diasAteRenovar: number | null;
  /** Exercício com a carga parada (3+ treinos em 14+ dias sem subir), se houver. */
  cargaParada: string | null;
  /** Contou no Pulso, nos últimos 14 dias, que falta tempo ou a rotina está corrida. */
  poucoTempo: boolean;
  /** Ofertas que valem para a pessoa (ofertasPara). */
  disponiveis: OfertaId[];
};

/** O motivo mais forte para oferecer agora (ou null = texto padrão). */
export function motivoDaOferta(e: EntradaMotivo): Motivo | null {
  const nome = e.nome.split(" ")[0] || "Ei";
  const tem = (id: OfertaId) => e.disponiveis.includes(id);
  if (e.publico === "aluno") {
    if (!tem("pacote")) return null;
    if (e.diasAteRenovar !== null && e.diasAteRenovar >= 0 && e.diasAteRenovar <= 30)
      return { oferta: "pacote", chave: "renovacao", titulo: `${nome}, sua renovação está chegando`, texto: "Que tal renovar já somando 10 aulas comigo? No Pacote Flexível você segue com a consultoria e usa as aulas quando der." };
    if (e.cargaParada)
      return { oferta: "pacote", chave: "carga_parada", titulo: `Carga travada no ${e.cargaParada}?`, texto: "Às vezes é técnica, às vezes é cabeça. Numa aula comigo eu ajusto ao vivo e você descobre que tinha mais. Pacote Flexível: 10 aulas para usar quando der." };
    if (e.poucoTempo)
      return { oferta: "pacote", chave: "pouco_tempo", titulo: "Rotina corrida? As aulas esperam você", texto: "No Pacote Flexível não tem horário fixo: semana tranquila, aula; semana corrida, o treino segue no app." };
    return null;
  }
  if (e.poucoTempo && tem("pacote"))
    return { oferta: "pacote", chave: "pouco_tempo", titulo: "Sem tempo fixo? Tem jeito", texto: "5 meses de consultoria + 10 aulas presenciais para usar quando der, sem horário fixo. Eu monto o treino e você encaixa na sua semana." };
  const d = e.diasDeAcesso;
  if (d === null) return null;
  if (d >= 21 && tem("pacote")) return { oferta: "pacote", chave: "dia21", titulo: `${nome}, que tal umas aulas comigo?`, texto: "Consultoria online + 10 aulas presenciais em Alphaville, sem horário fixo. Uma aula afina a técnica e o treino sozinho rende mais." };
  if (d >= 14 && tem("consultoria")) return { oferta: "consultoria", chave: "dia14", titulo: "Metade do caminho: sozinho ou com o Montinho?", texto: "Até aqui o treino foi seu. Na consultoria eu monto, acompanho cada semana e ajusto quando trava. A diferença aparece rápido." };
  if (d >= 7 && tem("consultoria")) return { oferta: "consultoria", chave: "dia7", titulo: "Uma semana de app. Imagina com acompanhamento", texto: "Meus alunos têm treino montado para eles e eu do lado ajustando. Veja os resultados na página da consultoria." };
  if (d >= 3 && tem("consultoria")) return { oferta: "consultoria", chave: "dia3", titulo: `${nome}, prazer: eu sou o Montinho`, texto: "Mais de 20 anos de musculação, −40 kg na minha própria história e mais de 100 alunos acompanhados. Quer treinar comigo de verdade?" };
  return null;
}

/**
 * Exercício com a carga parada: nas 3 últimas vezes (a 1ª e a última com 14+
 * dias entre elas) a maior carga não subiu. Recebe execuções do mais novo para
 * o mais antigo, por exercício. Devolve o nome do primeiro que travou.
 */
export function cargaParada(porExercicio: Array<{ nome: string; execucoes: Array<{ dia: string; maior: number }> }>): string | null {
  for (const ex of porExercicio) {
    const ult = ex.execucoes.filter((x) => x.maior > 0).slice(0, 3);
    if (ult.length < 3) continue;
    const dias = (Date.parse(`${ult[0].dia}T12:00:00Z`) - Date.parse(`${ult[2].dia}T12:00:00Z`)) / 86_400_000;
    if (dias >= 14 && ult[0].maior <= ult[2].maior && ult[1].maior <= ult[2].maior) return ex.nome;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fase 3: conversão por lugar (painel do personal).
// ---------------------------------------------------------------------------
export const LUGARES_OFERTA: Record<string, string> = {
  inicio: "🏠 Início",
  fim_treino: "🏁 Fim do treino",
  descanso: "⏱ Descanso do treino",
  planos: "✨ Página Planos",
  consultoria: "💎 Página da Consultoria",
  pacote: "🎟️ Página do Pacote Flexível",
  presencial: "🏋️ Página do Presencial",
};

export type EventoOferta = { cta: string; tipo: "exibido" | "clicado" | "dispensado"; tela: string | null; visitante: boolean };
export type LinhaConversao = { lugar: string; rotulo: string; oferta: string; publico: "visitante" | "aluno"; vistas: number; cliques: number; dispensas: number; taxa: number | null };

/** Vistas, cliques no WhatsApp e “agora não” por lugar, oferta e público; taxa = cliques ÷ vistas. */
export function conversaoPorLugar(eventos: EventoOferta[]): LinhaConversao[] {
  const m = new Map<string, LinhaConversao>();
  for (const e of eventos) {
    if (e.cta !== "consultoria" && e.cta !== "pacote" && e.cta !== "presencial") continue;
    const lugar = e.tela ?? "outro";
    const publico = e.visitante ? "visitante" : "aluno";
    const k = `${lugar}|${e.cta}|${publico}`;
    const l = m.get(k) ?? { lugar, rotulo: LUGARES_OFERTA[lugar] ?? lugar, oferta: e.cta, publico, vistas: 0, cliques: 0, dispensas: 0, taxa: null };
    if (e.tipo === "exibido") l.vistas++;
    else if (e.tipo === "clicado") l.cliques++;
    else l.dispensas++;
    m.set(k, l);
  }
  return [...m.values()].map((l) => ({ ...l, taxa: l.vistas ? Math.round((l.cliques / l.vistas) * 1000) / 10 : null })).sort((a, b) => b.cliques - a.cliques || b.vistas - a.vistas);
}

/** No treino: o histórico deste exercício mostra a carga parada? (mesma regra de cargaParada) */
export function travouNoHistorico(hist: Array<{ data: string; dor?: boolean; series: Array<{ tipo: string; carga: number | null }> }>): boolean {
  const execucoes = hist
    .filter((h) => !h.dor)
    .sort((a, b) => (a.data < b.data ? 1 : -1))
    .map((h) => ({ dia: h.data.slice(0, 10), maior: Math.max(0, ...h.series.filter((x) => x.tipo !== "aquecimento").map((x) => x.carga ?? 0)) }));
  return cargaParada([{ nome: "", execucoes }]) !== null;
}
