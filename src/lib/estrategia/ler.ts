// ============================================================================
// Leitura do relatório do Montinho Strategy (PDF → texto → estrutura).
// Função pura: recebe o texto extraído do PDF e devolve só o que está
// escrito nele. Campo não encontrado fica null/vazio — nada é inventado.
// Os rótulos seguem o modelo do relatório (Diagnóstico, Estratégia,
// Evolução, “Sua estratégia, em detalhes”, Encerramento).
// ============================================================================

import type { GrupoMuscular } from "@/lib/supabase/types-extended";

/** Meta semanal do grupo: `series` = mínimo; `max` fecha a faixa (null = número fixo). */
export type VolumeGrupo = { rotulo: string; grupo: GrupoMuscular | null; series: number; max?: number | null };
export type Fase = { numero: number; nome: string; semanas: number | null };

export type EstrategiaImportada = {
  versao: 1;
  aluno: string | null;
  titulo: string | null;
  data: string | null;
  objetivo: string | null;
  objetivosSecundarios: string | null;
  experiencia: string | null;
  diasPorSemana: number | null;
  minutosPorTreino: number | null;
  prioridades: string[];
  comoPriorizar: string[];
  divisao: string | null;
  justificativaDivisao: string | null;
  adaptacoes: string | null;
  intensidade: string | null;
  volume: VolumeGrupo[];
  volumeTotal: number | null;
  frequencia: string | null;
  fases: Fase[];
  preparacao: string[];
  preparacaoMotivo: string | null;
  progressao: string[];
  checkinSemanal: string[];
  pontosFortes: string[];
  pontosAtencao: string[];
  frase: string | null;
  logicaExercicios: string[];
  aerobico: string | null;
  encerramento: string | null;
  /** Só no arquivo do Montinho Strategy (o PDF não traz). */
  restricoes?: string | null;
  exerciciosObrigatorios?: string | null;
  exerciciosEvitar?: string | null;
};

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Rótulo do relatório → grupo do app. */
const GRUPOS: Array<[RegExp, GrupoMuscular]> = [
  [/^(peito|peitoral)/, "peito"],
  [/^(costas|dorsa|dorsal|latissimo)/, "costas"],
  [/^deltoide anterior|^ombro anterior/, "ombro_anterior"],
  [/^deltoide (medial|lateral)|^ombro (medial|lateral)/, "ombro_lateral"],
  [/^deltoide posterior|^ombro posterior/, "ombro_posterior"],
  [/^ombros?$|^deltoides?$/, "ombros"],
  [/^trapezio/, "trapezio"],
  [/^biceps/, "biceps"],
  [/^triceps/, "triceps"],
  [/^antebraco/, "antebraco"],
  [/^quadriceps/, "quadriceps"],
  [/^(isquiotibiais|posterior(es)? de coxa|posterior(es)?$)/, "posteriores"],
  [/^gluteo/, "gluteo"],
  [/^adutor/, "adutores"],
  [/^abdutor/, "abdutores"],
  [/^panturrilha/, "panturrilha"],
  [/^(abdominal|abdomen|abdome)/, "abdomen"],
  [/^core/, "core"],
  [/^lombar/, "lombar"],
];

export const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function grupoDoRotulo(rotulo: string): GrupoMuscular | null {
  const r = semAcento(rotulo);
  return GRUPOS.find(([re]) => re.test(r))?.[1] ?? null;
}

const limpa = (s: string | null | undefined) => (s ? s.replace(/\s+/g, " ").trim() || null : null);

/** Trecho entre dois marcadores (o fim é opcional). */
function entre(t: string, inicio: RegExp, fim: RegExp): string | null {
  const m = inicio.exec(t);
  if (!m) return null;
  const resto = t.slice(m.index + m[0].length);
  const f = fim.exec(resto);
  return f ? resto.slice(0, f.index) : resto;
}

