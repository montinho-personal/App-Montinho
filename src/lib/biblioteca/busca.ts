// ============================================================================
// Busca da biblioteca: nome completo ou parcial, sinônimos, grupo muscular,
// equipamento e padrão de movimento. Determinística, local e instantânea
// (≈150 itens), com explicação do porquê de cada resultado.
//
// Pontuação (maior = melhor):
//   100 nome exato · 95 sinônimo exato · 85 nome começa com a busca
//    80 grupo muscular exato · 75 equipamento/padrão exato
//    82 sinônimo começa com a busca como palavra inteira ("pulley triângulo")
//    72 todas as palavras no início de palavras do nome (frase contínua)
//    70 todas as palavras no nome · 70 equipamento/padrão por prefixo
//    65 todas as palavras em um sinônimo · 60 sinônimo começa com a busca
//    40 palavras espalhadas entre nome, sinônimos, grupo e equipamento
// Só ficam resultados com pelo menos 85% da melhor pontuação, para não
// misturar movimentos inadequados (ex.: "leg" traz leg press, não "leg curl").
// ============================================================================

import type { Equipamento, GrupoMuscular } from "@/lib/supabase/types-extended";
import { GRUPO_LABEL, normalizarNome } from "@/lib/grupos";
import { EQUIPAMENTO_LABEL, PADRAO_LABEL, type ItemBiblioteca, type PadraoMovimento, type TipoMovimento } from "./tipos";

export type FiltrosBusca = {
  grupo?: GrupoMuscular | null;
  /** Considera também o grupo como músculo secundário. */
  incluirSecundarios?: boolean;
  equipamento?: Equipamento | null;
  padrao?: PadraoMovimento | null;
  tipo?: TipoMovimento | null;
  somenteFavoritos?: boolean;
  somenteSemMidia?: boolean;
};

export type OpcoesBusca = {
  favoritos?: Set<string>;
  /** id do exercício → quantas vezes o treinador já prescreveu (dado real). */
  uso?: Map<string, number>;
  limite?: number;
};

export type ResultadoBusca = { item: ItemBiblioteca; score: number; motivo: string };

const RELATIVO = 0.85;

