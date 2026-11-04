// Meu treino do personal: escolher um treino para hoje — um treino pronto da
// vitrine dos visitantes ou um treino do protocolo de um aluno (04/11/2026).
import { redirect } from "next/navigation";
import { requireAlunoPage } from "@/lib/auth/session";
import { Voltar } from "@/components/ui/Voltar";
import { prontosComoBase, protocolosComoBase } from "@/lib/data/treino-base";
import { EscolherTreinoClient } from "./EscolherTreinoClient";

export const metadata = { title: "Escolher um treino" };

export default async function EscolherTreinoPage() {
  const sessao = await requireAlunoPage();
  if (!sessao.comoPersonal) redirect("/aluno/treinar");
  const [prontos, alunos] = await Promise.all([prontosComoBase().catch(() => []), protocolosComoBase(sessao.alunoId).catch(() => [])]);
  return (
    <div className="space-y-4">
      <Voltar href="/aluno/treinar" />
      <header>
        <h1 className="text-2xl font-bold">Escolher um treino para hoje</h1>
        <p className="mt-1 text-sm text-fg-muted">Um treino pronto ou um treino de um aluno. Abre o treino livre já com os exercícios, as séries e as repetições; dá para trocar, tirar e pôr exercício. A ficha do aluno não muda e as cargas dele não vêm junto.</p>
      </header>
      <EscolherTreinoClient prontos={prontos} alunos={alunos} />
    </div>
  );
}
