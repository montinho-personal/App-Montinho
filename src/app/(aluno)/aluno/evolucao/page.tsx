import { requireAlunoPage } from "@/lib/auth/session";
import { listCheckIns, listEvolucao } from "@/lib/db";
import { getPlanoAtivo, listVersoes } from "@/lib/data/programas";
import { listSessoes } from "@/lib/data/sessoes";
import { listIntervencoes } from "@/lib/data/acompanhamento";
import { RelatorioEvolucao } from "@/components/relatorios/RelatorioEvolucao";
import { BRAND } from "@/config/brand";

export const metadata = { title: "Evolução" };

export default async function EvolucaoPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const sessao = await requireAlunoPage();
  const { dias: d } = await searchParams;
  const dias = [7, 30, 90].includes(Number(d)) ? Number(d) : 30;
  const [plano, sessoes, evolucao, checkIns, versoes, intervencoes] = await Promise.all([
    getPlanoAtivo(sessao.alunoId),
    listSessoes(sessao.alunoId, { limite: 400 }),
    listEvolucao(sessao.alunoId),
    listCheckIns(sessao.alunoId, 120),
    listVersoes(sessao.alunoId, 10),
    listIntervencoes(sessao.alunoId, 5),
  ]);
  const comentario = intervencoes.find((i) => i.visivel_aluno && (i.tipo === "nota" || i.tipo === "mensagem" || i.tipo === "revisao_treino"));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Sua evolução</h1>
        <p className="text-sm text-fg-muted mt-1">Primeiro o essencial. Depois, os detalhes — sempre a partir do que você registrou.</p>
      </header>
      <RelatorioEvolucao
        modo="aluno"
        dias={dias}
        basePath="/aluno/evolucao"
        sessoes={sessoes}
        programa={plano.programa}
        treinos={plano.treinos}
        evolucao={evolucao}
        checkIns={checkIns}
        versoes={versoes}
        comentarioTreinador={comentario ? { texto: comentario.descricao, autor: comentario.autor?.nome ?? BRAND.name, data: comentario.created_at } : null}
        exportarHref={`/api/alunos/${sessao.alunoId}/exportar`}
      />
    </div>
  );
}
