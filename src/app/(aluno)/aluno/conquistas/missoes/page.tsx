// Missões Coletivas: metas do mês da tribo inteira (histórico preservado).
import { requireAlunoPage } from "@/lib/auth/session";
import { telaDaTribo } from "@/lib/data/tribo";
import { dataLocal } from "@/lib/aderencia/calcular";
import { progressoMissao } from "@/lib/tribo/regras";
import { AbasConquistas } from "@/components/tribo/AbasConquistas";
import { CelebrarTribo } from "@/components/tribo/CelebrarTribo";
import { MissaoCard } from "@/components/tribo/PainelTribo";

export const metadata = { title: "Missões Coletivas" };

export default async function MissoesPage() {
  const sessao = await requireAlunoPage();
  const { dados, minhas } = await telaDaTribo(sessao.alunoId);
  const hoje = dataLocal(new Date());
  const missoes = (dados?.missoes ?? []).map((m) => progressoMissao(m, dados?.contribuicoes ?? [], hoje)).filter((m) => m.status !== "desativada" || minhas.some((c) => c.referencia === m.id));
  const agora = missoes.filter((m) => m.status === "ativa" || m.status === "futura" || (m.status === "concluida" && m.fim >= hoje));
  const historico = missoes.filter((m) => !agora.includes(m));
  const trofeuDa = (id: string) => minhas.find((c) => c.codigo === "tribo_missao" && c.referencia === id) ?? null;
  return (
    <div className="space-y-5">
      <CelebrarTribo conquistas={minhas.filter((c) => !c.vista_em)} nome={sessao.nome} marcos={dados?.marcos} />
      <h1 className="text-2xl font-bold">Central de Conquistas</h1>
      <AbasConquistas ativa="missoes" />
      <p className="text-sm text-fg-muted">Metas da tribo inteira. Qualquer treino ou cardio válido seu entra na conta; quem contribuiu antes de a missão ser cumprida ganha o troféu dela.</p>
      {agora.length ? (
        <section className="space-y-3" aria-label="Missões de agora">
          {agora.map((m) => <MissaoCard key={m.id} m={m} minha={trofeuDa(m.id)} nome={sessao.nome} marcos={dados?.marcos} />)}
        </section>
      ) : (
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-fg-muted">Nenhuma missão coletiva agora. O Montinho avisa quando a próxima começar!</p>
      )}
      {historico.length ? (
        <section className="space-y-3" aria-label="Missões anteriores">
          <h2 className="text-xs font-bold uppercase tracking-wider text-fg-muted">Missões anteriores</h2>
          {historico.map((m) => <MissaoCard key={m.id} m={m} minha={trofeuDa(m.id)} nome={sessao.nome} marcos={dados?.marcos} />)}
        </section>
      ) : null}
    </div>
  );
}
