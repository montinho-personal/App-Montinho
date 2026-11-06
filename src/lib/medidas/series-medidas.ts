// PURO: a linha do tempo de CADA medida (06/11/2026, pedido do Montinho:
// “precisamos de gráficos também de cada medida”). Junta os campos fixos e as
// medidas extras do laudo (dobras, lado esquerdo, pescoço…) por nome; só entra
// medida com 2+ datas. Rótulos neutros: o app não diz se subir ou descer é bom.
import type { Evolucao } from "@/lib/supabase/types";
import { CAMPOS_MEDIDA } from "./campos";

export type GrupoSerie = "corpo" | "circunferencias" | "dobras" | "outras";
export type PontoSerie = { data: string; valor: number };
export type SerieMedida = { chave: string; rotulo: string; unidade: string; grupo: GrupoSerie; pontos: PontoSerie[] };

export const ROTULO_GRUPO_SERIE: Record<GrupoSerie, string> = { corpo: "Corpo", circunferencias: "Circunferências", dobras: "Dobras", outras: "Outras" };

const DIREITO: Record<string, string> = { braco_cm: "Braço esquerdo", coxa_cm: "Coxa esquerda", panturrilha_cm: "Panturrilha esquerda" };
const ROTULO_DIREITO: Record<string, string> = { braco_cm: "Braço direito", coxa_cm: "Coxa direita", panturrilha_cm: "Panturrilha direita" };
const ordem = (a: Evolucao, b: Evolucao) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.created_at < b.created_at ? -1 : 1);
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function grupoDoExtra(nome: string, unidade: string): GrupoSerie | null {
  const n = semAcento(nome);
  if (/imped|reatanc|angulo de fase/.test(n)) return null; // números técnicos do aparelho
  if (n.startsWith("dobra") || n.includes("soma das")) return "dobras";
  if (unidade === "cm") return "circunferencias";
  if (/massa|gordura|imc|agua|proteina|minera|metabol|densidade|cintura.quadril/.test(n)) return "corpo";
  return "outras";
}

function adicionar(mapa: Map<string, SerieMedida>, s: Omit<SerieMedida, "pontos">, data: string, valor: number) {
  const atual = mapa.get(s.chave) ?? { ...s, pontos: [] };
  const i = atual.pontos.findIndex((p) => p.data === data);
  // Mesmo dia lançado 2× (correção): vale o último.
  if (i >= 0) atual.pontos[i] = { data, valor };
  else atual.pontos.push({ data, valor });
  mapa.set(s.chave, atual);
}

export function seriesDeMedidas(medidas: Evolucao[]): SerieMedida[] {
  const todas = [...medidas].sort(ordem);
  const temEsquerdo = (k: string) => todas.some((m) => (m.extras ?? []).some((e) => e.nome === DIREITO[k]));
  const mapa = new Map<string, SerieMedida>();
  for (const m of todas) {
    for (const c of CAMPOS_MEDIDA) {
      if (c.chave === "altura_cm") continue;
      const v = m[c.chave as keyof Evolucao];
      if (typeof v !== "number" || !(v > 0)) continue;
      const rotulo = c.chave === "gordura_pct" ? "% de gordura" : DIREITO[c.chave] && temEsquerdo(c.chave) ? ROTULO_DIREITO[c.chave] : c.rotulo;
      adicionar(mapa, { chave: c.chave, rotulo, unidade: c.unidade, grupo: c.grupo === "circunferencias" ? "circunferencias" : "corpo" }, m.data, v);
    }
    for (const e of m.extras ?? []) {
      if (typeof e.valor !== "number" || !Number.isFinite(e.valor)) continue;
      const g = grupoDoExtra(e.nome, e.unidade);
      if (!g) continue;
      adicionar(mapa, { chave: `x:${semAcento(e.nome)}`, rotulo: e.nome, unidade: e.unidade, grupo: g }, m.data, e.valor);
    }
  }
  const ordemGrupo: GrupoSerie[] = ["corpo", "circunferencias", "dobras", "outras"];
  return [...mapa.values()].filter((s) => s.pontos.length >= 2).sort((a, b) => ordemGrupo.indexOf(a.grupo) - ordemGrupo.indexOf(b.grupo));
}

/** Resumo neutro da série: primeiro, último, diferença, menor e maior. */
export function resumoSerie(s: SerieMedida) {
  const p = s.pontos;
  const valores = p.map((x) => x.valor);
  const dif = Math.round((p.at(-1)!.valor - p[0].valor) * 100) / 100;
  return { primeiro: p[0], ultimo: p.at(-1)!, diferenca: dif, menor: Math.min(...valores), maior: Math.max(...valores) };
}

/** Pontos dentro do período (“tudo”, 365 ou 180 dias até o último registro). */
export function noPeriodo(s: SerieMedida, dias: number | null): PontoSerie[] {
  if (!dias) return s.pontos;
  const fim = Date.parse(`${s.pontos.at(-1)!.data}T12:00:00Z`);
  return s.pontos.filter((p) => fim - Date.parse(`${p.data}T12:00:00Z`) <= dias * 86_400_000);
}
