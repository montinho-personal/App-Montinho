// ============================================================================
// Relógio do WOD (Multimodalidade, fase 3) — regra PURA. Tudo sai do horário
// de início e das pausas (nunca de um contador rodando): tela bloqueada, sair
// do app ou o celular dormir não perdem a conta.
//   • AMRAP: regressivo do tempo total.
//   • EMOM / E2MOM: intervalo atual e quanto falta nele.
//   • Tabata / intervalado / circuito: trabalho × descanso, ciclo a ciclo.
//   • For Time / Rounds For Time / Chipper / Ladder: progressivo até o limite (time cap).
//   • Death By: um intervalo por minuto, sem fim marcado.
// ============================================================================
import type { BlocoTreino } from "./tipos";

export type Pausa = { de: number; ate: number | null };
export type FaseRelogio = "trabalho" | "descanso" | "fim";

export type EstadoRelogio = {
  /** Segundos de treino (sem as pausas). */
  decorridoSeg: number;
  /** Quanto falta no relógio grande (null = progressivo sem limite). */
  restanteSeg: number | null;
  /** O relógio grande mostra o que falta (true) ou o que passou (false). */
  regressivo: boolean;
  fase: FaseRelogio;
  /** Intervalo/ciclo atual (1, 2…) e o total, quando o formato tem. */
  intervalo: number | null;
  totalIntervalos: number | null;
  /** Quanto falta no intervalo/fase atual (EMOM, Tabata…). */
  restanteFaseSeg: number | null;
  terminou: boolean;
};

/** Segundos de treino entre o início e agora, descontando as pausas. */
export function segundosDeTreino(inicioMs: number, pausas: Pausa[], agoraMs: number): number {
  const pausado = pausas.reduce((t, p) => t + Math.max(0, Math.min(p.ate ?? agoraMs, agoraMs) - p.de), 0);
  return Math.max(0, Math.floor((agoraMs - inicioMs - pausado) / 1000));
}

/** Duração total prevista do relógio (null = sem fim marcado). */
export function duracaoRelogio(b: Pick<BlocoTreino, "formato" | "minutos" | "rounds" | "trabalho_seg" | "descanso_seg" | "time_cap_seg" | "movimentos" | "tipo">): number | null {
  switch (b.formato) {
    case "amrap":
    case "emom":
      return b.minutos ? b.minutos * 60 : null;
    case "tabata":
    case "intervalo":
    case "circuito":
      return b.rounds && b.trabalho_seg ? ciclos(b) * (b.trabalho_seg + (b.descanso_seg ?? 0)) : null;
    case "for_time":
    case "rounds_for_time":
    case "chipper":
    case "ladder":
      return b.time_cap_seg ?? null;
    default:
      return null;
  }
}

/** Circuito: cada estação de cada round é um ciclo de trabalho + descanso. */
function ciclos(b: Pick<BlocoTreino, "formato" | "rounds" | "movimentos">): number {
  const r = b.rounds ?? 1;
  return b.formato === "circuito" ? r * Math.max(1, b.movimentos?.length ?? 1) : r;
}

export function estadoRelogio(b: Pick<BlocoTreino, "formato" | "minutos" | "intervalo_seg" | "rounds" | "trabalho_seg" | "descanso_seg" | "time_cap_seg" | "movimentos" | "tipo">, decorridoSeg: number): EstadoRelogio {
  const d = Math.max(0, Math.floor(decorridoSeg));
  const total = duracaoRelogio(b);
  const base: EstadoRelogio = { decorridoSeg: d, restanteSeg: null, regressivo: false, fase: "trabalho", intervalo: null, totalIntervalos: null, restanteFaseSeg: null, terminou: false };
  const acabou = total != null && d >= total;
  if (acabou) return { ...base, decorridoSeg: total!, restanteSeg: 0, regressivo: b.formato === "amrap" || b.formato === "emom" || b.formato === "tabata" || b.formato === "intervalo" || b.formato === "circuito", fase: "fim", terminou: true };

  switch (b.formato) {
    case "amrap":
      return { ...base, restanteSeg: total != null ? total - d : null, regressivo: total != null };
    case "emom": {
      const I = b.intervalo_seg && b.intervalo_seg > 0 ? b.intervalo_seg : 60;
      return { ...base, restanteSeg: total != null ? total - d : null, regressivo: total != null, intervalo: Math.floor(d / I) + 1, totalIntervalos: total != null ? Math.ceil(total / I) : null, restanteFaseSeg: I - (d % I) };
    }
    case "tabata":
    case "intervalo":
    case "circuito": {
      const T = b.trabalho_seg ?? 0;
      const ciclo = T + (b.descanso_seg ?? 0);
      if (!T || !ciclo) return base;
      const pos = d % ciclo;
      const trabalhando = pos < T;
      return { ...base, restanteSeg: total != null ? total - d : null, regressivo: total != null, fase: trabalhando ? "trabalho" : "descanso", intervalo: Math.floor(d / ciclo) + 1, totalIntervalos: ciclos(b), restanteFaseSeg: trabalhando ? T - pos : ciclo - pos };
    }
    case "death_by":
      return { ...base, intervalo: Math.floor(d / 60) + 1, restanteFaseSeg: 60 - (d % 60) };
    default:
      // For Time e afins: progressivo; com limite, mostra também quanto falta.
      return { ...base, restanteSeg: total != null ? total - d : null };
  }
}

/** “8:05”, “1:02:30”. */
export function relogioTexto(seg: number | null | undefined): string {
  if (seg == null || !Number.isFinite(seg)) return "--:--";
  const s = Math.max(0, Math.floor(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}

/** Momentos para vibrar/apitar: troca de fase/intervalo e os 3 últimos segundos. */
export function deveAvisar(antes: EstadoRelogio, agora: EstadoRelogio): "troca" | "contagem" | "fim" | null {
  if (agora.terminou && !antes.terminou) return "fim";
  if (agora.intervalo != null && antes.intervalo != null && agora.intervalo !== antes.intervalo) return "troca";
  if (agora.fase !== antes.fase) return "troca";
  const r = agora.restanteFaseSeg ?? agora.restanteSeg;
  const rAntes = antes.restanteFaseSeg ?? antes.restanteSeg;
  if (r != null && rAntes != null && r !== rAntes && r <= 3 && r >= 1) return "contagem";
  return null;
}
