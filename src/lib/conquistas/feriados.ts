// ============================================================================
// Troféus de feriado (pedido do Montinho, 29/10/2026): treinar no feriado vale
// troféu com o NOME do feriado — musculação e cardio separados, e +1 se fizer
// os dois no mesmo feriado. Repetem a cada feriado (referência = feriado:ano).
//   • Musculação: conta como no carimbo (concluída, ou extra/livre com séries).
//   • Cardio: dia de cardio válido (mesma regra do Montinho Cardio).
//   • Carnaval vale na segunda ou na terça (os dois dias são o mesmo feriado).
// Dia = horário de Brasília. PURO. Datas em `feriadosDoAno` (fixos + Páscoa).
// ============================================================================
import { dataLocal } from "@/lib/aderencia/calcular";
import { contaCarimbo } from "./carimbos";
import { diasDeCardio, type CardioFeito } from "@/lib/cardio/regras";
import type { SessaoAderencia } from "@/lib/aderencia/calcular";

export type CodigoFeriado = "feriado_musculacao" | "feriado_cardio" | "feriado_combo";
export const CODIGOS_FERIADO: CodigoFeriado[] = ["feriado_musculacao", "feriado_cardio", "feriado_combo"];

export type Feriado = { slug: string; nome: string; emoji: string; datas: string[] };

