"use client";

// Treinos feitos (29/10/2026): o personal vê, dia a dia, qual treino o aluno fez,
// cada série e TODAS as anotações em destaque. Filtros de um toque: com
// anotações, com alerta (dor/desconforto/não conseguiu) e por treino (A, B, livre).
import { useState } from "react";
import Link from "next/link";
import { filtrar, porDia, rotuloDia, ROTULO_SINAL, type Filtro, type TreinoFeito } from "@/lib/historico/treinos-feitos";

type Item = TreinoFeito & { alunoNome?: string; visitante?: boolean };

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
const kg = (n: number) => (n >= 1000 ? `${fmt(Math.round(n / 100) / 10)} t` : `${fmt(n)} kg`);
const STATUS: Record<TreinoFeito["status"], { texto: string; cor: string }> = {
  concluido: { texto: "Concluído", cor: "bg-success/15 text-success" },
  parcial: { texto: "Parcial", cor: "bg-warning/15 text-warning" },
  cancelado: { texto: "Cancelado", cor: "bg-white/5 text-fg-subtle" },
  em_andamento: { texto: "Treinando agora", cor: "bg-accent/15 text-accent" },
};
const STATUS_EX: Record<string, string> = { feito: "✅", parcial: "◐", pulado: "⏭", nao_consegui: "✋", pendente: "○" };
const ALERTA = new Set(["dor", "desconforto", "nao_consegui"]);

