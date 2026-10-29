"use client";

// Painel editorial: lista com status e uso, editor completo (nova versão a
// cada gravação), histórico de versões, recomendação a aluno e analytics.
import { useMemo, useRef, useState } from "react";
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

type FiltroStatus = StatusEditorial | "todos";
const FILTROS_STATUS: Array<{ id: FiltroStatus; rotulo: string }> = [
  { id: "todos", rotulo: "Todos" },
  { id: "publicado", rotulo: "Publicados" },
  { id: "rascunho", rotulo: "Rascunhos" },
  { id: "em_revisao", rotulo: "Em revisão" },
  { id: "arquivado", rotulo: "Arquivados" },
];
/** Sem acento e em minúsculas, para a busca achar “nutricao” em “Nutrição”. */
const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const chip = (ativo: boolean) =>
  `inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors ${ativo ? "border-accent bg-accent-soft text-fg" : "border-border bg-card text-fg-muted hover:border-border-strong"}`;

export function ConhecimentoClient({ conteudos, problemas, fontes, medalhas, alunos, analytics }: { conteudos: ConteudoConhecimento[]; problemas: Record<string, string[]>; fontes: Array<{ id: string; citacao: string }>; medalhas: Opcao[]; alunos: Opcao[]; analytics: AnalyticsDesbloqueia }) {
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [filtroCat, setFiltroCat] = useState<string>("todas");
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<ConteudoConhecimento | null>(null);
  const rolagem = useRef(0);
  const lista = useMemo(() => {
    const q = normalizar(busca.trim());
    return conteudos.filter(
      (c) =>
        (filtroStatus === "todos" || c.status === filtroStatus) &&
        (filtroCat === "todas" || c.categoria === filtroCat) &&
        (!q || normalizar(`${c.numero} ${c.titulo} ${c.pergunta}`).includes(q)),
    );
  }, [conteudos, filtroStatus, filtroCat, busca]);
  const titulo = (id: string) => conteudos.find((c) => c.id === id)?.titulo ?? id;
  const a = analytics;

  // Números do topo: contagem por status e uso somado de todas as perguntas.
  const resumo = useMemo(() => {
    const porStatus: Record<StatusEditorial, number> = { rascunho: 0, em_revisao: 0, publicado: 0, arquivado: 0 };
    for (const c of conteudos) porStatus[c.status]++;
    let exploracoes = 0;
    let respostas = 0;
    let acertos = 0;
    for (const l of Object.values(a.porConteudo)) {
      exploracoes += l.explorados;
      if (l.acertoPct != null && l.respostas) {
        respostas += l.respostas;
        acertos += (l.acertoPct / 100) * l.respostas;
      }
    }
    return { porStatus, exploracoes, acertoMedio: respostas ? Math.round((acertos / respostas) * 100) : null };
  }, [conteudos, a.porConteudo]);

  function abrir(c: ConteudoConhecimento) {
    rolagem.current = window.scrollY;
    setEditando(c);
    window.scrollTo({ top: 0 });
  }
  function fechar() {
    setEditando(null);
    requestAnimationFrame(() => window.scrollTo({ top: rolagem.current }));
  }

  if (editando) return <Editor inicial={editando} fontes={fontes} medalhas={medalhas} alunos={alunos} onFechar={fechar} />;

  const temFiltro = filtroStatus !== "todos" || filtroCat !== "todas" || busca.trim() !== "";
  const contagem = (s: FiltroStatus) => (s === "todos" ? conteudos.length : resumo.porStatus[s]);

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Resumo">
        {[
          { r: "Publicadas", v: String(resumo.porStatus.publicado), d: "o aluno já vê" },
          { r: "Rascunhos", v: String(resumo.porStatus.rascunho + resumo.porStatus.em_revisao), d: resumo.porStatus.em_revisao ? `${resumo.porStatus.em_revisao} em revisão` : "ainda não aparecem" },
          { r: "Explorações", v: String(resumo.exploracoes), d: "somando todas" },
          { r: "Acerto médio", v: resumo.acertoMedio != null ? `${resumo.acertoMedio}%` : "—", d: "nas respostas do quiz" },
        ].map((x) => (
          <div key={x.r} className="flex flex-col rounded-xl border border-border bg-card px-3 py-2.5">
            <dt className="order-2 text-xs font-semibold text-fg-muted">{x.r}</dt>
            <dd className="order-1 font-mono text-2xl font-bold leading-tight">{x.v}</dd>
            <dd className="order-3 text-[11px] leading-tight text-fg-subtle">{x.d}</dd>
          </div>
        ))}
      </dl>

      <Button variant="gold" size="lg" className="w-full" onClick={() => abrir(rascunhoNovo(Math.max(30, ...conteudos.map((c) => c.numero)) + 1))}>
        + Nova pergunta
      </Button>

      <section className="space-y-3" aria-label="Filtros">
        <label className="block">
          <span className="sr-only">Buscar pergunta</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="🔎 Buscar pelo título, pergunta ou número"
            className="h-12 w-full rounded-xl border border-border bg-card px-4 text-base placeholder:text-fg-subtle focus:border-accent focus:outline-none"
          />
        </label>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-fg-muted">Situação</p>
          <div className="flex flex-wrap gap-2">
            {FILTROS_STATUS.map((s) => (
              <button key={s.id} type="button" aria-pressed={filtroStatus === s.id} onClick={() => setFiltroStatus(s.id)} className={chip(filtroStatus === s.id)}>
                {s.rotulo} <span className="font-mono text-xs text-fg-subtle">{contagem(s.id)}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-fg-muted">Tema</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={filtroCat === "todas"} onClick={() => setFiltroCat("todas")} className={chip(filtroCat === "todas")}>Todos</button>
            {CATEGORIAS.map((k) => (
              <button key={k.id} type="button" aria-pressed={filtroCat === k.id} onClick={() => setFiltroCat(k.id)} className={chip(filtroCat === k.id)}>
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: k.cor }} aria-hidden />
                {k.rotulo}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="flex min-h-11 items-center justify-between gap-2">
        <p className="text-sm text-fg-muted" aria-live="polite">
          {lista.length === 1 ? "1 pergunta" : `${lista.length} perguntas`}
          {temFiltro ? " com esses filtros" : ""}
        </p>
        {temFiltro ? (
          <button type="button" className="alvo min-h-11 px-2 text-sm font-semibold text-accent" onClick={() => { setFiltroStatus("todos"); setFiltroCat("todas"); setBusca(""); }}>
            Limpar filtros
          </button>
        ) : null}
      </div>

      {lista.length ? (
        <ul className="space-y-2">
          {lista.map((c) => {
            const u = a.porConteudo[c.id];
            const p = problemas[c.id] ?? [];
            const cat = CATEGORIAS.find((k) => k.id === c.categoria);
            return (
              <li key={c.id}>
                <button type="button" onClick={() => abrir(c)} className="block w-full min-w-0 rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:border-accent/40 active:bg-card-hover">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold" style={{ color: cat?.cor }}>#{String(c.numero).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-fg-subtle">{cat?.rotulo}</span>
                    <span className={`shrink-0 rounded-full border px-2 py-px text-[10px] font-semibold ${STATUS[c.status].classe}`}>{STATUS[c.status].rotulo}</span>
                  </span>
                  <span className="mt-1.5 block break-words text-base font-semibold leading-snug">{c.titulo || "Sem título"}</span>
                  {c.pergunta ? <span className="mt-0.5 line-clamp-2 block break-words text-sm text-fg-muted">{c.pergunta}</span> : null}
                  <span className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    {u ? (
                      <>
                        <span className="rounded-md bg-surface px-2 py-0.5" title="Alunos que exploraram">👀 {u.explorados}</span>
                        <span className="rounded-md bg-surface px-2 py-0.5" title="Acerto no quiz">✅ {u.acertoPct != null ? `${u.acertoPct}%` : "—"}</span>
                        <span className="rounded-md bg-surface px-2 py-0.5" title="Alunos que salvaram">🔖 {u.salvos}</span>
                      </>
                    ) : null}
                    {c.essencial ? <span className="rounded-md bg-surface px-2 py-0.5 text-fg-muted">🛟 Essencial</span> : null}
                    <span className="text-fg-subtle">v{c.versao}{c.personalizado ? " · criada por você" : ""}</span>
                  </span>
                  {!c.fontes.length ? <span className="mt-1 block text-[11px] text-fg-subtle">Sem fonte específica verificada</span> : null}
                  {p.length ? <span className="mt-1 block text-xs text-warning">⚠️ {p[0]}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-fg-muted">Nenhuma pergunta encontrada. Tente outro filtro ou limpe a busca.</p>
      )}

      <details className="group rounded-xl border border-border bg-card">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 text-sm font-semibold">
          📊 Como os alunos estão usando (90 dias)
          <span className="text-fg-subtle transition-transform group-open:rotate-180" aria-hidden>▾</span>
        </summary>
        <div className="space-y-3 border-t border-border p-4">
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Alunos com ≥ 1 descoberta", `${a.alunosComDescoberta} de ${a.alunosAtivos}`],
              ["Média explorada por aluno", a.mediaPorAluno != null ? String(a.mediaPorAluno).replace(".", ",") : "—"],
              ["Sugestões abertas", a.taxaAberturaPct != null ? `${a.taxaAberturaPct}% (${a.sugestoesAbertas}/${a.sugestoesVistas})` : "—"],
              ["Cards compartilhados", String(a.compartilhamentos)],
            ].map(([r, v]) => (
              <div key={r} className="flex flex-col rounded-lg bg-surface px-2 py-2 text-center">
                <dt className="order-2 text-[11px] leading-tight text-fg-subtle">{r}</dt>
                <dd className="order-1 font-mono text-base font-bold">{v}</dd>
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
        </div>
      </details>
      <p className="text-xs text-fg-subtle">O editor é manual. Fontes só podem ser escolhidas da lista verificada (referências conferidas); para incluir outra, peça a atualização da lista.</p>
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
// text-base (16 px) evita o zoom automático do iPhone ao tocar no campo.
const inp = "w-full min-w-0 rounded-lg border border-border bg-bg px-3 py-2.5 text-base sm:text-sm";

function Editor({ inicial, fontes, medalhas, alunos, onFechar }: { inicial: ConteudoConhecimento; fontes: Array<{ id: string; citacao: string }>; medalhas: Opcao[]; alunos: Opcao[]; onFechar: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [c, setC] = useState<ConteudoConhecimento>(inicial);
  const [salvando, setSalvando] = useState(false);
  const [versoes, setVersoes] = useState<Array<{ versao: number; status: string; created_at: string }> | null>(null);
  const [alunoRec, setAlunoRec] = useState("");
  const mudar = (p: Partial<ConteudoConhecimento>) => setC((x) => ({ ...x, ...p }));
  const problemas = problemasEditoriais(c, fontes.map((f) => f.id));
  // Depois da 1ª gravação já existe versão: libera arquivar, recomendar e histórico.
  const novo = c.versao === 0;

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
        <button type="button" onClick={onFechar} className="alvo -ml-2 min-h-11 px-2 text-sm font-semibold text-fg-muted hover:text-fg">← Voltar à lista</button>
        <span className={`shrink-0 rounded-full border px-2 py-px text-[11px] font-semibold ${STATUS[c.status].classe}`}>{novo ? "Nova" : `${STATUS[c.status].rotulo} · v${c.versao}`}</span>
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
          {c.alternativas.length < 4 ? <button type="button" className="alvo min-h-11 px-1 text-sm font-semibold text-accent" onClick={() => mudar({ alternativas: [...c.alternativas, { id: "abcd"[c.alternativas.length], texto: "" }] })}>+ alternativa</button> : null}
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
            <label key={f.id} className="flex items-start gap-2.5 rounded-md px-1 py-1.5 text-xs">
              <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0" checked={c.fontes.includes(f.id)} onChange={() => mudar({ fontes: alternar(c.fontes, f.id) })} />
              <span>{f.citacao}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-1">
        <legend className="text-xs font-semibold text-fg-muted">Desbloqueia com a medalha</legend>
        <div className="flex flex-wrap gap-1.5">
          {medalhas.map((m) => (
            <button key={m.id} type="button" aria-pressed={c.gatilhos.conquistas.includes(m.id)} onClick={() => mudar({ gatilhos: { ...c.gatilhos, conquistas: alternar(c.gatilhos.conquistas, m.id) } })} className={`min-h-10 rounded-full border px-3 py-1.5 text-sm ${c.gatilhos.conquistas.includes(m.id) ? "border-accent bg-accent-soft" : "border-border text-fg-muted"}`}>{m.nome}</button>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-1">
        <legend className="text-xs font-semibold text-fg-muted">Sugerir durante/depois do treino quando…</legend>
        <div className="flex flex-wrap gap-1.5">
          {CONTEXTOS.map((k) => (
            <button key={k} type="button" title={CHAMADA_CONTEXTO[k]} aria-pressed={c.gatilhos.contexto.includes(k)} onClick={() => mudar({ gatilhos: { ...c.gatilhos, contexto: alternar(c.gatilhos.contexto, k) as typeof c.gatilhos.contexto } })} className={`min-h-10 rounded-full border px-3 py-1.5 text-sm ${c.gatilhos.contexto.includes(k) ? "border-accent bg-accent-soft" : "border-border text-fg-muted"}`}>{ROTULO_CONTEXTO[k]}</button>
          ))}
        </div>
      </fieldset>
      <label className="flex min-h-11 items-center gap-2.5 text-sm">
        <input type="checkbox" className="h-5 w-5 shrink-0" checked={!!c.essencial} onChange={(e) => mudar({ essencial: e.target.checked })} /> Orientação essencial de segurança/saúde
      </label>
      <p className="-mt-2 text-[11px] text-fg-subtle">Orientações essenciais nunca ficam bloqueadas para o aluno.</p>

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
          <div className="flex flex-col gap-2 sm:flex-row">
            <select className={`${inp} h-11`} value={alunoRec} onChange={(e) => setAlunoRec(e.target.value)} aria-label="Aluno">
              <option value="">Escolha o aluno…</option>
              {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
            <Button variant="gold" className="shrink-0" disabled={!alunoRec || c.status !== "publicado"} onClick={recomendar}>Recomendar</Button>
          </div>
          {c.status !== "publicado" ? <p className="text-[11px] text-fg-subtle">Publique antes de recomendar.</p> : null}
        </section>
      ) : null}

      {!novo ? (
        <section className="space-y-1">
          <button type="button" className="alvo min-h-11 text-sm font-semibold text-accent" onClick={verVersoes}>Ver histórico de versões</button>
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
