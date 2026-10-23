"use client";

// "Eu monto": o aluno escolhe os exercícios do extra tocando nos atalhos do
// plano ou falando (microfone do navegador). O app entende nome, séries e
// repetições com o mesmo intérprete do "Ditar treino" do personal.
import { useState } from "react";
import { useDitado } from "@/components/voz/useDitado";
import { interpretarDitado } from "@/lib/treino/ditado";
import { ditadoDaIA } from "@/lib/treino/ditado-ia";
import type { ResultadoInterpretacao } from "@/lib/ia/interpretar-treino";
import type { ItemBiblioteca } from "@/lib/biblioteca/tipos";
import { LIMITES_EXTRA_LIVRE } from "@/lib/treino/extra-gerado";

export type ItemEscolhido = { chave: string; nome: string; biblioteca_id: string | null; series: number; reps: string };
type Atalho = { nome: string; biblioteca_id: string | null; grupo: string | null };

const L = LIMITES_EXTRA_LIVRE;
const novaChave = () => Math.random().toString(36).slice(2, 10);

export function EuMonto({ itens, setItens, biblioteca, atalhos, seriesDisponiveis }: { itens: ItemEscolhido[]; setItens: (f: (a: ItemEscolhido[]) => ItemEscolhido[]) => void; biblioteca: ItemBiblioteca[]; atalhos: Atalho[]; seriesDisponiveis: number }) {
  const voz = useDitado();
  const [naoEntendi, setNaoEntendi] = useState<string[]>([]);
  const [organizando, setOrganizando] = useState(false);
  const total = itens.reduce((n, i) => n + i.series, 0);
  const cheio = itens.length >= L.maxExercicios;

  function adicionar(novos: Array<Omit<ItemEscolhido, "chave">>) {
    setItens((a) => [...a, ...novos.map((n) => ({ ...n, chave: novaChave() }))].slice(0, L.maxExercicios));
  }
  async function usarFala() {
    voz.parar();
    const fala = voz.texto.trim();
    if (!fala) return;
    // Ditado inteligente (IA) quando ligado; senão, a leitura simples.
    setOrganizando(true);
    const resp = await fetch("/api/ia/ditado", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fala: fala.slice(0, 4000) }) }).catch(() => null);
    const j = (await resp?.json().catch(() => null)) as { resultado?: ResultadoInterpretacao | null } | null;
    setOrganizando(false);
    const d = j?.resultado ? ditadoDaIA(j.resultado, biblioteca) : interpretarDitado(fala, biblioteca);
    // Com IA: só entra o que ela achou na biblioteca; o resto aparece em “não entendi”.
    const achados = d.exercicios.filter((x) => x.escolhido && (!j?.resultado || x.confianca === "alta"));
    adicionar(achados.map((x) => ({ nome: x.escolhido!.nome, biblioteca_id: x.escolhido!.id, series: Math.min(L.maxSeries, x.series ?? L.seriesPadrao), reps: x.reps ?? L.repsPadrao })));
    setNaoEntendi([...d.exercicios.filter((x) => !achados.includes(x)).map((x) => x.falado), ...d.naoEntendido].filter(Boolean));
    voz.setTexto("");
  }
  const mudar = (chave: string, patch: Partial<ItemEscolhido>) => setItens((a) => a.map((i) => (i.chave === chave ? { ...i, ...patch } : i)));

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-xl border border-border p-3">
        <p className="font-semibold">Fale ou digite o seu treino</p>
        <div className="rounded-lg bg-accent/5 px-3 py-2 text-xs text-fg-muted">
          <p className="font-semibold text-fg">Como falar</p>
          <p className="mt-0.5">Diga o nome do exercício, as séries e as repetições, um depois do outro:</p>
          <p className="mt-1 italic text-fg">“Rosca direta 3 de 12, elevação lateral 3 de 15, abdominal infra 3 de 20.”</p>
          <p className="mt-1">Se não falar as séries, o app usa {L.seriesPadrao} de {L.repsPadrao}. Dá para falar “4 séries de 10” ou “3 por 15”. Depois é só conferir a lista e ajustar.</p>
        </div>
        {voz.temMic ? (
          <button type="button" onClick={voz.alternar} aria-pressed={voz.ouvindo} className={`touch flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold ${voz.ouvindo ? "animate-pulse bg-danger text-white" : "bg-accent text-bg"}`}>
            {voz.ouvindo ? "● Ouvindo… toque para parar" : "🎤 Toque e fale o seu treino"}
          </button>
        ) : (
          <p className="text-[11px] text-fg-subtle">Este navegador não tem microfone para ditado: digite abaixo ou use o microfone do teclado.</p>
        )}
        {voz.erroMic ? <p className="text-xs text-warning">{voz.erroMic}</p> : null}
        <textarea value={voz.texto} onChange={(e) => voz.setTexto(e.target.value)} rows={2} placeholder="Ex.: rosca direta 3 de 12, elevação lateral 3 de 15" aria-label="O que você quer treinar" className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
        <button type="button" disabled={!voz.texto.trim() || cheio || organizando} onClick={() => void usarFala()} className="touch w-full rounded-lg border border-accent/60 px-4 py-2 text-sm font-bold text-accent disabled:opacity-50">
          {organizando ? "✨ Organizando…" : "Adicionar à lista"}
        </button>
        {naoEntendi.length ? <p className="text-xs text-warning">Não reconheci: {naoEntendi.join(", ")}. Tente o nome como aparece no seu treino.</p> : null}
      </div>

      {atalhos.length ? (
        <div className="space-y-1.5">
          <p className="font-semibold">Ou toque nos exercícios do seu plano</p>
          <div className="flex flex-wrap gap-1.5">
            {atalhos.map((a) => (
              <button key={a.nome} type="button" disabled={cheio} onClick={() => adicionar([{ nome: a.nome, biblioteca_id: a.biblioteca_id, series: L.seriesPadrao, reps: L.repsPadrao }])} className="touch rounded-full border border-border px-3 py-1.5 text-xs text-fg-muted hover:border-accent/50 disabled:opacity-40">
                + {a.nome}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="font-semibold">Seu extra</p>
          <p className={`text-xs ${total > seriesDisponiveis ? "text-warning" : "text-fg-muted"}`}>{total} de {seriesDisponiveis} séries da semana</p>
        </div>
        {itens.length ? (
          <ol className="space-y-1.5">
            {itens.map((i, n) => (
              <li key={i.chave} className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5">
                <span className="min-w-0 flex-1 truncate text-sm">{n + 1}. {i.nome}</span>
                <button type="button" aria-label={`Menos uma série de ${i.nome}`} disabled={i.series <= 1} onClick={() => mudar(i.chave, { series: i.series - 1 })} className="alvo h-8 w-8 rounded border border-border disabled:opacity-40">−</button>
                <span className="w-5 text-center text-sm tabular-nums" aria-label={`${i.series} ${i.series === 1 ? "série" : "séries"}`}>{i.series}</span>
                <button type="button" aria-label={`Mais uma série de ${i.nome}`} disabled={i.series >= L.maxSeries} onClick={() => mudar(i.chave, { series: i.series + 1 })} className="alvo h-8 w-8 rounded border border-border disabled:opacity-40">+</button>
                <span className="text-xs text-fg-subtle">×</span>
                <input value={i.reps} onChange={(e) => mudar(i.chave, { reps: e.target.value.slice(0, 20) })} aria-label={`Repetições de ${i.nome}`} className="w-16 rounded border border-border bg-bg px-1.5 py-1 text-center text-sm" />
                <button type="button" aria-label={`Tirar ${i.nome}`} onClick={() => setItens((a) => a.filter((x) => x.chave !== i.chave))} className="alvo px-1 text-fg-subtle hover:text-fg">✕</button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="rounded-lg border border-dashed border-border px-3 py-3 text-center text-xs text-fg-subtle">Nenhum exercício ainda. Fale, digite ou toque nos atalhos acima.</p>
        )}
      </div>
    </div>
  );
}
