// ============================================================================
// O que mudou no protocolo (pedido do Montinho, 10/11/2026: passar da Adaptação
// para a Intensificação sem confundir o aluno). Regras PURAS: comparam duas
// versões salvas do protocolo (programa_versoes.snapshot) e dizem, em poucas
// linhas, o que o aluno precisa saber: fase nova, dias novos/que saíram,
// exercícios que entraram/saíram em cada treino e a meta da semana (que só
// vale a partir da segunda-feira seguinte — decisão do Montinho de 30/10/2026).
// Ajuste de séries/repetições/carga NÃO vira aviso (seria aviso demais).
// ============================================================================
import { FASE_INFO, FASES, type Fase } from "@/lib/treino/fases";
import { frequenciaDoCalendario, type Calendario } from "@/lib/volume/calcular";
import { dataLocal, inicioDaSemana } from "@/lib/aderencia/calcular";

type SnapEx = { nome: string };
type SnapTreino = { letra: string; nome: string; ativo: boolean; exercicios: SnapEx[] };
export type SnapProtocolo = { programa: { fase?: string | null; frequencia?: Record<string, number> | null; calendario?: unknown }; treinos: SnapTreino[] };

export type MudancaDia = { letra: string; nome: string; entraram: string[]; sairam: string[] };
export type MudancaProtocolo = {
  faseAntes: Fase | null;
  faseDepois: Fase | null;
  mudouFase: boolean;
  diasNovos: Array<{ letra: string; nome: string }>;
  diasQueSairam: Array<{ letra: string; nome: string }>;
  porDia: MudancaDia[];
  semanaAntes: number;
  semanaDepois: number;
  /** Tem algo que o aluno precisa saber. */
  relevante: boolean;
};

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const ehFase = (f: unknown): f is Fase => typeof f === "string" && (FASES as readonly string[]).includes(f);
// Treino sem exercício (dia acabado de criar e ainda vazio) não conta: o aluno nem o vê.
const ativos = (s: SnapProtocolo) => s.treinos.filter((t) => t.ativo && t.exercicios.length > 0);

/** Treinos por semana: calendário (quando montado) senão a frequência manual, só dos treinos ativos. */
export function treinosPorSemana(s: SnapProtocolo): number {
  const cal = frequenciaDoCalendario((s.programa.calendario ?? null) as Calendario | null);
  const usaCal = Object.keys(cal).length > 0;
  return ativos(s).reduce((n, t) => n + Number((usaCal ? cal[t.letra as keyof typeof cal] : s.programa.frequencia?.[t.letra]) ?? 0), 0);
}

export function mudancasDoProtocolo(anterior: SnapProtocolo | null, atual: SnapProtocolo): MudancaProtocolo | null {
  if (!anterior) return null;
  const antes = new Map(ativos(anterior).map((t) => [t.letra, t]));
  const depois = new Map(ativos(atual).map((t) => [t.letra, t]));
  const diasNovos = [...depois.values()].filter((t) => !antes.has(t.letra)).map((t) => ({ letra: t.letra, nome: t.nome }));
  const diasQueSairam = [...antes.values()].filter((t) => !depois.has(t.letra)).map((t) => ({ letra: t.letra, nome: t.nome }));
  const porDia: MudancaDia[] = [];
  for (const t of depois.values()) {
    const a = antes.get(t.letra);
    if (!a) continue;
    const nomesA = new Set(a.exercicios.map((e) => norm(e.nome)));
    const nomesD = new Set(t.exercicios.map((e) => norm(e.nome)));
    const entraram = t.exercicios.filter((e) => !nomesA.has(norm(e.nome))).map((e) => e.nome);
    const sairam = a.exercicios.filter((e) => !nomesD.has(norm(e.nome))).map((e) => e.nome);
    if (entraram.length || sairam.length) porDia.push({ letra: t.letra, nome: t.nome, entraram, sairam });
  }
  const faseAntes = ehFase(anterior.programa.fase) ? anterior.programa.fase : null;
  const faseDepois = ehFase(atual.programa.fase) ? atual.programa.fase : null;
  // Marcar “Adaptação” num protocolo que não tinha fase não é mudança para o aluno (ele já estava começando).
  const mudouFase = !!faseDepois && faseDepois !== faseAntes && !(faseAntes === null && faseDepois === "adaptacao");
  const semanaAntes = treinosPorSemana(anterior);
  const semanaDepois = treinosPorSemana(atual);
  const relevante = mudouFase || diasNovos.length > 0 || diasQueSairam.length > 0 || porDia.length > 0 || semanaAntes !== semanaDepois;
  return { faseAntes, faseDepois, mudouFase, diasNovos, diasQueSairam, porDia, semanaAntes, semanaDepois, relevante };
}

const lista = (xs: string[], max = 3) => (xs.length <= max ? xs.join(", ") : `${xs.slice(0, max).join(", ")} e mais ${xs.length - max}`);
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

/** Segunda-feira seguinte ao dia em que o protocolo foi salvo (quando a meta nova passa a valer). */
export function segundaSeguinte(salvoEm: string): string {
  const seg = inicioDaSemana(dataLocal(salvoEm));
  const d = new Date(`${seg}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}

export type AvisoProtocolo = { titulo: string; linhas: string[]; meta: string | null; push: { titulo: string; corpo: string } };

export function avisoDoProtocolo(m: MudancaProtocolo, salvoEm: string): AvisoProtocolo {
  const fase = m.faseDepois ? FASE_INFO[m.faseDepois] : null;
  const titulo = m.mudouFase && fase ? `🚀 Seu protocolo mudou: agora você está na ${fase.rotulo}!` : "🆕 Seu protocolo foi atualizado";
  const linhas: string[] = [];
  if (m.mudouFase && fase) linhas.push(fase.resumo);
  for (const d of m.diasNovos) linhas.push(`➕ Novo: Treino ${d.letra}${d.nome && d.nome !== `Treino ${d.letra}` ? ` · ${d.nome}` : ""}`);
  for (const d of m.diasQueSairam) linhas.push(`➖ Saiu: Treino ${d.letra}`);
  for (const d of m.porDia) {
    const partes: string[] = [];
    if (d.entraram.length) partes.push(`entrou ${lista(d.entraram)}`);
    if (d.sairam.length) partes.push(`saiu ${lista(d.sairam)}`);
    linhas.push(`🔁 Treino ${d.letra}: ${partes.join("; ")}`);
  }
  let meta: string | null = null;
  if (m.semanaDepois && m.semanaDepois !== m.semanaAntes) {
    meta = `🎯 Sua meta passa a ser ${m.semanaDepois} ${m.semanaDepois === 1 ? "treino" : "treinos"} por semana, a partir de segunda, ${ddmm(segundaSeguinte(salvoEm))}. Esta semana continua valendo a meta de antes.`;
  }
  const corpo = m.mudouFase && fase
    ? `${fase.resumo} Toque para ver o que mudou. É impossível dar errado!`
    : "O Montinho atualizou os seus treinos. Toque para ver o que mudou.";
  return { titulo, linhas, meta, push: { titulo, corpo } };
}

/** Próxima fase da sequência (para o botão “Passar para a …” do montador). */
export function proximaFase(f: Fase | "" | null | undefined): Fase | null {
  if (!f) return null;
  const i = FASES.indexOf(f);
  return i >= 0 && i < FASES.length - 1 ? FASES[i + 1] : null;
}
