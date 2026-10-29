import { Badge } from "@/components/ui/Badge";
import { listAlunos } from "@/lib/db";
import { dataBR, diasAte, tempoRelativo } from "@/lib/format";
import { ListaAlunosClient, type LinhaAluno } from "./ListaAlunosClient";
import { NovoAlunoButton } from "./NovoAlunoModal";

export default async function AlunosListPage() {
  const alunos = await listAlunos();
  const linhas: LinhaAluno[] = alunos.map((a) => {
    const dias = diasAte(a.acesso_ate);
    return {
      id: a.id,
      nome: a.profile?.nome ?? "Aluno",
      email: a.profile?.email ?? null,
      telefone: a.telefone ?? null,
      status: a.status,
      inicio: a.data_inicio ?? a.created_at ?? null,
      ultimoTreino: a.ultimo_treino_em ?? null,
      acessoAte: a.acesso_ate ?? null,
      avatar: a.profile?.avatar_url ?? null,
      ultimoTexto: tempoRelativo(a.ultimo_treino_em),
      acessoTexto: a.acesso_ate ? (dias !== null && dias < 0 ? `acesso vencido há ${Math.abs(dias)}d` : `acesso até ${dataBR(a.acesso_ate)}${dias === 0 ? " (último dia)" : dias !== null ? ` (${dias}d)` : ""}`) : "sem data de acesso",
      dias,
    };
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <Badge tone="accent">Alunos</Badge>
          <h1 className="text-3xl font-bold mt-3">Alunos</h1>
          <p className="text-fg-muted text-sm mt-1">Cadastro, status de acesso e acompanhamento de cada aluno.</p>
        </div>
        <NovoAlunoButton />
      </header>
      <ListaAlunosClient alunos={linhas} />
    </div>
  );
}
