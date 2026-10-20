import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { listCheckIns, listEvolucao } from "@/lib/db";
import { getPlanoAtivo, listVersoes } from "@/lib/data/programas";
import { listSessoes } from "@/lib/data/sessoes";
import { listIntervencoes } from "@/lib/data/acompanhamento";
import { RegistrarRelatorio } from "@/components/chalala/RegistrarRelatorio";
import { RelatorioEvolucao } from "@/components/relatorios/RelatorioEvolucao";
import { BRAND } from "@/config/brand";
import { getAluno } from "@/lib/db";
import { aderenciaDoAluno } from "@/lib/data/aderencia";
import { dataLocal } from "@/lib/aderencia/calcular";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProgressoSemana } from "@/components/aderencia/ProgressoSemana";
import { ResumoAderencia } from "@/components/aderencia/ResumoAderencia";
import { CalendarioConsistencia } from "@/components/aderencia/CalendarioConsistencia";

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
  const aluno = await getAluno(sessao.alunoId);
  const aderencia = aluno ? await aderenciaDoAluno(aluno) : null;
  const comentario = intervencoes.find((i) => i.visivel_aluno && (i.tipo === "nota" || i.tipo === "mensagem" || i.tipo === "revisao_treino"));

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Sua evolução</h1>
        <p className="text-sm text-fg-muted mt-1">Primeiro o essencial. Depois, os detalhes — sempre a partir do que você registrou.</p>
        <Link href="/aluno/conquistas" className="mt-2 inline-block text-sm font-semibold text-accent underline-offset-2 hover:underline min-h-6 py-0.5">
          Minhas conquistas e card dos 30 dias →
        </Link>
        <RegistrarRelatorio />
      </header>
      {aderencia ? (
        <Card id="consistencia" className="scroll-mt-20">
          <CardHeader>
            <CardTitle className="text-base">Sua consistência</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <ProgressoSemana semana={aderencia.semanaAtual} sequencia={aderencia.sequencia} extras={aderencia.semanaAtual?.extras ?? 0} />
            <ResumoAderencia r={aderencia} />
            <CalendarioConsistencia dias={aderencia.dias} sessoes={aderencia.sessoesPorId} hoje={dataLocal(new Date())} />
          </CardBody>
        </Card>
      ) : null}
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
        aderencia={aderencia}
        inicioAcompanhamento={aluno ? (aluno.data_inicio ?? aluno.created_at.slice(0, 10)) : null}
      />
    </div>
  );
}
