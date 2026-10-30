// ============================================================================
// Monitoramento (pedido do Montinho, 30/10/2026): troféus para quem registra
// avaliação/medidas SEMANA APÓS SEMANA, porque acompanhar os números é o que
// mantém a evolução no rumo.
//
// Regra: semana de segunda a domingo (horário de Brasília) com pelo menos UM
// registro de medidas (qualquer medida: peso, cintura…) ou um arquivo de
// avaliação. Vale o momento em que o registro ENTROU no app (created_at, hora
// do servidor) — lançar várias datas antigas no mesmo dia conta uma semana só.
// Registros feitos pelo personal contam também. Semana sem registro zera a
// sequência; a semana atual (ainda aberta) e as semanas pausadas não quebram.
// Marcos: 4, 8, 12 e 26 semanas seguidas, cada um vale uma vez.
// Evidência: monitorar o progresso aumenta a chance de atingir a meta
// (Harkin et al., 2016, meta-análise de 138 estudos), mais ainda quando fica
// registrado; o automonitoramento está associado à perda de peso (Burke et
// al., 2011).
// ============================================================================
import { dataLocal, inicioDaSemana, somarDias } from "@/lib/aderencia/calcular";

export const MARCOS_MONITORAMENTO = [4, 8, 12, 26] as const;
export type CodigoMonitoramento = "monitoramento_4" | "monitoramento_8" | "monitoramento_12" | "monitoramento_26";
export const CODIGOS_MONITORAMENTO: CodigoMonitoramento[] = MARCOS_MONITORAMENTO.map((n) => `monitoramento_${n}` as CodigoMonitoramento);

export type TrofeuMonitoramento = { codigo: CodigoMonitoramento; data: string; descricao: string; evidencia: Record<string, unknown> };
export type ProgressoMonitoramento = { seguidas: number; estaSemana: boolean; proximo: number | null };

/** Semanas (segunda) com registro, em ordem, e o primeiro registro (ISO) de cada uma. */
function semanasComRegistro(registros: string[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const iso of [...registros].sort()) {
    const s = inicioDaSemana(dataLocal(iso));
    if (!m.has(s)) m.set(s, iso);
  }
  return m;
}

/** Percorre as semanas do 1º registro até hoje e devolve os troféus e a sequência atual. */
function percorrer(registros: string[], hoje: string, pausadas: string[] = []) {
  const porSemana = semanasComRegistro(registros);
  const trofeus: TrofeuMonitoramento[] = [];
  const semanas = [...porSemana.keys()];
  if (!semanas.length) return { trofeus, seguidas: 0, estaSemana: false };
  const pausa = new Set(pausadas.map(inicioDaSemana));
  const atual = inicioDaSemana(hoje);
  let seguidas = 0;
  for (let s = semanas[0]; s <= atual; s = somarDias(s, 7)) {
    const iso = porSemana.get(s);
    if (iso) {
      seguidas++;
      for (const n of MARCOS_MONITORAMENTO) if (seguidas === n) trofeus.push({ codigo: `monitoramento_${n}` as CodigoMonitoramento, data: iso, descricao: `Avaliação ou medidas registradas ${n} semanas seguidas.`, evidencia: { semanas: n, ultimaSemana: s } });
    } else if (s !== atual && !pausa.has(s)) seguidas = 0;
  }
  return { trofeus, seguidas, estaSemana: porSemana.has(atual) };
}

/** Troféus de monitoramento sustentados pelos registros (datas ISO de quando entraram no app). */
export function trofeusDeMonitoramento(registros: string[], hoje: string, pausadas: string[] = []): TrofeuMonitoramento[] {
  return percorrer(registros, hoje, pausadas).trofeus;
}

/** Sequência atual (semanas seguidas com registro), se a semana atual já tem registro e o próximo marco. */
export function progressoMonitoramento(registros: string[], hoje: string, pausadas: string[] = []): ProgressoMonitoramento {
  const { seguidas, estaSemana } = percorrer(registros, hoje, pausadas);
  return { seguidas, estaSemana, proximo: MARCOS_MONITORAMENTO.find((n) => n > seguidas) ?? null };
}
