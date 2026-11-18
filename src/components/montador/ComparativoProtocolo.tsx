"use client";

// “📊 Antes × agora” no montador (18/11/2026, pedido do Montinho): sempre comparando o
// protocolo de partida (uma versão salva — por padrão a última da fase anterior) com o
// que está sendo montado. Resumo em números, por treino (entrou/saiu/mudou/igual) e por
// músculo (séries por semana). Cores neutras: só mostra o que mudou, não julga.
import { useState } from "react";
import type { ComparativoProtocolo as Comp, ItemComparado, MusculoComparado } from "@/lib/protocolo/comparar";

export type OpcaoBase = { id: string; rotulo: string };

const sinal = (n: number) => (n > 0 ? `+${String(n).replace(".", ",")}` : String(n).replace(".", ","));
const num = (n: number) => String(n).replace(".", ",");

function Numero({ rotulo, antes, agora }: { rotulo: string; antes: number; agora: number }) {
  const dif = Math.round((agora - antes) * 10) / 10;
  return (
    <div className="rounded-xl border border-border bg-bg/60 px-2 py-2 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-fg-subtle">{rotulo}</p>
      <p className="mt-0.5 font-mono text-sm">
        <span className="text-fg-muted">{num(antes)}</span> → <strong className="text-base">{num(agora)}</strong>
      </p>
      <p className={`text-[11px] font-semibold ${dif ? "text-accent" : "text-fg-subtle"}`}>{dif ? sinal(dif) : "igual"}</p>
    </div>
  );
}

const ESTILO: Record<ItemComparado["tipo"], { icone: string; cor: string; rotulo: string }> = {
  entrou: { icone: "＋", cor: "#5aa9e6", rotulo: "Entrou" },
  saiu: { icone: "−", cor: "#9a9a9a", rotulo: "Saiu" },
  mudou: { icone: "✎", cor: "#d4b25c", rotulo: "Mudou" },
  igual: { icone: "=", cor: "#6b6b6b", rotulo: "Igual" },
};

function Item({ i }: { i: ItemComparado }) {
  const e = ESTILO[i.tipo];
  return (
    <li className="flex items-start gap-2 py-1.5">
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-black" style={{ background: `${e.cor}26`, color: e.cor }} aria-label={e.rotulo}>{e.icone}</span>
      <span className="min-w-0 flex-1 text-sm">
        <span className={`font-semibold ${i.tipo === "saiu" ? "text-fg-muted line-through decoration-1" : ""}`}>{i.nome}</span>
        {i.tipo === "entrou" ? <span className="block text-xs text-fg-muted">{i.agora}{i.veioDe ? ` · veio do treino ${i.veioDe}` : ""}</span> : null}
        {i.tipo === "saiu" ? <span className="block text-xs text-fg-subtle">era {i.antes}{i.foiPara ? ` · foi para o treino ${i.foiPara}` : ""}</span> : null}
        {i.tipo === "igual" ? <span className="block text-xs text-fg-subtle">{i.agora}</span> : null}
        {i.tipo === "mudou" ? (
          <span className="block text-xs">
            <span className="text-fg-subtle">{i.antes}</span> → <strong>{i.agora}</strong>
            <span className="block text-[11px] text-accent">{i.detalhes.join(" · ")}</span>
          </span>
        ) : null}
      </span>
    </li>
  );
}

