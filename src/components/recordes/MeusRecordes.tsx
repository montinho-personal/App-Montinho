"use client";

// “Meus recordes” (Multimodalidade, fase 4): força por RM exato (1RM, 3RM,
// 5RM…), benchmarks (RX e Scaled separados) e marcas anotadas, com antes →
// agora (+kg e +%), data e o gráfico de cada vez que a marca subiu.
// Mesma tela para o aluno e para o personal (que também registra o
// “primeiro movimento técnico”).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CampoNumero } from "@/components/ui/CampoNumero";
import { useToast } from "@/components/ui/Toast";
import { relogioTexto } from "@/lib/modalidades/relogio";
import { textoResultado } from "@/lib/modalidades/resultado";
import { BENCHMARKS_REF } from "@/lib/modalidades/blocos";
import { rotuloRm, type PontoRecorde } from "@/lib/modalidades/recordes";
import type { RecordesDoAluno } from "@/lib/data/recordes";

type Aba = "forca" | "benchmarks" | "marcas";
const fmtData = (d: string) => d.split("-").reverse().join("/");
const kg = (n: number) => `${String(n).replace(".", ",")} kg`;
const nomeBenchmark = (slug: string) => BENCHMARKS_REF.find((b) => b.slug === slug)?.nome ?? slug;

function Linha({ pontos, invertido = false }: { pontos: PontoRecorde[]; invertido?: boolean }) {
  if (pontos.length < 2) return null;
  const W = 120;
  const H = 32;
  const vals = pontos.map((p) => p.valor);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const y = (v: number) => (max === min ? H / 2 : invertido ? 4 + ((v - min) / (max - min)) * (H - 8) : H - 4 - ((v - min) / (max - min)) * (H - 8));
  const x = (i: number) => 4 + (i / (pontos.length - 1)) * (W - 8);
  const d = pontos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden className="shrink-0 text-accent">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(pontos.length - 1)} cy={y(vals[vals.length - 1])} r={3} fill="currentColor" />
    </svg>
  );
}

