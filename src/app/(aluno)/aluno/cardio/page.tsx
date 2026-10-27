// Montinho Cardio do aluno: o que o Montinho prescreveu, registro rápido,
// semana, histórico, evolução do esforço e o próximo troféu de cardio.
import Link from "next/link";
import { requireAlunoPage } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { cardioDoAluno } from "@/lib/data/cardio";
import { aderenciaDoAluno } from "@/lib/data/aderencia";
import { dataLocal } from "@/lib/aderencia/calcular";
import { esforcoPorSemana, pendentesHoje } from "@/lib/cardio/regras";
import { DIAS_SEMANA, INTENSIDADES, MODALIDADES } from "@/lib/cardio/modalidades";
import { CATALOGO, type CodigoConquista } from "@/lib/conquistas/regras";
import { CardioHoje } from "@/components/cardio/CardioHoje";
import { SemanaCardioCard } from "@/components/cardio/SemanaCardioCard";
import { HistoricoCardio, SemanasCardio } from "@/components/cardio/HistoricoCardio";
import { Colombo, Oogway } from "@/components/jornada-chalala/Personagens";

export const metadata = { title: "Montinho Cardio" };

const VINCULO = { independente: "sessão independente", apos_treino: "depois da musculação", antes_treino: "antes da musculação" } as const;

export default async function CardioPage() {
  const sessao = await requireAlunoPage();
  const aluno = await getAluno(sessao.alunoId);
  if (!aluno) return null;
  const aderencia = await aderenciaDoAluno(aluno).catch(() => null);
  const pausadas = (aderencia?.semanas ?? []).filter((w) => w.pausada).map((w) => w.inicio);
  const c = await cardioDoAluno(aluno.id, pausadas);
  const hoje = dataLocal(new Date());
  const pendentes = pendentesHoje(c.prescricoes, c.feitos, hoje);
  const atual = c.semanas.find((s) => s.atual) ?? null;
  const esforco = esforcoPorSemana(c.feitos).slice(-6);
  const proximo = c.marco.proximo ? CATALOGO[`cardio_${c.marco.proximo}` as CodigoConquista]?.titulo : null;
  const seguidas = (() => {
    let n = 0;
    for (const s of [...c.semanas].reverse()) {
      if (s.atual && s.status !== "cumprida") continue;
      if (s.status === "cumprida") n++;
      else if (s.status !== "pausada" && s.status !== "sem_prescricao") break;
    }
    return n;
  })();
  const nome = (sessao.nome ?? "").split(" ")[0];

  return (
    <div className="mx-auto max-w-xl space-y-5 px-4 py-5">
      <header>
        <p className="text-xs text-fg-muted"><Link href="/aluno" className="hover:underline">Início</Link> › Cardio</p>
        <h1 className="text-2xl font-bold">❤️‍🔥 Montinho Cardio</h1>
        <p className="text-sm text-fg-muted">O objetivo não é fazer mais cardio. É cumprir o cardio certo, com constância.</p>
      </header>

      <SemanaCardioCard semana={atual} />
      <CardioHoje pendentes={pendentes} nome={nome} />

      {c.marco.proximo ? (
        <div className="flex items-center gap-3 rounded-xl border border-border p-3">
          <Colombo tamanho={56} />
          <p className="text-sm">
            {c.marco.feitos ? <>Você já tem <strong>{c.marco.feitos} {c.marco.feitos === 1 ? "cardio" : "cardios"}</strong>. </> : null}
            {c.marco.faltam === 1 ? "Falta só 1" : `Faltam ${c.marco.faltam}`} para o troféu <strong>{proximo}</strong>.
            <Link href="/aluno/conquistas/todas?aba=temas&tema=cardio" className="ml-1 text-accent underline-offset-2 hover:underline">Ver troféus de cardio</Link>
          </p>
        </div>
      ) : null}
      {seguidas >= 2 ? (
        <div className="flex items-center gap-3 rounded-xl border border-border p-3">
          <Oogway tamanho={56} />
          <p className="text-sm">{seguidas} semanas seguidas com o cardio em dia. Devagar e sempre: é assim que o fôlego se constrói.</p>
        </div>
      ) : null}

      {c.prescricoes.length ? (
        <section className="space-y-2">
          <h2 className="text-base font-bold">O que o Montinho prescreveu</h2>
          <ul className="space-y-2">
            {c.prescricoes.map((p) => (
              <li key={p.id} className="rounded-xl border border-border p-3 text-sm">
                <p className="font-semibold">{MODALIDADES[p.modalidade].emoji} {p.nome ?? MODALIDADES[p.modalidade].nome} · {p.duracao_min} min · {p.frequencia_semanal}× por semana</p>
                <p className="text-xs text-fg-muted">
                  {INTENSIDADES[p.intensidade].nome} · {p.tipo === "intervalado" ? `intervalado${p.intervalos ? ` (${p.intervalos})` : ""}` : "contínuo"} · {VINCULO[p.vinculo]}
                  {p.dias.length ? ` · ${p.dias.map((d) => DIAS_SEMANA[d]).join(", ")}` : ""}
                  {p.fc_alvo_min || p.fc_alvo_max ? ` · FC-alvo ${p.fc_alvo_min ?? "?"}–${p.fc_alvo_max ?? "?"} bpm` : ""}
                </p>
                {p.observacoes ? <p className="mt-1 text-xs">📝 {p.observacoes}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-3 text-sm text-fg-muted">O Montinho ainda não prescreveu cardio para você. Fez algum por conta? Registre como cardio livre: ele aparece aqui e conta para os troféus.</p>
      )}

      <SemanasCardio semanas={c.semanas} />

      {esforco.length >= 2 ? (
        <div className="rounded-xl border border-border p-3">
          <p className="mb-2 text-sm font-semibold">Esforço percebido (média por semana)</p>
          <div className="flex items-end gap-2">
            {esforco.map((e) => (
              <div key={e.inicio} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-bold">{String(e.media).replace(".", ",")}</span>
                <div className="w-3/4 rounded-t bg-gold/70" style={{ height: `${Math.max(4, e.media * 8)}px` }} />
                <span className="text-[10px] text-fg-subtle">{e.inicio.slice(8, 10)}/{e.inicio.slice(5, 7)}</span>
              </div>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-fg-subtle">Mesmo cardio com esforço menor ao longo das semanas é sinal de condicionamento melhorando.</p>
        </div>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-base font-bold">Histórico</h2>
        <HistoricoCardio feitos={c.feitos} rotaCorrecao="/api/cardio" />
      </section>
    </div>
  );
}
