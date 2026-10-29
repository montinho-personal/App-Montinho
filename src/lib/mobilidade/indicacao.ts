// ============================================================================
// Mobilidade indicada (pedido do Montinho, 29/10/2026): quem contou na
// anamnese que tem dor, lesão ou falta de mobilidade já recebe a mobilidade
// certa no protocolo — e um lembrete todo dia. PURO.
//
// Ordem de quem manda:
//   1. o que o personal prescreveu (protocolos + dias por semana), ou o
//      “desligar” dele (prescrição sem protocolo);
//   2. sem prescrição, o que a anamnese indica (todos os dias).
// O texto da anamnese é dado de saúde: aparece só para o próprio aluno e o
// personal, nunca em card ou compartilhamento.
// ============================================================================
import { PROTOCOLOS, type SlugMobilidade } from "./protocolos";
import { valeMobilidade, type SessaoMobilidade } from "./regras";

export type TextoAnamnese = { lesoes?: string | null; dores_atuais?: string | null; cirurgias?: string | null; doencas_cronicas?: string | null };

type RegraRegiao = { regiao: string; protocolo: SlugMobilidade; gatilho: RegExp };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// Regiões → protocolo. Lombar e quadril são de inferiores (o protocolo de
// inferiores trabalha quadril, posterior e coluna lombar).
const REGIOES: RegraRegiao[] = [
  { regiao: "Ombro", protocolo: "superiores", gatilho: /ombro|manguito|rotador|deltoide|labrum(?! do quadril)|subacromial|bursite no ombro|capsulite/ },
  { regiao: "Pescoço e cervical", protocolo: "superiores", gatilho: /pescoco|cervical|torcicolo|trapezio/ },
  { regiao: "Costas (torácica)", protocolo: "superiores", gatilho: /toracic|dorsal|meio das costas|costas travad|cifose|postura curvad/ },
  { regiao: "Cotovelo e punho", protocolo: "superiores", gatilho: /cotovelo|punho|epicondil|tunel do carpo|tendinite no (punho|cotovelo)/ },
  { regiao: "Lombar e coluna", protocolo: "inferiores", gatilho: /lombar|coluna|hernia|disco|ciat|protrus|espondil|escoliose|dor nas costas/ },
  { regiao: "Quadril", protocolo: "inferiores", gatilho: /quadril|piriforme|femoroacetabular|gluteo travad|adutor/ },
  { regiao: "Joelho", protocolo: "inferiores", gatilho: /joelho|patel|condromalacia|menisc|\blca\b|\blcp\b|ligamento cruzado/ },
  { regiao: "Tornozelo e pé", protocolo: "inferiores", gatilho: /tornozelo|entorse|fascite|calcanhar|tendao de aquiles|aquiles|panturrilha travad/ },
  { regiao: "Posterior de coxa", protocolo: "inferiores", gatilho: /posterior (de coxa|da coxa)|isquiotibia|encurtamento (de|do|da) posterior/ },
];

/** Falta de mobilidade/flexibilidade sem região dita: os dois protocolos. */
const GERAL = /mobilidade|flexibilidade|encurtad|encurtamento|rigidez|travad|alongamento|pouca amplitude|dificuldade para agachar/;

export type IndicacaoAnamnese = { protocolos: SlugMobilidade[]; regioes: string[] };

export function indicacaoDaAnamnese(a: TextoAnamnese | null | undefined): IndicacaoAnamnese {
  if (!a) return { protocolos: [], regioes: [] };
  const txt = norm([a.lesoes, a.dores_atuais, a.cirurgias, a.doencas_cronicas].filter(Boolean).join(" · "));
  if (!txt.trim() || /^(nao|nenhum[a]?|nada|sem)\b[^a-z]*$/.test(txt.trim())) return { protocolos: [], regioes: [] };
  const achadas = REGIOES.filter((r) => r.gatilho.test(txt));
  const protocolos = new Set<SlugMobilidade>(achadas.map((r) => r.protocolo));
  const regioes = achadas.map((r) => r.regiao);
  if (!achadas.length && GERAL.test(txt)) {
    protocolos.add("superiores");
    protocolos.add("inferiores");
    regioes.push("Mobilidade geral");
  }
  return { protocolos: (["superiores", "inferiores"] as const).filter((p) => protocolos.has(p)), regioes };
}

export type PrescricaoMobilidade = { protocolos: SlugMobilidade[]; dias_semana: number; motivo: string | null; ativo: boolean; criado_em: string };

