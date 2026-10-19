import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { AlunoStatusPill } from "@/components/ui/StatusPill";
import { listAlunos } from "@/lib/db";
import { dataBR, diasAte, tempoRelativo } from "@/lib/format";
import { AlunosFilter } from "./AlunosFilter";
import { NovoAlunoButton } from "./NovoAlunoModal";

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

export default async function AlunosListPage({ searchParams }: PageProps) {
  const { q, status } = await searchParams;
  const alunos = await listAlunos();

  const filtrados = alunos.filter((a) => {
    if (status && a.status !== status) return false;
    if (q) {
      const term = q.toLowerCase();
      const nome = a.profile?.nome?.toLowerCase() ?? "";
      const email = a.profile?.email?.toLowerCase() ?? "";
      const tel = a.telefone?.toLowerCase() ?? "";
      if (!nome.includes(term) && !email.includes(term) && !tel.includes(term)) return false;
    }
    return true;
  });

  const counts = {
    todos: alunos.length,
    ativo: alunos.filter((a) => a.status === "ativo").length,
    pendente: alunos.filter((a) => a.status === "pendente").length,
    inadimplente: alunos.filter((a) => a.status === "inadimplente").length,
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <Badge tone="accent">Squad</Badge>
          <h1 className="text-3xl font-bold mt-3">Alunos</h1>
          <p className="text-fg-muted text-sm mt-1">Gestão completa dos seus atletas.</p>
        </div>
        <NovoAlunoButton />
      </header>

      <AlunosFilter counts={counts} />

      <Card>
        <CardHeader>
          <CardTitle>
            {filtrados.length} {filtrados.length === 1 ? "aluno" : "alunos"}
          </CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {filtrados.length === 0 ? (
            <div className="p-8 text-center text-sm text-fg-subtle">
              Nenhum aluno corresponde aos filtros.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtrados.map((a) => {
                const dias = diasAte(a.acesso_ate);
                return (
                  <li key={a.id}>
                    <Link
                      href={`/treinador/alunos/${a.id}`}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-card-hover transition-colors"
                    >
                      <Avatar nome={a.profile?.nome ?? "?"} size={44} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{a.profile?.nome}</span>
                          <AlunoStatusPill status={a.status} />
                        </div>
                        <div className="text-xs text-fg-subtle mt-1 flex items-center gap-3 flex-wrap">
                          <span>📞 {a.telefone ?? "sem telefone"}</span>
                          <span>·</span>
                          <span>Último treino {tempoRelativo(a.ultimo_treino_em)}</span>
                        </div>
                      </div>
                      <div className="hidden md:block text-right">
                        <div className="text-xs text-fg-subtle">acesso até</div>
                        <div className="text-sm font-mono font-semibold">{dataBR(a.acesso_ate)}</div>
                        {dias !== null && (
                          <div
                            className={`text-[10px] mt-0.5 ${
                              dias < 0
                                ? "text-red"
                                : dias <= 7
                                  ? "text-gold"
                                  : "text-fg-subtle"
                            }`}
                          >
                            {dias < 0 ? `vencido há ${Math.abs(dias)}d` : `${dias}d restantes`}
                          </div>
                        )}
                      </div>
                      <div className="text-fg-subtle">→</div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
