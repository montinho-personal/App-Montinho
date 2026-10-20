// Minhas conquistas: histórico permanente, “Minha evolução em 30 dias” e
// reconhecimentos escritos pelo personal.
import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { listarReconhecimentos, resumoMensalDoAluno } from "@/lib/data/conquistas";
import { CATALOGO } from "@/lib/conquistas/regras";
import { ConquistasClient } from "./ConquistasClient";

export const metadata = { title: "Conquistas" };

export default async function ConquistasPage() {
  const sessao = await requireAlunoPage();
  const aluno = await getAluno(sessao.alunoId);
  if (!aluno) return null;
  const [{ mensal, conquistas }, reconhecimentos] = await Promise.all([resumoMensalDoAluno(aluno), listarReconhecimentos(aluno.id)]);
  const titulos = new Map(conquistas.map((c) => [c.id, c.titulo]));
  const conquistados = new Set(conquistas.map((c) => c.codigo));
  const proximas = Object.entries(CATALOGO)
    .filter(([k, v]) => !v.repete && !conquistados.has(k as keyof typeof CATALOGO))
    .map(([k, v]) => ({ codigo: k, titulo: v.titulo, criterio: v.criterio }));
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Minhas conquistas</h1>
        <Link href="/aluno/evolucao" className="alvo text-sm text-fg-muted hover:text-fg">
          Evolução →
        </Link>
      </div>
      <ConquistasClient
        nome={(aluno.profile?.nome ?? sessao.nome).split(" ")[0]}
        mensal={mensal}
        conquistas={conquistas.map((c) => ({ id: c.id, codigo: c.codigo, titulo: c.titulo, descricao: c.descricao, conquistado_em: c.conquistado_em, dados: c.dados }))}
        reconhecimentos={reconhecimentos.map((r) => ({ id: r.id, mensagem: r.mensagem, created_at: r.created_at, conquista: r.conquista_id ? (titulos.get(r.conquista_id) ?? null) : null }))}
        proximas={proximas}
        criterios={Object.fromEntries(Object.entries(CATALOGO).map(([k, v]) => [k, v.criterio]))}
      />
    </div>
  );
}
