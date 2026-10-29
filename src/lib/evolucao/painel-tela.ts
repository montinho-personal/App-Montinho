// ============================================================================
// Tela “Evoluções dos alunos” (personal): textos curtos para ler de relance.
// Só formatação — as regras de evolução continuam em ./motor.ts e ./painel.ts.
// Texto neutro (quem lê é o personal) e mensagem do WhatsApp sem pronomes:
// sempre o nome do aluno.
// ============================================================================

import type { Descoberta, TipoDescoberta } from "./motor";

type D = Pick<Descoberta, "tipo" | "exercicio" | "atual" | "anterior" | "media">;

/** Número no padrão do Brasil (vírgula, até 2 casas). */
export function numeroBR(n: number): string {
  return String(Math.round(n * 100) / 100).replace(".", ",");
}
export const kgBR = (n: number) => `${numeroBR(n)} kg`;
/** “26/10” a partir de “2026-10-26…”. */
export const diaMes = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export const ROTULO_TIPO: Record<TipoDescoberta, string> = {
  recorde_carga: "🏆 Marca pessoal",
  recorde_reps: "🏆 Marca pessoal",
  mais_carga: "Mais carga",
  mais_reps: "Mais repetições",
  acima_media: "Acima da média",
};

export const ehRecorde = (d: Pick<Descoberta, "tipo">) => d.tipo === "recorde_carga" || d.tipo === "recorde_reps";

/** “25 kg × 20 → 31,5 kg × 25” (ou a média, quando a comparação é com ela). */
export function antesDepois(d: D): string {
  const hoje = `${kgBR(d.atual.carga)} × ${d.atual.reps}`;
  if (d.anterior) return `${kgBR(d.anterior.carga)} × ${d.anterior.reps} → ${hoje}`;
  if (d.media) return `média ${numeroBR(d.media.reps)} reps → ${hoje}`;
  return hoje;
}

/** O ganho em destaque: “+6,5 kg”, “+5 reps”, “+6,5 kg · +5 reps”. Vazio quando não há o que somar. */
export function ganho(d: D): string {
  const partes: string[] = [];
  if (d.anterior) {
    const c = Math.round((d.atual.carga - d.anterior.carga) * 100) / 100;
    const r = d.atual.reps - d.anterior.reps;
    if (c > 0) partes.push(`+${numeroBR(c)} kg`);
    if (r > 0) partes.push(`+${r} ${r === 1 ? "rep" : "reps"}`);
  } else if (d.media) {
    const r = Math.round((d.atual.reps - d.media.reps) * 10) / 10;
    if (r > 0) partes.push(`+${numeroBR(r)} reps`);
  }
  return partes.join(" · ");
}

/** Uma evolução por exercício (a primeira da lista, que já vem da mais recente), até `max`. */
export function porExercicio<T extends Pick<Descoberta, "exercicio">>(lista: T[], max = 3): T[] {
  const vistos = new Set<string>();
  const out: T[] = [];
  for (const d of lista) {
    const k = d.exercicio.trim().toLowerCase();
    if (vistos.has(k)) continue;
    vistos.add(k);
    out.push(d);
    if (out.length >= max) break;
  }
  return out;
}

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] || nome;

/** Mensagem pronta do WhatsApp para parabenizar (1 a 3 evoluções), sem pronomes. */
export function mensagemParabens(nome: string, lista: D[]): string {
  const n = primeiroNome(nome);
  const itens = porExercicio(lista, 3);
  if (!itens.length) return `Fala, ${n}! Passando para lembrar que constância também é evolução. Bora para o próximo treino! 💪`;
  const linhas = itens.map((d) => {
    const g = ganho(d);
    return `• ${d.exercicio}: ${antesDepois(d)}${g ? ` (${g})` : ""}`;
  });
  return [`Fala, ${n}! Vi a evolução nos últimos treinos e fiz questão de parabenizar:`, "", ...linhas, "", `Isso é resultado da constância, ${n}. Bora manter o ritmo! 💪`].join("\n");
}
