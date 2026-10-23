// ============================================================================
// Montinho Desbloqueia — regras PURAS (testadas).
//
// • Disponibilidade é DERIVADA dos fatos (medalhas conquistadas, tempo de
//   acompanhamento, recomendação do personal): nada a “destravar” à mão e
//   pausas não apagam nada.
// • “Explorado” é o único estado gravado: abrir o conteúdo basta — acertar
//   não é exigido e errar não tira nada.
// • Biblioteca livre: todo conteúdo publicado pode ser lido a qualquer hora;
//   o desbloqueio é só a apresentação especial e o item colecionável.
// • Responder quiz NÃO concede medalha nem mexe em aderência.
// ============================================================================

import { somarDias } from "@/lib/aderencia/calcular";
import type { ContextoConhecimento, ConteudoConhecimento } from "./tipos";

export const REGRAS_DESBLOQUEIA = {
  /** A cada N dias de acompanhamento, uma nova descoberta fica disponível (alunos com pouca frequência também recebem). */
  diasPorOportunidade: 14,
  /** Selo “Nova” por 7 dias. */
  diasNovo: 7,
  /** No máximo 1 sugestão educativa nova por sessão de treino. */
  sugestoesPorSessao: 1,
};

export type LinhaConteudoDb = { id: string; dados: Partial<ConteudoConhecimento>; status: ConteudoConhecimento["status"]; versao: number; ordem: number | null };
export type ProgressoAluno = { conteudo_id: string; origem: string | null; disponivel_em: string | null; explorado_em: string | null; resposta: string | null; acertou: boolean | null; salvo: boolean | null };

/** Base do código + edições do personal (o banco vence) + conteúdos novos do personal. */
export function mesclarConteudos(base: ConteudoConhecimento[], linhas: LinhaConteudoDb[]): ConteudoConhecimento[] {
  const porId = new Map(linhas.map((l) => [l.id, l]));
  const out = base.map((b) => {
    const l = porId.get(b.id);
    return l ? ({ ...b, ...l.dados, id: b.id, status: l.status, versao: l.versao, ordem: l.ordem ?? b.ordem ?? b.numero } as ConteudoConhecimento) : { ...b, ordem: b.ordem ?? b.numero };
  });
  for (const l of linhas) {
    if (base.some((b) => b.id === l.id)) continue;
    const d = l.dados as ConteudoConhecimento;
    if (!d?.pergunta || !d.titulo) continue;
    out.push({ ...d, id: l.id, status: l.status, versao: l.versao, ordem: l.ordem ?? 1000, personalizado: true });
  }
  return out.sort((a, b) => (a.ordem ?? a.numero) - (b.ordem ?? b.numero));
}

export const publicados = (cs: ConteudoConhecimento[]) => cs.filter((c) => c.status === "publicado");

export type ResultadoResposta = { acertou: boolean; titulo: string; veredito: string };

/** Feedback imediato. Errar nunca é punido: só muda a frase de abertura. */
export function responder(c: ConteudoConhecimento, alternativa: string): ResultadoResposta {
  const acertou = alternativa === c.correta;
  return { acertou, titulo: acertou ? "Isso mesmo!" : "Boa tentativa! Essa dúvida é muito comum. Veja como funciona.", veredito: c.veredito };
}

export type EstadoDescoberta = "futuro" | "disponivel" | "explorado";
export type ItemAlbum = {
  conteudo: ConteudoConhecimento;
  estado: EstadoDescoberta;
  /** Data (AAAA-MM-DD) em que ficou disponível. */
  disponivelEm: string | null;
  origem: "conquista" | "periodo" | "personal" | "contexto" | "biblioteca" | null;
  exploradoEm: string | null;
  novo: "disponivel" | "explorado" | null;
  salvo: boolean;
};

const diasEntre = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
const dia = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : null);

