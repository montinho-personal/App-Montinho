// ============================================================================
// “Minha evolução em 30 dias” — números do card mensal, das MESMAS fontes da
// aderência e das conquistas (nada recalculado de outro jeito).
// Período incompleto (aluno com menos de 30 dias) é rotulado como tal.
// ============================================================================

import { classificarSessao, dataLocal, inicioDaSemana, somarDias, type ResultadoAderencia } from "@/lib/aderencia/calcular";
import type { SessaoConquista } from "./regras";

export type ConquistaSalva = { codigo: string; titulo: string; descricao: string | null; conquistado_em: string };

export type ResumoMensal = {
  desde: string;
  ate: string;
  periodoCompleto: boolean;
  rotuloPeriodo: string;
  treinos: number;
  aderenciaPct: number | null;
  tempoTotalMin: number | null;
  metasCumpridas: number | null;
  evolucao: string | null;
  conquista: string | null;
};

export function resumoMensal(e: { sessoes: SessaoConquista[]; aderencia: ResultadoAderencia; conquistas: ConquistaSalva[]; inicioAcompanhamento: string; hoje: string }): ResumoMensal {
  const janela = somarDias(e.hoje, -29);
  const desde = e.inicioAcompanhamento > janela ? e.inicioAcompanhamento : janela;
  const periodoCompleto = desde === janela;
  const noPeriodo = e.sessoes.filter((s) => {
    const d = dataLocal(s.iniciado_em);
    return d >= desde && d <= e.hoje && s.status !== "em_andamento";
  });
  const validas = noPeriodo.filter((s) => ["concluida", "parcial", "extra"].includes(classificarSessao(s)));
  const treinos = noPeriodo.filter((s) => classificarSessao(s) === "concluida").length;
  const seg = validas.reduce((a, s) => a + (s.duracao_seg ?? 0), 0);
  const semanas = e.aderencia.semanas.filter((w) => w.inicio >= inicioDaSemana(desde) && w.inicio <= e.hoje && w.meta);
  const conquistasPeriodo = e.conquistas.filter((c) => dataLocal(c.conquistado_em) >= desde).sort((a, b) => (a.conquistado_em < b.conquistado_em ? 1 : -1));
  const recorde = conquistasPeriodo.find((c) => c.codigo === "recorde");
  const outra = conquistasPeriodo.find((c) => c.codigo !== "recorde" && c.codigo !== "relatorio_mensal");
  const dd = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  return {
    desde,
    ate: e.hoje,
    periodoCompleto,
    rotuloPeriodo: periodoCompleto ? "30 dias" : `Desde ${dd(desde)}`,
    treinos,
    // Índice de 28 dias da aderência (fonte única); só faz sentido com período completo.
    aderenciaPct: periodoCompleto ? e.aderencia.indices.d28.pct : null,
    tempoTotalMin: seg > 0 ? Math.round(seg / 60) : null,
    metasCumpridas: semanas.length ? semanas.filter((w) => w.status === "cumprida").length : null,
    evolucao: recorde?.descricao?.split(" · ")[0] ?? null,
    conquista: outra?.titulo ?? null,
  };
}
