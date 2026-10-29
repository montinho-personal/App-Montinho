// Leitura de medidas do arquivo de avaliação (pedido do Montinho, 29/10/2026:
// “subi o PDF com antes e depois: puxe tudo e mostre o gráfico”). Regras PURAS:
// a IA só transcreve; aqui o app confere datas, limites e nomes antes de a
// pessoa ver a prévia — e nada é salvo sem ela tocar em “Salvar”.
import { CAMPOS_MEDIDA, type ChaveMedida } from "./campos";

/** Medida que não tem campo próprio (ex.: “Braço direito contraído”, “Dobra tricipital”). */
export type MedidaExtra = { nome: string; valor: number; unidade: string };
export type AvaliacaoLida = { data: string; medidas: Partial<Record<ChaveMedida, number>>; extras: MedidaExtra[] };

export const MAX_EXTRAS = 60;
const UNIDADES = ["cm", "mm", "kg", "%", "kcal", "anos", "nível", "pontos", "kg/m²", "L", "bpm", "mmHg", "m", "g"] as const;

const arred = (n: number) => Math.round(n * 100) / 100;
const dataValida = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T12:00:00Z`)) && new Date(`${d}T12:00:00Z`).toISOString().slice(0, 10) === d;

/** Nome normalizado para casar a mesma medida em datas diferentes (sem acento, minúsculo, sem espaços repetidos). */
export function chaveExtra(nome: string): string {
  return nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9%]+/g, " ").trim();
}

function unidade(u: string): string {
  const t = u.trim();
  const achada = UNIDADES.find((x) => x.toLowerCase() === t.toLowerCase());
  return achada ?? t.slice(0, 12);
}

/** Uma extra válida (nome curto, número positivo e razoável) ou null. */
export function extraValida(e: { nome?: unknown; valor?: unknown; unidade?: unknown }): MedidaExtra | null {
  const nome = typeof e.nome === "string" ? e.nome.replace(/\s+/g, " ").trim().slice(0, 60) : "";
  const valor = typeof e.valor === "number" ? e.valor : Number(String(e.valor ?? "").replace(",", "."));
  if (!nome || !Number.isFinite(valor) || valor <= 0 || valor > 10000) return null;
  return { nome, valor: arred(valor), unidade: unidade(typeof e.unidade === "string" ? e.unidade : "") };
}

type Bruta = { data?: unknown; medidas?: Record<string, unknown> | null; extras?: unknown[] | null };

/**
 * Confere o que a IA devolveu: só datas válidas e até hoje, campos dentro dos
 * limites de CAMPOS_MEDIDA (fora do limite vira “extra” para a pessoa conferir,
 * nunca some calado), sem medidas repetidas, em ordem de data (antes → depois).
 * Datas iguais são juntadas.
 */
export function normalizarLeitura(brutas: Bruta[], hoje: string): AvaliacaoLida[] {
  const porData = new Map<string, AvaliacaoLida>();
  for (const b of brutas) {
    const data = typeof b.data === "string" ? b.data.trim() : "";
    if (!dataValida(data) || data > hoje) continue;
    const alvo = porData.get(data) ?? { data, medidas: {}, extras: [] };
    for (const c of CAMPOS_MEDIDA) {
      const v = b.medidas?.[c.chave];
      const n = typeof v === "number" ? v : v == null ? NaN : Number(String(v).replace(",", "."));
      if (!Number.isFinite(n)) continue;
      if (n >= c.min && n <= c.max) alvo.medidas[c.chave] ??= arred(n);
      else {
        const ex = extraValida({ nome: `${c.rotulo} (conferir)`, valor: n, unidade: c.unidade });
        if (ex) alvo.extras.push(ex);
      }
    }
    for (const e of b.extras ?? []) {
      const ex = e && typeof e === "object" ? extraValida(e as Record<string, unknown>) : null;
      if (ex && !alvo.extras.some((x) => chaveExtra(x.nome) === chaveExtra(ex.nome))) alvo.extras.push(ex);
    }
    alvo.extras = alvo.extras.slice(0, MAX_EXTRAS);
    porData.set(data, alvo);
  }
  return [...porData.values()].filter((a) => Object.keys(a.medidas).length || a.extras.length).sort((a, b) => (a.data < b.data ? -1 : 1));
}

export type LinhaAntesDepois = { chave: string; rotulo: string; unidade: string; antes: number | null; depois: number | null; diferenca: number | null; grupo: "corpo" | "bioimpedancia" | "circunferencias" | "outras" };

type RegistroMedidas = { data: string; extras?: MedidaExtra[] | null } & Partial<Record<ChaveMedida, number | null>>;

/**
 * Antes × depois entre dois registros: campos do app (menos altura) e as
 * medidas extras com o mesmo nome. Diferença sem julgar se é bom ou ruim
 * (rótulos neutros: quem interpreta é o personal).
 */
export function antesDepois(a: RegistroMedidas | undefined, b: RegistroMedidas | undefined): LinhaAntesDepois[] {
  if (!a || !b) return [];
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
  const linha = (chave: string, rotulo: string, unidadeL: string, grupo: LinhaAntesDepois["grupo"], av: number | null, bv: number | null): LinhaAntesDepois => ({
    chave, rotulo, unidade: unidadeL, antes: av, depois: bv, grupo, diferenca: av != null && bv != null ? arred(bv - av) : null,
  });
  const out: LinhaAntesDepois[] = [];
  for (const c of CAMPOS_MEDIDA) {
    if (c.chave === "altura_cm") continue;
    const av = num(a[c.chave]);
    const bv = num(b[c.chave]);
    if (av != null || bv != null) out.push(linha(c.chave, c.rotulo, c.unidade, c.grupo, av, bv));
  }
  const ea = new Map((a.extras ?? []).map((e) => [chaveExtra(e.nome), e]));
  const eb = new Map((b.extras ?? []).map((e) => [chaveExtra(e.nome), e]));
  for (const k of new Set([...ea.keys(), ...eb.keys()])) {
    const x = ea.get(k) ?? eb.get(k)!;
    out.push(linha(`extra:${k}`, x.nome, x.unidade, "outras", ea.get(k)?.valor ?? null, eb.get(k)?.valor ?? null));
  }
  return out;
}