export function albumDoAluno(e: {
  conteudos: ConteudoConhecimento[];
  progresso: ProgressoAluno[];
  conquistas: Array<{ codigo: string; conquistado_em: string }>;
  /** AAAA-MM-DD — início do acompanhamento. */
  inicio: string;
  hoje: string;
}): ItemAlbum[] {
  const pub = publicados(e.conteudos);
  const prog = new Map(e.progresso.map((p) => [p.conteudo_id, p]));
  const primeiraConquista = (codigos: string[]) => e.conquistas.filter((c) => codigos.includes(c.codigo)).map((c) => dia(c.conquistado_em)!).sort()[0] ?? null;

  const itens: ItemAlbum[] = pub.map((c) => {
    const p = prog.get(c.id);
    const porConquista = c.gatilhos.conquistas.length ? primeiraConquista(c.gatilhos.conquistas) : null;
    const porRegistro = p?.disponivel_em ? dia(p.disponivel_em) : null;
    const disponivelEm = [porConquista, porRegistro].filter(Boolean).sort()[0] ?? null;
    const origem: ItemAlbum["origem"] = porConquista && porConquista === disponivelEm ? "conquista" : porRegistro ? ((p?.origem as ItemAlbum["origem"]) ?? "personal") : null;
    const exploradoEm = dia(p?.explorado_em);
    return { conteudo: c, estado: exploradoEm ? "explorado" : disponivelEm ? "disponivel" : "futuro", disponivelEm, origem, exploradoEm, novo: null, salvo: !!p?.salvo };
  });

  // Oportunidade periódica: quem treina pouco também recebe descobertas.
  const vagas = Math.floor(Math.max(0, diasEntre(e.inicio, e.hoje)) / REGRAS_DESBLOQUEIA.diasPorOportunidade) + 1;
  const jaPorPeriodo = itens.filter((i) => i.origem === "periodo").length;
  let k = 0;
  for (const i of itens) {
    if (k + jaPorPeriodo >= vagas) break;
    if (i.estado !== "futuro") continue;
    i.estado = "disponivel";
    i.origem = "periodo";
    i.disponivelEm = somarDias(e.inicio, (jaPorPeriodo + k) * REGRAS_DESBLOQUEIA.diasPorOportunidade);
    k++;
  }

  for (const i of itens) {
    if (i.exploradoEm && diasEntre(i.exploradoEm, e.hoje) < REGRAS_DESBLOQUEIA.diasNovo) i.novo = "explorado";
    else if (i.estado === "disponivel" && i.disponivelEm && diasEntre(i.disponivelEm, e.hoje) < REGRAS_DESBLOQUEIA.diasNovo) i.novo = "disponivel";
  }
  return itens;
}

export const progressoAlbum = (itens: ItemAlbum[]) => ({ explorados: itens.filter((i) => i.estado === "explorado").length, total: itens.length });

/** Candidatas a “Novo conhecimento desbloqueado!”: disponíveis há pouco e não abertas, mais recentes primeiro. */
export function candidatasAnuncio(itens: ItemAlbum[]): ItemAlbum[] {
  // Quem ainda não abriu nenhuma (ex.: aluno antigo na estreia do recurso) recebe o convite mesmo sem item “novo”.
  const nenhumaExplorada = !itens.some((i) => i.estado === "explorado");
  return itens.filter((i) => i.novo === "disponivel" || (nenhumaExplorada && i.estado === "disponivel")).sort((a, b) => ((a.disponivelEm ?? "") < (b.disponivelEm ?? "") ? 1 : a.disponivelEm === b.disponivelEm ? a.conteudo.numero - b.conteudo.numero : -1));
}

/** A primeira candidata que o aluno não dispensou (“Ver depois”). */
export function paraAnunciar(itens: ItemAlbum[], dispensados: string[] = []): ItemAlbum | null {
  return candidatasAnuncio(itens).find((i) => !dispensados.includes(i.conteudo.id)) ?? null;
}

/** Explicação contextual (Caminho B): relevante ao momento, sem repetir o que já foi visto/sugerido. */
export function sugestaoContextual(contexto: ContextoConhecimento, conteudos: ConteudoConhecimento[], e: { explorados: string[]; jaSugeridos: string[] }): ConteudoConhecimento | null {
  if (e.jaSugeridos.length >= REGRAS_DESBLOQUEIA.sugestoesPorSessao) return null;
  return publicados(conteudos).find((c) => c.gatilhos.contexto.includes(contexto) && !e.explorados.includes(c.id) && !e.jaSugeridos.includes(c.id)) ?? null;
}

/** Pergunta curta para a sugestão contextual. */
export const CHAMADA_CONTEXTO: Record<ContextoConhecimento, string> = {
  mais_reps: "Você conseguiu mais repetições. Quer entender por que isso também pode representar progresso?",
  recorde: "Nova marca! Quer entender por que mais carga não é a única forma de evoluir?",
  reps_altas: "Por que seu treino tem tantas repetições?",
  descanso: "Por que o descanso entre as séries faz parte do treino?",
  treino_reduzido: "Treino curto vale? Entenda quando ele ajuda.",
  meta_semanal: "Meta cumprida! Quer entender por que consistência importa mais do que perfeição?",
  sem_aumento_carga: "Por que nem toda semana precisa ter aumento de carga?",
};

/** Consistência editorial (usada em testes e no painel antes de publicar). */
export function problemasEditoriais(c: ConteudoConhecimento, fontesConhecidas: string[]): string[] {
  const p: string[] = [];
  if (!c.titulo?.trim()) p.push("Falta o título.");
  if (!c.pergunta?.trim()) p.push("Falta a pergunta.");
  if (c.alternativas.length < 2 || c.alternativas.length > 4) p.push("Use de 2 a 4 alternativas.");
  if (!c.alternativas.some((a) => a.id === c.correta)) p.push("A resposta correta precisa ser uma das alternativas.");
  if (new Set(c.alternativas.map((a) => a.id)).size !== c.alternativas.length) p.push("Alternativas repetidas.");
  if (!c.rapida?.trim() || !c.pratica?.trim()) p.push("Falta a explicação rápida ou a aplicação prática.");
  if (!c.detalhada?.trim()) p.push("Falta a explicação detalhada.");
  for (const f of c.fontes) if (!fontesConhecidas.includes(f)) p.push(`Fonte não verificada: ${f}.`);
  if (/dopamina|reprograma|garantid[oa]/i.test([c.rapida, c.detalhada, c.ciencia].join(" "))) p.push("Evite afirmações pseudocientíficas ou garantias.");
  return p;
}

