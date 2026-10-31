// ============================================================================
// Troféus da Multimodalidade (fase 5, aprovada pelo Montinho em 30/10/2026).
// Regras PURAS. Treino que vale = a mesma regra do carimbo (concluído, ou
// extra/livre/WOD do dia com algo feito; nada importado). A modalidade é a da
// SESSÃO (padrão musculação).
//  • Primeiro WOD (Cross Training), Primeira Sessão HYROX, Primeiro Circuito
//    Funcional: o 1º treino válido daquela modalidade.
//  • Primeiro Benchmark: o 1º resultado de um benchmark (Fran, Grace…).
//  • Superando Meu Recorde: um benchmark melhor que todos os anteriores
//    COMPARÁVEIS (mesmo benchmark, mesma versão, RX com RX, Scaled com Scaled;
//    adaptado nunca entra).
//  • Atleta Versátil: treinos válidos em 3 modalidades diferentes (musculação
//    conta como uma). É o único destes que entra no ranking.
//  • Semana Multimodalidade: numa mesma semana (segunda a domingo, Brasília),
//    treinos válidos em 2+ modalidades, sendo pelo menos uma fora da musculação.
//  • Evolução Sem Fronteiras: subiu um recorde de força (RM exato: 1, 2, 3, 5
//    ou 10 repetições) E superou um benchmark comparável.
// Todos valem uma vez.
// ============================================================================
import { dataLocal, inicioDaSemana } from "@/lib/aderencia/calcular";
import { contaCarimbo } from "./carimbos";
import { pontuacao, type ResultadoBloco } from "@/lib/modalidades/resultado";
import { recordesDeForca, type SerieForca } from "@/lib/modalidades/recordes";
import { MODALIDADES_TREINO, type ModalidadeTreino } from "@/lib/modalidades/tipos";
import type { SessaoConquista } from "./regras";

export type CodigoMulti = "primeiro_wod" | "primeiro_benchmark" | "superando_recorde" | "primeira_hyrox" | "primeiro_funcional" | "atleta_versatil" | "semana_multimodalidade" | "evolucao_sem_fronteiras";
export const CODIGOS_MULTI: CodigoMulti[] = ["primeiro_wod", "primeiro_benchmark", "superando_recorde", "primeira_hyrox", "primeiro_funcional", "atleta_versatil", "semana_multimodalidade", "evolucao_sem_fronteiras"];
/** Só o Atleta Versátil entra no ranking (decisão da auditoria). */
export const MULTI_FORA_DO_RANKING: CodigoMulti[] = CODIGOS_MULTI.filter((c) => c !== "atleta_versatil");
export const LIMITES_MULTI = { modalidadesVersatil: 3, modalidadesSemana: 2 } as const;

export type ResultadoBenchmarkConquista = ResultadoBloco & { benchmark: string; benchmark_versao?: number | null; created_at: string; session_id?: string | null };
export type TrofeuMulti = { codigo: CodigoMulti; data: string; sessaoId: string | null; descricao: string; evidencia: Record<string, unknown> };

const modalidadeDe = (s: SessaoConquista): ModalidadeTreino => ((s.modalidade && s.modalidade in MODALIDADES_TREINO ? s.modalidade : "musculacao") as ModalidadeTreino);
const nomeModalidade = (m: ModalidadeTreino) => MODALIDADES_TREINO[m].nome;

/** Treinos que valem, do mais antigo para o mais novo. */
function validas(sessoes: SessaoConquista[]): SessaoConquista[] {
  return sessoes.filter((s) => s.status !== "em_andamento" && contaCarimbo(s)).sort((a, b) => (a.iniciado_em < b.iniciado_em ? -1 : 1));
}

/** O primeiro resultado de benchmark que superou todos os anteriores comparáveis. */
export function primeiroBenchmarkSuperado(resultados: ResultadoBenchmarkConquista[]): ResultadoBenchmarkConquista | null {
  const ordem = [...resultados].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  for (let i = 0; i < ordem.length; i++) {
    const r = ordem[i];
    if (r.condicao !== "rx" && r.condicao !== "scaled") continue;
    const p = pontuacao(r);
    if (p == null) continue;
    const antes = ordem.slice(0, i).filter((x) => x.benchmark === r.benchmark && (x.benchmark_versao ?? 1) === (r.benchmark_versao ?? 1) && x.condicao === r.condicao && pontuacao(x) != null);
    if (antes.length && p > Math.max(...antes.map((x) => pontuacao(x)!))) return r;
  }
  return null;
}

/** Séries de força das sessões (para o recorde de RM exato). */
export function seriesDeForca(sessoes: SessaoConquista[]): Array<SerieForca & { sessaoId: string; em: string }> {
  const out: Array<SerieForca & { sessaoId: string; em: string }> = [];
  for (const s of sessoes) {
    if (s.origem === "importado" || s.status === "abandonada") continue;
    for (const e of s.exercicios ?? [])
      for (const x of e.series)
        if (x.tipo !== "aquecimento" && (x.carga_kg ?? 0) > 0 && (x.reps ?? 0) > 0)
          out.push({ chave: e.exercicio_id ?? `nome:${e.nome.toLowerCase()}`, nome: e.nome, data: dataLocal(s.iniciado_em), carga: x.carga_kg!, reps: x.reps!, sessaoId: s.id, em: s.iniciado_em });
  }
  return out;
}

