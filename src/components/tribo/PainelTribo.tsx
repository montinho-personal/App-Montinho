// Peças da tela Conquistas da Tribo (aluno e personal). Sem estado: os
// números vêm prontos de src/lib/tribo/regras.ts.
import { MedalhaIcone } from "@/components/conquistas/MedalhaIcone";
import { CompartilharTribo } from "./CompartilharTribo";
import {
  fmt,
  lendariaDaTribo,
  motivoDaTribo,
  seloDaTribo,
  unidade,
  type ConquistaTribo,
  type Curiosidade,
  type MarcoTribo,
  type ProgressoMissao,
  type ProximoMarco,
  type ResumoTribo,
  type SituacaoMarco,
} from "@/lib/tribo/regras";

const dataBR = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });

export function ResumoColetivo({ r }: { r: ResumoTribo }) {
  const itens = [
    { emoji: "⏱️", valor: fmt(r.minutos), rotulo: "minutos de cardio" },
    { emoji: "❤️‍🔥", valor: fmt(r.sessoesCardio), rotulo: "cardios concluídos" },
    { emoji: "🏋️", valor: fmt(r.treinos), rotulo: "treinos de musculação" },
    { emoji: "🤝", valor: fmt(r.participantes), rotulo: "pessoas na tribo" },
  ];
  return (
    <section aria-labelledby="tribo-resumo" className="rounded-2xl border border-accent/40 bg-grain-strong p-4">
      <p id="tribo-resumo" className="text-[11px] font-bold uppercase tracking-wider text-accent">Juntos, até agora</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {itens.map((i) => (
          <div key={i.rotulo} className="rounded-xl border border-border bg-bg/60 px-3 py-2.5">
            <p className="text-2xl font-extrabold leading-none">
              <span aria-hidden className="mr-1 text-lg">{i.emoji}</span>
              {i.valor}
            </p>
            <p className="mt-1 text-xs text-fg-muted">{i.rotulo}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function MensagensTribo({ mensagens }: { mensagens: string[] }) {
  if (!mensagens.length) return null;
  return (
    <ul className="space-y-1.5" aria-label="Recados da tribo">
      {mensagens.slice(0, 3).map((m) => (
        <li key={m} className="rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-sm font-semibold">💛 {m}</li>
      ))}
    </ul>
  );
}

export function CuriosidadesTribo({ itens }: { itens: Curiosidade[] }) {
  if (!itens.length) return null;
  return (
    <section aria-labelledby="tribo-curiosidades" className="space-y-2">
      <h2 id="tribo-curiosidades" className="text-xs font-bold uppercase tracking-wider text-fg-muted">Curiosidades sobre os nossos números</h2>
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
        {itens.map((c) => (
          <article key={c.id} className="w-[78%] max-w-xs shrink-0 snap-start rounded-2xl border border-border bg-surface p-4">
            <p aria-hidden className="text-3xl">{c.emoji}</p>
            <h3 className="mt-2 text-lg font-extrabold leading-tight">{c.titulo}</h3>
            <p className="mt-1 text-sm text-fg-muted">{c.texto}</p>
            {c.nota ? <p className="mt-2 text-[11px] text-fg-subtle">{c.nota}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export function BarraMarco({ titulo, p, meus }: { titulo: string; p: ProximoMarco; meus: number }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4" aria-label={titulo}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold">{titulo}</h2>
        <span className="text-xs text-fg-muted">total: {unidade(p.trilha, p.total)}</span>
      </div>
      {p.marco ? (
        <>
          <p className="mt-2 text-sm">
            Próxima conquista: <strong className="text-accent">{p.marco.nome}</strong> ({unidade(p.trilha, p.marco.marco)})
          </p>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-bg" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.pct} aria-label={`${p.pct}% até ${p.marco.nome}`}>
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, p.pct)}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-fg-muted">
            {p.pct}% do caminho · faltam {unidade(p.trilha, p.faltam)}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm font-semibold text-accent">Todos os marcos desta trilha foram alcançados. Que tribo!</p>
      )}
      <p className="mt-2 text-xs">
        Sua parte até hoje: <strong>{unidade(p.trilha, meus)}</strong>
      </p>
    </section>
  );
}

type ItemGaleria = { s: SituacaoMarco; minha: ConquistaTribo | null };

export function GaleriaTribo({ titulo, itens, nome, marcos, compartilhar = true }: { titulo: string; itens: ItemGaleria[]; nome: string; marcos: MarcoTribo[]; compartilhar?: boolean }) {
  return (
    <section className="space-y-2" aria-label={titulo}>
      <h2 className="text-xs font-bold uppercase tracking-wider text-fg-muted">{titulo}</h2>
      <ul className="grid grid-cols-2 gap-2">
        {itens.map(({ s, minha }) => {
          const alcancado = !!s.alcancadoEm;
          const lendaria = lendariaDaTribo(s.codigo, marcos);
          const falta = Math.max(0, s.metaRecuperacao - s.meuAcumulado);
          return (
            <li key={s.codigo} className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center ${minha ? "border-accent/60 bg-grain-strong" : "border-border bg-surface"}`}>
              <MedalhaIcone selo={seloDaTribo(s.codigo, marcos)} conquistada={!!minha} atual={minha ? null : alcancado ? s.meuAcumulado : null} alvo={minha ? null : alcancado ? s.metaRecuperacao : null} tamanho={70} lendaria={lendaria && !!minha} />
              <p className="text-sm font-bold leading-tight">{s.nome}</p>
              <p className="text-[11px] text-fg-muted">{unidade(s.trilha, s.marco)} da tribo</p>
              {minha ? (
                <>
                  <p className="text-[11px] font-semibold text-success">{minha.metodo === "recuperacao" ? "♻️ Recuperado" : "✅ Eu fiz parte"} · {dataBR(minha.conquistado_em)}</p>
                  <p className="text-[11px] text-fg-muted">{motivoDaTribo(minha)}</p>
                  {compartilhar ? <CompartilharTribo conquista={minha} nome={nome} marcos={marcos} /> : null}
                </>
              ) : alcancado ? (
                <p className="text-[11px] text-fg-muted">
                  🏛️ Conquista histórica ({dataBR(s.alcancadoEm!)}). Recupere com {unidade(s.trilha, s.metaRecuperacao)} seus: {falta ? `faltam ${unidade(s.trilha, falta)}` : "quase lá"}.
                </p>
              ) : (
                <p className="text-[11px] text-fg-subtle">🔒 Ainda não alcançado. Cada contribuição sua conta para este troféu.</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const ROTULO_STATUS: Record<ProgressoMissao["status"], string> = {
  ativa: "Em andamento",
  futura: "Começa em breve",
  concluida: "Missão cumprida",
  encerrada: "Encerrada",
  desativada: "Desligada",
};

export function MissaoCard({ m, minha, nome, marcos, compartilhar = true }: { m: ProgressoMissao; minha?: ConquistaTribo | null; nome?: string; marcos?: MarcoTribo[]; compartilhar?: boolean }) {
  const periodo = `${m.inicio.slice(8, 10)}/${m.inicio.slice(5, 7)} a ${m.fim.slice(8, 10)}/${m.fim.slice(5, 7)}/${m.fim.slice(0, 4)}`;
  const barras = [
    m.meta_minutos != null ? { rotulo: "Cardio", atual: m.minutos, meta: m.meta_minutos, pct: m.pctMinutos ?? 0, trilha: "cardio" as const } : null,
    m.meta_treinos != null ? { rotulo: "Musculação", atual: m.treinos, meta: m.meta_treinos, pct: m.pctTreinos ?? 0, trilha: "treinos" as const } : null,
  ].filter((x): x is NonNullable<typeof x> => !!x);
  return (
    <article className={`rounded-2xl border p-4 ${m.status === "concluida" ? "border-accent/60 bg-grain-strong" : "border-border bg-surface"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-extrabold leading-tight">🎯 {m.nome}</h3>
          <p className="text-[11px] text-fg-muted">
            {periodo}
            {m.recorrente ? " · todo mês" : ""}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${m.status === "concluida" ? "bg-accent text-bg" : m.status === "ativa" ? "bg-success/15 text-success" : "bg-bg text-fg-muted"}`}>{ROTULO_STATUS[m.status]}</span>
      </div>
      {m.descricao ? <p className="mt-1.5 text-sm text-fg-muted">{m.descricao}</p> : null}
      <div className="mt-3 space-y-2">
        {barras.map((b) => (
          <div key={b.rotulo}>
            <div className="flex justify-between text-xs">
              <span className="font-semibold">{b.rotulo}</span>
              <span className="text-fg-muted">
                {fmt(b.atual)} de {unidade(b.trilha, b.meta)}
              </span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-bg" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={b.pct} aria-label={`${b.rotulo}: ${b.pct}%`}>
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, b.pct)}%` }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-fg-muted">
        {m.participantes ? `${fmt(m.participantes)} ${m.participantes === 1 ? "pessoa já ajudou" : "pessoas já ajudaram"}. ` : ""}
        {m.meus.minutos || m.meus.treinos ? (
          <strong className="text-fg">Sua parte: {[m.meus.minutos ? unidade("cardio", m.meus.minutos) : null, m.meus.treinos ? unidade("treinos", m.meus.treinos) : null].filter(Boolean).join(" e ")}.</strong>
        ) : m.status === "ativa" && compartilhar ? (
          "Qualquer treino ou cardio válido seu já entra na missão."
        ) : null}
      </p>
      {minha ? (
        <div className="mt-3 space-y-2 rounded-xl border border-accent/40 bg-bg/60 p-3">
          <p className="text-sm font-bold">🏆 Troféu da missão: você fez parte!</p>
          {compartilhar && nome ? <CompartilharTribo conquista={minha} nome={nome} marcos={marcos} /> : null}
        </div>
      ) : compartilhar && m.status === "concluida" && !m.ajudei ? (
        <p className="mt-2 text-[11px] text-fg-subtle">A missão foi cumprida antes da sua primeira contribuição nela. A próxima é sua!</p>
      ) : null}
    </article>
  );
}
