// Treinos extras: pedidos aguardando, regras por aluno, extras liberados e
// sinalização de volume extra acima do combinado.
import { requireTreinadorPage } from "@/lib/auth/session";
import { listAlunos } from "@/lib/db";
import { getConfigExtra, listarExtras, listarSolicitacoes, sessaoRecente, sugestaoExtraDoAluno } from "@/lib/data/extras";
import { getPlanoAtivo } from "@/lib/data/programas";
import { listSessoes } from "@/lib/data/sessoes";
import { dataLocal, inicioDaSemana } from "@/lib/aderencia/calcular";
import { CONFIG_EXTRA_PADRAO } from "@/lib/treino/extra";
import type { ComponentProps } from "react";
import { ExtrasClient } from "./ExtrasClient";
import { opcoesExtraParaPersonal } from "@/lib/data/extra-gerado";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { normalizarNome } from "@/lib/grupos";

export const metadata = { title: "Treinos extras" };
export const dynamic = "force-dynamic";

export default async function TreinosExtrasPage({ searchParams }: { searchParams: Promise<{ aluno?: string }> }) {
  await requireTreinadorPage();
  const { aluno: alunoParam } = await searchParams;
  const alunos = (await listAlunos()).filter((a) => a.status !== "arquivado");
  const nomes = Object.fromEntries(alunos.map((a) => [a.id, a.profile?.nome ?? "Aluno"]));
  const alunoId = alunos.find((a) => a.id === alunoParam)?.id ?? alunos[0]?.id ?? null;
  const [pendentes, todosExtras] = await Promise.all([listarSolicitacoes({ status: "pendente" }), listarExtras(null)]);
  const titulos = Object.fromEntries(todosExtras.map((x) => [x.id, x.titulo]));

  let detalhe: ComponentProps<typeof ExtrasClient>["detalhe"] = null;
  if (alunoId) {
    const [config, extras, plano, sessoes, sugestao, biblioteca] = await Promise.all([getConfigExtra(alunoId), listarExtras(alunoId), getPlanoAtivo(alunoId), listSessoes(alunoId, { limite: 60 }), sugestaoExtraDoAluno(alunoId), listarBiblioteca()]);
    const opcoes = await opcoesExtraParaPersonal(alunoId, sugestao.sugestao).catch(() => []);
    const semana = inicioDaSemana(dataLocal(new Date()));
    const extrasFeitos = sessoes.filter((s) => s.modo === "extra").slice(0, 12);
    const seriesSemana = extrasFeitos.filter((s) => dataLocal(s.iniciado_em) >= semana).reduce((n, s) => n + (sessaoRecente(s).series_extra ?? 0), 0);
    const cfg = config ?? { ...CONFIG_EXTRA_PADRAO, observacao: null };
    detalhe = {
      alunoId,
      config: { habilitado: cfg.habilitado, requer_aprovacao: cfg.requer_aprovacao, aprovacao_so_intensos: cfg.aprovacao_so_intensos ?? true, max_por_semana: cfg.max_por_semana, dias_permitidos: cfg.dias_permitidos, limite_series_semana: cfg.limite_series_semana, intervalo_min_horas: cfg.intervalo_min_horas, observacao: cfg.observacao },
      extras: extras.map((x) => ({ id: x.id, modalidade: x.modalidade, titulo: x.titulo, descricao: x.descricao, duracao_min: x.duracao_min, treino_id: x.treino_id, grupos: x.grupos, series_estimadas: x.series_estimadas, ativo: x.ativo, exercicios: x.exercicios ?? null })),
      treinos: plano.treinos.map((t) => ({ id: t.id, nome: `${t.letra} — ${t.nome}` })),
      feitos: extrasFeitos.map((s) => ({ id: s.id, titulo: s.nome_treino ?? "Treino extra", data: s.iniciado_em, duracaoMin: s.duracao_seg ? Math.round(s.duracao_seg / 60) : null, series: s.series_concluidas })),
      seriesSemana,
      opcoes,
      motivoSemOpcoes: plano.treinos.some((t) => t.ativo) ? sugestao.motivo : "Monte o treino do aluno primeiro: as opções de extra usam os exercícios do plano dele.",
      biblioteca: biblioteca.filter((b) => b.contaVolume !== false && b.grupo !== "cardio").map((b) => ({ id: b.id, nome: b.nome, grupo: b.grupo, busca: normalizarNome([b.nome, ...(b.sinonimos ?? [])].join(" ")) })),
    };
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Flexibilidade</p>
        <h1 className="text-2xl font-bold">Treinos extras</h1>
        <p className="mt-1 text-sm text-fg-muted">Você decide o que cada aluno pode fazer além do programa. O app só libera o que estiver dentro das suas regras; o resto vira pedido para você aprovar. Extras ficam registrados à parte e não contam na meta semanal.</p>
      </header>
      <ExtrasClient
        alunos={alunos.map((a) => ({ id: a.id, nome: nomes[a.id] }))}
        pendentes={pendentes.map((p) => ({ id: p.id, aluno: nomes[p.aluno_id] ?? "Aluno", titulo: titulos[p.extra_id] ?? "Treino extra", classificacao: p.classificacao, motivos: p.motivos, recuperacao: p.recuperacao, tempo: p.tempo_disponivel_min, data: p.created_at }))}
        detalhe={detalhe}
      />
    </div>
  );
}