function palavras(s: string): string[] {
  return normalizarNome(s)
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

/** Todas as palavras da busca casam com o início de alguma palavra do texto. */
function todasPorPrefixo(tokens: string[], alvo: string[]): boolean {
  return tokens.every((t) => alvo.some((w) => w.startsWith(t)));
}

/** As palavras aparecem em sequência no texto (cada uma como prefixo). */
function fraseContinua(tokens: string[], alvo: string[]): boolean {
  for (let i = 0; i + tokens.length <= alvo.length; i++) {
    if (tokens.every((t, j) => alvo[i + j].startsWith(t))) return true;
  }
  return false;
}

export function passaFiltros(item: ItemBiblioteca, f: FiltrosBusca, favoritos?: Set<string>): boolean {
  if (f.grupo) {
    const noPrincipal = item.grupo === f.grupo;
    const noSecundario = !!f.incluirSecundarios && item.secundarios.includes(f.grupo);
    if (!noPrincipal && !noSecundario) return false;
  }
  if (f.equipamento && !item.equipamento.includes(f.equipamento)) return false;
  if (f.padrao && item.padrao !== f.padrao) return false;
  if (f.tipo && item.tipo !== f.tipo) return false;
  if (f.somenteFavoritos && !favoritos?.has(item.id)) return false;
  if (f.somenteSemMidia && item.midia?.verificada) return false;
  return true;
}

function pontuar(item: ItemBiblioteca, consulta: string, tokens: string[]): { score: number; motivo: string } {
  const nome = normalizarNome(item.nome);
  const nomeW = palavras(item.nome);
  const sins = item.sinonimos.map((s) => ({ txt: normalizarNome(s), w: palavras(s) }));
  const grupoLabel = normalizarNome(GRUPO_LABEL[item.grupo] ?? item.grupo);
  const grupoKey = normalizarNome(item.grupo.replace(/_/g, " "));
  const equips = item.equipamento.map((e) => ({ label: normalizarNome(EQUIPAMENTO_LABEL[e] ?? e), key: normalizarNome(e.replace(/_/g, " ")) }));
  const padrao = item.padrao ? normalizarNome(PADRAO_LABEL[item.padrao]) : "";
  const padraoKey = item.padrao ? normalizarNome(item.padrao.replace(/_/g, " ")) : "";

  if (nome === consulta) return { score: 100, motivo: "nome" };
  const sinExato = sins.find((s) => s.txt === consulta);
  if (sinExato) return { score: 95, motivo: `sinônimo “${item.sinonimos[sins.indexOf(sinExato)]}”` };
  if (nome.startsWith(consulta)) return { score: 85, motivo: "nome" };
  const sinPalavra = sins.find((s) => s.txt.startsWith(consulta + " "));
  if (sinPalavra) return { score: 82, motivo: `sinônimo “${item.sinonimos[sins.indexOf(sinPalavra)]}”` };
  if (consulta === grupoLabel || consulta === grupoKey) return { score: 80, motivo: `grupo ${GRUPO_LABEL[item.grupo]}` };
  const eqExato = equips.find((e) => e.label === consulta || e.key === consulta);
  if (eqExato) return { score: 75, motivo: `equipamento ${eqExato.label}` };
  if (padrao && (consulta === padrao || consulta === padraoKey)) return { score: 75, motivo: `padrão ${PADRAO_LABEL[item.padrao!]}` };
  if (fraseContinua(tokens, nomeW)) return { score: 72, motivo: "nome" };
  if (todasPorPrefixo(tokens, nomeW)) return { score: 70, motivo: "nome" };
  const eqPrefixo = equips.find((e) => todasPorPrefixo(tokens, palavras(e.label)) || todasPorPrefixo(tokens, palavras(e.key)));
  if (eqPrefixo) return { score: 70, motivo: `equipamento ${eqPrefixo.label}` };
  if (padrao && (todasPorPrefixo(tokens, palavras(padrao)) || todasPorPrefixo(tokens, palavras(padraoKey)))) {
    return { score: 70, motivo: `padrão ${PADRAO_LABEL[item.padrao!]}` };
  }
  const sinTodas = sins.find((s) => todasPorPrefixo(tokens, s.w));
  if (sinTodas) return { score: 65, motivo: `sinônimo “${item.sinonimos[sins.indexOf(sinTodas)]}”` };
  if (sins.some((s) => s.txt.startsWith(consulta))) return { score: 60, motivo: "sinônimo" };
  const tudo = [...nomeW, ...sins.flatMap((s) => s.w), ...palavras(grupoLabel), ...equips.flatMap((e) => palavras(e.label))];
  if (todasPorPrefixo(tokens, tudo)) return { score: 40, motivo: "nome e características" };
  return { score: 0, motivo: "" };
}

export function buscarExercicios(itens: ItemBiblioteca[], consulta: string, filtros: FiltrosBusca = {}, opcoes: OpcoesBusca = {}): ResultadoBusca[] {
  const favoritos = opcoes.favoritos;
  const uso = opcoes.uso;
  const base = itens.filter((i) => passaFiltros(i, filtros, favoritos));
  const q = normalizarNome(consulta).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  const bonus = (i: ItemBiblioteca) => (favoritos?.has(i.id) ? 3 : 0) + Math.min(5, uso?.get(i.id) ?? 0) * 0.5;

  let out: ResultadoBusca[];
  if (!q) {
    out = base.map((item) => ({ item, score: bonus(item), motivo: "" }));
  } else {
    const tokens = q.split(" ");
    const pontuados = base
      .map((item) => {
        const p = pontuar(item, q, tokens);
        return { item, score: p.score, motivo: p.motivo };
      })
      .filter((r) => r.score > 0);
    const melhor = pontuados.reduce((m, r) => Math.max(m, r.score), 0);
    out = pontuados.filter((r) => r.score >= melhor * RELATIVO).map((r) => ({ ...r, score: r.score + bonus(r.item) }));
  }
  out.sort((a, b) => b.score - a.score || a.item.nome.localeCompare(b.item.nome, "pt-BR"));
  return opcoes.limite ? out.slice(0, opcoes.limite) : out;
}
