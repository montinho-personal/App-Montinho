"use client";

// Personal: mobilidade no protocolo do aluno (pedido do Montinho, 29/10/2026).
// A anamnese já sugere; aqui ele confirma, troca os protocolos, escolhe os dias
// por semana, escreve o motivo ou desliga. Avisar no WhatsApp com a mensagem pronta.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { linkWhatsApp } from "@/lib/acesso/mensagem";
import { mensagemMobilidade } from "@/lib/mobilidade/enviar";
import { PROTOCOLOS, SLUGS_MOBILIDADE, type SlugMobilidade } from "@/lib/mobilidade/protocolos";

export type EstadoPrescricao = { protocolos: SlugMobilidade[]; diasSemana: number; motivo: string; ativo: boolean; origem: "personal" | "anamnese" | null; regioesAnamnese: string[]; diasFeitos: number | null; feitaHoje: boolean };

const DIAS = [2, 3, 4, 5, 7];

export function PrescreverMobilidade({ alunoId, nome, telefone, e, abertoInicial = false }: { alunoId: string; nome: string; telefone: string | null; e: EstadoPrescricao; abertoInicial?: boolean }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(abertoInicial);
  const [protocolos, setProtocolos] = useState<SlugMobilidade[]>(e.protocolos);
  const [dias, setDias] = useState(e.diasSemana);
  const [motivo, setMotivo] = useState(e.motivo);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function salvar(ativo: boolean) {
    setSalvando(true);
    setMsg(null);
    const r = await fetch(`/api/alunos/${alunoId}/mobilidade`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ protocolos: ativo ? protocolos : [], dias_semana: dias, motivo: motivo.trim() || null, ativo }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setSalvando(false);
    if (!r?.ok) return setMsg(j.error ?? "Não deu para salvar agora.");
    setMsg(ativo ? "✅ Mobilidade no protocolo. O aluno vê no Início todo dia e recebe o lembrete no celular." : "Mobilidade desligada para este aluno.");
    router.refresh();
  }

  const avisar = () => {
    const p = protocolos[0] ?? "superiores";
    window.open(linkWhatsApp(telefone, mensagemMobilidade(nome, p, window.location.origin)), "_blank", "noopener,noreferrer");
  };

  const status = !e.ativo && e.origem === "personal" ? "Desligada" : e.origem === "personal" ? "No protocolo" : e.origem === "anamnese" ? "Sugerida pela anamnese" : "Sem mobilidade";

  return (
    <section aria-label="Mobilidade no protocolo" className="space-y-3 rounded-2xl border border-accent/40 bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-black">🧘 Mobilidade no protocolo</p>
          <p className="text-xs text-fg-muted">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${e.origem === "anamnese" ? "bg-accent/20 text-accent" : e.origem === "personal" && e.ativo ? "bg-success/20 text-success" : "bg-bg text-fg-subtle"}`}>{status}</span>
            {e.protocolos.length && e.ativo ? ` ${e.protocolos.map((p) => PROTOCOLOS[p].nome.replace("Mobilidade de ", "")).join(" + ")} · ${e.diasSemana >= 7 ? "todo dia" : `${e.diasSemana}×/semana`}` : ""}
            {e.diasFeitos != null && e.ativo ? ` · ${e.diasFeitos} nesta semana${e.feitaHoje ? " (fez hoje)" : ""}` : ""}
          </p>
          {e.regioesAnamnese.length ? <p className="mt-1 text-xs">📋 Anamnese: <span className="font-semibold">{e.regioesAnamnese.join(", ")}</span></p> : null}
        </div>
        <button type="button" onClick={() => setAberto((x) => !x)} className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold">{aberto ? "Fechar" : e.origem === "anamnese" ? "Confirmar" : "Ajustar"}</button>
      </div>
      {aberto ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {SLUGS_MOBILIDADE.map((s) => {
              const on = protocolos.includes(s);
              return (
                <button key={s} type="button" aria-pressed={on} onClick={() => setProtocolos((xs) => (on ? xs.filter((x) => x !== s) : [...xs, s]))} className={`rounded-xl border px-3 py-2 text-sm font-bold ${on ? "border-accent bg-accent text-bg" : "border-border bg-bg"}`}>
                  {PROTOCOLOS[s].emoji} {PROTOCOLOS[s].nome.replace("Mobilidade de ", "")}
                </button>
              );
            })}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold">Quantos dias por semana?</p>
            <div className="flex flex-wrap gap-2">
              {DIAS.map((d) => (
                <button key={d} type="button" aria-pressed={dias === d} onClick={() => setDias(d)} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${dias === d ? "border-accent bg-accent text-bg" : "border-border"}`}>{d === 7 ? "Todo dia" : `${d}×`}</button>
              ))}
            </div>
          </div>
          <label className="block text-xs font-semibold">
            Motivo (o aluno vê)
            <input value={motivo} onChange={(ev) => setMotivo(ev.target.value)} maxLength={200} placeholder="Ex.: soltar o ombro antes do supino" className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-base font-normal" />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={salvando || !protocolos.length} onClick={() => void salvar(true)} className="touch rounded-xl bg-accent px-4 py-3 font-black text-bg disabled:opacity-50">{salvando ? "Salvando…" : "✅ Colocar no protocolo"}</button>
            <button type="button" onClick={avisar} disabled={!protocolos.length} className="touch rounded-xl border border-accent/60 px-4 py-3 font-bold text-accent disabled:opacity-50">💬 Avisar no WhatsApp</button>
          </div>
          {e.origem !== null && e.ativo ? <button type="button" disabled={salvando} onClick={() => void salvar(false)} className="text-xs text-fg-muted underline">Desligar a mobilidade para este aluno</button> : null}
        </div>
      ) : null}
      {msg ? <p role="status" className="text-sm font-semibold">{msg}</p> : null}
    </section>
  );
}
