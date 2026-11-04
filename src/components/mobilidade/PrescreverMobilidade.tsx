"use client";

// Personal: mobilidade no protocolo do aluno (pedido do Montinho, 29/10/2026).
// A anamnese já sugere; aqui ele confirma, troca os protocolos, escolhe os dias
// por semana (de CADA protocolo, 0145), escreve o motivo e a observação ou
// desliga. Avisar no WhatsApp com a mensagem pronta.
// 04/11/2026 (pedido do Montinho: “a informação fica vaga”): o cartão mostra
// sempre o que ESTÁ gravado (protocolos com os dias, motivo, observação e a
// semana de cada um) e, ao salvar, confirma exatamente o que o banco guardou.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { linkWhatsApp } from "@/lib/acesso/mensagem";
import { mensagemMobilidade } from "@/lib/mobilidade/enviar";
import { resumoProtocolos } from "@/lib/mobilidade/indicacao";
import { PROTOCOLOS, SLUGS_MOBILIDADE, type SlugMobilidade } from "@/lib/mobilidade/protocolos";

export type EstadoPrescricao = {
  protocolos: SlugMobilidade[];
  diasSemana: number;
  motivo: string;
  observacao?: string;
  ativo: boolean;
  origem: "personal" | "anamnese" | null;
  regioesAnamnese: string[];
  diasFeitos: number | null;
  feitaHoje: boolean;
  porProtocolo?: Partial<Record<SlugMobilidade, number>>;
};

type Salvo = { protocolos: SlugMobilidade[]; dias_semana: number; motivo: string | null; observacao: string | null; ativo: boolean };

const DIAS = [1, 2, 3, 4, 5, 7];
const nome = (p: SlugMobilidade) => `${PROTOCOLOS[p].emoji} ${PROTOCOLOS[p].nome.replace("Mobilidade de ", "")}`;
const diasTxt = (d: number) => (d >= 7 ? "todo dia" : `${d}× por semana`);

