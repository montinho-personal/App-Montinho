// ============================================================================
// Treinos feitos (pedido do Montinho, 29/10/2026): o personal encontra rápido
// qual treino o aluno fez, como foi cada exercício e TUDO que ele anotou —
// sem caçar em gráficos. Puro (sem rede): transforma as sessões gravadas em
// cartões prontos para a tela, com as anotações juntas e os sinais em destaque.
// ============================================================================
import type { SessaoCompleta } from "@/lib/data/sessoes";

export type TipoAnotacao = "exercicio" | "serie" | "fim" | "antes";
export type Anotacao = { tipo: TipoAnotacao; onde: string; texto: string };
export type Sinal = "dor" | "desconforto" | "nao_consegui" | "pulou" | "trocou" | "pesado";

export type ExercicioFeito = {
  nome: string;
  status: "feito" | "parcial" | "pulado" | "nao_consegui" | "pendente";
  trocadoDe: string | null;
  percepcao: string | null;
  series: string[];
  anotacao: string | null;
};

export type TreinoFeito = {
  id: string;
  alunoId: string;
  /** Dia (Brasília) AAAA-MM-DD e hora HH:MM. */
  data: string;
  hora: string;
  titulo: string;
  letra: string | null;
  tipo: "ficha" | "livre" | "extra";
  status: "concluido" | "parcial" | "cancelado" | "em_andamento";
  duracaoMin: number | null;
  seriesFeitas: number;
  seriesPlanejadas: number;
  volumeKg: number;
  sentiu: string | null;
  anotacoes: Anotacao[];
  sinais: Sinal[];
  exercicios: ExercicioFeito[];
};

const SP = (iso: string) => new Date(new Date(iso).getTime() - 3 * 3_600_000).toISOString();
const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export const ROTULO_PERCEPCAO: Record<string, string> = { muito_leve: "Muito leve", moderado: "Moderado", pesado: "Pesado", muito_pesado: "Muito pesado" };
export const ROTULO_SENTIU: Record<string, string> = { leve: "Leve", ok: "Na medida", pesado: "Pesado", dor: "Sentiu dor" };
export const ROTULO_CHECKIN: Record<string, string> = { muito_bem: "Muito bem", normal: "Normal", cansado: "Cansado(a)", desconforto: "Com desconforto", prefiro_nao: "Preferiu não responder" };
export const ROTULO_SINAL: Record<Sinal, string> = { dor: "🤕 Dor", desconforto: "⚠️ Desconforto", nao_consegui: "✋ Não conseguiu", pulou: "⏭ Pulou", trocou: "⇄ Trocou", pesado: "🔥 Pesado" };

/** “38,5 kg × 15”, “× 12” (sem carga), “aquec. 20 kg × 15”, blocos “30 kg × 8+3+2”. */
export function textoSerie(s: { tipo: string; carga_kg: number | null; reps: number | null; tempo_seg?: number | null; blocos?: Array<{ carga: number | null; reps: number | null }> | null; rir?: number | null }): string {
  const carga = s.carga_kg != null && s.carga_kg > 0 ? `${fmt(s.carga_kg)} kg ` : "";
  const reps = s.blocos && s.blocos.length > 1 ? s.blocos.map((b) => b.reps ?? "?").join("+") : s.reps != null ? String(s.reps) : s.tempo_seg ? `${s.tempo_seg}s` : "?";
  const pre = s.tipo === "aquecimento" ? "aquec. " : s.tipo !== "valida" ? `${s.tipo.replace("_", "-")} ` : "";
  return `${pre}${carga}× ${reps}${s.rir != null ? ` (RIR ${s.rir})` : ""}`.trim();
}