function Cartao({ t, comAluno, aberto: inicial }: { t: Item; comAluno: boolean; aberto: boolean }) {
  const [aberto, setAberto] = useState(inicial);
  const st = STATUS[t.status];
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} className="w-full space-y-2 px-4 py-3 text-left">
        {comAluno ? (
          <p className="text-base font-bold">
            {t.alunoNome}
            {t.visitante ? <span className="ml-2 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-fg-subtle">visitante</span> : null}
          </p>
        ) : null}
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-lg font-black text-accent">{t.letra ?? (t.tipo === "extra" ? "＋" : "🎲")}</span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold leading-tight">{t.titulo}</span>
            <span className="block text-xs text-fg-muted">
              {t.hora} · {t.seriesFeitas}{t.seriesPlanejadas ? `/${t.seriesPlanejadas}` : ""} séries{t.duracaoMin ? ` · ${t.duracaoMin} min` : ""}{t.volumeKg ? ` · ${kg(t.volumeKg)}` : ""}{t.sentiu ? ` · sentiu: ${t.sentiu.toLowerCase()}` : ""}
            </span>
          </span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${st.cor}`}>{st.texto}</span>
        </div>
        {t.sinais.length ? (
          <div className="flex flex-wrap gap-1">
            {t.sinais.map((s) => (
              <span key={s} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ALERTA.has(s) ? "bg-danger/15 text-danger" : "bg-white/5 text-fg-muted"}`}>{ROTULO_SINAL[s]}</span>
            ))}
          </div>
        ) : null}
        {t.anotacoes.length ? (
          <ul className="space-y-1 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2">
            {t.anotacoes.map((a, i) => (
              <li key={i} className="text-sm leading-snug">
                <span aria-hidden>📝 </span>“{a.texto}” <span className="text-xs text-fg-muted">— {a.onde}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <span className="block text-xs font-semibold text-accent">{aberto ? "Esconder exercícios ▴" : `Ver os ${t.exercicios.length} exercícios ▾`}</span>
      </button>
      {aberto ? (
        <ol className="divide-y divide-border border-t border-border">
          {t.exercicios.map((e, i) => (
            <li key={i} className="space-y-1 px-4 py-2.5">
              <p className="text-sm font-semibold">
                <span aria-hidden>{STATUS_EX[e.status]} </span>
                {e.nome}
                {e.percepcao ? <span className="ml-2 text-xs font-normal text-fg-muted">esforço: {e.percepcao.toLowerCase()}</span> : null}
              </p>
              {e.trocadoDe ? <p className="text-xs text-fg-muted">⇄ no lugar de {e.trocadoDe}</p> : null}
              {e.series.length ? (
                <div className="flex flex-wrap gap-1">
                  {e.series.map((s, k) => (
                    <span key={k} className={`rounded-md px-2 py-0.5 font-mono text-xs ${s.startsWith("aquec.") ? "bg-white/5 text-fg-subtle" : "bg-bg text-fg"}`}>{s}</span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-fg-subtle">{e.status === "nao_consegui" ? "Não conseguiu fazer" : e.status === "pulado" ? "Pulou hoje" : "Sem séries"}</p>
              )}
              {e.anotacao ? <p className="rounded-lg bg-accent/10 px-2 py-1 text-xs">📝 {e.anotacao}</p> : null}
            </li>
          ))}
        </ol>
      ) : null}
      {comAluno ? (
        <Link href={`/treinador/alunos/${t.alunoId}/treinos-feitos`} className="block border-t border-border px-4 py-2 text-xs font-semibold text-accent">
          Ver todos os treinos de {t.alunoNome?.split(" ")[0]} →
        </Link>
      ) : null}
    </article>
  );
}

export function TreinosFeitosLista({ lista, hoje, comAluno = false, porTreino = false }: { lista: Item[]; hoje: string; comAluno?: boolean; porTreino?: boolean }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [letra, setLetra] = useState<string | null>(null);
  const [limite, setLimite] = useState(20);
  const letras = porTreino ? [...new Set(lista.map((t) => t.letra).filter((l): l is string => !!l))].sort() : [];
  const temLivre = porTreino && lista.some((t) => t.tipo !== "ficha");
  const filtrados = filtrar(lista, filtro, letra);
  const visiveis = filtrados.slice(0, limite);
  const chip = (on: boolean) => `min-h-9 rounded-full border px-3 text-xs font-bold ${on ? "border-accent bg-accent text-bg" : "border-border text-fg-muted"}`;
  const contar = (f: Filtro) => filtrar(lista, f, letra).length;

  if (!lista.length) return <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-fg-muted">Nenhum treino registrado ainda.</p>;
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar">
          <button type="button" aria-pressed={filtro === "todos"} onClick={() => setFiltro("todos")} className={chip(filtro === "todos")}>Todos ({contar("todos")})</button>
          <button type="button" aria-pressed={filtro === "anotacoes"} onClick={() => setFiltro("anotacoes")} className={chip(filtro === "anotacoes")}>📝 Com anotações ({contar("anotacoes")})</button>
          <button type="button" aria-pressed={filtro === "alertas"} onClick={() => setFiltro("alertas")} className={chip(filtro === "alertas")}>⚠️ Com alerta ({contar("alertas")})</button>
        </div>
        {letras.length + (temLivre ? 1 : 0) > 1 ? (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Treino">
            <button type="button" aria-pressed={!letra} onClick={() => setLetra(null)} className={chip(!letra)}>Todos os treinos</button>
            {letras.map((l) => (
              <button key={l} type="button" aria-pressed={letra === l} onClick={() => setLetra(l)} className={chip(letra === l)}>Treino {l}</button>
            ))}
            {temLivre ? <button type="button" aria-pressed={letra === "livre"} onClick={() => setLetra("livre")} className={chip(letra === "livre")}>Livre / extra</button> : null}
          </div>
        ) : null}
      </div>

      {!filtrados.length ? <p className="text-sm text-fg-muted">Nada com esse filtro.</p> : null}
      {porDia(visiveis).map((g) => (
        <section key={g.data} className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-fg-subtle first-letter:uppercase">{rotuloDia(g.data, hoje)}</h3>
          {g.itens.map((t, i) => (
            <Cartao key={t.id} t={t} comAluno={comAluno} aberto={!comAluno && filtro === "todos" && !letra && g.data === visiveis[0]?.data && i === 0} />
          ))}
        </section>
      ))}
      {filtrados.length > limite ? (
        <button type="button" onClick={() => setLimite((n) => n + 20)} className="touch w-full rounded-xl border border-border py-3 text-sm font-semibold text-fg-muted">
          Mostrar mais ({filtrados.length - limite})
        </button>
      ) : null}
    </div>
  );
}
