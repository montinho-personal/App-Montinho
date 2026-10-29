// Conquistas da Tribo vistas pelo personal: números coletivos, marcos (quando
// a tribo chegou e quantos ganharam), quem está somando e as missões coletivas
// (criar, repetir todo mês, desligar — nada é apagado).
import { requireTreinadorPage } from "@/lib/auth/session";
import { conquistasTriboDeTodos, dadosTribo } from "@/lib/data/tribo";
import { listAlunos } from "@/lib/db";
import { dataLocal, somarDias } from "@/lib/aderencia/calcular";
import { curiosidades, fmt, progressoMissao, proximoMarco, resumoTribo, situacaoDosMarcos, unidade } from "@/lib/tribo/regras";
import { CuriosidadesTribo, MissaoCard, ResumoColetivo } from "@/components/tribo/PainelTribo";
import { MissoesAdmin } from "./MissoesAdmin";

export const metadata = { title: "Conquistas da Tribo" };
export const dynamic = "force-dynamic";

const dataBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

export default async function TriboTreinadorPage() {
  await requireTreinadorPage();
  const [dados, ganhos, alunos] = await Promise.all([dadosTribo({ treinador: true }).catch(() => null), conquistasTriboDeTodos().catch(() => []), listAlunos({ incluirVisitantes: true }).catch(() => [] as Awaited<ReturnType<typeof listAlunos>>)]);
  if (!dados) return <p className="text-sm text-fg-muted">Não foi possível carregar a Tribo agora. Confira se a migration 0115 foi aplicada.</p>;
  const hoje = dataLocal(new Date());
  const r = resumoTribo(dados);
  const nomes = new Map(alunos.map((a) => [a.id, a.profile?.nome ?? "Aluno"]));
  // Quem somou nos últimos 30 dias (constância, não volume: mostra dias com atividade).
  const desde = Date.parse(`${somarDias(hoje, -30)}T00:00:00-03:00`);
  const porAluno = new Map<string, { minutos: number; cardios: number; treinos: number }>();
  for (const c of dados.contribuicoes) {
    if (!c.a || Date.parse(c.em) < desde) continue;
    const x = porAluno.get(c.a) ?? { minutos: 0, cardios: 0, treinos: 0 };
    if (c.t === "c") { x.minutos += c.min; x.cardios++; } else x.treinos++;
    porAluno.set(c.a, x);
  }
  const contribuintes = [...porAluno.entries()].sort((a, b) => (nomes.get(a[0]) ?? "").localeCompare(nomes.get(b[0]) ?? "", "pt-BR"));
  const missoes = dados.missoes.map((m) => progressoMissao(m, dados.contribuicoes, hoje));
  const ganhosPor = (codigo: string, ref?: string) => ganhos.filter((g) => g.codigo === codigo && (!ref || g.referencia === ref));
  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Conquistas da Tribo</h1>
        <p className="mt-1 text-sm text-fg-muted">O esforço de cada aluno vira conquista coletiva. Contam os cardios válidos e os treinos de musculação concluídos (as mesmas regras do app). Os alunos veem os números da tribo, nunca os dados dos outros.</p>
      </div>
      <ResumoColetivo r={r} />
      <CuriosidadesTribo itens={curiosidades(r, dados.contribuicoes)} />
      {(["cardio", "treinos"] as const).map((trilha) => {
        const p = proximoMarco(dados, trilha);
        return (
          <section key={trilha} className="rounded-2xl border border-border bg-surface p-4" aria-label={trilha === "cardio" ? "Marcos de cardio" : "Marcos de musculação"}>
            <h2 className="text-sm font-bold">{trilha === "cardio" ? "❤️‍🔥 Marcos de cardio" : "🏋️ Marcos de musculação"}</h2>
            <p className="mt-1 text-xs text-fg-muted">{p.marco ? `Próximo: ${p.marco.nome} — faltam ${unidade(trilha, p.faltam)} (${p.pct}%).` : "Todos os marcos alcançados."}</p>
            <ul className="mt-2 divide-y divide-border text-sm">
              {situacaoDosMarcos(dados, trilha).map((s) => {
                const g = ganhosPor(s.codigo);
                return (
                  <li key={s.codigo} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                    <span><strong>{s.nome}</strong> <span className="text-fg-muted">· {unidade(trilha, s.marco)}</span></span>
                    <span className="text-xs text-fg-muted">{s.alcancadoEm ? `alcançado em ${dataBR(s.alcancadoEm)} · ${g.filter((x) => x.metodo === "participacao").length} por participação, ${g.filter((x) => x.metodo === "recuperacao").length} recuperados` : "ainda não"}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <section className="rounded-2xl border border-border bg-surface p-4" aria-labelledby="contribuintes">
        <h2 id="contribuintes" className="text-sm font-bold">🤝 Quem somou nos últimos 30 dias</h2>
        {contribuintes.length ? (
          <ul className="mt-2 divide-y divide-border text-sm">
            {contribuintes.map(([id, x]) => (
              <li key={id} className="flex flex-wrap justify-between gap-2 py-1.5">
                <span>{nomes.get(id) ?? "Aluno"}</span>
                <span className="text-xs text-fg-muted">{[x.treinos ? unidade("treinos", x.treinos) : null, x.cardios ? `${x.cardios} ${x.cardios === 1 ? "cardio" : "cardios"} (${fmt(x.minutos)} min)` : null].filter(Boolean).join(" · ")}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-fg-muted">Ninguém somou nos últimos 30 dias.</p>
        )}
        <p className="mt-2 text-[11px] text-fg-subtle">Lista em ordem alfabética, só para você: a tribo valoriza constância, não quem fez mais.</p>
      </section>
      <MissoesAdmin hoje={hoje} />
      <section className="space-y-3" aria-label="Missões">
        <h2 className="text-xs font-bold uppercase tracking-wider text-fg-muted">Missões (atuais e histórico)</h2>
        {missoes.length ? missoes.map((m) => (
          <div key={m.id} className="space-y-1">
            <MissaoCard m={m} compartilhar={false} />
            <p className="px-1 text-[11px] text-fg-subtle">{ganhosPor("tribo_missao", m.id).length} {ganhosPor("tribo_missao", m.id).length === 1 ? "troféu entregue" : "troféus entregues"}</p>
            <MissoesAdmin hoje={hoje} alternar={{ id: m.id, ativa: m.ativa }} />
          </div>
        )) : <p className="text-sm text-fg-muted">Nenhuma missão criada ainda. Crie a primeira acima.</p>}
      </section>
    </div>
  );
}