export function treinoFeito(s: SessaoCompleta): TreinoFeito {
  const iso = SP(s.iniciado_em);
  const modo = (s as { modo?: string }).modo;
  const livre = !s.treino_id && modo !== "extra";
  const tipo: TreinoFeito["tipo"] = modo === "extra" ? "extra" : livre ? "livre" : "ficha";
  const anotacoes: Anotacao[] = [];
  const sinais = new Set<Sinal>();
  const ci = (s as { checkin_pre?: string | null }).checkin_pre;
  const ciNota = (s as { checkin_pre_nota?: string | null }).checkin_pre_nota;
  if (ci === "desconforto") sinais.add("desconforto");
  if (ciNota?.trim()) anotacoes.push({ tipo: "antes", onde: "Antes do treino", texto: ciNota.trim() });
  if (s.feedback_percepcao === "dor") sinais.add("dor");
  if (s.feedback_percepcao === "pesado") sinais.add("pesado");
  let volume = 0;
  let feitas = 0;
  const exercicios: ExercicioFeito[] = [...s.exercicios]
    .sort((a, b) => a.ordem - b.ordem || (a.created_at < b.created_at ? -1 : 1))
    .map((e) => {
      const series = [...e.series].sort((a, b) => a.serie - b.serie);
      for (const x of series) {
        if (x.tipo !== "aquecimento") {
          feitas++;
          volume += (x.carga_kg ?? 0) * (x.reps ?? 0);
        }
        if (x.observacoes?.trim()) anotacoes.push({ tipo: "serie", onde: `${e.nome} · série ${x.serie}`, texto: x.observacoes.trim() });
        if ((x.desconforto ?? 0) >= 6) sinais.add("desconforto");
      }
      if (e.observacao_aluno?.trim()) anotacoes.push({ tipo: "exercicio", onde: e.nome, texto: e.observacao_aluno.trim() });
      if (e.status === "nao_consegui") sinais.add("nao_consegui");
      if (e.status === "pulado" && !series.length) sinais.add("pulou");
      if (e.substituido_de) sinais.add("trocou");
      const validas = series.filter((x) => x.tipo !== "aquecimento").length;
      const status: ExercicioFeito["status"] = e.status === "nao_consegui" ? "nao_consegui" : e.status === "pulado" && !series.length ? "pulado" : !series.length ? "pendente" : e.series_planejadas && validas < e.series_planejadas ? "parcial" : "feito";
      return { nome: e.nome, status, trocadoDe: e.substituido_de?.nome ?? null, percepcao: e.percepcao ? (ROTULO_PERCEPCAO[e.percepcao] ?? e.percepcao) : null, series: series.map(textoSerie), anotacao: e.observacao_aluno?.trim() || null };
    });
  if (s.feedback_comentario?.trim()) anotacoes.push({ tipo: "fim", onde: "No fim do treino", texto: s.feedback_comentario.trim() });
  const planejadas = s.series_planejadas || s.exercicios.reduce((n, e) => n + (e.series_planejadas ?? 0), 0);
  const status: TreinoFeito["status"] = s.status === "em_andamento" ? "em_andamento" : s.status === "abandonada" ? (feitas ? "parcial" : "cancelado") : planejadas && feitas < planejadas ? "parcial" : "concluido";
  const titulo = s.nome_treino ?? (tipo === "livre" ? "Treino livre" : tipo === "extra" ? "Treino extra" : s.letra ? `Treino ${s.letra}` : "Treino");
  return {
    id: s.id,
    alunoId: s.aluno_id,
    data: iso.slice(0, 10),
    hora: iso.slice(11, 16),
    titulo,
    letra: tipo === "ficha" ? s.letra : null,
    tipo,
    status,
    duracaoMin: s.duracao_seg != null ? Math.max(1, Math.round(s.duracao_seg / 60)) : null,
    seriesFeitas: feitas,
    seriesPlanejadas: planejadas,
    volumeKg: Math.round(volume),
    sentiu: s.feedback_percepcao ? ROTULO_SENTIU[s.feedback_percepcao] ?? null : null,
    anotacoes,
    sinais: [...sinais],
    exercicios,
  };
}

/** Lista para a tela: sem histórico importado sem séries e sem cancelados vazios (a não ser que peça). */
export function treinosFeitos(sessoes: SessaoCompleta[], opts: { incluirCancelados?: boolean } = {}): TreinoFeito[] {
  return sessoes
    .filter((s) => s.exercicios.some((e) => e.series.length) || s.status === "em_andamento" || (opts.incluirCancelados && s.status === "abandonada"))
    .map(treinoFeito)
    .sort((a, b) => (a.data + a.hora < b.data + b.hora ? 1 : -1));
}

export type Filtro = "todos" | "anotacoes" | "alertas";
export function filtrar(lista: TreinoFeito[], f: Filtro, letra?: string | null): TreinoFeito[] {
  return lista.filter((t) => (f === "anotacoes" ? t.anotacoes.length > 0 : f === "alertas" ? t.sinais.some((s) => s === "dor" || s === "desconforto" || s === "nao_consegui") : true) && (!letra || (letra === "livre" ? t.tipo !== "ficha" : t.letra === letra)));
}

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
/** “Hoje”, “Ontem”, “quinta, 23/10”. */
export function rotuloDia(data: string, hoje: string): string {
  if (data === hoje) return "Hoje";
  const ontem = new Date(Date.parse(`${hoje}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  if (data === ontem) return "Ontem";
  const d = new Date(`${data}T12:00:00Z`);
  return `${DIAS[d.getUTCDay()]}, ${data.slice(8, 10)}/${data.slice(5, 7)}`;
}

/** Agrupa por dia, na ordem da lista. */
export function porDia<T extends { data: string }>(lista: T[]): Array<{ data: string; itens: T[] }> {
  const out: Array<{ data: string; itens: T[] }> = [];
  for (const t of lista) {
    const g = out.at(-1);
    if (g && g.data === t.data) g.itens.push(t);
    else out.push({ data: t.data, itens: [t] });
  }
  return out;
}
