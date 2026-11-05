import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { Voltar } from "@/components/ui/Voltar";
import { AcademiaIlustracao } from "@/components/academia/AcademiaIlustracao";
import { duracaoTexto, infoModelo } from "@/lib/academia/regras";
import { listarObras } from "@/lib/data/academia";

export const metadata = { title: "O Legado da Tribo" };

const dataBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });

export default async function LegadoPage() {
  await requireAlunoPage();
  const obras = (await listarObras()).filter((o) => o.estado !== "rascunho");
  const prontas = obras.filter((o) => o.estado === "concluida");
  const ativa = obras.find((o) => o.estado === "ativa");
  return (
    <div className="space-y-4">
      <Voltar href="/aluno/academia" />
      <header>
        <h1 className="text-2xl font-black">🏛️ O Legado da Tribo</h1>
        <p className="text-sm text-fg-muted">Cada academia inaugurada é um capítulo da nossa história. Elas nunca desaparecem.</p>
      </header>
      {prontas.length ? (
        <ol className="space-y-3">
          {prontas.map((o) => (
            <li key={o.id}>
              <Link href={`/aluno/academia/${o.id}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 hover:border-accent/60">
                <div className="w-28 shrink-0 overflow-hidden rounded-xl border border-border">
                  <AcademiaIlustracao etapa={7} pavimentos={infoModelo(o.modelo).pavimentos} animar={false} className="block h-auto w-full" />
                </div>
                <div className="min-w-0 text-sm">
                  <p className="text-xs font-bold text-accent">{o.ordem}ª academia</p>
                  <p className="font-bold">{o.nome}</p>
                  {o.ativada_em && o.concluida_em ? (
                    <p className="text-xs text-fg-muted">
                      Inaugurada em {dataBR(o.concluida_em)} · {duracaoTexto(o.ativada_em, o.concluida_em)} de obra
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-fg-muted">Nenhuma academia inaugurada ainda. A primeira página do nosso legado está sendo escrita agora, treino a treino.</p>
      )}
      {ativa ? (
        <Link href="/aluno/academia" className="alvo flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-bold text-bg">
          🏗️ Ver a obra em andamento: {ativa.nome}
        </Link>
      ) : null}
    </div>
  );
}
