"use client";

// Painel editorial: lista com status e uso, editor completo (nova versão a
// cada gravação), histórico de versões, recomendação a aluno e analytics.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { CATEGORIAS, CONTEXTOS, type ConteudoConhecimento, type StatusEditorial } from "@/lib/desbloqueia/tipos";
import { CHAMADA_CONTEXTO, problemasEditoriais } from "@/lib/desbloqueia/motor";
import type { AnalyticsDesbloqueia } from "@/lib/desbloqueia/analytics";

type Opcao = { id: string; nome: string };
const STATUS: Record<StatusEditorial, { rotulo: string; classe: string }> = {
  rascunho: { rotulo: "Rascunho", classe: "border-border text-fg-muted" },
  em_revisao: { rotulo: "Em revisão", classe: "border-warning/60 text-warning" },
  publicado: { rotulo: "Publicado", classe: "border-success/60 text-success" },
  arquivado: { rotulo: "Arquivado", classe: "border-border text-fg-subtle" },
};
const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

function novoId(): string {
  const a = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "p-";
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

function rascunhoNovo(numero: number): ConteudoConhecimento {
  return {
    id: novoId(), numero, categoria: "musculacao", titulo: "", pergunta: "", tipo: "mito_verdade",
    alternativas: [{ id: "mito", texto: "Mito" }, { id: "verdade", texto: "Verdade" }], correta: "mito", veredito: "MITO",
    rapida: "", pratica: "", detalhada: "", exemplo: "", fatores: [], ciencia: "", limitacoes: "", quandoMuda: "",
    fontes: [], gatilhos: { conquistas: [], contexto: [] }, status: "rascunho", versao: 0, personalizado: true,
  };
}

export function ConhecimentoClient({ conteudos, problemas, fontes, medalhas, alunos, analytics }: { conteudos: ConteudoConhecimento[]; problemas: Record<string, string[]>; fontes: Array<{ id: string; citacao: string }>; medalhas: Opcao[]; alunos: Opcao[]; analytics: AnalyticsDesbloqueia }) {
  const [filtroStatus, setFiltroStatus] = useState<StatusEditorial | "todos">("todos");
  const [filtroCat, setFiltroCat] = useState<string>("todas");
  const [editando, setEditando] = useState<ConteudoConhecimento | null>(null);
  const lista = useMemo(() => conteudos.filter((c) => (filtroStatus === "todos" || c.status === filtroStatus) && (filtroCat === "todas" || c.categoria === filtroCat)), [conteudos, filtroStatus, filtroCat]);
  const titulo = (id: string) => conteudos.find((c) => c.id === id)?.titulo ?? id;

  if (editando) return <Editor inicial={editando} fontes={fontes} medalhas={medalhas} alunos={alunos} onFechar={() => setEditando(null)} />;

  const a = analytics;
  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-xl border border-border bg-card p-4" aria-label="Uso pelos alunos">
        <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Uso pelos alunos (90 dias de eventos)</p>
        <dl className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          {[
            ["Alunos com ≥ 1 descoberta", `${a.alunosComDescoberta} de ${a.alunosAtivos}`],
            ["Média explorada por aluno", a.mediaPorAluno != null ? String(a.mediaPorAluno).replace(".", ",") : "—"],
            ["Sugestões abertas", a.taxaAberturaPct != null ? `${a.taxaAberturaPct}% (${a.sugestoesAbertas}/${a.sugestoesVistas})` : "—"],
            ["Cards compartilhados", String(a.compartilhamentos)],
          ].map(([r, v]) => (
            <div key={r} className="rounded-lg bg-surface px-2 py-2">
              <dd className="font-mono text-base font-bold">{v}</dd>
              <dt className="text-[10px] leading-tight text-fg-subtle">{r}</dt>
            </div>
          ))}
        </dl>
        {a.maisExplorados.length ? <p className="text-sm"><span className="font-semibold">Mais exploradas:</span> {a.maisExplorados.map(titulo).join(" · ")}</p> : null}
        {a.maisErros.length ? <p className="text-sm"><span className="font-semibold">Onde os alunos mais erram (vale reforçar na conversa):</span> {a.maisErros.map((id) => `${titulo(id)} (${a.porConteudo[id].acertoPct}% de acerto)`).join(" · ")}</p> : null}
        {a.aderencia.nEngajados && a.aderencia.nDemais ? (
          <p className="text-xs text-fg-muted">
            Aderência média (4 sem): quem explorou 3+ descobertas <strong>{a.aderencia.engajados}%</strong> (n={a.aderencia.nEngajados}) · demais <strong>{a.aderencia.demais}%</strong> (n={a.aderencia.nDemais}). <em>Isto é só uma correlação — não mostra que as descobertas causam mais aderência.</em>
          </p>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as StatusEditorial | "todos")} aria-label="Filtrar por status" className="h-10 rounded-lg border border-border bg-card px-3 text-sm">
          <option value="todos">Todos os status</option>
          {(Object.keys(STATUS) as StatusEditorial[]).map((s) => <option key={s} value={s}>{STATUS[s].rotulo}</option>)}
        </select>
        <select value={filtroCat} onChange={(e) => setFiltroCat(e.target.value)} aria-label="Filtrar por categoria" className="h-10 rounded-lg border border-border bg-card px-3 text-sm">
          <option value="todas">Todas as categorias</option>
          {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
        </select>
        <Button size="sm" variant="gold" className="ml-auto" onClick={() => setEditando(rascunhoNovo(Math.max(30, ...conteudos.map((c) => c.numero)) + 1))}>+ Novo conteúdo</Button>
      </div>

      <ul className="space-y-2">
        {lista.map((c) => {
          const u = a.porConteudo[c.id];
          const p = problemas[c.id] ?? [];
          return (
            <li key={c.id}>
              <button type="button" onClick={() => setEditando(c)} className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3 text-left hover:border-accent/40">
                <span className="mt-0.5 font-mono text-xs" style={{ color: CATEGORIAS.find((k) => k.id === c.categoria)?.cor }}>#{String(c.numero).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-tight">{c.titulo}</span>
                  <span className="block text-xs text-fg-muted">{c.pergunta}</span>
                  <span className="mt-1 block text-[11px] text-fg-subtle">
                    v{c.versao}{c.personalizado ? " · criado por você" : ""}{c.essencial ? " · essencial" : ""}
                    {u ? ` · ${u.explorados} exploraram · ${u.acertoPct != null ? `${u.acertoPct}% acerto` : "sem respostas"} · ${u.salvos} salvos` : ""}
                    {!c.fontes.length ? " · sem fonte específica verificada" : ""}
                  </span>
                  {p.length ? <span className="block text-[11px] text-warning">{p[0]}</span> : null}
                </span>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS[c.status].classe}`}>{STATUS[c.status].rotulo}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-fg-subtle">Não há assistente de IA configurado neste app: o editor é manual. Fontes só podem ser escolhidas da lista verificada (referências conferidas); para incluir outra, peça a atualização da lista.</p>
    </div>
  );
}

function Campo({ rotulo, children, dica }: { rotulo: string; children: React.ReactNode; dica?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-fg-muted">{rotulo}</span>
      {children}
      {dica ? <span className="block text-[11px] text-fg-subtle">{dica}</span> : null}
    </label>
  );
}
const inp = "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm";

function Editor({ inicial, fontes, medalhas, alunos, onFechar }: { inicial: ConteudoConhecimento; fontes: Array<{ id: string; citacao: string }>; medalhas: Opcao[]; alunos: Opcao[]; onFechar: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [c, setC] = useState<ConteudoConhecimento>(inicial);
  const [salvando, setSalvando] = useState(false);
  const [versoes, setVersoes] = useState<Array<{ versao: number; status: string; created_at: string }> | null>(null);
  const [alunoRec, setAlunoRec] = useState("");
  const mudar = (p: Partial<ConteudoConhecimento>) => setC((x) => ({ ...x, ...p }));
  const problemas = problemasEditoriais(c, fontes.map((f) => f.id));
  const novo = inicial.versao === 0;

  async function salvar(status: StatusEditorial) {
    setSalvando(true);
    const { status: _s, versao: _v, personalizado: _p, ...conteudo } = c;
    void _s;
    void _v;
    void _p;
    const res = await fetch("/api/conhecimento", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conteudo, status }) }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    setSalvando(false);
    if (!res?.ok) return toast.error(d?.error ?? "Não foi possível salvar.");
    toast.success(`Salvo como versão ${d.versao} (${STATUS[status].rotulo.toLowerCase()}).`);
    mudar({ status, versao: d.versao });
    router.refresh();
  }
  async function verVersoes() {
    const res = await fetch(`/api/conhecimento/${c.id}/versoes`).catch(() => null);
    const d = await res?.json().catch(() => null);
    setVersoes(d?.versoes ?? []);
  }
  async function recomendar() {
    if (!alunoRec) return;
    const res = await fetch(`/api/conhecimento/${c.id}/recomendar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aluno_id: alunoRec }) }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    if (res?.ok) toast.success("Recomendado. O aluno verá como “Novo conhecimento desbloqueado”.");
    else toast.error(d?.error ?? "Não foi possível recomendar.");
  }
  function mudarTipo(tipo: ConteudoConhecimento["tipo"]) {
    if (tipo === "mito_verdade") mudar({ tipo, alternativas: [{ id: "mito", texto: "Mito" }, { id: "verdade", texto: "Verdade" }], correta: c.correta === "depende" ? "mito" : c.correta });
    else if (tipo === "mito_verdade_depende") mudar({ tipo, alternativas: [{ id: "mito", texto: "Mito" }, { id: "verdade", texto: "Verdade" }, { id: "depende", texto: "Depende" }] });
    else mudar({ tipo, alternativas: [{ id: "a", texto: "" }, { id: "b", texto: "" }, { id: "c", texto: "" }], correta: "a" });
  }
  const alternar = (lista: string[], v: string) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onFechar} className="alvo text-sm text-fg-muted hover:text-fg">← Voltar à lista</button>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS[c.status].classe}`}>{novo ? "Novo" : `${STATUS[c.status].rotulo} · v${c.versao}`}</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Campo rotulo="Título curto"><input className={inp} value={c.titulo} maxLength={80} onChange={(e) => mudar({ titulo: e.target.value })} /></Campo>
        <Campo rotulo="Categoria">
          <select className={inp} value={c.categoria} onChange={(e) => mudar({ categoria: e.target.value as ConteudoConhecimento["categoria"] })}>
            {CATEGORIAS.map((k) => <option key={k.id} value={k.id}>{k.rotulo}</option>)}
          </select>
        </Campo>
      </div>
      <Campo rotulo="Pergunta do quiz"><input className={inp} value={c.pergunta} maxLength={200} onChange={(e) => mudar({ pergunta: e.target.value })} /></Campo>
      <div className="grid gap-3 sm:grid-cols-3">
        <Campo rotulo="Tipo">
          <select className={inp} value={c.tipo} onChange={(e) => mudarTipo(e.target.value as ConteudoConhecimento["tipo"])}>
            <option value="mito_verdade">Mito ou verdade</option>
            <option value="mito_verdade_depende">Mito, verdade ou depende</option>
            <option value="multipla">Múltipla escolha</option>
          </select>
        </Campo>
        <Campo rotulo="Resposta correta">
          <select className={inp} value={c.correta} onChange={(e) => mudar({ correta: e.target.value })}>
            {c.alternativas.map((a) => <option key={a.id} value={a.id}>{a.texto || a.id}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Veredito (o que o aluno vê)"><input className={inp} value={c.veredito} maxLength={40} onChange={(e) => mudar({ veredito: e.target.value })} /></Campo>
      </div>
      {c.tipo === "multipla" ? (
        <div className="space-y-2">
          {c.alternativas.map((a, i) => (
            <input key={a.id} className={inp} placeholder={`Alternativa ${a.id.toUpperCase()}`} value={a.texto} maxLength={120} onChange={(e) => mudar({ alternativas: c.alternativas.map((x, k) => (k === i ? { ...x, texto: e.target.value } : x)) })} />
          ))}
          {c.alternativas.length < 4 ? <button type="button" className="text-xs text-accent" onClick={() => mudar({ alternativas: [...c.alternativas, { id: "abcd"[c.alternativas.length], texto: "" }] })}>+ alternativa</button> : null}
        </div>
      ) : null}

      <p className="pt-2 text-[11px] font-bold uppercase tracking-wider text-accent">Nível 1 — resposta rápida</p>
      <Campo rotulo="Resposta rápida (15–30 s)"><textarea className={inp} rows={3} maxLength={600} value={c.rapida} onChange={(e) => mudar({ rapida: e.target.value })} /></Campo>
      <Campo rotulo="Na prática"><textarea className={inp} rows={2} maxLength={400} value={c.pratica} onChange={(e) => mudar({ pratica: e.target.value })} /></Campo>
      <p className="pt-2 text-[11px] font-bold uppercase tracking-wider text-accent">Nível 2 — entenda melhor</p>
      <Campo rotulo="Explicação detalhada"><textarea className={inp} rows={5} maxLength={2500} value={c.detalhada} onChange={(e) => mudar({ detalhada: e.target.value })} /></Campo>
      <Campo rotulo="Exemplo"><textarea className={inp} rows={2} maxLength={800} value={c.exemplo} onChange={(e) => mudar({ exemplo: e.target.value })} /></Campo>
      <Campo rotulo="Fatores que influenciam" dica="Um por linha."><textarea className={inp} rows={3} value={c.fatores.join("\n")} onChange={(e) => mudar({ fatores: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 10) })} /></Campo>
      <p className="pt-2 text-[11px] font-bold uppercase tracking-wider text-accent">Nível 3 — a ciência por trás</p>
      <Campo rotulo="O que a ciência diz"><textarea className={inp} rows={5} maxLength={2500} value={c.ciencia} onChange={(e) => mudar({ ciencia: e.target.value })} /></Campo>
      <Campo rotulo="Limitações das evidências"><textarea className={inp} rows={2} maxLength={800} value={c.limitacoes} onChange={(e) => mudar({ limitacoes: e.target.value })} /></Campo>
      <Campo rotulo="Quando a resposta muda"><textarea className={inp} rows={2} maxLength={800} value={c.quandoMuda} onChange={(e) => mudar({ quandoMuda: e.target.value })} /></Campo>

      <fieldset className="space-y-1">
        <legend className="text-xs font-semibold text-fg-muted">Fontes (somente referências verificadas)</legend>
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
          {fontes.map((f) => (
            <label key={f.id} className="flex items-start gap-2 text-xs">
              <input type="checkbox" className="mt-0.5" checked={c.fontes.includes(f.id)} onChange={() => mudar({ fontes: alternar(c.fontes, f.id) })} />
              <span>{f.citacao}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-1">
        <legend className="text-xs font-semibold text-fg-muted">Desbloqueia com a medalha</legend>
        <div className="flex flex-wrap gap-1.5">
          {medalhas.map((m) => (
            <button key={m.id} type="button" aria-pressed={c.gatilhos.conquistas.includes(m.id)} onClick={() => mudar({ gatilhos: { ...c.gatilhos, conquistas: alternar(c.gatilhos.conquistas, m.id) } })} className={`rounded-full border px-2.5 py-1 text-xs ${c.gatilhos.conquistas.includes(m.id) ? "border-accent bg-accent-soft" : "border-border text-fg-muted"}`}>{m.nome}</button>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-1">
        <legend className="text-xs font-semibold text-fg-muted">Sugerir durante/depois do treino quando…</legend>
        <div className="flex flex-wrap gap-1.5">
          {CONTEXTOS.map((k) => (
            <button key={k} type="button" title={CHAMADA_CONTEXTO[k]} aria-pressed={c.gatilhos.contexto.includes(k)} onClick={() => mudar({ gatilhos: { ...c.gatilhos, contexto: alternar(c.gatilhos.contexto, k) as typeof c.gatilhos.contexto } })} className={`rounded-full border px-2.5 py-1 text-xs ${c.gatilhos.contexto.includes(k) ? "border-accent bg-accent-soft" : "border-border text-fg-muted"}`}>{ROTULO_CONTEXTO[k]}</button>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!c.essencial} onChange={(e) => mudar({ essencial: e.target.checked })} /> Orientação essencial de segurança/saúde
      </label>

      {problemas.length ? (
        <ul className="list-disc space-y-0.5 rounded-lg border border-warning/40 bg-warning/10 p-3 pl-7 text-xs text-warning">{problemas.map((p) => <li key={p}>{p}</li>)}</ul>
      ) : <p className="text-xs text-success">Checagem editorial ok.</p>}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button variant="secondary" loading={salvando} onClick={() => salvar("rascunho")}>Salvar rascunho</Button>
        <Button variant="secondary" loading={salvando} onClick={() => salvar("em_revisao")}>Enviar p/ revisão</Button>
        <Button variant="success" loading={salvando} disabled={problemas.length > 0} onClick={() => salvar("publicado")}>Publicar</Button>
        {!novo ? <Button variant="danger" loading={salvando} onClick={() => salvar("arquivado")}>Arquivar</Button> : null}
      </div>
      <p className="text-[11px] text-fg-subtle">Arquivar tira o conteúdo do app do aluno, mas nada é apagado: quem já explorou continua com o registro.</p>

      {!novo ? (
        <section className="space-y-2 rounded-xl border border-border bg-card p-3">
          <p className="text-sm font-semibold">Recomendar a um aluno</p>
          <div className="flex gap-2">
            <select className={inp} value={alunoRec} onChange={(e) => setAlunoRec(e.target.value)} aria-label="Aluno">
              <option value="">Escolha o aluno…</option>
              {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
            <Button size="sm" variant="gold" disabled={!alunoRec || c.status !== "publicado"} onClick={recomendar}>Recomendar</Button>
          </div>
          {c.status !== "publicado" ? <p className="text-[11px] text-fg-subtle">Publique antes de recomendar.</p> : null}
        </section>
      ) : null}

      {!novo ? (
        <section className="space-y-1">
          <button type="button" className="text-sm font-semibold text-accent" onClick={verVersoes}>Ver histórico de versões</button>
          {versoes ? (
            versoes.length ? (
              <ul className="space-y-1 text-xs text-fg-muted">{versoes.map((v) => <li key={v.versao}>v{v.versao} · {STATUS[v.status as StatusEditorial]?.rotulo ?? v.status} · {fmt.format(new Date(v.created_at))}</li>)}</ul>
            ) : <p className="text-xs text-fg-muted">Ainda sem versões editadas — este é o texto-base (v1) do app.</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

const ROTULO_CONTEXTO: Record<(typeof CONTEXTOS)[number], string> = {
  mais_reps: "Fez mais repetições",
  recorde: "Bateu recorde",
  reps_altas: "Série com muitas reps",
  descanso: "No descanso",
  treino_reduzido: "Treino reduzido",
  meta_semanal: "Cumpriu a meta",
  sem_aumento_carga: "Sem aumento de carga",
};
