// ============================================================================
// Montinho Desbloqueia — números agregados para o personal (PURO).
// Só contagens: nada de texto livre, nada de ranking de alunos. Correlação
// com aderência NÃO é causa — a tela diz isso.
// ============================================================================

import type { ConteudoConhecimento } from "./tipos";

type Prog = { aluno_id: string; conteudo_id: string; explorado_em: string | null; resposta: string | null; acertou: boolean | null; salvo: boolean | null; origem: string | null };
type Ev = { aluno_id: string | null; tipo: string; modelo: string | null; origem: string | null };

export type LinhaAnalytics = { id: string; explorados: number; respostas: number; acertoPct: number | null; salvos: number; compartilhados: number; recomendados: number };
export type AnalyticsDesbloqueia = {
  alunosAtivos: number;
  alunosComDescoberta: number;
  mediaPorAluno: number | null;
  sugestoesVistas: number;
  sugestoesAbertas: number;
  taxaAberturaPct: number | null;
  compartilhamentos: number;
  porConteudo: Record<string, LinhaAnalytics>;
  maisExplorados: string[];
  maisErros: string[];
  /** Aderência média de quem explorou ≥ 3 vs. quem explorou < 3 (só descritivo). */
  aderencia: { engajados: number | null; demais: number | null; nEngajados: number; nDemais: number };
};

const media = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

export function analyticsDesbloqueia(e: { conteudos: ConteudoConhecimento[]; progresso: Prog[]; eventos: Ev[]; alunosAtivos: string[]; aderencia28: Record<string, number | null> }): AnalyticsDesbloqueia {
  const ativos = new Set(e.alunosAtivos);
  const prog = e.progresso.filter((p) => ativos.has(p.aluno_id));
  const porConteudo: Record<string, LinhaAnalytics> = {};
  for (const c of e.conteudos) porConteudo[c.id] = { id: c.id, explorados: 0, respostas: 0, acertoPct: null, salvos: 0, compartilhados: 0, recomendados: 0 };
  const acertos: Record<string, number> = {};
  for (const p of prog) {
    const l = porConteudo[p.conteudo_id];
    if (!l) continue;
    if (p.explorado_em) l.explorados++;
    if (p.resposta) {
      l.respostas++;
      if (p.acertou) acertos[p.conteudo_id] = (acertos[p.conteudo_id] ?? 0) + 1;
    }
    if (p.salvo) l.salvos++;
    if (p.origem === "personal") l.recomendados++;
  }
  for (const l of Object.values(porConteudo)) l.acertoPct = l.respostas ? Math.round(((acertos[l.id] ?? 0) / l.respostas) * 100) : null;
  for (const ev of e.eventos) if (ev.tipo === "descoberta_compartilhada" && ev.modelo && porConteudo[ev.modelo]) porConteudo[ev.modelo].compartilhados++;

  const exploradosPorAluno = new Map<string, number>();
  for (const p of prog) if (p.explorado_em) exploradosPorAluno.set(p.aluno_id, (exploradosPorAluno.get(p.aluno_id) ?? 0) + 1);
  const vistas = e.eventos.filter((x) => x.tipo === "sugestao_vista").length;
  const abertas = e.eventos.filter((x) => x.tipo === "sugestao_aberta").length;
  const linhas = Object.values(porConteudo);
  const eng: number[] = [];
  const dem: number[] = [];
  for (const a of e.alunosAtivos) {
    const v = e.aderencia28[a];
    if (v == null) continue;
    ((exploradosPorAluno.get(a) ?? 0) >= 3 ? eng : dem).push(v);
  }
  return {
    alunosAtivos: ativos.size,
    alunosComDescoberta: exploradosPorAluno.size,
    mediaPorAluno: ativos.size ? Math.round(([...exploradosPorAluno.values()].reduce((a, b) => a + b, 0) / ativos.size) * 10) / 10 : null,
    sugestoesVistas: vistas,
    sugestoesAbertas: abertas,
    taxaAberturaPct: vistas ? Math.min(100, Math.round((abertas / vistas) * 100)) : null,
    compartilhamentos: e.eventos.filter((x) => x.tipo === "descoberta_compartilhada").length,
    porConteudo,
    maisExplorados: linhas.filter((l) => l.explorados > 0).sort((a, b) => b.explorados - a.explorados).slice(0, 5).map((l) => l.id),
    maisErros: linhas.filter((l) => l.respostas >= 3 && l.acertoPct != null && l.acertoPct < 60).sort((a, b) => (a.acertoPct ?? 0) - (b.acertoPct ?? 0)).slice(0, 5).map((l) => l.id),
    aderencia: { engajados: media(eng), demais: media(dem), nEngajados: eng.length, nDemais: dem.length },
  };
}