export function trofeusMultimodalidade(sessoes: SessaoConquista[], benchmarks: ResultadoBenchmarkConquista[] = []): TrofeuMulti[] {
  const out: TrofeuMulti[] = [];
  const ok = validas(sessoes);

  const primeiraDe = (m: ModalidadeTreino) => ok.find((s) => modalidadeDe(s) === m);
  const firsts: Array<[CodigoMulti, ModalidadeTreino, string]> = [
    ["primeiro_wod", "cross", "Primeiro treino de Cross Training registrado no app."],
    ["primeira_hyrox", "hyrox", "Primeira sessão de HYROX registrada no app."],
    ["primeiro_funcional", "funcional", "Primeiro circuito funcional registrado no app."],
  ];
  for (const [codigo, m, descricao] of firsts) {
    const s = primeiraDe(m);
    if (s) out.push({ codigo, data: s.iniciado_em, sessaoId: s.id, descricao, evidencia: { modalidade: m, sessao: s.id } });
  }

  // Atleta Versátil: a sessão em que apareceu a 3ª modalidade diferente.
  const vistas: ModalidadeTreino[] = [];
  for (const s of ok) {
    const m = modalidadeDe(s);
    if (vistas.includes(m)) continue;
    vistas.push(m);
    if (vistas.length === LIMITES_MULTI.modalidadesVersatil) {
      out.push({ codigo: "atleta_versatil", data: s.iniciado_em, sessaoId: s.id, descricao: `Treinos em ${vistas.length} modalidades: ${vistas.map(nomeModalidade).join(", ")}.`, evidencia: { modalidades: [...vistas] } });
      break;
    }
  }

  // Semana Multimodalidade: a 1ª semana com 2+ modalidades (uma fora da musculação).
  const porSemana = new Map<string, Map<ModalidadeTreino, SessaoConquista>>();
  for (const s of ok) {
    const sem = inicioDaSemana(dataLocal(s.iniciado_em));
    const mapa = porSemana.get(sem) ?? new Map<ModalidadeTreino, SessaoConquista>();
    if (!mapa.has(modalidadeDe(s))) mapa.set(modalidadeDe(s), s);
    porSemana.set(sem, mapa);
    const mods = [...mapa.keys()];
    if (mods.length >= LIMITES_MULTI.modalidadesSemana && mods.some((m) => m !== "musculacao")) {
      out.push({ codigo: "semana_multimodalidade", data: s.iniciado_em, sessaoId: s.id, descricao: `Na mesma semana: ${mods.map(nomeModalidade).join(" + ")}.`, evidencia: { semana: sem, modalidades: mods } });
      break;
    }
  }

  // Benchmarks.
  const bm = [...benchmarks].sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
  if (bm[0]) out.push({ codigo: "primeiro_benchmark", data: bm[0].created_at, sessaoId: bm[0].session_id ?? null, descricao: `Primeiro benchmark registrado: ${bm[0].benchmark}.`, evidencia: { benchmark: bm[0].benchmark } });
  const superou = primeiroBenchmarkSuperado(bm);
  if (superou) out.push({ codigo: "superando_recorde", data: superou.created_at, sessaoId: superou.session_id ?? null, descricao: `${superou.benchmark} (${superou.condicao === "rx" ? "RX" : "Scaled"}): melhor que todas as vezes anteriores.`, evidencia: { benchmark: superou.benchmark, condicao: superou.condicao } });

  // Evolução Sem Fronteiras: força (RM exato subiu) + benchmark superado.
  if (superou) {
    const series = seriesDeForca(sessoes);
    const subidas = recordesDeForca(series)
      .filter((l) => l.historico.length > 1)
      .map((l) => ({ l, data: l.historico[1].data }))
      .sort((a, b) => (a.data < b.data ? -1 : 1));
    const primeira = subidas[0];
    if (primeira) {
      const serie = series.find((x) => x.chave === primeira.l.chave && x.data === primeira.data);
      const emForca = serie?.em ?? `${primeira.data}T12:00:00-03:00`;
      const data = emForca > superou.created_at ? emForca : superou.created_at;
      out.push({ codigo: "evolucao_sem_fronteiras", data, sessaoId: emForca > superou.created_at ? serie?.sessaoId ?? null : superou.session_id ?? null, descricao: `Força e condicionamento subindo juntos: ${primeira.l.nome} (${primeira.l.rm}RM) e ${superou.benchmark}.`, evidencia: { forca: primeira.l.nome, rm: primeira.l.rm, benchmark: superou.benchmark } });
    }
  }
  return out;
}
