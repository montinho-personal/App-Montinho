import { notFound } from "next/navigation";
import { requireAlunoPage } from "@/lib/auth/session";
import { FEATURES } from "@/lib/env";
import { recordesDoAluno } from "@/lib/data/recordes";
import { MeusRecordes } from "@/components/recordes/MeusRecordes";
import { Voltar } from "@/components/ui/Voltar";

export const metadata = { title: "Meus recordes" };

export default async function MeusRecordesPage() {
  if (!FEATURES.multimodalidade) notFound();
  const sessao = await requireAlunoPage();
  const dados = await recordesDoAluno(sessao.alunoId);
  return (
    <div className="space-y-4">
      <Voltar href="/aluno/evolucao" />
      <div>
        <h1 className="text-2xl font-black">🏅 Meus recordes</h1>
        <p className="text-sm text-fg-muted">Comparação justa: 1RM com 1RM, 5RM com 5RM, e o mesmo benchmark na mesma versão. RX nunca com Scaled.</p>
      </div>
      <MeusRecordes dados={dados} modo="aluno" />
    </div>
  );
}
