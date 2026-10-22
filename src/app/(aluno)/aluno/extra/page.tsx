// “Quero fazer um treino extra”: o aluno informa (se quiser) tempo e
// recuperação; o SERVIDOR classifica cada extra liberado pelo personal.
import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { getConfigExtra, listarExtras, listarSolicitacoes } from "@/lib/data/extras";
import { contextoExtraGerado } from "@/lib/data/extra-gerado";
import { MontarExtra } from "./MontarExtra";
import { BRAND } from "@/config/brand";
import { ExtraClient } from "./ExtraClient";

export const metadata = { title: "Treino extra" };
export const dynamic = "force-dynamic";

export default async function TreinoExtraPage() {
  const sessao = await requireAlunoPage();
  const [config, extras, pedidos, ctx] = await Promise.all([getConfigExtra(sessao.alunoId), listarExtras(sessao.alunoId, true), listarSolicitacoes({ alunoId: sessao.alunoId, desde: new Date(new Date().getTime() - 14 * 86_400_000).toISOString() }), contextoExtraGerado(sessao.alunoId)]);
  const titulos = Object.fromEntries(extras.map((x) => [x.id, x.titulo]));
  return (
    <div className="space-y-5">
      <Link href="/aluno" className="inline-flex min-h-6 items-center gap-1 text-sm text-fg-muted hover:text-fg">
        ← Início
      </Link>
      <header>
        <h1 className="text-2xl font-bold">Quero fazer um treino extra</h1>
        <p className="mt-1 text-sm text-fg-muted">Está com disposição para treinar mais hoje? Veja se existe uma sessão extra liberada para você. A decisão segue as regras do {BRAND.name} — recuperação também faz parte do treino.</p>
      </header>
      {!config?.habilitado ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-fg-muted">
          O {BRAND.name} ainda não liberou treinos extras para você. Se quiser treinar mais, converse com ele — ele ajusta o plano com segurança.
        </div>
      ) : (
        <>
          <MontarExtra ctx={ctx} />
          {extras.length ? (
            <section className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-fg-muted">Outras opções liberadas pelo {BRAND.name}</h2>
              <ExtraClient pedidos={pedidos.map((p) => ({ id: p.id, titulo: titulos[p.extra_id] ?? "Treino extra", status: p.status, resposta: p.resposta, data: p.data, created_at: p.created_at }))} />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
