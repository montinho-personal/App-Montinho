// ============================================================================
// Resumo visual de QUALQUER avaliação física (pedido do Montinho, 06/11/2026,
// caso da Michelle: subiu a bioimpedância InBody e “não achava nada visual”
// na ficha, nas medidas nem no relatório). Regras PURAS.
//
// Uma avaliação é uma linha de `evolucao`: campos de sempre (peso, % de
// gordura, massa muscular…) + `extras` (o que o laudo traz e não tem campo:
// IMC, água total, taxa metabólica, massa magra/gordura por segmento,
// impedâncias, dobras…). Os nomes dos extras vêm da leitura do arquivo, então
// reconhecemos pelo SENTIDO do nome (sem acento, minúsculo), nunca por texto exato.
//
// Comparação só com a avaliação ANTERIOR do MESMO MÉTODO (bioimpedância com
// bioimpedância, 7 dobras com 7 dobras): métodos diferentes dão números diferentes.
// Circunferências (fita métrica) comparam com o último registro que tem a medida.
// Rótulos e setas NEUTROS: quem interpreta o que é bom é o Montinho.
// ============================================================================
import { CAMPOS_MEDIDA, type ChaveMedida } from "@/lib/medidas/campos";
import { itensCircunferencia } from "@/lib/medidas/lados";
import { ehAvaliacao7Dobras, imcDe, type Linha } from "@/lib/medidas/relatorio-avaliacao";
import type { Evolucao } from "@/lib/supabase/types";

export type MetodoAvaliacao = "7_dobras" | "bioimpedancia" | "medidas";
export const ROTULO_METODO: Record<MetodoAvaliacao, string> = { "7_dobras": "7 dobras", bioimpedancia: "Bioimpedância", medidas: "Medidas" };

export type ParteCorpo = "braco_e" | "braco_d" | "tronco" | "perna_e" | "perna_d";
export const ROTULO_PARTE: Record<ParteCorpo, string> = { braco_e: "Braço esquerdo", braco_d: "Braço direito", tronco: "Tronco", perna_e: "Perna esquerda", perna_d: "Perna direita" };
export type Segmento = { parte: ParteCorpo; rotulo: string; magra: number | null; gordura: number | null };

export type ExtraAv = { nome: string; valor: number; unidade: string };

export type ResumoAvaliacao = {
  id: string;
  data: string;
  metodo: MetodoAvaliacao;
  personal: boolean;
  /** Números grandes do topo, na ordem de leitura. */
  principais: Linha[];
  /** Massa magra e gordura de cada parte do corpo (bioimpedância segmentar). */
  segmentos: Segmento[];
  circunferencias: Linha[];
  /** O resto do laudo (proteína, minerais, pontuação, dobras…), sem perder nada. */
  outros: ExtraAv[];
  /** Impedâncias (Ω): dado técnico do aparelho, recolhido na tela. */
  tecnicos: ExtraAv[];
  anterior: { id: string; data: string } | null;
  observacao: string | null;
  /** Avaliação de 7 dobras: o relatório próprio dela continua valendo. */
  ehSeteDobras: boolean;
};

const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const r1 = (n: number) => Math.round(n * 10) / 10;
const ordem = (a: Evolucao, b: Evolucao) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0);
const linha = (rotulo: string, unidade: string, atual: number | null, anterior: number | null): Linha => ({ rotulo, unidade, atual, anterior, diferenca: atual != null && anterior != null ? r1(atual - anterior) : null });
const campo = (m: Evolucao, k: ChaveMedida) => (typeof m[k] === "number" ? (m[k] as number) : null);

// ---------------------------------------------------------------------------
// Reconhecer os extras pelo sentido do nome
// ---------------------------------------------------------------------------
const ehImpedancia = (n: string) => /imped|reatanc|angulo de fase/.test(sem(n));
const ehSegmentar = (n: string) => /segment/.test(sem(n));
const ehDobra = (n: string) => /^dobra |soma das 7 dobras|densidade corporal/.test(sem(n));

/** Parte do corpo citada no nome (“Massa Magra Segmentar Braço Esquerdo” → braco_e). */
export function parteDoNome(nome: string): ParteCorpo | null {
  const t = sem(nome);
  const esq = /esquerd|\besq\b/.test(t);
  const dir = /direit|\bdir\b/.test(t);
  if (/tronco/.test(t)) return "tronco";
  if (/braco|membro superior/.test(t)) return esq ? "braco_e" : dir ? "braco_d" : null;
  if (/perna|membro inferior/.test(t)) return esq ? "perna_e" : dir ? "perna_d" : null;
  return null;
}

