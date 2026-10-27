"use client";

// Aba “💛 Montinho Pulso” da Central: fila de ações do personal com base no que
// os alunos contam no Pulso. Não é diagnóstico nem previsão de desistência:
// cada cartão diz por quê. Nada é enviado sozinho — o WhatsApp abre com o
// rascunho e o contato só fica registrado quando o personal confirma.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { linkWhatsApp } from "@/lib/acesso/mensagem";
import { CATEGORIA_ROTULO } from "@/lib/pulso/classificar";
import { ordenarFila } from "@/lib/pulso/alertas";
import type { PulsoDoAluno } from "@/lib/data/pulso";
import { TendenciaPulso } from "@/components/pulso/TendenciaPulso";

type Filtro = "todos" | "atencao" | "acompanhar" | "reconhecer";
const tipoDe = (p: PulsoDoAluno): Exclude<Filtro, "todos"> | "tudo_bem" => (p.resultado.categoria === "tudo_bem" ? (p.resultado.sugestao?.acao === "reconhecer" ? "reconhecer" : "tudo_bem") : p.resultado.categoria);
const ROTULO: Record<Exclude<Filtro, "todos">, { t: string; e: string; cor: string }> = {
  atencao: { t: CATEGORIA_ROTULO.atencao.rotulo, e: "🔴", cor: "border-danger/50 bg-danger/5" },
  acompanhar: { t: CATEGORIA_ROTULO.acompanhar.rotulo, e: "🟡", cor: "border-warning/50 bg-warning/5" },
  reconhecer: { t: "Reconhecer evolução", e: "💛", cor: "border-accent/50 bg-accent/5" },
};
const dataBR = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }) : null);

