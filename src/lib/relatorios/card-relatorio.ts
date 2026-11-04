// ============================================================================
// Cards para compartilhar dos relatórios (pedido do Montinho, 04/11/2026:
// “gerar card para relatórios, tanto de evolução, quanto evolução de peso,
// quanto evolução das medidas, da avaliação física”). Regras PURAS: o que vai
// no card. O desenho (Story 1080×1920 com o logo oficial completo) fica em
// src/components/relatorios/cardRelatorio.ts.
// Rótulos neutros em peso e medidas: só a seta (subiu/desceu), sem “ideal”.
// Só o primeiro nome da pessoa.
// ============================================================================
import type { CargaEmAlta } from "@/lib/relatorios/cargas-em-alta";
import type { PainelEvolucao } from "@/lib/relatorios/painel-aluno";
import type { LinhaAntesDepois } from "@/lib/medidas/leitura";
import type { RelatorioAvaliacao } from "@/lib/medidas/relatorio-avaliacao";
import type { EvolucaoAvaliacao } from "@/lib/medidas/evolucao-avaliacao";

export type NumeroCard = { valor: string; rotulo: string; detalhe?: string };
export type LinhaCard = { titulo: string; valor: string; detalhe?: string };
export type CardRelatorio = {
  tipo: "evolucao" | "peso" | "medidas" | "avaliacao";
  /** Linha dourada pequena, em maiúsculas. */
  chamada: string;
  titulo: string;
  sub: string;
  /** Até 3 números grandes. */
  numeros: NumeroCard[];
  /** Até 5 linhas “antes → agora”. */
  linhas: LinhaCard[];
  /** Linha do tempo (peso). */
  grafico?: { valores: number[]; inicio: string; fim: string };
  nome: string;
  data: string;
  legenda: string;
  arquivo: string;
  /** Referência do evento de compartilhar. */
  ref: string;
};

export const MAX_LINHAS_CARD = 5;
const LEGENDA = "Evolução registrada no app do Montinho Personal Trainer 💪 @montinho_personal";

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const ddmmaa = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
export const primeiroNome = (nome: string | null | undefined) => (nome ?? "").trim().split(/\s+/)[0] ?? "";

/** Diferença neutra: “↓ 3,2 kg”, “↑ 1 cm”, “igual”. */
export function setaNeutra(d: number | null, unidade: string): string {
  if (d == null) return "";
  const r = Math.round(d * 10) / 10;
  if (r === 0) return "igual";
  return `${r > 0 ? "↑" : "↓"} ${fmt(Math.abs(r))}${unidade ? ` ${unidade}` : ""}`;
}

/** Evolução dos treinos (topo da tela Evolução): números do período + cargas em alta. */
export function cardDaEvolucao(o: { painel: PainelEvolucao; emAlta: CargaEmAlta[]; dias: number; nome: string; hoje: string }): CardRelatorio | null {
  const numeros = o.painel.numeros
    .map((n) => ({ valor: n.valor.replace(/\s*🔥/u, "").trim(), rotulo: n.rotulo, detalhe: n.delta && (n.delta.tom === "alta" || n.delta.tom === "novo") && n.delta.texto !== "novo" ? n.delta.texto.replace("▲ ", "") : undefined }))
    .filter((n) => n.valor && n.valor !== "0" && n.valor !== "0 kg");
  const linhas = o.emAlta.slice(0, 3).map((c) => ({ titulo: c.nome, valor: `${fmt(c.primeira)} → ${fmt(c.ultima)} kg`, detalhe: `+${c.ganhoPct}% desde ${ddmm(c.desde)}` }));
  if (!numeros.length && !linhas.length) return null;
  const treinos = Number(o.painel.numeros[0]?.valor) || 0;
  const titulo = linhas.length ? "MAIS FORTE A CADA TREINO" : treinos > 1 ? `${treinos} TREINOS NA CONTA` : "CADA TREINO CONTA";
  return {
    tipo: "evolucao",
    chamada: "MINHA EVOLUÇÃO",
    titulo,
    sub: `Últimos ${o.dias} dias`,
    numeros: numeros.slice(0, 3),
    linhas,
    nome: primeiroNome(o.nome),
    data: ddmmaa(o.hoje),
    legenda: LEGENDA,
    arquivo: `minha-evolucao-${o.dias}-dias-${o.hoje}.png`,
    ref: `relatorio:evolucao:${o.dias}`,
  };
}

/** Evolução do peso (aba ⚖️ Peso): antes, agora, diferença neutra e a linha do tempo. */
export function cardDoPeso(o: { pesos: Array<{ data: string; kg: number }>; nome: string; hoje: string }): CardRelatorio | null {
  const p = o.pesos.filter((x) => Number.isFinite(x.kg) && x.kg > 0);
  if (p.length < 2) return null;
  const a = p[0];
  const b = p.at(-1)!;
  return {
    tipo: "peso",
    chamada: "MINHA EVOLUÇÃO",
    titulo: "PESO",
    sub: `${ddmmaa(a.data)} → ${ddmmaa(b.data)}`,
    numeros: [
      { valor: `${fmt(a.kg)} kg`, rotulo: "antes" },
      { valor: `${fmt(b.kg)} kg`, rotulo: "agora" },
      { valor: setaNeutra(b.kg - a.kg, "kg") || "igual", rotulo: "diferença" },
    ],
    linhas: [],
    grafico: { valores: p.map((x) => x.kg), inicio: ddmm(a.data), fim: ddmm(b.data) },
    nome: primeiroNome(o.nome),
    data: ddmmaa(o.hoje),
    legenda: LEGENDA,
    arquivo: `meu-peso-${b.data}.png`,
    ref: "relatorio:peso",
  };
}