export function PrescreverMobilidade({ alunoId, nome: nomeAluno, telefone, e, abertoInicial = false }: { alunoId: string; nome: string; telefone: string | null; e: EstadoPrescricao; abertoInicial?: boolean }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(abertoInicial);
  const [protocolos, setProtocolos] = useState<SlugMobilidade[]>(e.protocolos);
  const [dias, setDias] = useState(e.diasSemana);
  const [motivo, setMotivo] = useState(e.motivo);
  const [observacao, setObservacao] = useState(e.observacao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [salvo, setSalvo] = useState<Salvo | null>(null);

  async function salvar(ativo: boolean) {
    setSalvando(true);
    setMsg(null);
    setSalvo(null);
    const r = await fetch(`/api/alunos/${alunoId}/mobilidade`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ protocolos: ativo ? protocolos : [], dias_semana: dias, motivo: motivo.trim() || null, observacao: observacao.trim() || null, ativo }) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string; salvo?: Salvo };
    setSalvando(false);
    if (!r?.ok) return setMsg(j.error ?? "Não deu para salvar agora.");
    if (j.salvo) setSalvo(j.salvo);
    setMsg(ativo ? null : "Mobilidade desligada para este aluno.");
    router.refresh();
  }

  const avisar = () => {
    const p = protocolos[0] ?? "superiores";
    window.open(linkWhatsApp(telefone, mensagemMobilidade(nomeAluno, p, window.location.origin)), "_blank", "noopener,noreferrer");
  };

  const status = !e.ativo && e.origem === "personal" ? "Desligada" : e.origem === "personal" ? "No protocolo" : e.origem === "anamnese" ? "Sugerida pela anamnese" : "Sem mobilidade";
  const ativoAgora = e.ativo && e.protocolos.length > 0;
  const mudou = protocolos.slice().sort().join() !== e.protocolos.slice().sort().join() || dias !== e.diasSemana || motivo.trim() !== e.motivo.trim() || observacao.trim() !== (e.observacao ?? "").trim();
  const fora = SLUGS_MOBILIDADE.filter((s) => !protocolos.includes(s));

  return (
    <section aria-label="Mobilidade no protocolo" className="space-y-3 rounded-2xl border border-accent/40 bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-black">🧘 Mobilidade no protocolo</p>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${e.origem === "anamnese" ? "bg-accent/20 text-accent" : e.origem === "personal" && e.ativo ? "bg-success/20 text-success" : "bg-bg text-fg-subtle"}`}>{status}</span>
        </div>
        <button type="button" onClick={() => setAberto((x) => !x)} className="shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold">{aberto ? "Fechar" : e.origem === "anamnese" ? "Confirmar" : "Ajustar"}</button>
      </div>

      {/* O que está valendo agora, sem abrir nada. */}
      {ativoAgora ? (
        <div className="space-y-1.5 rounded-xl border border-border bg-bg/50 p-3 text-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">{e.origem === "personal" ? "Está no protocolo" : "A anamnese sugere"}</p>
          <ul className="space-y-1">
            {e.protocolos.map((p) => {
              const feitos = e.porProtocolo?.[p];
              return (
                <li key={p} className="flex items-center justify-between gap-2">
                  <span className="font-bold">{nome(p)} · {diasTxt(e.diasSemana)}</span>
                  {feitos != null ? <span className={`shrink-0 text-xs ${feitos >= e.diasSemana ? "text-success font-semibold" : "text-fg-muted"}`}>{feitos} de {e.diasSemana >= 7 ? 7 : e.diasSemana} nesta semana</span> : null}
                </li>
              );
            })}
          </ul>
          {e.motivo ? <p className="text-xs"><span className="font-semibold">Motivo:</span> {e.motivo}</p> : null}
          {e.observacao ? <p className="text-xs"><span className="font-semibold">Observação:</span> {e.observacao}</p> : null}
          {e.feitaHoje ? <p className="text-xs text-success">✅ Fez mobilidade hoje.</p> : null}
        </div>
      ) : null}
      {e.regioesAnamnese.length ? <p className="text-xs">📋 Anamnese: <span className="font-semibold">{e.regioesAnamnese.join(", ")}</span></p> : null}

      {aberto ? (
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-semibold">Quais protocolos? <span className="font-normal text-fg-muted">(pode marcar os dois)</span></p>
            <div className="grid grid-cols-2 gap-2">
              {SLUGS_MOBILIDADE.map((s) => {
                const on = protocolos.includes(s);
                return (
                  <button key={s} type="button" aria-pressed={on} onClick={() => setProtocolos((xs) => (on ? xs.filter((x) => x !== s) : [...xs, s]))} className={`rounded-xl border px-3 py-2 text-sm font-bold ${on ? "border-accent bg-accent text-bg" : "border-border bg-bg"}`}>
                    {on ? "✓ " : ""}{nome(s)}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold">Quantos dias por semana? <span className="font-normal text-fg-muted">({protocolos.length > 1 ? "vale para CADA protocolo" : "dias desse protocolo"})</span></p>
            <div className="flex flex-wrap gap-2">
              {DIAS.map((d) => (
                <button key={d} type="button" aria-pressed={dias === d} onClick={() => setDias(d)} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${dias === d ? "border-accent bg-accent text-bg" : "border-border"}`}>{d === 7 ? "Todo dia" : `${d}×`}</button>
              ))}
            </div>
          </div>
          <label className="block text-xs font-semibold">
            Motivo (o aluno vê)
            <input value={motivo} onChange={(ev) => setMotivo(ev.target.value)} maxLength={200} placeholder="Ex.: dores na lombar e melhorar a postura" className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-base font-normal" />
          </label>
          <label className="block text-xs font-semibold">
            Observação (o aluno vê)
            <textarea value={observacao} onChange={(ev) => setObservacao(ev.target.value)} maxLength={500} rows={2} placeholder="Ex.: pode fazer a hora que quiser; nos dias de perna, antes do treino" className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-base font-normal" />
          </label>

          {protocolos.length ? (
            <p className="rounded-xl border border-accent/40 bg-accent/5 px-3 py-2 text-xs">
              Vai ficar no protocolo: <span className="font-bold">{resumoProtocolos(protocolos, dias)}</span>
              {fora.length ? <span className="block text-fg-muted">Fora: {fora.map(nome).join(", ")}</span> : null}
            </p>
          ) : <p className="text-xs text-warning">Marque pelo menos um protocolo.</p>}

          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={salvando || !protocolos.length || (ativoAgora && e.origem === "personal" && !mudou)} onClick={() => void salvar(true)} className="touch rounded-xl bg-accent px-4 py-3 font-black text-bg disabled:opacity-50">{salvando ? "Salvando…" : ativoAgora && e.origem === "personal" && !mudou ? "✓ Já está assim no protocolo" : "✅ Salvar no protocolo"}</button>
            <button type="button" onClick={avisar} disabled={!protocolos.length} className="touch rounded-xl border border-accent/60 px-4 py-3 font-bold text-accent disabled:opacity-50">💬 Avisar no WhatsApp</button>
          </div>
          {e.origem !== null && e.ativo ? <button type="button" disabled={salvando} onClick={() => void salvar(false)} className="text-xs text-fg-muted underline">Desligar a mobilidade para este aluno</button> : null}
        </div>
      ) : null}

      {salvo && salvo.ativo ? (
        <div role="status" className="space-y-1 rounded-xl border border-success/50 bg-success/10 px-3 py-2 text-sm">
          <p className="font-bold text-success">✅ Salvo no protocolo de {nomeAluno.split(" ")[0] || "o aluno"}:</p>
          <ul className="list-disc pl-5">{salvo.protocolos.map((p) => <li key={p}>{nome(p)} · {diasTxt(salvo.dias_semana)}</li>)}</ul>
          {salvo.motivo ? <p className="text-xs"><span className="font-semibold">Motivo:</span> {salvo.motivo}</p> : null}
          {salvo.observacao ? <p className="text-xs"><span className="font-semibold">Observação:</span> {salvo.observacao}</p> : null}
          <p className="text-xs text-fg-muted">O aluno vê no Início e recebe o lembrete no celular até completar os dias de cada um.</p>
        </div>
      ) : null}
      {msg ? <p role="status" className="text-sm font-semibold">{msg}</p> : null}
    </section>
  );
}
