// Treinos que o Montinho fez (0154): os treinos que o personal montou e fez,
// com o foco e a narrativa; o aluno faz o mesmo treino pelo treino livre.
import { requireAlunoPage } from "@/lib/auth/session";
import { Voltar } from "@/components/ui/Voltar";
import { listarTreinosMontinho } from "@/lib/data/treinos-montinho";
import { CartaoTreinoMontinho } from "@/components/treinos-montinho/CartaoTreinoMontinho";
import { podeRegistrar } from "@/lib/visitante/acesso";

export const metadata = { title: "Treinos do Montinho" };

export default async function TreinosDoMontinhoPage() {
  const sessao = await requireAlunoPage();
  const treinos = await listarTreinosMontinho().catch(() => []);
  const pode = podeRegistrar(sessao.modalidade ?? "consultoria", sessao.acessoFim ?? null);
  return (
    <div className="space-y-4">
      <Voltar href="/aluno/treinar" />
      <header>
        <h1 className="text-2xl font-bold">🔥 Treinos que o Montinho fez</h1>
        <p className="mt-1 text-sm text-fg-muted">Os treinos que o Montinho montou e fez de verdade. Escolha um, use as suas cargas e faça junto com ele. Conta como treino livre.</p>
      </header>
      {treinos.length ? treinos.map((t) => <CartaoTreinoMontinho key={t.id} t={t} podeFazer={pode} />) : <p className="py-8 text-center text-sm text-fg-muted">O Montinho ainda vai postar os treinos dele aqui. Volte em breve! 💪</p>}
    </div>
  );
}
