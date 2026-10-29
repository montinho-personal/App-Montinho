// ============================================================================
// Troféus de compartilhamento (pedido do Montinho em 24/10/2026) — regras
// PURAS. Contam semanas e troféus DIFERENTES (tocar em “Compartilhar” várias
// vezes seguidas não sobe ninguém no Ranking). O app só sabe que a pessoa
// tocou em Compartilhar/Baixar; a prova de alcance é a visita ao link.
// ============================================================================

export type EventoCompartilhar = { tipo: string; origem: string | null; modelo: string | null; ref: string | null; created_at: string };

export const LIMITES_COMPARTILHAR = { semanasDiario: 4, trofeusVitrine: 5 } as const;

const ENVIO = new Set(["compartilhar_nativo", "download", "descoberta_compartilhada"]);
const ENVIO_CARD = new Set(["compartilhar_nativo", "download"]);

const segundaFeira = (iso: string) => {
  const d = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso)) + "T12:00:00Z");
  return new Date(d.getTime() - ((d.getUTCDay() + 6) % 7) * 86_400_000).toISOString().slice(0, 10);
};

export type MarcosCompartilhar = { primeiro: string | null; diario: string | null; vitrine: string | null; inspiracao: string | null; amigo: string | null };

/** Quando cada troféu de compartilhamento foi alcançado (null = ainda não). */
export function marcosCompartilhar(eventos: EventoCompartilhar[], primeiroAmigoEm: string | null): MarcosCompartilhar {
  const ordem = [...eventos].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const primeiro = ordem.find((e) => ENVIO.has(e.tipo))?.created_at ?? null;

  let diario: string | null = null;
  const semanas = new Set<string>();
  for (const e of ordem) {
    if (!ENVIO_CARD.has(e.tipo) || e.origem !== "conclusao") continue;
    semanas.add(segundaFeira(e.created_at));
    if (semanas.size >= LIMITES_COMPARTILHAR.semanasDiario) {
      diario = e.created_at;
      break;
    }
  }

  let vitrine: string | null = null;
  const trofeus = new Set<string>();
  for (const e of ordem) {
    if (!ENVIO_CARD.has(e.tipo)) continue;
    const codigo = e.ref?.startsWith("medalha:") ? e.ref.slice(8) : e.origem === "medalha" ? e.modelo : null;
    if (!codigo) continue;
    trofeus.add(codigo);
    if (trofeus.size >= LIMITES_COMPARTILHAR.trofeusVitrine) {
      vitrine = e.created_at;
      break;
    }
  }

  const inspiracao = ordem.find((e) => e.tipo === "visita_link" && e.ref?.startsWith("c:"))?.created_at ?? null;
  return { primeiro, diario, vitrine, inspiracao, amigo: primeiroAmigoEm };
}

/** Progresso para a vitrine (“o que falta”). */
export function progressoCompartilhar(eventos: EventoCompartilhar[]): { semanasDiario: number; trofeusVitrine: number } {
  const semanas = new Set<string>();
  const trofeus = new Set<string>();
  for (const e of eventos) {
    if (!ENVIO_CARD.has(e.tipo)) continue;
    if (e.origem === "conclusao") semanas.add(segundaFeira(e.created_at));
    const codigo = e.ref?.startsWith("medalha:") ? e.ref.slice(8) : e.origem === "medalha" ? e.modelo : null;
    if (codigo) trofeus.add(codigo);
  }
  return { semanasDiario: semanas.size, trofeusVitrine: trofeus.size };
}

// ============================================================================
// Mais troféus de compartilhar (pedido do Montinho, 29/10/2026):
// • Semana Compartilhada: semana com a meta cumprida em que o card do fim de
//   CADA treino do protocolo foi compartilhado (ou baixado);
// • Cards no Feed: cards do fim do treino de 10, 20 e 30 treinos diferentes;
// • Galeria de Troféus: 10, 20, 30 e 50 troféus diferentes compartilhados.
// O card do fim do treino leva a referência “sessao:<id>”; cards antigos, sem
// ela, contam 1 por dia.
// ============================================================================
export const MARCOS_CARDS = [10, 20, 30] as const;
export const MARCOS_TROFEUS_COMPARTILHADOS = [10, 20, 30, 50] as const;
export type CodigoCompartilharMais =
  | "semana_compartilhada"
  | "cards_10" | "cards_20" | "cards_30"
  | "trofeus_compartilhados_10" | "trofeus_compartilhados_20" | "trofeus_compartilhados_30" | "trofeus_compartilhados_50";
