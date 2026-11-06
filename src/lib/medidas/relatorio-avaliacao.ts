// ============================================================================
// Relatório da avaliação física de 7 dobras (pedido do Montinho, 04/11/2026:
// “depois da avaliação, gerar um relatório para enviar ao aluno, e o aluno ver
// na página dele”) — regras PURAS.
//
// A avaliação é a linha de `evolucao` salva pela tela `AvaliacaoPollock`: os
// números principais nos campos de sempre (peso, % de gordura, massa magra,
// circunferências) e cada dobra, a soma, a densidade e a massa gorda em
// `extras`. Comparação só com a avaliação de 7 DOBRAS anterior (mesmo método;
// bioimpedância dá outro número e não se compara). Rótulos e cores NEUTROS:
// quem interpreta o que é bom para cada aluno é o Montinho.
// ============================================================================
import { type ChaveMedida } from "@/lib/medidas/campos";
import { PONTOS_7_DOBRAS, type PontoDobra } from "@/lib/medidas/pollock";
import type { Evolucao } from "@/lib/supabase/types";
import { itensCircunferencia } from "@/lib/medidas/lados";

export const NOME_SOMA = "Soma das 7 dobras";
export const PREFIXO_OBS = "Avaliação de 7 dobras";

/** Erro típico da equação (Jackson & Pollock): cerca de 3,5 pontos de % de gordura para mais ou para menos. */
export const ERRO_TIPICO_PCT = 3.5;

export type Linha = { rotulo: string; unidade: string; atual: number | null; anterior: number | null; diferenca: number | null };

export type RelatorioAvaliacao = {
  id: string;
  data: string;
  sexo: "M" | "F" | null;
  idade: number | null;
  observacao: string | null;
  principais: { gorduraPct: number | null; massaMagraKg: number | null; massaGordaKg: number | null; pesoKg: number | null; alturaCm: number | null; imc: number | null; soma: number | null; densidade: number | null };
  dobras: Array<Linha & { chave: PontoDobra }>;
  /** Linhas do resumo comparado (só com a avaliação de 7 dobras anterior). */
  comparacao: Linha[];
  circunferencias: Linha[];
  anterior: { id: string; data: string } | null;
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const extra = (m: Evolucao, nome: string): number | null => m.extras?.find((e) => e.nome.toLowerCase() === nome.toLowerCase())?.valor ?? null;
const ordem = (a: Evolucao, b: Evolucao) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0);
const linha = (rotulo: string, unidade: string, atual: number | null, anterior: number | null): Linha => ({ rotulo, unidade, atual, anterior, diferenca: atual != null && anterior != null ? r1(atual - anterior) : null });

/** É uma avaliação de 7 dobras (tem a soma guardada)? */
export const ehAvaliacao7Dobras = (m: Evolucao) => extra(m, NOME_SOMA) != null;

/** Sexo, idade e a observação do personal, a partir do texto que a tela grava (“Avaliação de 7 dobras (…), mulher, 35 anos. obs”). */
export function lerObservacao(obs: string | null | undefined): { sexo: "M" | "F" | null; idade: number | null; observacao: string | null } {
  const t = obs ?? "";
  const m = t.match(/,\s*(homem|mulher),\s*(\d{1,3})\s*anos\.\s*/i);
  if (!t.startsWith(PREFIXO_OBS) || !m) return { sexo: null, idade: null, observacao: t.trim() || null };
  const resto = t.slice((m.index ?? 0) + m[0].length).trim();
  return { sexo: m[1].toLowerCase() === "homem" ? "M" : "F", idade: Number(m[2]), observacao: resto || null };
}

/** IMC (kg/m²), com 1 casa. */
export const imcDe = (pesoKg: number | null, alturaCm: number | null) => (pesoKg && alturaCm && alturaCm >= 100 ? r1(pesoKg / (alturaCm / 100) ** 2) : null);


/**
 * Monta o relatório da avaliação `id`. `alturaCadastro` entra quando a altura
 * não foi anotada na avaliação. Devolve null se a linha não for de 7 dobras.
 */
/** Avaliações de 7 dobras ANTERIORES à `id` (mais recente primeiro), para escolher com qual comparar. */
export function avaliacoesParaComparar(medidas: Evolucao[], id: string): Array<{ id: string; data: string; gordura_pct: number | null }> {
  const atual = medidas.find((m) => m.id === id);
  if (!atual) return [];
  return [...medidas].sort(ordem).filter((m) => m.data < atual.data && ehAvaliacao7Dobras(m)).reverse().map((m) => ({ id: m.id, data: m.data, gordura_pct: m.gordura_pct ?? null }));
}

