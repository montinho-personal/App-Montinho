// Conquistas da Tribo: o esforço de cada um vira conquista coletiva.
// “Cada treino conta. Cada minuto importa. E juntos, a Tribo Montinho vai mais longe.”
import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { telaDaTribo } from "@/lib/data/tribo";
import { dataLocal } from "@/lib/aderencia/calcular";
import { curiosidades, mensagensDaTribo, previsaoDoMarco, progressoMissao, proximoMarco, resumoTribo, situacaoDosMarcos, ultimosDiasDaTribo, type Trilha } from "@/lib/tribo/regras";
import { MetaDaTribo } from "@/components/tribo/MetaDaTribo";
import { AbasConquistas } from "@/components/tribo/AbasConquistas";
import { CelebrarTribo } from "@/components/tribo/CelebrarTribo";
import { CuriosidadesTribo, GaleriaTribo, MensagensTribo, MissaoCard, ResumoColetivo } from "@/components/tribo/PainelTribo";

export const metadata = { title: "Conquistas da Tribo" };

export default async function TriboPage() {
  const sessao = await requireAlunoPage();
  const { dados, minhas } = await telaDaTribo(sessao.alunoId);
  const nome = sessao.nome.split(" ")[0];
  const hoje = dataLocal(new Date());
  if (!dados) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Central de Conquistas</h1>
        <AbasConquistas ativa="tribo" />
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-fg-muted">A Tribo está se preparando. Volte daqui a pouco!</p>
      </div>
    );
  }
  const r = resumoTribo(dados);
  const porCodigo = new Map(minhas.filter((c) => c.codigo !== "tribo_missao").map((c) => [c.codigo, c]));
  const recuperouAgora = minhas.some((c) => !c.vista_em && c.metodo === "recuperacao");
  const galeria = (trilha: "cardio" | "treinos") => situacaoDosMarcos(dados, trilha).map((s) => ({ s, minha: porCodigo.get(s.codigo) ?? null }));
  const missoes = dados.missoes.map((m) => progressoMissao(m, dados.contribuicoes, hoje));
  const ativa = missoes.find((m) => m.status === "ativa") ?? missoes.find((m) => m.status === "concluida" && m.fim >= hoje) ?? null;
  const meta = (trilha: Trilha, meus: number) => {
    const p = proximoMarco(dados, trilha);
    const ultimos = ultimosDiasDaTribo(dados.contribuicoes, trilha, hoje);
    return { p, marcos: situacaoDosMarcos(dados, trilha), ultimos, previsao: previsaoDoMarco(p, ultimos), meus };
  };
  return (
    <div className="space-y-5">
      <CelebrarTribo conquistas={minhas.filter((c) => !c.vista_em)} nome={sessao.nome} marcos={dados.marcos} />
      <div>
        <h1 className="text-2xl font-bold">Central de Conquistas</h1>
        <p className="mt-1 text-sm text-fg-muted">Cada treino conta. Cada minuto importa. E juntos, a Tribo Montinho vai mais longe.</p>
      </div>
      <AbasConquistas ativa="tribo" />
      {/* Meta em destaque: % até o próximo troféu, trilha dos marcos e os últimos 7 dias. */}
      <MetaDaTribo cardio={meta("cardio", r.meus.minutos)} treinos={meta("treinos", r.meus.treinos)} />
      <MensagensTribo mensagens={mensagensDaTribo(dados, hoje, recuperouAgora)} />
      <ResumoColetivo r={r} />
      <CuriosidadesTribo itens={curiosidades(r, dados.contribuicoes)} />
      <section className="rounded-2xl border border-border bg-surface p-4" aria-labelledby="minha-contribuicao">
        <h2 id="minha-contribuicao" className="text-sm font-bold">💛 Minha contribuição</h2>
        <p className="mt-1 text-sm text-fg-muted">
          {r.meus.minutos || r.meus.treinos
            ? `Você já somou ${[r.meus.minutos ? `${r.meus.minutos.toLocaleString("pt-BR")} minutos de cardio (${r.meus.sessoesCardio} ${r.meus.sessoesCardio === 1 ? "cardio" : "cardios"})` : null, r.meus.treinos ? `${r.meus.treinos} ${r.meus.treinos === 1 ? "treino" : "treinos"} de musculação` : null].filter(Boolean).join(" e ")} à tribo. Obrigado por fazer parte!`
            : "Seu primeiro treino ou cardio válido já entra na conta da tribo. Sem pressa: no seu ritmo, do jeito combinado."}
        </p>
        <p className="mt-2 text-xs text-fg-subtle">{minhas.length ? `${minhas.length} ${minhas.length === 1 ? "troféu da tribo" : "troféus da tribo"} com você.` : "Ainda sem troféus da tribo: o primeiro vem com a sua primeira contribuição num marco."}</p>
      </section>
      {ativa ? (
        <section className="space-y-2" aria-label="Missão coletiva">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-fg-muted">Missão coletiva</h2>
            <Link href="/aluno/conquistas/missoes" className="alvo text-xs font-semibold text-accent">Ver todas →</Link>
          </div>
          <MissaoCard m={ativa} minha={minhas.find((c) => c.codigo === "tribo_missao" && c.referencia === ativa.id) ?? null} nome={sessao.nome} marcos={dados.marcos} />
        </section>
      ) : null}
      <GaleriaTribo titulo="Galeria — troféus coletivos de cardio" itens={galeria("cardio")} nome={sessao.nome} marcos={dados.marcos} />
      <GaleriaTribo titulo="Galeria — troféus coletivos de musculação" itens={galeria("treinos")} nome={sessao.nome} marcos={dados.marcos} />
      <section className="rounded-2xl border border-border bg-surface p-4 text-xs text-fg-muted" aria-labelledby="como-funciona">
        <h2 id="como-funciona" className="text-sm font-bold text-fg">Como funciona</h2>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>Contam os cardios válidos (10+ min) e os treinos de musculação concluídos, de todo mundo.</li>
          <li>Quando a tribo chega num marco, ganha o troféu quem contribuiu desde o marco anterior.</li>
          <li>Chegou depois? Recupere as conquistas históricas somando 10% do marco no seu ritmo (ex.: 100 min para o de 1.000). Seus minutos não zeram.</li>
          <li>O objetivo é constância, não exagero: faça o que foi combinado com o Montinho.</li>
        </ul>
        <p className="mt-2">{nome}, é impossível dar errado quando a tribo não para!</p>
      </section>
    </div>
  );
}
