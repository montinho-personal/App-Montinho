// Sala de troféus de um aluno, vista pelo personal: as mesmas medalhas que o
// aluno vê (vitrine), recordes pessoais e a contagem — sem nada além do que o
// próprio aluno já vê no app dele.
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTreinadorPage } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { listarReconhecimentos, resumoMensalDoAluno } from "@/lib/data/conquistas";
import { vitrineDeMedalhas } from "@/lib/conquistas/vitrine";
import { dataLocal } from "@/lib/aderencia/calcular";
import { VitrineMedalhas } from "@/components/conquistas/VitrineMedalhas";
import { Card, CardBody } from "@/components/ui/Card";

export const metadata = { title: "Sala de troféus" };

const dataBR = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));

export default async function SalaDeTrofeusPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTreinadorPage();
  const { id } = await params;
  const aluno = await getAluno(id);
  if (!aluno) notFound();
  const [{ conquistas, sessoes, aderencia }, reconhecimentos] = await Promise.all([resumoMensalDoAluno(aluno), listarReconhecimentos(aluno.id)]);
  const medalhas = vitrineDeMedalhas({ conquistas, sessoes, aderencia, hoje: dataLocal(new Date()) });
  const ganhas = medalhas.filter((m) => m.conquistada).length;
  const recordes = conquistas.filter((c) => c.codigo === "recorde").slice(0, 10);
  const nome = aluno.profile?.nome ?? "Aluno";
  const codigoPorId = new Map(conquistas.map((c) => [c.id, c.codigo]));
  const reconhecimentosPorCodigo: Record<string, { mensagem: string; data: string }> = {};
  for (const r of [...reconhecimentos].reverse()) {
    const cod = r.conquista_id ? codigoPorId.get(r.conquista_id) : null;
    if (cod) reconhecimentosPorCodigo[cod] = { mensagem: r.mensagem, data: r.created_at };
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link href={`/treinador/alunos/${id}`} className="inline-flex min-h-6 items-center text-sm text-fg-muted hover:text-fg">
        ← {nome}
      </Link>
      <div className="rounded-2xl border border-accent/40 bg-grain-strong p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent">🏆 Sala de troféus</p>
        <h1 className="text-2xl font-bold">{nome}</h1>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-bg/50 p-2">
            <p className="font-mono text-xl font-bold">
              {ganhas}
              <span className="text-xs font-normal text-fg-subtle">/{medalhas.length}</span>
            </p>
            <p className="text-[11px] text-fg-subtle">medalhas</p>
          </div>
          <div className="rounded-lg bg-bg/50 p-2">
            <p className="font-mono text-xl font-bold">{conquistas.filter((c) => c.codigo === "recorde").length}</p>
            <p className="text-[11px] text-fg-subtle">recordes</p>
          </div>
          <div className="rounded-lg bg-bg/50 p-2">
            <p className="font-mono text-xl font-bold">{aderencia.indices.d28.pct != null ? `${aderencia.indices.d28.pct}%` : "—"}</p>
            <p className="text-[11px] text-fg-subtle">aderência 4 sem.</p>
          </div>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-bold">Medalhas</h2>
        <p className="text-xs text-fg-muted">Toque numa medalha: nas douradas (já conquistadas) dá para ver como o aluno vê, com a animação; nas cinzas aparece o desafio para conquistar.</p>
        <VitrineMedalhas medalhas={medalhas} nome={nome.split(" ")[0]} reconhecimentos={reconhecimentosPorCodigo} comPrevia />
      </section>

      {recordes.length ? (
        <Card>
          <CardBody className="space-y-2">
            <h2 className="text-sm font-bold">★ Recordes pessoais recentes</h2>
            <ul className="space-y-1.5 text-sm">
              {recordes.map((r) => (
                <li key={r.id} className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0">{r.descricao}</span>
                  <span className="shrink-0 text-[11px] text-fg-subtle">{dataBR(r.conquistado_em)}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Link href={`/treinador/alunos/${id}/jornada`} className="touch flex items-center justify-center rounded-xl border border-border px-3 py-3 text-sm font-semibold text-fg-muted hover:text-fg">
          🗺️ Ver jornada
        </Link>
        <Link href="/treinador/conquistas" className="touch flex items-center justify-center rounded-xl border border-accent/50 px-3 py-3 text-sm font-semibold text-accent">
          👏 Enviar reconhecimento
        </Link>
      </div>
    </div>
  );
}
