"use client";

// Escolher o PDF do Montinho Strategy → o app lê e mostra o que encontrou
// (para conferir) antes de salvar. Usado no “Novo aluno” e no perfil.
import { useRef, useState } from "react";
import { telefoneDoWhatsapp, type CadastroStrategy, type EstrategiaImportada } from "@/lib/estrategia/ler";
import { dataBR } from "@/lib/format";

function volumeTexto(e: EstrategiaImportada): string {
  if (!e.volume.length) return e.volumeTotal ? `${e.volumeTotal} séries/semana` : "—";
  const min = e.volume.reduce((a, v) => a + v.series, 0);
  const max = e.volume.reduce((a, v) => a + Math.max(v.series, v.max ?? v.series), 0);
  return `${max > min ? `${min}–${max}` : min} séries/semana`;
}

export type Lida = { estrategia: EstrategiaImportada; dias: Array<{ letra: string; nome: string; foco: string }>; naoReconhecidos?: string[]; arquivo_nome: string; cadastro?: CadastroStrategy | null };

export function ImportarEstrategia({ onLida, lida }: { onLida: (l: Lida | null) => void; lida: Lida | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /** Texto copiado no Strategy (“Copiar para o app Montinho”): vira o mesmo arquivo. */
  async function colar() {
    setErro(null);
    let texto = "";
    try {
      texto = await navigator.clipboard.readText();
    } catch {
      texto = window.prompt("Cole aqui o que você copiou no Montinho Strategy:") ?? "";
    }
    if (!texto.trim()) {
      setErro("Nada copiado. No Montinho Strategy, toque em “Copiar para o app Montinho” e volte aqui.");
      return;
    }
    await escolher(new File([texto], "estrategia.montinho.json", { type: "application/json" }));
  }

  async function escolher(f: File | undefined) {
    if (!f) return;
    setErro(null);
    setLendo(true);
    const fd = new FormData();
    fd.append("arquivo", f);
    const res = await fetch("/api/estrategia/ler", { method: "POST", body: fd }).catch(() => null);
    setLendo(false);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) {
      setErro(d?.error ?? "Não foi possível ler o relatório.");
      onLida(null);
      return;
    }
    onLida(d as Lida);
  }

  const e = lida?.estrategia;
  return (
    <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
      <input ref={input} type="file" className="sr-only" id="estrategia-pdf" onChange={(ev) => void escolher(ev.target.files?.[0])} />
      {!e ? (
        <>
          <p className="text-sm font-semibold">Estratégia do Montinho Strategy</p>
          <p className="text-xs text-fg-muted">No Strategy, toque em “Copiar para o app Montinho” e depois em “Colar do Strategy” aqui. Também dá para escolher o arquivo baixado ou o PDF do relatório. O app monta os dias da semana por músculo, as metas de séries, as fases e o acompanhamento.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={lendo} onClick={() => void colar()} className="touch inline-flex items-center justify-center rounded-lg bg-gold px-4 text-sm font-bold text-bg hover:brightness-110 disabled:opacity-60">
              {lendo ? "Lendo…" : "Colar do Strategy"}
            </button>
            <label htmlFor="estrategia-pdf" className="touch inline-flex cursor-pointer items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold hover:bg-card">
              Escolher arquivo
            </label>
          </div>
        </>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-success">Relatório lido</p>
              <p className="font-bold">{e.titulo ?? "Estratégia"}{e.aluno ? <span className="font-normal text-fg-muted"> · {e.aluno}</span> : null}</p>
            </div>
            <button type="button" onClick={() => { onLida(null); if (input.current) input.current.value = ""; }} className="alvo text-xs text-fg-muted underline">trocar</button>
          </div>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs [overflow-wrap:anywhere]">
            <dt className="text-fg-subtle">Objetivo</dt><dd>{e.objetivo ?? "—"}</dd>
            <dt className="text-fg-subtle">Experiência</dt><dd>{e.experiencia ?? "—"}</dd>
            <dt className="text-fg-subtle">Disponibilidade</dt><dd>{e.diasPorSemana ? `${e.diasPorSemana} dias/semana` : "—"}{e.minutosPorTreino ? ` · ${e.minutosPorTreino} min` : ""}</dd>
            <dt className="text-fg-subtle">Divisão</dt><dd>{e.divisao ?? "—"}</dd>
            <dt className="text-fg-subtle">Intensidade</dt><dd>{e.intensidade ?? "—"}</dd>
            <dt className="text-fg-subtle">Volume</dt><dd>{volumeTexto(e)}</dd>
            <dt className="text-fg-subtle">Fases</dt><dd>{e.fases.length ? e.fases.map((f) => f.nome).join(" → ") : "—"}</dd>
          </dl>
          {lida.cadastro ? (
            <div className="rounded-md bg-card px-2 py-1.5 text-xs">
              <p className="font-semibold">Cadastro do aluno (vai para os dados dele)</p>
              <p className="text-fg-muted [overflow-wrap:anywhere]">
                {[
                  lida.cadastro.dataNascimento ? `Nascimento ${dataBR(lida.cadastro.dataNascimento)}` : lida.cadastro.idade ? `${lida.cadastro.idade} anos` : null,
                  lida.cadastro.sexo === "M" ? "Masculino" : lida.cadastro.sexo === "F" ? "Feminino" : null,
                  lida.cadastro.whatsapp ? `WhatsApp ${telefoneDoWhatsapp(lida.cadastro.whatsapp)}` : null,
                  lida.cadastro.email,
                ].filter(Boolean).join(" · ")}
              </p>
            </div>
          ) : null}
          {lida.naoReconhecidos?.length ? (
            <p className="text-xs text-warning">Grupo(s) sem correspondência no app, fora das metas: {lida.naoReconhecidos.join(", ")}. Ajuste o nome no Strategy (ex.: “Posterior de coxa”) ou monte no montador.</p>
          ) : null}
          {lida.dias.length ? (
            <div>
              <p className="text-xs font-semibold">Dias da semana por músculo (séries/semana)</p>
              <ul className="mt-1 space-y-1 text-xs">
                {lida.dias.map((d) => (
                  <li key={d.letra} className="rounded-md bg-card px-2 py-1">
                    <span className="font-bold">{d.letra} · {d.nome}</span>
                    <span className="block text-fg-muted">{d.foco}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-warning">Divisão sem modelo automático: os dias serão montados por você no montador. O restante da estratégia é salvo.</p>
          )}
        </div>
      )}
      {erro ? <p className="text-xs text-red" role="alert">{erro}</p> : null}
    </div>
  );
}

/** Salva a estratégia lida no aluno (cria o plano inicial se ele ainda não tiver treino). */
export async function salvarEstrategiaNoAluno(alunoId: string, lida: Lida): Promise<{ ok: boolean; planoCriado?: boolean; motivoSemPlano?: string | null; cadastroAtualizado?: string[]; error?: string }> {
  const res = await fetch(`/api/alunos/${alunoId}/estrategia`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estrategia: lida.estrategia, cadastro: lida.cadastro ?? null, arquivo_nome: lida.arquivo_nome, criar_plano: true }) }).catch(() => null);
  const d = await res?.json().catch(() => ({}));
  if (!res?.ok) return { ok: false, error: d?.error ?? "Não foi possível salvar a estratégia." };
  return { ok: true, planoCriado: d.planoCriado, motivoSemPlano: d.motivoSemPlano, cadastroAtualizado: d.cadastroAtualizado };
}