export const CODIGOS_COMPARTILHAR_MAIS: CodigoCompartilharMais[] = ["semana_compartilhada", ...MARCOS_CARDS.map((n) => `cards_${n}` as CodigoCompartilharMais), ...MARCOS_TROFEUS_COMPARTILHADOS.map((n) => `trofeus_compartilhados_${n}` as CodigoCompartilharMais)];

export type TrofeuCompartilharMais = { codigo: CodigoCompartilharMais; data: string; descricao: string; evidencia: Record<string, unknown> };
/** Semana da aderência (só o que a regra precisa). */
export type SemanaParaCompartilhar = { inicio: string; status: string; meta: number | null };
/** Treino do protocolo (concluído ou parcial, sem extra) com o dia em Brasília. */
export type TreinoParaCompartilhar = { id: string; dia: string };

const dataSP = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
const codigoDaMedalha = (e: EventoCompartilhar) => (e.ref?.startsWith("medalha:") ? e.ref.slice(8) : e.origem === "medalha" ? e.modelo : null);
/** Chave do card do fim do treino: a sessão; sem referência (cards antigos), o dia. */
const chaveDoCard = (e: EventoCompartilhar) => (e.ref?.startsWith("sessao:") ? e.ref : `dia:${dataSP(e.created_at)}`);

/** Quantos cards do fim do treino (treinos diferentes) e troféus diferentes já foram compartilhados. */
export function contagemCompartilhar(eventos: EventoCompartilhar[]): { cards: number; trofeus: number } {
  const cards = new Set<string>();
  const trofeus = new Set<string>();
  for (const e of eventos) {
    if (!ENVIO_CARD.has(e.tipo)) continue;
    if (e.origem === "conclusao") cards.add(chaveDoCard(e));
    const c = codigoDaMedalha(e);
    if (c) trofeus.add(c);
  }
  return { cards: cards.size, trofeus: trofeus.size };
}

export function trofeusCompartilharMais(eventos: EventoCompartilhar[], semanas: SemanaParaCompartilhar[] = [], treinos: TreinoParaCompartilhar[] = []): TrofeuCompartilharMais[] {
  const out: TrofeuCompartilharMais[] = [];
  const ordem = [...eventos].filter((e) => ENVIO_CARD.has(e.tipo)).sort((a, b) => a.created_at.localeCompare(b.created_at));

  const cards = new Set<string>();
  const trofeus = new Set<string>();
  const primeiroDaSessao = new Map<string, string>();
  for (const e of ordem) {
    if (e.origem === "conclusao") {
      const antes = cards.size;
      cards.add(chaveDoCard(e));
      if (e.ref?.startsWith("sessao:") && !primeiroDaSessao.has(e.ref.slice(7))) primeiroDaSessao.set(e.ref.slice(7), e.created_at);
      if (cards.size > antes) for (const n of MARCOS_CARDS) if (cards.size === n) out.push({ codigo: `cards_${n}` as CodigoCompartilharMais, data: e.created_at, descricao: `Card do fim do treino compartilhado em ${n} treinos diferentes.`, evidencia: { cards: n } });
    }
    const c = codigoDaMedalha(e);
    if (c && !trofeus.has(c)) {
      trofeus.add(c);
      for (const n of MARCOS_TROFEUS_COMPARTILHADOS) if (trofeus.size === n) out.push({ codigo: `trofeus_compartilhados_${n}` as CodigoCompartilharMais, data: e.created_at, descricao: `${n} troféus diferentes compartilhados.`, evidencia: { trofeus: n } });
    }
  }

  // Semana Compartilhada: a primeira semana cumprida com o card de todos os treinos dela.
  for (const w of [...semanas].sort((a, b) => (a.inicio < b.inicio ? -1 : 1))) {
    if (w.status !== "cumprida") continue;
    const fim = new Date(Date.parse(`${w.inicio}T12:00:00Z`) + 6 * 86_400_000).toISOString().slice(0, 10);
    const daSemana = treinos.filter((t) => t.dia >= w.inicio && t.dia <= fim);
    if (!daSemana.length || daSemana.length < (w.meta ?? 1)) continue;
    const datas = daSemana.map((t) => primeiroDaSessao.get(t.id));
    if (datas.some((d) => !d)) continue;
    const data = (datas as string[]).sort().at(-1)!;
    out.push({ codigo: "semana_compartilhada", data, descricao: `Semana de ${w.inicio.slice(8, 10)}/${w.inicio.slice(5, 7)}: meta cumprida e o card de cada um dos ${daSemana.length} treinos compartilhado.`, evidencia: { semana: w.inicio, treinos: daSemana.length } });
    break;
  }
  return out;
}
