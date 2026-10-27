// Protocolo livre do visitante (0105): a semana inteira sem treinos A/B/C —
// só a faixa de séries por semana de cada músculo. Cada dia ele faz um
// “treino livre” e o placar da semana mostra o que falta.
import { requireAlunoPage } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { getPlanoAtivo } from "@/lib/data/programas";
import { ehLivreMetas, placarDoAluno } from "@/lib/data/livre-metas";
import { EditorMetas } from "@/components/livre-metas/EditorMetas";
import { PlacarMetas } from "@/components/livre-metas/PlacarMetas";
import { DiferencaLivre } from "@/components/livre-metas/DiferencaLivre";
import { Voltar } from "@/components/ui/Voltar";
import { podeRegistrar } from "@/lib/visitante/acesso";

export const metadata = { title: "Meu protocolo livre" };
export const dynamic = "force-dynamic";

export default async function ProtocoloLivrePage() {
  const sessao = await requireAlunoPage();
  const visitante = ehVisitante(sessao);
  const { programa } = await getPlanoAtivo(sessao.alunoId).catch(() => ({ programa: null }));
  const ligado = ehLivreMetas(programa);
  const p = ligado ? await placarDoAluno(sessao.alunoId).catch(() => null) : null;
  return (
    <div className="space-y-5">
      <Voltar href="/aluno/meus-treinos" />
      <header>
        <h1 className="text-2xl font-bold">🎯 Meu protocolo livre</h1>
        <p className="text-sm text-fg-muted">Monte a sua semana só com a quantidade de séries de cada músculo. Nos dias de treino, você escolhe os exercícios na hora e o app conta tudo.</p>
      </header>
      <DiferencaLivre />
      {p?.placar.length ? <PlacarMetas placar={p.placar} sugestao={p.sugestao} resumo={p.resumo} /> : null}
      {!visitante ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm">O seu protocolo é montado pelo Montinho. Quer treinar por metas de séries? Fale com ele pelo WhatsApp.</p>
      ) : !podeRegistrar("visitante", sessao.acessoFim ?? null) ? (
        <p className="rounded-xl border border-border bg-card p-4 text-sm">Seu acesso terminou. Para voltar a montar treinos, fale com o Montinho.</p>
      ) : (
        <EditorMetas alunoId={sessao.alunoId} inicial={ligado ? (programa?.metas_volume ?? {}) : {}} ligadoInicial={ligado} visitante treinar="/aluno/livre" />
      )}
    </div>
  );
}
