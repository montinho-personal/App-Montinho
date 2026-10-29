// ============================================================================
// Topo da tela Evolução do aluno (pedido do Montinho, 29/10/2026): “abrir e já
// ver que está evoluindo”, no estilo das redes sociais — uma manchete, três
// números grandes com a comparação ao período anterior e destaques para
// deslizar. O detalhe continua embaixo (RelatorioEvolucao). Puro (sem rede).
// Só o que foi registrado; medidas com cor neutra (nada de “ideal”).
// ============================================================================
import type { SessaoMes } from "@/lib/visitante/evolucao";
import type { CargaEmAlta } from "@/lib/relatorios/cargas-em-alta";
import type { ItemInvisivel } from "@/lib/relatorios/invisivel";

export type Tom = "alta" | "baixa" | "igual" | "novo";
export type Numero = { valor: string; rotulo: string; delta: { texto: string; tom: Tom } | null };
export type Destaque = { id: string; emoji: string; titulo: string; valor: string; detalhe: string; tom: "ouro" | "verde" | "neutro" };
export type PainelEvolucao = { emoji: string; manchete: string; sub: string; numeros: Numero[]; destaques: Destaque[] };

export type EntradaPainel = {
  sessoes: SessaoMes[];
  dias: number;
  emAlta: CargaEmAlta[];
  invisivel: ItemInvisivel[];
  medidas: Array<{ data: string; peso_kg: number | null; cintura_cm: number | null }>;
  /** Semanas seguidas com a meta cumprida. */
  sequencia: number;
  agora?: Date;
};

const DIA = 86_400_000;
const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

type Soma = { treinos: number; series: number; cargaKg: number; minutos: number };
function somar(sessoes: SessaoMes[]): Soma {
  let series = 0;
  let carga = 0;
  let seg = 0;
  for (const s of sessoes) {
    seg += s.duracao_seg ?? 0;
    for (const e of s.exercicios)
      for (const x of e.series) {
        if (x.tipo === "aquecimento") continue;
        series++;
        carga += (x.carga_kg ?? 0) * (x.reps ?? 0);
      }
  }
  return { treinos: sessoes.length, series, cargaKg: Math.round(carga), minutos: Math.round(seg / 60) };
}

/** Período atual (últimos N dias) × os N dias antes. Só treinos encerrados com séries. */
export function compararPeriodos(sessoes: SessaoMes[], dias: number, agora: Date = new Date()): { atual: Soma; anterior: Soma } {
  const fim = agora.getTime();
  const feitas = sessoes.filter((s) => s.status !== "em_andamento" && s.status !== "abandonada" && s.exercicios.some((e) => e.series.length > 0));
  const entre = (a: number, b: number) => feitas.filter((s) => {
    const t = Date.parse(s.iniciado_em);
    return t > a && t <= b;
  });
  return { atual: somar(entre(fim - dias * DIA, fim)), anterior: somar(entre(fim - 2 * dias * DIA, fim - dias * DIA)) };
}

/** “+3”, “−2”, “igual”; em % para números grandes. */
export function delta(atual: number, anterior: number, emPct = false): { texto: string; tom: Tom } | null {
  if (!atual && !anterior) return null;
  if (!anterior) return { texto: "novo", tom: "novo" };
  const d = atual - anterior;
  if (d === 0) return { texto: "igual", tom: "igual" };
  // Muito acima do período anterior: “3× mais” lê melhor que “+2417%”.
  if (emPct && atual >= anterior * 3) return { texto: `▲ ${Math.round(atual / anterior)}× mais`, tom: "alta" };
  const texto = emPct ? `${Math.round((d / anterior) * 100)}%` : fmt(Math.abs(d));
  return { texto: `${d > 0 ? "▲ +" : "▼ −"}${emPct ? texto.replace("-", "") : texto}`, tom: d > 0 ? "alta" : "baixa" };
}

/** Carga total em kg ou toneladas. */
export function carga(kg: number): string {
  return kg >= 1000 ? `${fmt(Math.round(kg / 100) / 10)} t` : `${fmt(kg)} kg`;
}

