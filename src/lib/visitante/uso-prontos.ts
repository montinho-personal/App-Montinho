// Quantas pessoas estão fazendo cada treino pronto (e o Monte com IA).
// PURO e testado. Conta pela marca guardada nas observações dos treinos
// criados a partir do pronto; treinos arquivados continuam contando em
// “escolheram” (o histórico não some).
import { MARCA_MONTE_IA, progressoDesafio, prontoDaMarca, type TreinoPronto } from "./treinos-prontos";

export type TreinoMarcado = { id: string; aluno_id: string; observacoes: string | null; ativo: boolean; created_at: string };
export type SessaoDoTreino = { aluno_id: string; treino_id: string | null; data: string; concluida: boolean };

export type UsoDoPronto = {
  chave: string;
  /** null = Monte com IA. */
  pronto: TreinoPronto | null;
  /** Pessoas diferentes que já escolheram (mesmo que tenham trocado depois). */
  escolheram: number;
  /** Com o treino ativo em Meus treinos. */
  comAtivo: number;
  /** Com o treino ativo e pelo menos 1 treino feito nos últimos 14 dias. */
  fazendoAgora: number;
  /** Treinos feitos (sessões com séries) nos treinos dele. */
  treinosFeitos: number;
  /** Pessoas que bateram a meta do desafio. */
  desafiosConcluidos: number;
  /** Último dia em que alguém escolheu (AAAA-MM-DD). */
  ultimaEscolha: string | null;
};

export const DIAS_FAZENDO_AGORA = 14;
const dia = (d: string) => Math.floor(Date.parse(`${d}T12:00:00Z`) / 86_400_000);

export function usoDosProntos(treinos: TreinoMarcado[], sessoes: SessaoDoTreino[], hoje: string, dataLocal: (iso: string) => string): UsoDoPronto[] {
  const grupos = new Map<string, { pronto: TreinoPronto | null; treinos: TreinoMarcado[] }>();
  for (const t of treinos) {
    const pronto = prontoDaMarca(t.observacoes);
    const chave = pronto ? pronto.slug : (t.observacoes ?? "").trim() === MARCA_MONTE_IA ? "monte-com-ia" : null;
    if (!chave) continue;
    const g = grupos.get(chave) ?? { pronto, treinos: [] };
    g.treinos.push(t);
    grupos.set(chave, g);
  }
  const porTreino = new Map<string, SessaoDoTreino[]>();
  for (const s of sessoes) if (s.treino_id && s.concluida) porTreino.set(s.treino_id, [...(porTreino.get(s.treino_id) ?? []), s]);

  return [...grupos.entries()]
    .map(([chave, g]): UsoDoPronto => {
      const porAluno = new Map<string, TreinoMarcado[]>();
      for (const t of g.treinos) porAluno.set(t.aluno_id, [...(porAluno.get(t.aluno_id) ?? []), t]);
      let comAtivo = 0, fazendoAgora = 0, treinosFeitos = 0, desafiosConcluidos = 0;
      for (const ts of porAluno.values()) {
        const datas = ts.flatMap((t) => (porTreino.get(t.id) ?? []).map((s) => s.data));
        treinosFeitos += datas.length;
        const ativos = ts.filter((t) => t.ativo);
        if (ativos.length) {
          comAtivo++;
          const recentes = ativos.flatMap((t) => (porTreino.get(t.id) ?? []).map((s) => s.data));
          if (recentes.some((d) => dia(hoje) - dia(d) < DIAS_FAZENDO_AGORA)) fazendoAgora++;
        }
        if (g.pronto) {
          const inicio = ts.map((t) => dataLocal(t.created_at)).sort()[0];
          if (progressoDesafio(g.pronto, inicio, hoje, datas).concluido) desafiosConcluidos++;
        }
      }
      const ultimaEscolha = g.treinos.map((t) => dataLocal(t.created_at)).sort().at(-1) ?? null;
      return { chave, pronto: g.pronto, escolheram: porAluno.size, comAtivo, fazendoAgora, treinosFeitos, desafiosConcluidos, ultimaEscolha };
    })
    .sort((a, b) => b.fazendoAgora - a.fazendoAgora || b.escolheram - a.escolheram || b.treinosFeitos - a.treinosFeitos);
}