const p2 = (n: number) => String(n).padStart(2, "0");
const iso = (a: number, m: number, d: number) => `${a}-${p2(m)}-${p2(d)}`;
function somar(dia: string, n: number): string {
  const x = new Date(`${dia}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}
/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
export function pascoa(ano: number): string {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(ano, mes, dia);
}

/** Feriados nacionais + Carnaval, em ordem de data. */
export function feriadosDoAno(ano: number): Feriado[] {
  const p = pascoa(ano);
  const lista: Feriado[] = [
    { slug: "ano_novo", nome: "Ano Novo", emoji: "🎆", datas: [iso(ano, 1, 1)] },
    { slug: "carnaval", nome: "Carnaval", emoji: "🎭", datas: [somar(p, -48), somar(p, -47)] },
    { slug: "sexta_santa", nome: "Sexta-feira Santa", emoji: "🕊️", datas: [somar(p, -2)] },
    { slug: "tiradentes", nome: "Tiradentes", emoji: "🇧🇷", datas: [iso(ano, 4, 21)] },
    { slug: "dia_do_trabalho", nome: "Dia do Trabalho", emoji: "🛠️", datas: [iso(ano, 5, 1)] },
    { slug: "corpus_christi", nome: "Corpus Christi", emoji: "⛪", datas: [somar(p, 60)] },
    { slug: "independencia", nome: "Independência", emoji: "🇧🇷", datas: [iso(ano, 9, 7)] },
    { slug: "aparecida", nome: "Nossa Senhora Aparecida", emoji: "🙏", datas: [iso(ano, 10, 12)] },
    { slug: "finados", nome: "Finados", emoji: "🕯️", datas: [iso(ano, 11, 2)] },
    { slug: "republica", nome: "Proclamação da República", emoji: "🏛️", datas: [iso(ano, 11, 15)] },
    { slug: "consciencia_negra", nome: "Consciência Negra", emoji: "✊🏿", datas: [iso(ano, 11, 20)] },
    { slug: "natal", nome: "Natal", emoji: "🎄", datas: [iso(ano, 12, 25)] },
  ];
  return lista.sort((a, b) => (a.datas[0] < b.datas[0] ? -1 : 1));
}

export function feriadoDoDia(dia: string): Feriado | null {
  return feriadosDoAno(Number(dia.slice(0, 4))).find((f) => f.datas.includes(dia)) ?? null;
}

/** Referência gravada no troféu: “finados:2026”. */
export const referenciaFeriado = (f: Feriado, dia: string) => `${f.slug}:${dia.slice(0, 4)}`;

/** Nome do troféu com o nome do feriado. */
export function tituloFeriado(codigo: CodigoFeriado, nome: string): string {
  return codigo === "feriado_musculacao" ? `${nome} Pago` : codigo === "feriado_cardio" ? `${nome} de Fôlego` : `${nome} Completo`;
}

/** Destaque no app: hoje é feriado (“hoje”) ou amanhã é (“amanha”). */
export function destaqueFeriado(hoje: string): { feriado: Feriado; quando: "hoje" | "amanha"; dia: string } | null {
  const h = feriadoDoDia(hoje);
  if (h) return { feriado: h, quando: "hoje", dia: hoje };
  const amanha = somar(hoje, 1);
  const a = feriadoDoDia(amanha);
  // Carnaval: na segunda, o “amanhã” (terça) já é hoje — tratado acima.
  return a ? { feriado: a, quando: "amanha", dia: amanha } : null;
}

/** Próximo feriado a partir de hoje (inclusive). */
export function proximoFeriado(hoje: string): { feriado: Feriado; dia: string } | null {
  for (const ano of [Number(hoje.slice(0, 4)), Number(hoje.slice(0, 4)) + 1]) {
    for (const f of feriadosDoAno(ano)) {
      const d = f.datas.find((x) => x >= hoje);
      if (d) return { feriado: f, dia: d };
    }
  }
  return null;
}

type SessaoDia = SessaoAderencia & { id: string; conta_aderencia?: boolean | null };
export type TrofeuFeriado = { codigo: CodigoFeriado; referencia: string; titulo: string; data: string; sessaoId: string | null; descricao: string; evidencia: Record<string, unknown> };

const fmt = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export function trofeusDeFeriado(sessoes: SessaoDia[], cardios: CardioFeito[]): TrofeuFeriado[] {
  const musc = new Map<string, { s: SessaoDia; dia: string; f: Feriado }>();
  for (const s of sessoes.filter(contaCarimbo).sort((a, b) => (a.iniciado_em < b.iniciado_em ? -1 : 1))) {
    const dia = dataLocal(s.iniciado_em);
    const f = feriadoDoDia(dia);
    if (!f) continue;
    const ref = referenciaFeriado(f, dia);
    if (!musc.has(ref)) musc.set(ref, { s, dia, f });
  }
  const card = new Map<string, { em: string; dia: string; minutos: number; f: Feriado }>();
  for (const d of diasDeCardio(cardios)) {
    if (!d.valido || !d.validoEm) continue;
    const f = feriadoDoDia(d.data);
    if (!f) continue;
    const ref = referenciaFeriado(f, d.data);
    if (!card.has(ref)) card.set(ref, { em: d.validoEm, dia: d.data, minutos: d.minutos, f });
  }
  const out: TrofeuFeriado[] = [];
  for (const [ref, m] of musc) out.push({ codigo: "feriado_musculacao", referencia: ref, titulo: tituloFeriado("feriado_musculacao", m.f.nome), data: m.s.iniciado_em, sessaoId: m.s.id, descricao: `Treino de musculação no feriado de ${m.f.nome} (${fmt(m.dia)}).`, evidencia: { feriado: m.f.slug, dia: m.dia, sessao: m.s.id } });
  for (const [ref, c] of card) out.push({ codigo: "feriado_cardio", referencia: ref, titulo: tituloFeriado("feriado_cardio", c.f.nome), data: c.em, sessaoId: null, descricao: `${c.minutos} min de cardio no feriado de ${c.f.nome} (${fmt(c.dia)}).`, evidencia: { feriado: c.f.slug, dia: c.dia } });
  for (const [ref, m] of musc) {
    const c = card.get(ref);
    if (!c) continue;
    out.push({ codigo: "feriado_combo", referencia: ref, titulo: tituloFeriado("feriado_combo", m.f.nome), data: m.s.iniciado_em > c.em ? m.s.iniciado_em : c.em, sessaoId: m.s.id, descricao: `Musculação e cardio no feriado de ${m.f.nome}.`, evidencia: { feriado: m.f.slug, musculacao: m.dia, cardio: c.dia } });
  }
  return out;
}