/** O extra é massa magra (true), gordura (false) ou outra coisa (null)? */
function tipoSegmentar(nome: string): "magra" | "gordura" | null {
  const t = sem(nome);
  if (/gordur/.test(t)) return "gordura";
  if (/magra|muscul|livre de gordura/.test(t)) return "magra";
  return null;
}

type Chave = "massa_gorda" | "imc" | "agua_l" | "tmb" | "rcq" | "pontuacao";
function chaveDoExtra(nome: string): Chave | null {
  const t = sem(nome);
  if (ehSegmentar(nome) || ehImpedancia(nome)) return null;
  if (/^massa (de )?gordura|^massa gorda|^gordura corporal \(kg\)/.test(t)) return "massa_gorda";
  if (/^imc\b|indice de massa corporal/.test(t)) return "imc";
  if (/agua corporal total|^agua total/.test(t)) return "agua_l";
  if (/metabolica basal|metabolismo basal|^tmb\b/.test(t)) return "tmb";
  if (/cintura.?quadril|\brcq\b/.test(t)) return "rcq";
  if (/pontuacao|score/.test(t)) return "pontuacao";
  return null;
}
const extraPorChave = (m: Evolucao, k: Chave) => (m.extras ?? []).find((e) => chaveDoExtra(e.nome) === k) ?? null;

/** Bioimpedância: tem campo ou extra que só o aparelho dá. */
function ehBioimpedancia(m: Evolucao): boolean {
  if (campo(m, "massa_muscular_kg") != null || campo(m, "gordura_visceral") != null || campo(m, "agua_pct") != null) return true;
  if ((m.extras ?? []).some((e) => ehImpedancia(e.nome) || ehSegmentar(e.nome) || chaveDoExtra(e.nome) === "agua_l" || chaveDoExtra(e.nome) === "tmb")) return true;
  return campo(m, "gordura_pct") != null || campo(m, "massa_magra_kg") != null;
}

export function metodoDa(m: Evolucao): MetodoAvaliacao {
  if (ehAvaliacao7Dobras(m)) return "7_dobras";
  if (ehBioimpedancia(m)) return "bioimpedancia";
  return "medidas";
}

/** A avaliação mais “completa” para mostrar em destaque: a mais recente com composição corporal; sem ela, o registro mais recente. */
export function avaliacaoEmDestaque(medidas: Evolucao[]): Evolucao | null {
  const todas = [...medidas].sort(ordem).reverse();
  return todas.find((m) => metodoDa(m) !== "medidas") ?? todas[0] ?? null;
}

