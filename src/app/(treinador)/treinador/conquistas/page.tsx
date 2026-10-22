// Celebrar conquista do aluno + métricas do “Meu Chalalá”.
// Conquistas vêm dos registros reais; a mensagem é escrita pelo personal.
import { requireTreinadorPage } from "@/lib/auth/session";
import { listAlunos } from "@/lib/db";
import { listarConquistas, listarEventos, listarReconhecimentos } from "@/lib/data/conquistas";
import { agregarChalalaTreino, agregarEventos } from "@/lib/chalala/metricas";
import { getConfigChalala, metricasPush } from "@/lib/data/notificacoes";
import { PainelChalalaCelular } from "./PainelChalalaCelular";
import { CelebrarClient } from "./CelebrarClient";
import { aderenciaDeTodos } from "@/lib/data/aderencia";
import { nomeDaConquista, CONTEUDO } from "@/lib/conquistas/conteudo";
import type { CodigoConquista } from "@/lib/conquistas/regras";
import type { Semana } from "@/lib/aderencia/calcular";

/** Aderência média da turma (treinos válidos ÷ meta) nas últimas N semanas completas. */
function mediaTurma(semanasPorAluno: Semana[][], n: number): number | null {
  let pontos = 0;
  let meta = 0;
  for (const ws of semanasPorAluno) for (const w of ws.filter((x) => !x.atual).slice(-n)) if (w.meta && !w.pausada) { pontos += Math.min(w.pontos, w.meta); meta += w.meta; }
  return meta ? Math.round((pontos / meta) * 100) : null;
}

export const metadata = { title: "Celebrar conquistas" };
export const dynamic = "force-dynamic";

export default async function CelebrarConquistasPage({ searchParams }: { searchParams: Promise<{ dias?: string; aluno?: string; msg?: string }> }) {
  const sessao = await requireTreinadorPage();
  const { dias: d, aluno: alunoParam, msg } = await searchParams;
  const dias = [7, 30, 90].includes(Number(d)) ? Number(d) : 30;
  const desde = new Date(new Date().getTime() - dias * 86_400_000).toISOString();
  const [alunos, conquistas, reconhecimentos, eventos, configCelular, push] = await Promise.all([listAlunos({ incluirVisitantes: true }), listarConquistas(null, { desde, limite: 300 }), listarReconhecimentos(null, 200), listarEventos(desde), getConfigChalala().catch(() => null), metricasPush(new Date(desde)).catch(() => null)]);
  const nomes = Object.fromEntries(alunos.map((a) => [a.id, a.profile?.nome ?? "Aluno"]));
  const ativos = alunos.filter((a) => a.status === "ativo");
  const ader = ativos.length ? await aderenciaDeTodos(ativos) : {};
  const semanasTurma = Object.values(ader).map((r) => r.semanas);
  const resultados = {
    aderencia28: mediaTurma(semanasTurma, 4),
    aderencia60: mediaTurma(semanasTurma, 9),
    aderencia90: mediaTurma(semanasTurma, 13),
    medalhas: conquistas.filter((c) => !["recorde", "eu_voltei"].includes(c.codigo)).length,
    retomadas: conquistas.filter((c) => c.codigo === "eu_voltei" || c.codigo === "recomeco_consistente").length,
    recordes: conquistas.filter((c) => c.codigo === "recorde").length,
  };
  const reconhecidas = new Set(reconhecimentos.map((r) => r.conquista_id).filter(Boolean) as string[]);
  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Reconhecimento</p>
        <h1 className="text-2xl font-bold">Celebrar conquistas</h1>
        <p className="mt-1 text-sm text-fg-muted">Conquistas registradas pelos alunos nos últimos {dias} dias. Escolha uma, escreva sua mensagem e envie: o aluno vê no app, identificada como escrita por você. Nada é enviado automaticamente.</p>
      </header>
      <CelebrarClient
        dias={dias}
        autor={sessao.nome.split(" ")[0]}
        alunoInicial={alunos.some((a) => a.id === alunoParam) ? alunoParam! : ""}
        mensagemInicial={(msg ?? "").slice(0, 600)}
        alunos={alunos.filter((a) => a.status !== "arquivado").map((a) => ({ id: a.id, nome: nomes[a.id] }))}
        conquistas={conquistas.map((c) => ({ id: c.id, alunoId: c.aluno_id, aluno: nomes[c.aluno_id] ?? "Aluno", codigo: c.codigo, categoria: CONTEUDO[c.codigo as CodigoConquista]?.categoria ?? "pratica", titulo: nomeDaConquista(c.codigo, c.titulo), descricao: c.descricao, data: c.conquistado_em, reconhecida: reconhecidas.has(c.id) }))}
        resultados={resultados}
        enviados={reconhecimentos.slice(0, 20).map((r) => ({ id: r.id, aluno: nomes[r.aluno_id] ?? "Aluno", mensagem: r.mensagem, data: r.created_at }))}
        metricas={agregarEventos(eventos)}
      />
      <PainelChalalaCelular dias={dias} config={configCelular ?? { chalala_ativo: false, limite_diario: 2, intervalo_minimo_min: 60 }} push={push} treino={agregarChalalaTreino(eventos)} />
    </div>
  );
}
