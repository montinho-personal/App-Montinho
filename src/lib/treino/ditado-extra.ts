// ============================================================================
// Ditar treino extra (PURO, testado): o personal fala e o app monta a opção de
// extra do aluno — modalidade, título, duração, grupos, séries e treino do
// plano. Ex.: “cardio leve de 30 minutos na esteira, ritmo de conversa”;
// “mobilidade 20 minutos e outro: complementar de glúteo e posterior,
// 6 séries, 25 minutos”. Nada é salvo sem a prévia e o toque em “Salvar”.
// ============================================================================

import type { Modalidade } from "./extra";
import { numerosPorExtenso } from "./ditado";

export type ExtraDitado = {
  modalidade: Modalidade;
  titulo: string;
  descricao: string;
  duracao_min: number;
  treino_id: string | null;
  grupos: string[];
  series_estimadas: number;
  /** O que faltou para o personal completar antes de salvar. */
  avisos: string[];
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Palavra falada → grupo do app (validacao/schemas GRUPOS).
const GRUPOS_FALADOS: Array<[RegExp, string]> = [
  [/\bglute[oa]s?\b|\bbumbum\b/, "gluteo"],
  [/\bposterior(es)?( de coxa)?\b|\bisquiotibiais\b/, "posteriores"],
  [/\bquadriceps\b|\bcoxas?\b/, "quadriceps"],
  [/\bpanturrilhas?\b/, "panturrilha"],
  [/\badutor(es)?\b/, "adutores"],
  [/\babdutor(es)?\b/, "abdutores"],
  [/\bpernas?\b|\binferiores?\b/, "pernas"],
  [/\bpeito(ral)?\b/, "peito"],
  [/\bcostas\b|\bdorsa(l|is)\b/, "costas"],
  [/\bombros?\b|\bdeltoides?\b/, "ombros"],
  [/\bbiceps\b/, "biceps"],
  [/\btriceps\b/, "triceps"],
  [/\bantebracos?\b/, "antebraco"],
  [/\btrapezio\b/, "trapezio"],
  [/\babdomen\b|\babdominais?\b|\babdominal\b/, "abdomen"],
  [/\bcore\b/, "core"],
  [/\blombar\b/, "lombar"],
  [/\bcorpo (todo|inteiro)\b|\bfull ?body\b/, "full_body"],
];

const ATIVIDADES: Array<[RegExp, string]> = [
  [/\bcaminhada\b|\bcaminhar\b/, "Caminhada"],
  [/\besteira\b/, "Esteira"],
  [/\bbike\b|\bbicicleta\b|\bspinning\b|\bpedal\b/, "Bike"],
  [/\bcorrida\b|\bcorrer\b|\btrote\b/, "Corrida"],
  [/\beliptico\b|\btransport\b/, "Elíptico"],
  [/\bescada\b|\bescadas\b/, "Escada"],
  [/\bnatacao\b|\bnadar\b|\bpiscina\b/, "Natação"],
  [/\bremo\b/, "Remo"],
  [/\bhiit\b|\btiros?\b/, "HIIT"],
];

function duracao(t: string): number | null {
  if (/\bhora e meia\b/.test(t)) return 90;
  if (/\bmeia hora\b/.test(t)) return 30;
  const h = t.match(/\b(\d+)\s*(h|horas?)\b/);
  const m = t.match(/\b(\d+)\s*(min|minutos?|m)\b/);
  if (h) return Number(h[1]) * 60 + (m ? Number(m[1]) : 0);
  if (/\b(uma|1) hora\b/.test(t)) return 60;
  return m ? Number(m[1]) : null;
}

function modalidadeDe(t: string, temGrupos: boolean, temTreino: boolean): Modalidade {
  if (/\bmobilidade\b|\balongamento\b|\bflexibilidade\b|\byoga\b|\bliberacao\b/.test(t)) return "mobilidade";
  if (/\btecnica\b|\btecnico\b|\baprender\b|\baprendizado\b/.test(t)) return "tecnica";
  const cardio = /\bcardio\b|\baerobico\b/.test(t) || ATIVIDADES.some(([r]) => r.test(t));
  if (cardio) return /\bmoderad|\bintens|\bcorrida\b|\bcorrer\b|\bhiit\b|\btiros?\b|\bforte\b/.test(t) && !/\bleve\b/.test(t) ? "cardio_moderado" : "cardio_leve";
  if (/\bresistido\b|\bmusculacao\b|\bficha\b/.test(t) || temTreino) return "resistido";
  if (/\bcomplementar\b|\bespecifico\b/.test(t) || temGrupos) return "complementar";
  return "atividade_geral";
}

const ROTULO_GRUPO: Record<string, string> = { gluteo: "glúteo", posteriores: "posterior", quadriceps: "quadríceps", panturrilha: "panturrilha", adutores: "adutores", abdutores: "abdutores", pernas: "pernas", peito: "peito", costas: "costas", ombros: "ombros", biceps: "bíceps", triceps: "tríceps", antebraco: "antebraço", trapezio: "trapézio", abdomen: "abdômen", core: "core", lombar: "lombar", full_body: "corpo todo" };
const juntar = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} e ${xs.at(-1)}`);

export function interpretarExtraTrecho(falaOriginal: string, treinos: Array<{ id: string; nome: string }>): ExtraDitado | null {
  const original = falaOriginal.trim().replace(/^[,.;:\s]+|[,.;:\s]+$/g, "");
  if (!original) return null;
  const t = numerosPorExtenso(norm(original));
  const grupos = [...new Set(GRUPOS_FALADOS.filter(([r]) => r.test(t)).map(([, g]) => g))];
  // "treino B" / "usar o treino b" → treino do plano pela letra.
  const letra = t.match(/\btreino\s+([a-f])\b/)?.[1]?.toUpperCase() ?? null;
  const treino = letra ? (treinos.find((x) => x.nome.trim().toUpperCase().startsWith(`${letra} `) || x.nome.trim().toUpperCase() === letra) ?? null) : null;
  const modalidade = modalidadeDe(t, grupos.length > 0, !!treino);
  const intenso = modalidade === "complementar" || modalidade === "resistido";
  const series = Number(t.match(/\b(\d+)\s*series?\b/)?.[1] ?? 0);
  const dur = duracao(t);
  const avisos: string[] = [];

  const atividade = ATIVIDADES.find(([r]) => r.test(t))?.[1] ?? null;
  const feminino = !!atividade && (/a$/.test(atividade) || atividade === "Bike");
  const intensidade = modalidade === "cardio_moderado" ? (feminino ? "moderada" : "moderado") : modalidade === "cardio_leve" ? "leve" : "";
  const titulo =
    modalidade === "cardio_leve" || modalidade === "cardio_moderado"
      ? `${atividade ?? "Cardio"} ${intensidade}`
      : modalidade === "mobilidade"
        ? /\balongamento\b/.test(t) ? "Alongamento" : /\byoga\b/.test(t) ? "Yoga" : "Mobilidade"
        : modalidade === "tecnica"
          ? "Sessão técnica"
          : modalidade === "resistido"
            ? treino ? `Treino ${treino.nome.split(/\s+—\s+|\s+-\s+/).pop()} extra` : grupos.length ? `Extra de ${juntar(grupos.map((g) => ROTULO_GRUPO[g] ?? g))}` : "Treino resistido extra"
            : modalidade === "complementar"
              ? grupos.length ? `Complementar de ${juntar(grupos.map((g) => ROTULO_GRUPO[g] ?? g))}` : "Treino complementar"
              : cap(original.split(/[,.;]/)[0].slice(0, 60));

  if (dur == null) avisos.push("Não ouvi a duração: confira os minutos.");
  if (intenso && !grupos.length && !treino) avisos.push("Diga os grupos musculares (ex.: glúteo e posterior) para o app checar a recuperação.");
  if (intenso && !series && !treino) avisos.push("Quantas séries, mais ou menos? Isso conta no limite semanal.");
  if (letra && !treino) avisos.push(`Não achei o treino ${letra} na ficha deste aluno.`);

  return {
    modalidade,
    titulo: titulo.trim().slice(0, 80),
    descricao: cap(original).slice(0, 600),
    duracao_min: Math.min(180, Math.max(5, dur ?? 30)),
    treino_id: intenso ? (treino?.id ?? null) : null,
    grupos: intenso ? grupos.filter((g) => g !== "full_body" || grupos.length === 1) : [],
    series_estimadas: intenso ? Math.min(40, series) : 0,
    avisos,
  };
}

/** Vários extras numa fala: separados por “outro”, “mais um”, “próximo”, ponto e vírgula ou nova linha. */
export function interpretarExtras(fala: string, treinos: Array<{ id: string; nome: string }>): ExtraDitado[] {
  return fala
    .split(/\n|;|\s+e\s+(?:outro|mais\s+um)\b[:,]?|\b(?:outro\s+extra|outra\s+opcao|outra\s+opção|mais\s+um\s+extra|proximo|próximo)\b[:,]?/i)
    .map((s) => interpretarExtraTrecho(s ?? "", treinos))
    .filter((x): x is ExtraDitado => !!x);
}
