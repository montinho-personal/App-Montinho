// Painel do personal: desafios entre alunos (0094). Só leitura — os alunos criam sem aprovação.
import { requireTreinadorPage } from "@/lib/auth/session";
import { detalheDesafio, listarTodosDesafios } from "@/lib/data/desafios";
import { resumoDesafio, TIPOS_DESAFIO } from "@/lib/desafios/regras";
import { Card, CardBody } from "@/components/ui/Card";

export const metadata = { title: "Desafios entre alunos" };
export const dynamic = "force-dynamic";

export default async function DesafiosTreinadorPage() {
  await requireTreinadorPage();
  const todos = await listarTodosDesafios().catch(() => []);
  const ativos = todos.filter((d) => d.situacao !== "encerrado");
  const encerrados = todos.filter((d) => d.situacao === "encerrado").slice(0, 20);
  const placares = new Map((await Promise.all(ativos.slice(0, 20).map((d) => detalheDesafio(d.id, null).catch(() => null)))).filter((x) => x !== null).map((x) => [x.id, x.placar]));
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-wider text-accent">Desafios entre alunos</p>
        <h1 className="mt-1 text-3xl font-bold">⚔️ Quem está desafiando quem</h1>
        <p className="mt-1 text-sm text-fg-muted">Alunos e visitantes criam e convidam sem precisar da sua aprovação. Bom gancho para mandar mensagem: “vi que você está no desafio!”.</p>
      </header>
      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-fg-muted">Em andamento e agendados ({ativos.length})</h2>
        {ativos.length ? (
          ativos.map((d) => (
            <Card key={d.id}>
              <CardBody className="space-y-2">
                <p className="font-bold">{TIPOS_DESAFIO[d.tipo].emoji} {d.nome}</p>
                <p className="text-xs text-fg-muted">{resumoDesafio(d)} · código {d.codigo}</p>
                <ol className="space-y-1 text-sm">
                  {(placares.get(d.id) ?? []).map((l) => (
                    <li key={l.alunoId} className="flex justify-between gap-3">
                      <span>
                        {l.posicao}º {l.nome}
                        {l.criador ? <span className="text-xs text-fg-subtle"> (criou)</span> : null}
                      </span>
                      <span className="text-fg-muted">{l.rotulo}</span>
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          ))
        ) : (
          <p className="text-sm text-fg-muted">Nenhum desafio agora.</p>
        )}
      </section>
      {encerrados.length ? (
        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-fg-muted">Encerrados</h2>
          <ul className="space-y-1 text-sm">
            {encerrados.map((d) => (
              <li key={d.id} className="rounded-lg border border-border px-3 py-2">
                <span className="font-semibold">{d.nome}</span> <span className="text-xs text-fg-muted">· {resumoDesafio(d)} · {d.participantes.join(", ")}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