function CartaoPulso({ p }: { p: PulsoDoAluno }) {
  const router = useRouter();
  const toast = useToast();
  const sg = p.resultado.sugestao;
  const [texto, setTexto] = useState(sg?.rascunho ?? "");
  const [perguntar, setPerguntar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const tipo = tipoDe(p);
  const r = tipo === "tudo_bem" ? null : ROTULO[tipo];

  async function acao(a: "acompanhado" | "dispensado" | "adiado" | "contato") {
    if (!p.chave) return;
    setSalvando(true);
    const res = await fetch("/api/pulso/alertas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aluno_id: p.alunoId, chave: p.chave, acao: a, dias: 3 }) }).catch(() => null);
    setSalvando(false);
    if (!res?.ok) return toast.error("Não foi possível salvar agora.");
    toast.success(a === "contato" ? "Contato registrado na linha do tempo." : a === "adiado" ? "Volta para a fila em 3 dias." : a === "dispensado" ? "Alerta dispensado. Volta só com resposta nova." : "Marcado como acompanhado.");
    router.refresh();
  }

  return (
    <article className={`space-y-3 rounded-xl border p-3 ${r?.cor ?? "border-border"}`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href={`/treinador/alunos/${p.alunoId}`} className="font-bold hover:underline">{p.nome}</Link>
          <p className="text-[11px] text-fg-muted">
            {p.resultado.ultimaResposta ? `Último check-in: ${dataBR(p.resultado.ultimaResposta)}` : "Sem check-in recente"}
            {p.diasSemTreino != null && p.diasSemTreino >= 4 ? ` · ${p.diasSemTreino} dias sem treinar` : ""}
          </p>
        </div>
        {r ? <span className="rounded-full border border-border bg-bg px-2 py-0.5 text-[11px] font-semibold">{r.e} {r.t}</span> : null}
      </header>
      {sg ? <p className="text-sm font-semibold">{sg.titulo}</p> : null}
      {p.resultado.motivos.length ? (
        <ul className="space-y-0.5 text-xs text-fg-muted">
          {p.resultado.motivos.map((m) => <li key={m.texto}>• {m.texto}</li>)}
        </ul>
      ) : null}
      {p.dificuldades.length ? (
        <div className="flex flex-wrap gap-1">
          {p.dificuldades.map((d) => <span key={d.valor} className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-fg-muted">{d.rotulo} ×{d.vezes}</span>)}
        </div>
      ) : null}
      <TendenciaPulso semanas={p.semanas} />
      {sg ? (
        <div className="space-y-2">
          <label className="block text-[11px] text-fg-muted" htmlFor={`pm-${p.alunoId}`}>Rascunho para você editar (nada é enviado sozinho; não cita saúde)</label>
          <textarea id={`pm-${p.alunoId}`} rows={3} value={texto} onChange={(e) => setTexto(e.target.value.slice(0, 600))} className="w-full rounded-md border border-border bg-card p-2 text-sm" />
          {perguntar ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-bg p-2 text-xs" aria-live="polite">
              <span className="font-semibold">Você enviou a mensagem?</span>
              <button type="button" disabled={salvando} onClick={() => void acao("contato")} className="alvo rounded-md bg-accent px-3 py-1.5 font-bold text-bg">Sim, enviei</button>
              <button type="button" onClick={() => setPerguntar(false)} className="alvo rounded-md border border-border px-3 py-1.5">Ainda não</button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2 text-xs">
        {sg ? (
          <a href={linkWhatsApp(p.telefone, texto)} target="_blank" rel="noopener noreferrer" onClick={() => setPerguntar(true)} className="alvo inline-flex items-center gap-1 rounded-md bg-[#25D366] px-3 py-1.5 font-bold text-black">
            💬 WhatsApp
          </a>
        ) : null}
        <button type="button" disabled={salvando} onClick={() => void acao("acompanhado")} className="alvo rounded-md border border-border px-3 py-1.5 font-semibold">✅ Acompanhado</button>
        <button type="button" disabled={salvando} onClick={() => void acao("adiado")} className="alvo rounded-md border border-border px-3 py-1.5">⏰ Adiar 3 dias</button>
        <button type="button" disabled={salvando} onClick={() => void acao("dispensado")} className="alvo rounded-md border border-border px-3 py-1.5 text-fg-muted">✖️ Dispensar</button>
        <Link href={`/treinador/alunos/${p.alunoId}#checkins`} className="alvo px-1 py-1.5 text-accent underline-offset-2 hover:underline">Histórico</Link>
        {sg?.acao === "revisar_treino" || sg?.acao === "revisao_humana" ? (
          <Link href={`/treinador/alunos/${p.alunoId}#treinos`} className="alvo px-1 py-1.5 text-accent underline-offset-2 hover:underline">Revisar treino</Link>
        ) : null}
      </div>
      {!p.telefone && sg ? <p className="text-[11px] text-fg-subtle">Sem WhatsApp cadastrado: o WhatsApp abre para você escolher o contato.</p> : null}
    </article>
  );
}

export function CentralPulsoClient({ itens }: { itens: PulsoDoAluno[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const abertos = useMemo(() => itens.filter((p) => p.chave && p.situacao === "aberto"), [itens]);
  const conta = (t: Exclude<Filtro, "todos">) => abertos.filter((p) => tipoDe(p) === t).length;
  const fila = ordenarFila(abertos.filter((p) => filtro === "todos" || tipoDe(p) === filtro));
  const adiados = itens.filter((p) => p.chave && p.situacao === "adiado");
  const resolvidos = itens.filter((p) => p.chave && p.situacao === "resolvido");
  const tudoBem = itens.filter((p) => !p.chave);
  const semResposta = itens.filter((p) => p.resultado.semRespostas).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted">
        O que os alunos contam no Pulso antes do treino. <strong>Não é diagnóstico nem previsão de desistência</strong>: cada cartão mostra por que apareceu. Não responder não significa desmotivação e nunca gera alerta.
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar a fila">
        {([["todos", `Todos (${abertos.length})`], ["atencao", `🔴 ${conta("atencao")}`], ["acompanhar", `🟡 ${conta("acompanhar")}`], ["reconhecer", `💛 ${conta("reconhecer")}`]] as Array<[Filtro, string]>).map(([v, l]) => (
          <button key={v} type="button" aria-pressed={filtro === v} onClick={() => setFiltro(v)} className={`touch rounded-full border px-3 py-1.5 text-xs font-semibold ${filtro === v ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>{l}</button>
        ))}
        <span className="self-center text-xs text-fg-subtle">🟢 {tudoBem.length} tudo bem · {semResposta} sem respostas recentes</span>
      </div>

      {fila.length ? (
        <div className="space-y-3">{fila.map((p) => <CartaoPulso key={p.alunoId} p={p} />)}</div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-fg-muted">Nada na fila agora. 💛 Quando algum aluno contar uma dificuldade no Pulso, aparece aqui.</div>
      )}

      {adiados.length ? (
        <details className="rounded-xl border border-border p-3 text-sm">
          <summary className="cursor-pointer font-semibold">⏰ Adiados ({adiados.length})</summary>
          <ul className="mt-2 space-y-1 text-xs text-fg-muted">
            {adiados.map((p) => <li key={p.alunoId}>{p.nome} — volta em {p.estado?.adiado_ate ? `${p.estado.adiado_ate.slice(8, 10)}/${p.estado.adiado_ate.slice(5, 7)}` : "breve"}</li>)}
          </ul>
        </details>
      ) : null}
      {resolvidos.length ? (
        <details className="rounded-xl border border-border p-3 text-sm">
          <summary className="cursor-pointer font-semibold">✅ Acompanhados e dispensados ({resolvidos.length})</summary>
          <ul className="mt-2 space-y-1 text-xs text-fg-muted">
            {resolvidos.map((p) => <li key={p.alunoId}>{p.nome} — {p.estado?.estado === "dispensado" ? "dispensado" : "acompanhado"}. Volta só se houver resposta nova.</li>)}
          </ul>
        </details>
      ) : null}
      {tudoBem.length ? (
        <details className="rounded-xl border border-border p-3 text-sm">
          <summary className="cursor-pointer font-semibold">🟢 Tudo bem ({tudoBem.length})</summary>
          <ul className="mt-2 grid gap-1 text-xs text-fg-muted sm:grid-cols-2">
            {tudoBem.map((p) => (
              <li key={p.alunoId}>
                <Link href={`/treinador/alunos/${p.alunoId}#checkins`} className="hover:underline">{p.nome}</Link>
                {" — "}
                {p.resultado.ultimaResposta ? `último check-in ${dataBR(p.resultado.ultimaResposta)}` : "sem respostas recentes"}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