// ---------------------------------------------------------------------------
// Resumo
// ---------------------------------------------------------------------------
export function resumoDaAvaliacao(medidas: Evolucao[], id: string, alturaCadastro: number | null = null): ResumoAvaliacao | null {
  const todas = [...medidas].sort(ordem);
  const atual = todas.find((m) => m.id === id);
  if (!atual) return null;
  const metodo = metodoDa(atual);
  const antes = todas.filter((m) => m.data < atual.data);
  const anterior = metodo === "medidas" ? null : [...antes].reverse().find((m) => metodoDa(m) === metodo) ?? null;

  const alturaA = campo(atual, "altura_cm") ?? alturaCadastro;
  const alturaB = anterior ? campo(anterior, "altura_cm") ?? alturaCadastro : null;
  const massaGorda = (m: Evolucao | null) => {
    if (!m) return null;
    const ex = extraPorChave(m, "massa_gorda")?.valor ?? (m.extras ?? []).find((e) => sem(e.nome) === "massa gorda")?.valor;
    if (ex != null) return ex;
    const p = campo(m, "peso_kg"), g = campo(m, "gordura_pct");
    return p && g != null ? r1((p * g) / 100) : null;
  };
  const imc = (m: Evolucao | null, alt: number | null) => (m ? extraPorChave(m, "imc")?.valor ?? imcDe(campo(m, "peso_kg"), alt) : null);
  const agua = (m: Evolucao | null) => (m ? extraPorChave(m, "agua_l") : null);
  const usados = new Set<string>();
  const marcar = (m: Evolucao, k: Chave) => {
    const e = extraPorChave(m, k);
    if (e) usados.add(e.nome);
  };
  (["massa_gorda", "imc", "agua_l", "tmb", "rcq"] as Chave[]).forEach((k) => marcar(atual, k));
  if (metodo === "7_dobras") (atual.extras ?? []).filter((e) => sem(e.nome) === "massa gorda").forEach((e) => usados.add(e.nome));

  const principais: Linha[] = [
    linha("Peso", "kg", campo(atual, "peso_kg"), anterior ? campo(anterior, "peso_kg") : null),
    linha("% de gordura", "%", campo(atual, "gordura_pct"), anterior ? campo(anterior, "gordura_pct") : null),
    linha("Massa muscular", "kg", campo(atual, "massa_muscular_kg"), anterior ? campo(anterior, "massa_muscular_kg") : null),
    linha("Massa magra", "kg", campo(atual, "massa_magra_kg"), anterior ? campo(anterior, "massa_magra_kg") : null),
    linha("Massa de gordura", "kg", massaGorda(atual), massaGorda(anterior)),
    linha("Gordura visceral", "nível", campo(atual, "gordura_visceral"), anterior ? campo(anterior, "gordura_visceral") : null),
    linha("IMC", "kg/m²", imc(atual, alturaA), imc(anterior, alturaB)),
    campo(atual, "agua_pct") != null
      ? linha("Água corporal", "%", campo(atual, "agua_pct"), anterior ? campo(anterior, "agua_pct") : null)
      : linha("Água corporal", agua(atual)?.unidade || "L", agua(atual)?.valor ?? null, agua(anterior)?.valor ?? null),
    linha("Taxa metabólica basal", "kcal", extraPorChave(atual, "tmb")?.valor ?? null, anterior ? extraPorChave(anterior, "tmb")?.valor ?? null : null),
    linha("Relação cintura-quadril", "", extraPorChave(atual, "rcq")?.valor ?? null, anterior ? extraPorChave(anterior, "rcq")?.valor ?? null : null),
  ].filter((l) => l.atual != null);

  // Segmentos (massa magra e gordura por parte do corpo).
  const seg = new Map<ParteCorpo, Segmento>();
  for (const e of atual.extras ?? []) {
    if (!ehSegmentar(e.nome)) continue;
    const parte = parteDoNome(e.nome);
    const tipo = tipoSegmentar(e.nome);
    if (!parte || !tipo || e.unidade === "%") continue;
    const s = seg.get(parte) ?? { parte, rotulo: ROTULO_PARTE[parte], magra: null, gordura: null };
    s[tipo] = e.valor;
    seg.set(parte, s);
    usados.add(e.nome);
  }
  const segmentos = (Object.keys(ROTULO_PARTE) as ParteCorpo[]).map((p) => seg.get(p)).filter((s): s is Segmento => !!s);

  // Circunferências: campo de sempre + lados/pescoço dos extras; anterior = último registro com a medida.
  const temLados = itensCircunferencia().some((it) => it.tipo === "extra" && it.extra.nome !== "Pescoço" && (atual.extras ?? []).some((e) => e.nome === it.extra.nome));
  const circunferencias = itensCircunferencia().map((it) => {
    if (it.tipo === "extra") {
      const v = (atual.extras ?? []).find((e) => e.nome === it.extra.nome)?.valor ?? null;
      if (v == null) return null;
      usados.add(it.extra.nome);
      const ant = [...antes].reverse().find((m) => (m.extras ?? []).some((e) => e.nome === it.extra.nome));
      return linha(it.extra.nome, "cm", v, ant ? (ant.extras ?? []).find((e) => e.nome === it.extra.nome)!.valor : null);
    }
    const c = it.campo;
    const v = campo(atual, c.chave as ChaveMedida);
    if (v == null) return null;
    const ant = [...antes].reverse().find((m) => campo(m, c.chave as ChaveMedida) != null);
    return linha(temLados ? it.rotulo : c.rotulo, c.unidade, v, ant ? campo(ant, c.chave as ChaveMedida) : null);
  }).filter((l): l is Linha => !!l);

  const extras = (atual.extras ?? []).filter((e) => !usados.has(e.nome));
  const tecnicos = extras.filter((e) => ehImpedancia(e.nome));
  const outros = extras.filter((e) => !ehImpedancia(e.nome) && (metodo !== "7_dobras" || !ehDobra(e.nome)));

  return {
    id: atual.id,
    data: atual.data,
    metodo,
    personal: atual.origem === "personal",
    principais,
    segmentos,
    circunferencias,
    outros,
    tecnicos,
    anterior: anterior ? { id: anterior.id, data: anterior.data } : null,
    observacao: atual.observacoes?.trim() || null,
    ehSeteDobras: metodo === "7_dobras",
  };
}

/** Quantos números a avaliação tem (para dizer “ver todos os N dados”). */
export const totalDeDados = (r: ResumoAvaliacao) => r.principais.length + r.segmentos.length * 2 + r.circunferencias.length + r.outros.length + r.tecnicos.length;

/** Campos que a tela de medidas conhece, para quem quiser listar sem duplicar. */
export const CHAVES_CONHECIDAS = CAMPOS_MEDIDA.map((c) => c.chave);