// Ordem das medidas no card: corpo primeiro, depois as circunferências.
const PRIORIDADE: Record<LinhaAntesDepois["grupo"], number> = { corpo: 0, bioimpedancia: 1, circunferencias: 2, outras: 3 };

/** Medidas antes × depois (comparador): as que mudaram, até 5. */
export function cardDasMedidas(o: { linhas: LinhaAntesDepois[]; antes: string; depois: string; nome: string; hoje: string }): CardRelatorio | null {
  const mudaram = o.linhas
    .filter((l) => l.antes != null && l.depois != null && l.diferenca != null && l.diferenca !== 0)
    .map((l, i) => ({ l, i }))
    .sort((x, y) => PRIORIDADE[x.l.grupo] - PRIORIDADE[y.l.grupo] || x.i - y.i)
    .map((x) => x.l);
  if (!mudaram.length || o.antes === o.depois) return null;
  return {
    tipo: "medidas",
    chamada: "MINHA EVOLUÇÃO",
    titulo: "MEDIDAS: ANTES × DEPOIS",
    sub: `${ddmmaa(o.antes)} → ${ddmmaa(o.depois)}`,
    numeros: [],
    linhas: mudaram.slice(0, MAX_LINHAS_CARD).map((l) => ({ titulo: l.rotulo, valor: `${fmt(l.antes!)} → ${fmt(l.depois!)} ${l.unidade}`.trim(), detalhe: setaNeutra(l.diferenca, l.unidade === "%" ? "pontos" : l.unidade) })),
    nome: primeiroNome(o.nome),
    data: ddmmaa(o.hoje),
    legenda: LEGENDA,
    arquivo: `minhas-medidas-${o.depois}.png`,
    ref: "relatorio:medidas",
  };
}

/** Avaliação física de 7 dobras: % de gordura, massa magra e peso (+ comparação com a anterior). */
export function cardDaAvaliacao(o: { rel: RelatorioAvaliacao; nome: string; /** Evoluiu (evolucao-avaliacao.ts): o card vira “EU EVOLUÍ!”. */ evolucao?: EvolucaoAvaliacao | null }): CardRelatorio | null {
  const p = o.rel.principais;
  const comp = new Map(o.rel.comparacao.map((l) => [l.rotulo, l]));
  const num = (v: number | null, unidade: string, rotulo: string, chave: string, unDif: string): NumeroCard | null => {
    if (v == null) return null;
    const d = comp.get(chave)?.diferenca ?? null;
    return { valor: `${fmt(v)}${unidade}`, rotulo, detalhe: d != null && o.rel.anterior ? setaNeutra(d, unDif) : undefined };
  };
  const numeros = [
    num(p.gorduraPct, "%", "de gordura", "% de gordura", "pontos"),
    num(p.massaMagraKg, " kg", "massa magra", "Massa magra", "kg"),
    num(p.pesoKg, " kg", "peso", "Peso", "kg"),
  ].filter((n): n is NumeroCard => n != null);
  if (!numeros.length) return null;
  const linhas = o.rel.anterior
    ? o.rel.comparacao
        .filter((l) => l.atual != null && l.anterior != null && l.diferenca != null && l.diferenca !== 0)
        .slice(0, 4)
        .map((l) => ({ titulo: l.rotulo, valor: `${fmt(l.anterior!)} → ${fmt(l.atual!)} ${l.unidade}`, detalhe: setaNeutra(l.diferenca, l.unidade === "%" ? "pontos" : l.unidade) }))
    : [];
  return {
    tipo: "avaliacao",
    chamada: o.evolucao?.evoluiu ? "EVOLUÇÃO NA AVALIAÇÃO FÍSICA" : "AVALIAÇÃO FÍSICA",
    titulo: o.evolucao?.evoluiu ? "EU EVOLUÍ!" : o.rel.anterior ? "MINHA EVOLUÇÃO" : "MINHA AVALIAÇÃO",
    sub: o.rel.anterior ? `${ddmmaa(o.rel.anterior.data)} → ${ddmmaa(o.rel.data)}` : `7 dobras · ${ddmmaa(o.rel.data)}`,
    numeros,
    linhas,
    nome: primeiroNome(o.nome),
    data: ddmmaa(o.rel.data),
    legenda: LEGENDA,
    arquivo: `avaliacao-fisica-${o.rel.data}.png`,
    ref: `relatorio:avaliacao:${o.rel.id}`,
  };
}