export function ComparativoProtocolo({ comp, musculos, opcoes, baseId, onTrocarBase, rotuloBase, aberto: abertoInicial = false, id }: { comp: Comp; musculos: MusculoComparado[]; opcoes: OpcaoBase[]; baseId: string; onTrocarBase: (id: string) => void; rotuloBase: string; aberto?: boolean; id?: string }) {
  const [aberto, setAberto] = useState(abertoInicial);
  const [aba, setAba] = useState<"treinos" | "musculos">("treinos");
  const [verIguais, setVerIguais] = useState(false);
  const mudancas = comp.entraram + comp.sairam + comp.mudaram;
  return (
    <section id={id} className="border-t border-border px-4 py-3">
      <button type="button" onClick={() => setAberto((a) => !a)} aria-expanded={aberto} className="flex w-full items-center gap-2 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">📊 Antes × agora</span>
          <span className="block text-xs text-fg-muted">
            Comparando com <strong>{rotuloBase}</strong> · {comp.identico ? "nada mudou ainda" : `${mudancas} ${mudancas === 1 ? "mudança" : "mudanças"} · séries/semana ${comp.seriesSemanaAntes} → ${comp.seriesSemanaAgora}`}
          </span>
        </span>
        <span className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold">{aberto ? "Fechar" : "Ver"}</span>
      </button>
      {aberto ? (
        <div className="mt-3 space-y-3">
          {opcoes.length > 1 ? (
            <label className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
              Comparar com:
              <select value={baseId} onChange={(e) => onTrocarBase(e.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-bg px-2 text-sm text-fg">
                {opcoes.map((o) => (
                  <option key={o.id} value={o.id}>{o.rotulo}</option>
                ))}
              </select>
            </label>
          ) : null}
          <div className="grid grid-cols-3 gap-2">
            <Numero rotulo="Treinos/sem" antes={comp.treinosSemanaAntes} agora={comp.treinosSemanaAgora} />
            <Numero rotulo="Séries/sem" antes={comp.seriesSemanaAntes} agora={comp.seriesSemanaAgora} />
            <Numero rotulo="Técnicas" antes={comp.tecnicasAntes} agora={comp.tecnicasAgora} />
          </div>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <span style={{ color: ESTILO.entrou.cor }}>＋ {comp.entraram} entraram</span>
            <span style={{ color: ESTILO.mudou.cor }}>✎ {comp.mudaram} mudaram</span>
            <span className="text-fg-muted">− {comp.sairam} saíram</span>
            <span className="text-fg-subtle">= {comp.iguais} iguais</span>
          </p>
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-border p-1 text-xs font-semibold">
            {(["treinos", "musculos"] as const).map((a) => (
              <button key={a} type="button" onClick={() => setAba(a)} aria-pressed={aba === a} className={`rounded-lg px-2 py-2 ${aba === a ? "bg-accent text-bg" : "text-fg-muted"}`}>
                {a === "treinos" ? "Por treino" : "Por músculo (séries/sem)"}
              </button>
            ))}
          </div>
          {aba === "treinos" ? (
            <div className="space-y-2">
              {comp.porTreino.map((t) => {
                const lista = verIguais ? t.itens : t.itens.filter((i) => i.tipo !== "igual");
                const iguais = t.itens.length - t.itens.filter((i) => i.tipo !== "igual").length;
                return (
                  <div key={t.letra} className="rounded-xl border border-border bg-bg/40 px-3 py-2">
                    <p className="flex items-center gap-2 text-sm font-bold">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-accent/15 text-accent">{t.letra}</span>
                      <span className="min-w-0 flex-1 truncate">{t.nome}</span>
                      <span className="shrink-0 text-[11px] font-semibold text-fg-muted">
                        {t.status === "novo" ? "🆕 dia novo" : t.status === "saiu" ? "saiu do protocolo" : t.status === "igual" ? "igual" : `${t.seriesAntes} → ${t.seriesAgora} séries`}
                      </span>
                    </p>
                    {lista.length ? <ul className="mt-1 divide-y divide-border/60">{lista.map((i) => <Item key={`${i.tipo}:${i.nome}`} i={i} />)}</ul> : null}
                    {!verIguais && iguais > 0 ? <p className="pt-1 text-[11px] text-fg-subtle">= {iguais} {iguais === 1 ? "exercício igual" : "exercícios iguais"}</p> : null}
                  </div>
                );
              })}
              <button type="button" onClick={() => setVerIguais((v) => !v)} className="text-xs font-semibold text-fg-muted underline">
                {verIguais ? "Esconder os iguais" : "Mostrar também os que ficaram iguais"}
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-bg/60 text-[11px] uppercase tracking-wider text-fg-subtle">
                  <tr><th className="px-3 py-2 text-left">Músculo</th><th className="px-2 py-2 text-right">Antes</th><th className="px-2 py-2 text-right">Agora</th><th className="px-3 py-2 text-right">Dif.</th></tr>
                </thead>
                <tbody>
                  {musculos.map((m) => (
                    <tr key={m.grupo} className="border-t border-border/60">
                      <td className="px-3 py-1.5">{m.label}</td>
                      <td className="px-2 py-1.5 text-right font-mono text-fg-muted">{num(m.antes)}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-bold">{num(m.agora)}</td>
                      <td className={`px-3 py-1.5 text-right font-mono text-xs font-semibold ${m.dif ? "text-accent" : "text-fg-subtle"}`}>{m.dif ? sinal(m.dif) : "="}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-3 py-2 text-[11px] text-fg-subtle">Mesma conta da tabela de volume (séries válidas × vezes por semana).</p>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
