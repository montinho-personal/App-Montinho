"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { MODALIDADES, RECUPERACAO, type Classificacao, type Recuperacao } from "@/lib/treino/extra";
import type { ExtraAvaliado } from "@/lib/data/extras";
import { BRAND } from "@/config/brand";

type Pedido = { id: string; titulo: string; status: "pendente" | "aprovada" | "recusada"; resposta: string | null; data: string; created_at: string };

const ESTILO: Record<Classificacao["classe"], { rotulo: string; cls: string }> = {
  liberado: { rotulo: "Liberado conforme as regras do programa", cls: "border-success/40 bg-success/10 text-success" },
  aprovacao: { rotulo: "Disponível mediante aprovação do personal", cls: "border-accent/40 bg-accent/10 text-accent" },
  nao_recomendado: { rotulo: "Não recomendado nas condições atuais", cls: "border-warning/40 bg-warning/10 text-warning" },
};
const chave = () => `extra:${new Date().toISOString().slice(0, 10)}:${Math.random().toString(36).slice(2, 10)}`;
const dataBR = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

export function ExtraClient({ pedidos }: { pedidos: Pedido[] }) {
  const router = useRouter();
  const toast = useToast();
  const [recuperacao, setRecuperacao] = useState<Recuperacao | null>(null);
  const [tempo, setTempo] = useState<number | null>(null);
  const [itens, setItens] = useState<ExtraAvaliado[] | null>(null);
  const [registrando, setRegistrando] = useState<string | null>(null);
  const [duracao, setDuracao] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vivo = true;
    fetch("/api/extras/avaliar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recuperacao, tempo_disponivel_min: tempo }) })
      .then((r) => r.json())
      .then((d: { itens?: ExtraAvaliado[] }) => vivo && setItens(d.itens ?? []))
      .catch(() => vivo && setItens([]));
    return () => {
      vivo = false;
    };
  }, [recuperacao, tempo]);

  async function pedir(extraId: string) {
    setEnviando(true);
    const res = await fetch("/api/extras/solicitar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ extra_id: extraId, client_key: chave(), recuperacao, tempo_disponivel_min: tempo }) }).catch(() => null);
    setEnviando(false);
    if (!res?.ok) return toast.error("Não foi possível enviar o pedido agora.");
    toast.success(`Pedido enviado. O ${BRAND.name} vai responder por aqui.`);
    router.refresh();
    setItens(null);
    const r = await fetch("/api/extras/avaliar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recuperacao, tempo_disponivel_min: tempo }) }).then((x) => x.json()).catch(() => ({ itens: [] }));
    setItens(r.itens ?? []);
  }

  // Extra pronto do personal (com exercícios): abre o treino para marcar série por série.
  async function comecar(extraId: string) {
    setEnviando(true);
    const res = await fetch("/api/extras/iniciar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ extra_id: extraId, client_key: chave(), recuperacao }) }).catch(() => null);
    const d = (await res?.json().catch(() => null)) as { id?: string; treinoId?: string; error?: string } | null;
    if (!res?.ok || !d?.id) {
      setEnviando(false);
      return toast.error(d?.error ?? "Não foi possível começar agora.");
    }
    router.push(`/aluno/treino/${d.treinoId}?sessao=${d.id}`);
  }

  async function registrar(extraId: string) {
    const min = Number(duracao);
    if (!min || min < 1) return toast.error("Informe quantos minutos você fez.");
    setEnviando(true);
    const res = await fetch("/api/extras/registrar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ extra_id: extraId, client_key: chave(), duracao_min: min, recuperacao }) }).catch(() => null);
    setEnviando(false);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) return toast.error(d?.error ?? "Não foi possível registrar.");
    toast.success("Treino extra registrado. Hoje teve um chalalá extra!");
    setRegistrando(null);
    setDuracao("");
    router.push("/aluno");
  }

  return (
    <>
      <Card>
        <CardBody className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">
              Como está sua recuperação? <span className="font-normal text-fg-subtle">(opcional, mas ajuda)</span>
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(RECUPERACAO) as Recuperacao[]).map((k) => (
                <button key={k} type="button" aria-pressed={recuperacao === k} onClick={() => setRecuperacao(recuperacao === k ? null : k)} className={`touch rounded-full border px-3 py-1.5 text-xs font-semibold ${recuperacao === k ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>
                  {RECUPERACAO[k]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">
              Quanto tempo você tem? <span className="font-normal text-fg-subtle">(opcional)</span>
            </legend>
            <div className="flex flex-wrap gap-1.5">
              {[20, 30, 45, 60].map((m) => (
                <button key={m} type="button" aria-pressed={tempo === m} onClick={() => setTempo(tempo === m ? null : m)} className={`touch rounded-full border px-3 py-1.5 text-xs font-semibold ${tempo === m ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>
                  {m} min
                </button>
              ))}
            </div>
          </fieldset>
          <p className="text-[11px] text-fg-subtle">Isso não é avaliação de saúde. Dor leve ou moderada: treine com precaução e pare se piorar. Dor forte: converse com o {BRAND.name} antes de treinar.</p>
        </CardBody>
      </Card>

      <section className="space-y-2" aria-live="polite">
        {itens === null ? (
          <p className="text-sm text-fg-muted" role="status">
            Conferindo as regras…
          </p>
        ) : (
          itens.map(({ extra, classificacao, pedidoHoje }) => {
            const est = ESTILO[classificacao.classe];
            const pronto = !!extra.exercicios?.length;
            const atividade = !extra.treino_id && !pronto;
            return (
              <Card key={extra.id}>
                <CardBody className="space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-bold">{extra.titulo}</p>
                    <span className="text-xs text-fg-subtle">
                      {MODALIDADES[extra.modalidade].rotulo} · {extra.duracao_min} min
                    </span>
                  </div>
                  {pronto ? (
                    <ul className="space-y-0.5 text-sm">
                      {extra.exercicios!.map((x) => (
                        <li key={x.nome}>
                          • <strong>{x.nome}</strong> <span className="text-fg-muted">— {x.series} × {x.reps}</span>
                        </li>
                      ))}
                    </ul>
                  ) : extra.descricao ? (
                    <p className="text-sm text-fg-muted">{extra.descricao}</p>
                  ) : null}
                  <div className={`rounded-lg border px-3 py-2 text-xs ${est.cls}`}>
                    <p className="font-semibold">{est.rotulo}</p>
                    {classificacao.motivos.map((m) => (
                      <p key={m} className="text-fg-muted">{m}</p>
                    ))}
                  </div>
                  {classificacao.classe === "liberado" ? (
                    pronto ? (
                      <button type="button" disabled={enviando} onClick={() => void comecar(extra.id)} className="touch w-full rounded-lg bg-accent px-4 py-2.5 font-bold text-bg disabled:opacity-60">
                        Começar treino extra
                      </button>
                    ) : atividade ? (
                      registrando === extra.id ? (
                        <div className="flex flex-wrap items-end gap-2">
                          <label className="space-y-0.5 text-xs">
                            <span className="block text-fg-muted">Quantos minutos você fez?</span>
                            <input inputMode="numeric" value={duracao} onChange={(e) => setDuracao(e.target.value.replace(/\D/g, "").slice(0, 3))} className="h-10 w-24 rounded-md border border-border bg-bg px-2 text-center font-mono" aria-label="Duração em minutos" placeholder={String(extra.duracao_min)} />
                          </label>
                          <button type="button" disabled={enviando} onClick={() => void registrar(extra.id)} className="touch h-10 rounded-lg bg-accent px-4 font-bold text-bg disabled:opacity-60">
                            Registrar
                          </button>
                          <button type="button" onClick={() => setRegistrando(null)} className="h-10 text-xs text-fg-muted">
                            cancelar
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setRegistrando(extra.id)} className="touch w-full rounded-lg bg-accent px-4 py-2.5 font-bold text-bg">
                          Já fiz — registrar
                        </button>
                      )
                    ) : (
                      <Link href={`/aluno/treino/${extra.treino_id}?extra=${extra.id}${recuperacao ? `&rec=${recuperacao}` : ""}${tempo ? `&tempo=${tempo}` : ""}`} className="touch inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 font-bold text-bg">
                        Abrir treino extra
                      </Link>
                    )
                  ) : pedidoHoje?.status === "pendente" ? (
                    <p className="text-xs font-semibold text-fg-muted">Pedido enviado hoje — aguardando o {BRAND.name}.</p>
                  ) : pedidoHoje?.status === "recusada" ? (
                    <p className="text-xs text-fg-muted">
                      O {BRAND.name} preferiu que não hoje{pedidoHoje.resposta ? `: “${pedidoHoje.resposta}”` : "."}
                    </p>
                  ) : (
                    <button type="button" disabled={enviando} onClick={() => void pedir(extra.id)} className="touch w-full rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-fg-muted hover:text-fg disabled:opacity-60">
                      {classificacao.classe === "aprovacao" ? `Pedir liberação ao ${BRAND.name}` : `Perguntar ao ${BRAND.name}`}
                    </button>
                  )}
                </CardBody>
              </Card>
            );
          })
        )}
      </section>

      {pedidos.length ? (
        <section className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-fg-muted">Seus pedidos recentes</h2>
          <ul className="space-y-1.5 text-sm">
            {pedidos.map((p) => (
              <li key={p.id} className="rounded-lg border border-border px-3 py-2">
                <span className="font-semibold">{p.titulo}</span> · {dataBR(p.data)} · {p.status === "pendente" ? "aguardando" : p.status === "aprovada" ? "aprovado" : "não aprovado"}
                {p.resposta ? <span className="block text-xs text-fg-muted">“{p.resposta}” — {BRAND.name}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