/** Itens de lista: uma linha por item; linha que começa em minúscula continua a anterior. */
function itens(bloco: string | null): string[] {
  if (!bloco) return [];
  const out: string[] = [];
  for (const linha of bloco.split("\n").map((l) => l.trim()).filter(Boolean)) {
    if (out.length && /^[a-zà-ú(]/.test(linha)) out[out.length - 1] += ` ${linha}`;
    else out.push(linha);
  }
  return out;
}

const lista = (s: string | null) => (s ? s.split(/,\s*|\s+e\s+(?=[A-ZÁÉÍÓÚÂÊÔ])/).map((x) => x.trim()).filter(Boolean) : []);

export function lerEstrategia(textoBruto: string): EstrategiaImportada {
  const t = textoBruto.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n");

  const cab = /P\s?L\s?A\s?N\s?E\s?J\s?A\s?M\s?E\s?N\s?T\s?O\s+E\s?X\s?C\s?L\s?U\s?S\s?I\s?V\s?O\n(.+)\n(.+)\n/.exec(t);
  const d = /(\d{1,2}) de ([a-zç]+) de (\d{4})/i.exec(t);
  const mes = d ? MESES.indexOf(d[2].toLowerCase()) + 1 : 0;
  const data = d && mes ? `${d[3]}-${String(mes).padStart(2, "0")}-${d[1].padStart(2, "0")}` : null;

  const rotulo = (r: RegExp) => limpa(new RegExp(`(?:^|\\n)${r.source}\\n(.+)`, "i").exec(t)?.[1]);
  const disp = /(\d+)\s*dias\s*\/\s*semana\s*·\s*(\d+)\s*min/i.exec(t);

  const prioridadesTxt = limpa(entre(t, /Prioridade muscular\n/, /\nComo vamos priorizar/)) ?? limpa(entre(t, /\nPRIORIDADES\n/, /\nPontos fortes/));

  const comoBloco = entre(t, /vou usar estas estratégias:\n/, /\nA previsão|\nA musculação|\nSeu diagnóstico/);
  const comoPriorizar = comoBloco
    ? comoBloco.split(/\n(?=[A-ZÁÉÍÓÚ][^\n]*? — )/).map((x) => limpa(x.split(" — ")[0])!).filter(Boolean)
    : [];

  const divisao = limpa(/Escolhi organizar os seus treinos assim: (.+?)\.\n/.exec(t)?.[1]) ?? rotulo(/Divisão semanal/);
  const justificativa = limpa(entre(t, /Divisão semanal\n.+\n/, /\nAdaptações:/));
  const adaptacoes = limpa(entre(t, /Adaptações:/, /\nIntensidade\n/));
  const intensidade = limpa(/optei por (.+?)\.\n/.exec(t)?.[1]) ?? rotulo(/Intensidade/);

  const volume: VolumeGrupo[] = [];
  for (const m of t.matchAll(/^([A-Za-zÀ-ú][A-Za-zÀ-ú ]*?) (\d{1,3})(?:\s*[–-]\s*(\d{1,3}))? (\d{1,3})%$/gm)) {
    const rot = m[1].trim();
    if (/^total/i.test(rot) || volume.some((v) => v.rotulo === rot)) continue;
    const max = m[3] ? Number(m[3]) : null;
    volume.push({ rotulo: rot, grupo: grupoDoRotulo(rot), series: Number(m[2]), max: max && max > Number(m[2]) ? max : null });
  }
  const total = /Total (\d+)(?:\s*[–-]\s*\d+)? séries/.exec(t);

  const fases: Fase[] = [];
  for (const m of t.matchAll(/Fase (\d+) · ([^(;\n]+?) \((\d+) sem\)/g)) {
    const numero = Number(m[1]);
    if (!fases.some((f) => f.numero === numero)) fases.push({ numero, nome: m[2].trim(), semanas: Number(m[3]) });
  }

  const prep = /preparei esta rotina para o seu corpo: ([\s\S]+?)\.\n/.exec(t)?.[1] ?? /Antes de cada treino: ([\s\S]+?)\. /.exec(t)?.[1] ?? null;

  return {
    versao: 1,
    aluno: limpa(cab?.[1]) ?? limpa(/Olá, ([^!]+)!/.exec(t)?.[1]),
    titulo: limpa(cab?.[2]),
    data,
    objetivo: limpa(/Neste ciclo, nosso foco será (.+?)\./.exec(t)?.[1]) ?? rotulo(/OBJETIVO/),
    objetivosSecundarios: limpa(/objetivo secundário, também vamos trabalhar (.+?)\./.exec(t)?.[1]),
    experiencia: rotulo(/EXPERIÊNCIA/),
    diasPorSemana: disp ? Number(disp[1]) : null,
    minutosPorTreino: disp ? Number(disp[2]) : null,
    prioridades: lista(prioridadesTxt),
    comoPriorizar,
    divisao,
    justificativaDivisao: justificativa,
    adaptacoes,
    intensidade,
    volume,
    volumeTotal: total ? Number(total[1]) : volume.length ? volume.reduce((a, v) => a + v.series, 0) : null,
    frequencia: limpa(/Frequência: (.+)/.exec(t)?.[1]),
    fases: fases.sort((a, b) => a.numero - b.numero),
    preparacao: lista(limpa(prep)),
    preparacaoMotivo: limpa(/Isso é importante porque ([\s\S]+?)\.\n/.exec(t)?.[1]),
    progressao: itens(entre(t, /pensei a progressão assim:\n/, /\nO combinado|\nSeu papel/)),
    checkinSemanal: itens(entre(t, /o que eu preciso que você me envie:\n/, /\nPeço|\nCom esses/)),
    pontosFortes: itens(entre(t, /pontos muito a seu favor:\n/, /\nE há alguns detalhes|\nNo geral/)),
    pontosAtencao: itens(entre(t, /vamos cuidar juntos:\n/, /\nNo geral|\nSua estratégia/)),
    frase: limpa(/Em uma frase, é isto: “([\s\S]+?)”/.exec(t)?.[1]?.replace(/\.$/, "")),
    logicaExercicios: itens(entre(t, /segui esta lógica:\n/, /\nSobre o trabalho aeróbico|\nComo seus treinos/)),
    aerobico: limpa(/Sobre o trabalho aeróbico, ([\s\S]+?)\.\n/.exec(t)?.[1]),
    encerramento: limpa(entre(t, /E\s?N\s?C\s?E\s?R\s?R\s?A\s?M\s?E\s?N\s?T\s?O\n/, /\n“/)),
  };
}

/** Relatório reconhecido? (precisa ao menos da divisão ou do volume e do objetivo). */
export function estrategiaValida(e: EstrategiaImportada): boolean {
  return !!e.objetivo && (!!e.divisao || e.volume.length > 0);
}

/**
 * Arquivo do Montinho Strategy (“Enviar para o app Montinho”): já vem
 * estruturado — só confere o formato e liga os rótulos aos grupos do app.
 * Retorna null se não for esse arquivo.
 */
export function lerArquivoStrategy(dados: unknown): EstrategiaImportada | null {
  const d = dados as { formato?: unknown; versaoFormato?: unknown; estrategia?: Record<string, unknown> } | null;
  if (!d || d.formato !== "montinho-strategy" || d.versaoFormato !== 1 || !d.estrategia || typeof d.estrategia !== "object") return null;
  const e = d.estrategia as Record<string, unknown>;
  const vol = Array.isArray(e.volume) ? (e.volume as Array<Record<string, unknown>>) : [];
  return {
    ...(e as unknown as EstrategiaImportada),
    versao: 1,
    volume: vol
      .filter((v) => typeof v.rotulo === "string" && Number.isFinite(Number(v.series)))
      .map((v) => {
        const series = Math.round(Number(v.series));
        const max = v.max == null ? null : Math.round(Number(v.max));
        return { rotulo: String(v.rotulo).trim(), grupo: grupoDoRotulo(String(v.rotulo)), series, max: max != null && max > series ? max : null };
      }),
  };
}
