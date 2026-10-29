// ============================================================================
// Revisão do “Mito ou verdade?” (pedido do Montinho, 29/10/2026) — regras PURAS.
// A pergunta que a pessoa errou volta depois de um tempo: 3 dias depois do
// erro, depois 7 e depois 14 (se errar de novo). Acertou na revisão → sai da
// fila (“aprendida”). A 1ª resposta continua sendo o histórico e é a que vale
// para os troféus de Autoconhecimento.
// ============================================================================

export const INTERVALOS_REVISAO = [3, 7, 14] as const;

export type ProgressoRevisao = {
  conteudo_id: string;
  resposta: string | null;
  acertou: boolean | null;
  explorado_em: string | null;
  updated_at?: string | null;
  revisoes?: number | null;
  revisao_em?: string | null;
  revisao_acertou?: boolean | null;
};

const dias = (de: string, ate: string) => Math.floor((Date.parse(ate) - Date.parse(de)) / 86_400_000);

/** Data da última tentativa (revisão ou 1ª resposta). */
const ultimaTentativa = (p: ProgressoRevisao) => p.revisao_em ?? p.updated_at ?? p.explorado_em;

/** Errou e ainda não acertou numa revisão. */
export const precisaRevisar = (p: ProgressoRevisao) => !!p.resposta && p.acertou === false && p.revisao_acertou !== true;

/** Quando a pergunta volta (ISO) — null se não precisa revisar. */
export function proximaRevisao(p: ProgressoRevisao): string | null {
  const desde = ultimaTentativa(p);
  if (!precisaRevisar(p) || !desde) return null;
  const n = INTERVALOS_REVISAO[Math.min(p.revisoes ?? 0, INTERVALOS_REVISAO.length - 1)];
  return new Date(Date.parse(desde) + n * 86_400_000).toISOString();
}

/** Já voltou (está na hora de revisar)? */
export function revisaoDevida(p: ProgressoRevisao, agora: string): boolean {
  const quando = proximaRevisao(p);
  return !!quando && quando <= agora;
}

/** Perguntas na hora de revisar, das que estão esperando há mais tempo primeiro. */
export function filaDeRevisao<T extends ProgressoRevisao>(ps: T[], agora: string, publicados?: Set<string>): T[] {
  return ps
    .filter((p) => (!publicados || publicados.has(p.conteudo_id)) && revisaoDevida(p, agora))
    .sort((a, b) => (proximaRevisao(a)! < proximaRevisao(b)! ? -1 : 1));
}

/** Resumo para a tela: quantas para revisar agora e quantas já foram aprendidas na revisão. */
export function resumoRevisao(ps: ProgressoRevisao[], agora: string, publicados?: Set<string>) {
  const fila = filaDeRevisao(ps, agora, publicados);
  const aprendidas = ps.filter((p) => p.acertou === false && p.revisao_acertou === true).length;
  const esperando = ps.filter((p) => precisaRevisar(p) && !revisaoDevida(p, agora)).length;
  return { agora: fila.length, primeira: fila[0]?.conteudo_id ?? null, aprendidas, esperando, dias: (p: ProgressoRevisao) => (proximaRevisao(p) ? Math.max(0, dias(agora, proximaRevisao(p)!)) : null) };
}
