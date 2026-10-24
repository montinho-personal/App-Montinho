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
