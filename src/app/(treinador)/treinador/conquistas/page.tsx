// Celebrar conquista do aluno + métricas do “Meu Chalalá”.
// Conquistas vêm dos registros reais; a mensagem é escrita pelo personal.
import { requireTreinadorPage } from "@/lib/auth/session";
import { listAlunos } from "@/lib/db";
import { listarConquistas, listarEventos, listarReconhecimentos } from "@/lib/data/conquistas";
import { agregarEventos } from "@/lib/chalala/metricas";
import { CelebrarClient } from "./CelebrarClient";

export const metadata = { title: "Celebrar conquistas" };
export const dynamic = "force-dynamic";

export default async function CelebrarConquistasPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const sessao = await requireTreinadorPage();
  const { dias: d } = await searchParams;
  const dias = [7, 30, 90].includes(Number(d)) ? Number(d) : 30;
  const desde = new Date(new Date().getTime() - dias * 86_400_000).toISOString();
  const [alunos, conquistas, reconhecimentos, eventos] = await Promise.all([listAlunos(), listarConquistas(null, { desde, limite: 300 }), listarReconhecimentos(null, 200), listarEventos(desde)]);
  const nomes = Object.fromEntries(alunos.map((a) => [a.id, a.profile?.nome ?? "Aluno"]));
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
        alunos={alunos.filter((a) => a.status !== "arquivado").map((a) => ({ id: a.id, nome: nomes[a.id] }))}
        conquistas={conquistas.map((c) => ({ id: c.id, alunoId: c.aluno_id, aluno: nomes[c.aluno_id] ?? "Aluno", titulo: c.titulo, descricao: c.descricao, data: c.conquistado_em, reconhecida: reconhecidas.has(c.id) }))}
        enviados={reconhecimentos.slice(0, 20).map((r) => ({ id: r.id, aluno: nomes[r.aluno_id] ?? "Aluno", mensagem: r.mensagem, data: r.created_at }))}
        metricas={agregarEventos(eventos)}
      />
    </div>
  );
}
