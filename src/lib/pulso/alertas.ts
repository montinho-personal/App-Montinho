// ============================================================================
// Montinho Pulso — fila de ações do personal (regras puras).
// Cada alerta tem uma CHAVE ligada às respostas que o geraram: depois de
// “acompanhado” ou “dispensado”, ele só volta com resposta nova (não repete o
// mesmo alerta). “Adiado” volta sozinho na data escolhida.
// ============================================================================

import { diaSP } from "./perguntas";
import type { CategoriaPulso, ResultadoPulso } from "./classificar";

export type EstadoAlerta = { estado: "acompanhado" | "dispensado" | "adiado"; adiado_ate: string | null; updated_at?: string };

export type SituacaoAlerta = "aberto" | "adiado" | "resolvido";

/** Chave do alerta (null = nada a fazer). Muda quando chega resposta nova que mantém o alerta. */
export function chaveAlertaPulso(r: ResultadoPulso): string | null {
  if (r.categoria === "tudo_bem" && r.sugestao?.acao !== "reconhecer") return null;
  const datas = r.motivos.flatMap((m) => m.datas);
  const ultima = datas.length ? datas.sort().at(-1)! : r.ultimaResposta ? diaSP(r.ultimaResposta) : null;
  if (!ultima) return null;
  const tipo: CategoriaPulso | "reconhecer" = r.categoria === "tudo_bem" ? "reconhecer" : r.categoria;
  return `pulso:${tipo}:${ultima}`;
}

export function situacaoAlerta(e: EstadoAlerta | undefined, hoje: string): SituacaoAlerta {
  if (!e) return "aberto";
  if (e.estado === "adiado") return e.adiado_ate && e.adiado_ate > hoje ? "adiado" : "aberto";
  return "resolvido";
}

const PESO: Record<string, number> = { atencao: 0, acompanhar: 1, reconhecer: 2 };

/** Ordem da fila: precisa de atenção (desconforto primeiro) → acompanhar → reconhecer; dentro, a resposta mais recente primeiro. */
export function ordenarFila<T extends { resultado: ResultadoPulso; chave: string | null }>(itens: T[]): T[] {
  const tipo = (x: T) => (x.resultado.categoria === "tudo_bem" ? "reconhecer" : x.resultado.categoria);
  return [...itens].sort((a, b) => PESO[tipo(a)] - PESO[tipo(b)] || Number(b.resultado.revisaoHumana) - Number(a.resultado.revisaoHumana) || (b.chave ?? "").localeCompare(a.chave ?? ""));
}