export function MeusRecordes({ dados, modo, alunoId }: { dados: RecordesDoAluno; modo: "aluno" | "personal"; alunoId?: string }) {
  const [aba, setAba] = useState<Aba>(dados.forca.length ? "forca" : dados.benchmarks.length ? "benchmarks" : "marcas");
  const [anotar, setAnotar] = useState(false);
  const primeiros = dados.marcas.filter((m) => m.tipo === "primeiro");
  const outras = dados.marcas.filter((m) => m.tipo !== "primeiro" && !m.tipo.endsWith("rm"));
  const abas: Array<{ id: Aba; nome: string; n: number }> = [
    { id: "forca", nome: "🏋️ Força", n: dados.forca.length },
    { id: "benchmarks", nome: "⏱️ Benchmarks", n: dados.benchmarks.length },
    { id: "marcas", nome: "🎯 Marcas", n: outras.length + primeiros.length },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 overflow-x-auto" role="tablist">
        {abas.map((a) => (
          <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} onClick={() => setAba(a.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-bold ${aba === a.id ? "bg-accent text-bg" : "border border-border text-fg-muted"}`}>
            {a.nome} ({a.n})
          </button>
        ))}
      </div>

      {aba === "forca" ? (
        dados.forca.length ? (
          <ul className="space-y-2">
            {dados.forca.map((ex) => (
              <li key={ex.chave} className="rounded-2xl border border-border bg-card p-3">
                <p className="font-bold">{ex.nome}</p>
                <ul className="mt-2 space-y-2">
                  {ex.rms.map((r) => (
                    <li key={r.rm} className="flex items-center gap-3">
                      <span className="w-12 shrink-0 rounded-md bg-accent/15 px-1.5 py-1 text-center text-xs font-black text-accent">{rotuloRm(r.rm)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-lg font-black tabular-nums">{kg(r.atual)}</span>
                        <span className="block text-[11px] text-fg-muted">
                          {r.anterior != null ? <>antes {kg(r.anterior)} · <strong className="text-success">+{kg(r.ganhoKg ?? 0).replace(" kg", "")} kg ({String(r.ganhoPct ?? 0).replace(".", ",")}%)</strong> · </> : "primeira marca · "}
                          {fmtData(r.data)}
                        </span>
                      </span>
                      <Linha pontos={r.historico} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <Vazio texto="Ainda não tem recorde de força. Eles aparecem sozinhos quando você faz 1, 2, 3, 5 ou 10 repetições com carga e supera a sua marca." />
        )
      ) : null}

      {aba === "benchmarks" ? (
        dados.benchmarks.length ? (
          <ul className="space-y-2">
            {dados.benchmarks.map((b) => (
              <li key={`${b.benchmark}-${b.versao}-${b.condicao}`} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 font-bold">{nomeBenchmark(b.benchmark)}</p>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-bold">{b.condicao === "rx" ? "RX" : "Scaled"}</span>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-black tabular-nums">🏆 {textoResultado(b.melhor)}</span>
                    <span className="block text-[11px] text-fg-muted">
                      Último: {textoResultado(b.ultimo)} em {fmtData(b.ultimo.data)}
                      {b.diferenca && b.diferenca !== "igual" ? <> · <strong className={b.melhorou ? "text-success" : ""}>{b.diferenca}</strong></> : null} · {b.vezes} {b.vezes === 1 ? "vez" : "vezes"}
                    </span>
                  </span>
                  <Linha pontos={b.historico.map((h) => ({ data: h.data, valor: h.pontos }))} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Vazio texto="Quando o WOD for um benchmark (Fran, Grace, Cindy, Helen, Murph…), o seu resultado aparece aqui. Só se compara com a mesma versão, e RX nunca com Scaled." />
        )
      ) : null}

      {aba === "marcas" ? (
        <div className="space-y-3">
          {primeiros.length ? (
            <section className="space-y-1.5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-fg-muted">🌟 Primeiros movimentos</h2>
              {primeiros.map((m, i) => (
                <p key={m.id ?? i} className="rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm"><strong>{m.nome}</strong> · {fmtData(m.data)}{m.observacoes ? ` · ${m.observacoes}` : ""}</p>
              ))}
            </section>
          ) : null}
          {outras.length ? (
            <ul className="space-y-1.5">
              {outras.map((m, i) => (
                <li key={m.id ?? i} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                  <span className="min-w-0 truncate"><strong>{m.nome}</strong> · {m.tipo === "max_reps" ? "máx. repetições" : m.tipo}</span>
                  <span className="shrink-0 font-bold tabular-nums">{m.unidade === "seg" ? relogioTexto(m.valor) : `${String(m.valor ?? "").replace(".", ",")} ${m.unidade ?? ""}`} · {fmtData(m.data)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {!outras.length && !primeiros.length ? <Vazio texto="Anote aqui um 1RM testado na aula, o máximo de repetições ou um tempo, mesmo fora de um treino do app." /> : null}
        </div>
      ) : null}

      {anotar ? (
        <AnotarMarca modo={modo} alunoId={alunoId} onFechar={() => setAnotar(false)} />
      ) : (
        <button type="button" onClick={() => setAnotar(true)} className="alvo w-full rounded-xl bg-accent px-4 py-3 font-black text-bg">＋ Anotar uma marca</button>
      )}
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-fg-muted">{texto}</p>;
}

function AnotarMarca({ modo, alunoId, onFechar }: { modo: "aluno" | "personal"; alunoId?: string; onFechar: () => void }) {
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"1rm" | "3rm" | "5rm" | "max_reps" | "tempo" | "primeiro">("1rm");
  const [valor, setValor] = useState<number | null>(null);
  const [data, setData] = useState(hoje);
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const unidade = tipo === "max_reps" ? "reps" : tipo === "tempo" ? "seg" : tipo === "primeiro" ? null : "kg";

  async function salvar() {
    if (!nome.trim()) return toast.error("Diga qual é o movimento.");
    if (tipo !== "primeiro" && !(valor && valor > 0)) return toast.error("Coloque o valor da marca.");
    setSalvando(true);
    const url = modo === "personal" && alunoId ? `/api/alunos/${alunoId}/marcas` : "/api/marcas";
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: nome.trim(), tipo, valor: tipo === "primeiro" ? null : valor, unidade, data, observacoes: obs.trim() || null }) }).catch(() => null);
    const d = (await r?.json().catch(() => null)) as { error?: string } | null;
    setSalvando(false);
    if (!r?.ok) return toast.error(d?.error ?? "Não foi possível salvar agora.");
    toast.success(tipo === "primeiro" ? "Primeiro movimento registrado! 🌟" : "Marca anotada! 💪");
    onFechar();
    router.refresh();
  }

  const campo = "h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm";
  return (
    <div className="space-y-2 rounded-2xl border border-accent/50 bg-card p-3">
      <p className="font-bold">Anotar uma marca</p>
      <input value={nome} onChange={(e) => setNome(e.target.value.slice(0, 120))} placeholder="Movimento (ex.: Back Squat, Muscle-Up)" aria-label="Movimento" className={campo} />
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo da marca">
        {(["1rm", "3rm", "5rm", "max_reps", "tempo", ...(modo === "personal" ? (["primeiro"] as const) : [])] as const).map((t) => (
          <button key={t} type="button" role="radio" aria-checked={tipo === t} onClick={() => setTipo(t)} className={`rounded-full border px-2.5 py-1 text-xs font-bold ${tipo === t ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>
            {t === "max_reps" ? "Máx. reps" : t === "tempo" ? "Tempo" : t === "primeiro" ? "🌟 Primeiro movimento" : t.toUpperCase()}
          </button>
        ))}
      </div>
      {tipo !== "primeiro" ? (
        <label className="flex items-center justify-between gap-2 text-sm font-semibold">{unidade === "kg" ? "Carga (kg)" : unidade === "reps" ? "Repetições" : "Tempo (segundos)"}
          <CampoNumero valor={valor} min={0} max={100000} decimal={unidade === "kg"} onChange={setValor} onVazio={() => setValor(null)} className="h-11 w-28 rounded-lg border border-border bg-bg px-2 text-center text-lg" />
        </label>
      ) : (
        <p className="text-xs text-fg-muted">Fica no histórico do aluno. Não vira troféu de propósito, para ninguém arriscar movimento acima do nível só por medalha.</p>
      )}
      <label className="flex items-center justify-between gap-2 text-sm font-semibold">Dia <input type="date" value={data} max={hoje} onChange={(e) => setData(e.target.value)} className="h-11 rounded-lg border border-border bg-bg px-2 text-sm" /></label>
      <input value={obs} onChange={(e) => setObs(e.target.value.slice(0, 300))} placeholder="Observação (opcional)" aria-label="Observação" className={campo} />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onFechar} className="alvo rounded-xl border border-border py-3 text-sm font-semibold">Cancelar</button>
        <button type="button" disabled={salvando} onClick={() => void salvar()} className="alvo rounded-xl bg-accent py-3 text-sm font-black text-bg disabled:opacity-60">{salvando ? "Salvando…" : "Salvar"}</button>
      </div>
    </div>
  );
}
