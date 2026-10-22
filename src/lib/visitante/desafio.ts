// ============================================================================
// Modo Visitante — estado do desafio para a tela (puro, sem rede).
// ============================================================================

import { progressoDesafio, type DesafioConquista } from "@/lib/conquistas/regras";
import { dataLocal } from "@/lib/aderencia/calcular";

export type EstadoDesafio =
  | { estado: "em_breve"; feitos: 0; meta: number; diasParaComecar: number }
  | { estado: "andamento"; feitos: number; meta: number; diasRestantes: number | null }
  | { estado: "concluido"; feitos: number; meta: number; concluidoEm: string }
  | { estado: "encerrado"; feitos: number; meta: number };

const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

/** `concluidas`: treinos concluídos (com pelo menos metade das séries), como na medalha. */
export function estadoDesafio(d: DesafioConquista, concluidas: Array<{ id: string; iniciado_em: string }>, agora: Date = new Date()): EstadoDesafio {
  const hoje = dataLocal(agora);
  const p = progressoDesafio(d, concluidas);
  const feitos = Math.min(p.feitos, d.metaTreinos);
  if (p.concluidoEm) return { estado: "concluido", feitos, meta: d.metaTreinos, concluidoEm: p.concluidoEm.data };
  if (d.inicio && hoje < d.inicio) return { estado: "em_breve", feitos: 0, meta: d.metaTreinos, diasParaComecar: diasEntre(hoje, d.inicio) };
  if (d.fim && hoje > d.fim) return { estado: "encerrado", feitos, meta: d.metaTreinos };
  return { estado: "andamento", feitos, meta: d.metaTreinos, diasRestantes: d.fim ? diasEntre(hoje, d.fim) + 1 : null };
}
