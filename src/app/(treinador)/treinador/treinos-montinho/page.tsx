// Personal: os treinos que ele fez viram “Treinos do Montinho” para os alunos (0154).
import Link from "next/link";
import { requireTreinadorPage } from "@/lib/auth/session";
import { meuAlunoId } from "@/lib/data/meu-treino";
import { listarTreinosMontinho, treinosFeitosParaSalvar } from "@/lib/data/treinos-montinho";
import { PainelTreinosMontinho } from "@/components/treinos-montinho/PainelTreinosMontinho";

export const metadata = { title: "Treinos do Montinho" };

export default async function TreinosMontinhoPage() {
  const s = await requireTreinadorPage();
  const meu = await meuAlunoId(s.userId).catch(() => null);
  const [salvos, feitos] = await Promise.all([listarTreinosMontinho({ todos: true }).catch(() => []), meu ? treinosFeitosParaSalvar(meu).catch(() => []) : Promise.resolve([])]);
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <header>
        <h1 className="text-2xl font-bold">🔥 Treinos do Montinho</h1>
        <p className="mt-1 text-sm text-fg-muted">Os treinos que você fez ficam guardados e os alunos podem fazer o mesmo treino. {meu ? null : <Link href="/treinador/meu-treino" className="text-accent underline">Crie a sua ficha no Meu treino</Link>}</p>
      </header>
      <PainelTreinosMontinho salvos={salvos} feitos={feitos} />
    </div>
  );
}