export type MobilidadeDoAluno = {
  protocolos: SlugMobilidade[];
  diasSemana: number;
  origem: "personal" | "anamnese";
  /** Por quê (para o aluno e o personal): “Anamnese: ombro e joelho” ou o motivo escrito. */
  motivo: string;
  regioes: string[];
};

const listaPt = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} e ${xs.at(-1)}`);

/** O que vale para o aluno agora (null = nada indicado ou o personal desligou). */
export function mobilidadeDoAluno(p: PrescricaoMobilidade | null, anamnese: TextoAnamnese | null | undefined): MobilidadeDoAluno | null {
  const ind = indicacaoDaAnamnese(anamnese);
  if (p) {
    if (!p.ativo || !p.protocolos.length) return null;
    return { protocolos: p.protocolos, diasSemana: Math.min(7, Math.max(1, p.dias_semana)), origem: "personal", motivo: p.motivo?.trim() || (ind.regioes.length ? `Pela sua anamnese: ${listaPt(ind.regioes).toLowerCase()}` : "Indicada pelo Montinho"), regioes: ind.regioes };
  }
  if (!ind.protocolos.length) return null;
  return { protocolos: ind.protocolos, diasSemana: 7, origem: "anamnese", motivo: `Pela sua anamnese: ${listaPt(ind.regioes).toLowerCase()}`, regioes: ind.regioes };
}

// ---------------------------------------------------------------------------
// A semana e o dia
// ---------------------------------------------------------------------------
const diaBR = (iso: string) => new Date(Date.parse(iso) - 3 * 3_600_000).toISOString().slice(0, 10);
/** Segunda-feira da semana de `dia` (AAAA-MM-DD). */
export function segundaDe(dia: string): string {
  const d = new Date(`${dia}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export type SituacaoMobilidade = {
  feitaHoje: boolean;
  /** Dias diferentes da semana (seg–dom) com uma mobilidade indicada concluída. */
  diasNaSemana: number;
  meta: number;
  metaBatida: boolean;
  /** Qual fazer hoje: a indicada feita há mais tempo (ou nunca). */
  hoje: SlugMobilidade;
  ultimaEm: string | null;
};

export function situacaoMobilidade(m: MobilidadeDoAluno, sessoes: SessaoMobilidade[], hoje: string): SituacaoMobilidade {
  const validas = sessoes.filter((s) => valeMobilidade(s) && m.protocolos.includes(s.protocolo));
  const seg = segundaDe(hoje);
  const diasSemana = new Set(validas.map((s) => diaBR(s.iniciado_em)).filter((d) => d >= seg && d <= hoje));
  const ultimaDe = (p: SlugMobilidade) => validas.filter((s) => s.protocolo === p).map((s) => s.concluido_em!).sort().at(-1) ?? "";
  const hojeQual = [...m.protocolos].sort((a, b) => (ultimaDe(a) < ultimaDe(b) ? -1 : ultimaDe(a) > ultimaDe(b) ? 1 : 0))[0];
  const ultimaEm = validas.map((s) => s.concluido_em!).sort().at(-1) ?? null;
  return { feitaHoje: diasSemana.has(hoje), diasNaSemana: diasSemana.size, meta: m.diasSemana, metaBatida: diasSemana.size >= m.diasSemana, hoje: hojeQual, ultimaEm };
}

/** Lembrete de hoje: aparece se não fez hoje e a meta da semana ainda está aberta (com 7 dias, todo dia). */
export const lembrarHoje = (s: SituacaoMobilidade) => !s.feitaHoje && !s.metaBatida;

/** Por que vale a pena (gira por dia; cuidado com a saúde e o desempenho, nunca culpa). */
export const BENEFICIOS = [
  "Corpo solto, treino melhor: mais amplitude e mais segurança em cada exercício.",
  "Menos dor e menos travamento significam menos treino perdido. A constância agradece.",
  "Com mais mobilidade, a execução melhora e a carga sobe com mais segurança.",
  "20 minutos hoje cuidam das suas articulações e do seu treino de amanhã.",
  "Cuidar do corpo é parte do treino: é assim que o resultado vem melhor e mais rápido.",
  "Articulação que se mexe bem aguenta mais treino, e mais treino bem feito vira resultado.",
  "Quem cuida da mobilidade treina por mais tempo, com menos pausa por dor.",
];
export function beneficioDoDia(hoje: string): string {
  const n = [...hoje].reduce((s, c) => s + c.charCodeAt(0), 0);
  return BENEFICIOS[n % BENEFICIOS.length];
}

export const nomeCurto = (p: SlugMobilidade) => PROTOCOLOS[p].nome.replace("Mobilidade de ", "");
export const textoDias = (n: number) => (n >= 7 ? "todos os dias" : `${n}× por semana`);
