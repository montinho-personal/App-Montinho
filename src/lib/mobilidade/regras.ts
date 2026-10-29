// ============================================================================
// Mobilidade e alongamento — regras PURAS (pedido do Montinho, 29/10/2026).
// Só vale o que foi COMEÇADO no app: início e fim são gravados pelo SERVIDOR
// (0116), e a sessão precisa durar pelo menos LIMITES_MOBILIDADE.minutosMin
// entre o “Começar” e o “Concluir” (ninguém conclui um protocolo de ~22 min
// em 1 minuto). Dia = horário de Brasília.
// ============================================================================
import type { SlugMobilidade } from "./protocolos";

export const LIMITES_MOBILIDADE = {
  /** Tempo mínimo entre o “Começar” e o “Concluir” (o protocolo tem ~22 min). */
  minutosMin: 10,
  /** “Desafio 7 dias” dos vídeos: todos os dias seguidos. */
  diasDesafio: 7,
} as const;

export type SessaoMobilidade = {
  id: string;
  protocolo: SlugMobilidade;
  status: "em_andamento" | "concluida" | "cancelada";
  iniciado_em: string;
  concluido_em: string | null;
  nota_antes: number | null;
  nota_depois: number | null;
};

export type CodigoMobilidade = "mobilidade_superiores" | "mobilidade_inferiores" | "mobilidade_completa" | "mobilidade_7_superiores" | "mobilidade_7_inferiores";
export const CODIGOS_MOBILIDADE: CodigoMobilidade[] = ["mobilidade_superiores", "mobilidade_inferiores", "mobilidade_completa", "mobilidade_7_superiores", "mobilidade_7_inferiores"];

const diaBR = (iso: string) => new Date(Date.parse(iso) - 3 * 3_600_000).toISOString().slice(0, 10);
const diaSeguinte = (d: string) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + 1);
  return x.toISOString().slice(0, 10);
};

export const minutosDaSessao = (s: Pick<SessaoMobilidade, "iniciado_em" | "concluido_em">) => (s.concluido_em ? (Date.parse(s.concluido_em) - Date.parse(s.iniciado_em)) / 60_000 : 0);

/** Conta: concluída no app, com o tempo mínimo entre começar e concluir. */
export const valeMobilidade = (s: SessaoMobilidade) => s.status === "concluida" && !!s.concluido_em && minutosDaSessao(s) >= LIMITES_MOBILIDADE.minutosMin;

export function validasEmOrdem(sessoes: SessaoMobilidade[]): SessaoMobilidade[] {
  return sessoes.filter(valeMobilidade).sort((a, b) => Date.parse(a.concluido_em!) - Date.parse(b.concluido_em!));
}

/** Dias seguidos com o protocolo até `hoje` (ou até ontem, se hoje ainda não fez): o “Desafio 7 dias”. */
export function sequenciaAtual(sessoes: SessaoMobilidade[], protocolo: SlugMobilidade, hoje: string): number {
  const dias = new Set(validasEmOrdem(sessoes).filter((s) => s.protocolo === protocolo).map((s) => diaBR(s.iniciado_em)));
  let d = dias.has(hoje) ? hoje : (() => {
    const x = new Date(`${hoje}T12:00:00Z`);
    x.setUTCDate(x.getUTCDate() - 1);
    return x.toISOString().slice(0, 10);
  })();
  let n = 0;
  while (dias.has(d)) {
    n++;
    const x = new Date(`${d}T12:00:00Z`);
    x.setUTCDate(x.getUTCDate() - 1);
    d = x.toISOString().slice(0, 10);
  }
  return n;
}

export type TrofeuMobilidade = { codigo: CodigoMobilidade; data: string; descricao: string; evidencia: Record<string, unknown> };

export function trofeusDaMobilidade(sessoes: SessaoMobilidade[]): TrofeuMobilidade[] {
  const ok = validasEmOrdem(sessoes);
  const out: TrofeuMobilidade[] = [];
  const primeira = (p: SlugMobilidade) => ok.find((s) => s.protocolo === p) ?? null;
  const sup = primeira("superiores");
  const inf = primeira("inferiores");
  if (sup) out.push({ codigo: "mobilidade_superiores", data: sup.concluido_em!, descricao: "Primeira Mobilidade de Superiores concluída no app.", evidencia: { sessao: sup.id } });
  if (inf) out.push({ codigo: "mobilidade_inferiores", data: inf.concluido_em!, descricao: "Primeira Mobilidade de Inferiores concluída no app.", evidencia: { sessao: inf.id } });
  if (sup && inf) {
    const ultima = Date.parse(sup.concluido_em!) > Date.parse(inf.concluido_em!) ? sup : inf;
    out.push({ codigo: "mobilidade_completa", data: ultima.concluido_em!, descricao: "Os dois protocolos de mobilidade concluídos: superiores e inferiores.", evidencia: { superiores: sup.id, inferiores: inf.id } });
  }
  for (const p of ["superiores", "inferiores"] as const) {
    // 7 dias seguidos (Brasília) com o mesmo protocolo: vale a 1ª vez.
    const porDia = new Map<string, SessaoMobilidade>();
    for (const s of ok.filter((x) => x.protocolo === p)) if (!porDia.has(diaBR(s.iniciado_em))) porDia.set(diaBR(s.iniciado_em), s);
    const dias = [...porDia.keys()].sort();
    let seq = 0;
    let anterior: string | null = null;
    for (const d of dias) {
      seq = anterior && diaSeguinte(anterior) === d ? seq + 1 : 1;
      anterior = d;
      if (seq === LIMITES_MOBILIDADE.diasDesafio) {
        const s = porDia.get(d)!;
        out.push({ codigo: p === "superiores" ? "mobilidade_7_superiores" : "mobilidade_7_inferiores", data: s.concluido_em!, descricao: `${LIMITES_MOBILIDADE.diasDesafio} dias seguidos de ${p === "superiores" ? "Mobilidade de Superiores" : "Mobilidade de Inferiores"}.`, evidencia: { ate: d } });
        break;
      }
    }
  }
  return out;
}

/** “Desconforto: 7 → 3”: só quando as duas notas existem. */
export function melhoraDaNota(s: Pick<SessaoMobilidade, "nota_antes" | "nota_depois">): { antes: number; depois: number; diferenca: number } | null {
  if (s.nota_antes == null || s.nota_depois == null) return null;
  return { antes: s.nota_antes, depois: s.nota_depois, diferenca: s.nota_antes - s.nota_depois };
}

/** Quanto falta para poder concluir (minutos inteiros, para cima). */
export function faltaParaConcluir(iniciadoEm: string, agoraMs: number): number {
  const passou = (agoraMs - Date.parse(iniciadoEm)) / 60_000;
  return Math.max(0, Math.ceil(LIMITES_MOBILIDADE.minutosMin - passou));
}