export function painelEvolucao(e: EntradaPainel): PainelEvolucao {
  const { atual, anterior } = compararPeriodos(e.sessoes, e.dias, e.agora);
  // Janela corrida (não a semana seg–dom): “nos últimos 7 dias” (auditoria 29/10/2026).
  const periodo = `nos últimos ${e.dias} dias`;
  const numeros: Numero[] = [
    { valor: String(atual.treinos), rotulo: atual.treinos === 1 ? "treino" : "treinos", delta: delta(atual.treinos, anterior.treinos) },
    { valor: carga(atual.cargaKg), rotulo: "levantados", delta: delta(atual.cargaKg, anterior.cargaKg, true) },
    e.sequencia > 0
      ? { valor: `${e.sequencia} 🔥`, rotulo: e.sequencia === 1 ? "semana na meta" : "semanas seguidas", delta: null }
      : { valor: String(atual.series), rotulo: "séries", delta: delta(atual.series, anterior.series) },
  ];

  const destaques: Destaque[] = [];
  for (const c of e.emAlta.slice(0, 3)) {
    destaques.push({ id: `carga:${c.chave}`, emoji: "💪", titulo: c.nome, valor: `${fmt(c.primeira)} → ${fmt(c.ultima)} kg`, detalhe: `+${c.ganhoPct}% desde ${ddmm(c.desde)}`, tom: "ouro" });
  }
  if (atual.minutos > 0) {
    const h = Math.floor(atual.minutos / 60);
    destaques.push({ id: "tempo", emoji: "⏱️", titulo: "Tempo treinando", valor: h ? `${h} h ${atual.minutos % 60} min` : `${atual.minutos} min`, detalhe: periodo, tom: "verde" });
  }
  const pesos = e.medidas.filter((m) => m.peso_kg != null);
  if (pesos.length >= 2 && pesos[0].peso_kg !== pesos.at(-1)!.peso_kg) {
    destaques.push({ id: "peso", emoji: "⚖️", titulo: "Peso", valor: `${fmt(pesos[0].peso_kg!)} → ${fmt(pesos.at(-1)!.peso_kg!)} kg`, detalhe: `de ${ddmm(pesos[0].data)} a ${ddmm(pesos.at(-1)!.data)}`, tom: "neutro" });
  }
  const cint = e.medidas.filter((m) => m.cintura_cm != null);
  if (cint.length >= 2 && cint[0].cintura_cm !== cint.at(-1)!.cintura_cm) {
    destaques.push({ id: "cintura", emoji: "📏", titulo: "Cintura", valor: `${fmt(cint[0].cintura_cm!)} → ${fmt(cint.at(-1)!.cintura_cm!)} cm`, detalhe: `de ${ddmm(cint[0].data)} a ${ddmm(cint.at(-1)!.data)}`, tom: "neutro" });
  }
  for (const i of e.invisivel.filter((x) => x.tipo !== "frequencia").slice(0, 2)) {
    destaques.push({ id: `inv:${i.tipo}`, emoji: "✨", titulo: i.titulo, valor: "", detalhe: i.dado, tom: "verde" });
  }

  // Manchete: a melhor notícia verdadeira.
  const top = e.emAlta[0];
  let manchete: { emoji: string; manchete: string; sub: string };
  if (top) manchete = { emoji: "💪", manchete: "Você está mais forte", sub: `${top.nome}: de ${fmt(top.primeira)} para ${fmt(top.ultima)} kg (+${top.ganhoPct}%) desde ${ddmm(top.desde)}.` };
  else if (atual.treinos > anterior.treinos && anterior.treinos > 0) manchete = { emoji: "🚀", manchete: "Mais treinos que antes", sub: `${atual.treinos} ${periodo}, contra ${anterior.treinos} no período anterior.` };
  else if (e.sequencia >= 2) manchete = { emoji: "🔥", manchete: `${e.sequencia} semanas seguidas na meta`, sub: "Constância é o que faz o resultado aparecer." };
  else if (atual.treinos > 0) manchete = { emoji: "✅", manchete: "Cada treino conta", sub: `${atual.treinos} ${atual.treinos === 1 ? "treino" : "treinos"} ${periodo}. Continue registrando para ver a sua evolução aqui.` };
  else manchete = { emoji: "🏁", manchete: "Sua evolução começa no próximo treino", sub: `Nenhum treino ${periodo}. Bora voltar? Cada treino registrado aparece aqui.` };

  return { ...manchete, numeros, destaques };
}