export function relatorioAvaliacao(medidas: Evolucao[], id: string, alturaCadastro: number | null = null, comId: string | null = null): RelatorioAvaliacao | null {
  const todas = [...medidas].sort(ordem);
  const atual = todas.find((m) => m.id === id);
  if (!atual || !ehAvaliacao7Dobras(atual)) return null;
  // Só datas ANTERIORES: avaliação refeita no mesmo dia (correção) não vira “anterior”.
  let antes = todas.filter((m) => m.data < atual.data);
  // `comId` (06/11/2026, pedido do Montinho: “comparar entre elas”): escolher QUALQUER avaliação de 7 dobras
  // anterior para comparar; sem ela (ou inválida), vale a imediatamente anterior.
  const escolhida = comId ? antes.find((m) => m.id === comId && ehAvaliacao7Dobras(m)) ?? null : null;
  if (escolhida) antes = antes.filter((m) => m.data <= escolhida.data);
  const anterior = escolhida ?? [...antes].reverse().find(ehAvaliacao7Dobras) ?? null;
  const obs = lerObservacao(atual.observacoes);

  const alturaCm = atual.altura_cm ?? alturaCadastro ?? null;
  const massaGorda = extra(atual, "Massa gorda") ?? (atual.peso_kg && atual.gordura_pct != null ? r1((atual.peso_kg * atual.gordura_pct) / 100) : null);
  const massaGordaAnt = anterior ? extra(anterior, "Massa gorda") ?? (anterior.peso_kg && anterior.gordura_pct != null ? r1((anterior.peso_kg * anterior.gordura_pct) / 100) : null) : null;

  const dobras = PONTOS_7_DOBRAS.map((p) => ({ chave: p.chave, ...linha(p.nome, "mm", extra(atual, `Dobra ${p.nome.toLowerCase()}`), anterior ? extra(anterior, `Dobra ${p.nome.toLowerCase()}`) : null) }));

  const comparacao = anterior
    ? [
        linha("% de gordura", "%", atual.gordura_pct ?? null, anterior.gordura_pct ?? null),
        linha("Massa magra", "kg", atual.massa_magra_kg ?? null, anterior.massa_magra_kg ?? null),
        linha("Massa gorda", "kg", massaGorda, massaGordaAnt),
        linha("Peso", "kg", atual.peso_kg ?? null, anterior.peso_kg ?? null),
        linha("Soma das 7 dobras", "mm", extra(atual, NOME_SOMA), extra(anterior, NOME_SOMA)),
      ].filter((l) => l.atual != null)
    : [];

  // Circunferências: medida com fita não depende do método → compara com o último registro que tem aquela medida.
  // Com os dois lados + pescoço (04/11/2026): o esquerdo e o pescoço vêm de `extras`; com o esquerdo anotado, o campo de sempre vira “direito”.
  const temLados = itensCircunferencia().some((it) => it.tipo === "extra" && it.extra.nome !== "Pescoço" && extra(atual, it.extra.nome) != null);
  const circunferencias = itensCircunferencia().map((it) => {
    if (it.tipo === "extra") {
      const v = extra(atual, it.extra.nome);
      if (v == null) return null;
      const ant = [...antes].reverse().find((m) => extra(m, it.extra.nome) != null);
      return linha(it.extra.nome, "cm", v, ant ? extra(ant, it.extra.nome) : null);
    }
    const c = it.campo;
    const v = atual[c.chave as ChaveMedida] as number | null | undefined;
    if (v == null) return null;
    const ant = [...antes].reverse().find((m) => typeof m[c.chave as ChaveMedida] === "number");
    return linha(temLados ? it.rotulo : c.rotulo, c.unidade, v, ant ? (ant[c.chave as ChaveMedida] as number) : null);
  }).filter((l): l is Linha => !!l);

  return {
    id: atual.id,
    data: atual.data,
    sexo: obs.sexo,
    idade: obs.idade,
    observacao: obs.observacao,
    principais: {
      gorduraPct: atual.gordura_pct ?? null,
      massaMagraKg: atual.massa_magra_kg ?? null,
      massaGordaKg: massaGorda,
      pesoKg: atual.peso_kg ?? null,
      alturaCm,
      imc: imcDe(atual.peso_kg ?? null, alturaCm),
      soma: extra(atual, NOME_SOMA),
      densidade: extra(atual, "Densidade corporal"),
    },
    dobras,
    comparacao,
    circunferencias,
    anterior: anterior ? { id: anterior.id, data: anterior.data } : null,
  };
}

/** Texto curto e neutro sobre a mudança (sem dizer se é bom ou ruim). */
export function textoDiferenca(l: Linha): string {
  if (l.diferenca == null) return "—";
  if (l.diferenca === 0) return "igual";
  const v = Math.abs(l.diferenca).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${l.diferenca > 0 ? "↑ +" : "↓ −"}${v} ${l.unidade === "%" ? "ponto" + (Math.abs(l.diferenca) === 1 ? "" : "s") : l.unidade}`;
}

/** Mensagem do WhatsApp para mandar o relatório ao aluno (sem pronome). */
export function mensagemRelatorio(nome: string, data: string, url: string, metodo: "7_dobras" | "bioimpedancia" | "medidas" = "7_dobras"): string {
  const primeiro = nome.trim().split(/\s+/)[0] || "";
  const [a, m, d] = data.split("-");
  return [
    `Oi${primeiro ? `, ${primeiro}` : ""}! 💪`,
    "",
    `O relatório da sua avaliação física de ${d}/${m}/${a} já está no app:`,
    url,
    "",
    metodo === "7_dobras"
      ? "Lá tem o resultado de cada dobra, o % de gordura, a massa magra e, a partir da segunda avaliação, a comparação com a anterior. Dá para baixar em PDF também."
      : metodo === "bioimpedancia"
        ? "Lá tem o % de gordura, a massa muscular, a massa magra, o corpo por partes e todos os dados do laudo. A partir da segunda avaliação, aparece a comparação com a anterior. Dá para baixar em PDF também."
        : "Lá estão todas as suas medidas e, a partir do segundo registro, a comparação com o anterior. Dá para baixar em PDF também.",
    "",
    "Qualquer dúvida, me chama aqui. Chalalá! 🔥",
  ].join("\n");
}