/** Repetições “altas” pedem a explicação d01 (link “Por que N repetições?”). */
export const REPS_ALTAS = 15;
/** Primeiro número da prescrição (“15-20” → 15; “até a falha” → null). */
export function repsPrescritas(reps: string | null | undefined): number | null {
  if (/\d\s*(s|seg|min|")\b/i.test(reps ?? "") || /\d\s*(s|")$/i.test(reps ?? "")) return null; // tempo (isometria), não repetições
  const m = (reps ?? "").match(/\d+/);
  return m ? Number(m[0]) : null;
}

export type PacoteTreino = {
  /** Sugestão automática por momento (só o que o aluno ainda não explorou). */
  porContexto: Partial<Record<ContextoConhecimento, string>>;
  /** Explicação sob demanda das repetições altas (mesmo já explorada). */
  repsAltas: string | null;
  itens: Record<string, { id: string; titulo: string; pergunta: string; veredito: string; rapida: string; pratica: string }>;
};

/** O que o treino ativo precisa do Desbloqueia (enxuto, para o cliente). */
export function pacoteDoTreino(conteudos: ConteudoConhecimento[], explorados: string[], contextos: readonly ContextoConhecimento[]): PacoteTreino {
  const pub = publicados(conteudos);
  const porContexto: PacoteTreino["porContexto"] = {};
  for (const ctx of contextos) {
    const c = sugestaoContextual(ctx, pub, { explorados, jaSugeridos: [] });
    if (c) porContexto[ctx] = c.id;
  }
  const repsAltas = pub.find((c) => c.gatilhos.contexto.includes("reps_altas"))?.id ?? null;
  const ids = new Set([...Object.values(porContexto), ...(repsAltas ? [repsAltas] : [])]);
  const itens: PacoteTreino["itens"] = {};
  for (const c of pub) if (ids.has(c.id)) itens[c.id] = { id: c.id, titulo: c.titulo, pergunta: c.pergunta, veredito: c.veredito, rapida: c.rapida, pratica: c.pratica };
  return { porContexto, repsAltas, itens };
}

/** Fim de treino: qual momento merece uma explicação (ordem de prioridade). */
export function contextosDaConclusao(r: { metaCumpridaAgora: boolean; modo: "normal" | "reduzido" | "extra"; recorde: boolean; maisReps: boolean }): ContextoConhecimento[] {
  const out: ContextoConhecimento[] = [];
  if (r.metaCumpridaAgora) out.push("meta_semanal");
  if (r.modo === "reduzido") out.push("treino_reduzido");
  if (r.recorde) out.push("recorde");
  if (r.maisReps) out.push("mais_reps");
  return out;
}

/** Linha do tempo da Jornada: cada descoberta explorada vira um acontecimento. */
export function eventosDasDescobertas(itens: ItemAlbum[]): Array<{ chave: string; data: string; tipo: "descoberta"; titulo: string; detalhe: string | null }> {
  return itens
    .filter((i) => i.exploradoEm)
    .map((i) => ({ chave: `d:${i.conteudo.id}`, data: `${i.exploradoEm}T15:00:00Z`, tipo: "descoberta" as const, titulo: `Descoberta: ${i.conteudo.titulo}`, detalhe: `${i.conteudo.pergunta} — ${i.conteudo.veredito}.` }));
}

/**
 * Próxima pergunta depois de ler uma descoberta: a próxima em número que a
 * pessoa ainda não explorou (dando a volta no álbum); se já explorou todas,
 * simplesmente a seguinte. Pelo álbum só valem as liberadas; pela biblioteca,
 * todas (a biblioteca é aberta). null = não há outra.
 */
export function proximaDescoberta(itens: Array<Pick<ItemAlbum, "estado"> & { conteudo: Pick<ConteudoConhecimento, "id" | "numero"> }>, atualId: string, biblioteca: boolean): string | null {
  const ordem = [...itens].filter((i) => biblioteca || i.estado !== "futuro").sort((a, b) => a.conteudo.numero - b.conteudo.numero);
  const k = ordem.findIndex((i) => i.conteudo.id === atualId);
  const depois = [...ordem.slice(k + 1), ...ordem.slice(0, Math.max(0, k))].filter((i) => i.conteudo.id !== atualId);
  return (depois.find((i) => i.estado !== "explorado") ?? depois[0])?.conteudo.id ?? null;
}
