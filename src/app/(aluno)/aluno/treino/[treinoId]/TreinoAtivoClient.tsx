"use client";

// ============================================================================
// Treino ativo do aluno.
//  • Inicia uma SESSÃO real (client_key idempotente) e registra cada série com
//    client_key própria: reenviar nunca duplica, perder rede nunca apaga.
//  • Fila local (localStorage) com indicador "pendente de sincronização".
//  • Última carga/reps do mesmo exercício como referência (não substitui a escolha).
//  • Timer de descanso opcional que inicia ao concluir a série.
//  • "Não consegui" → pedido de adaptação. Finalização com resumo real.
// ============================================================================

import { descreverTecnica } from "@/lib/volume/tecnicas";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { RestTimer } from "@/components/ui/RestTimer";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { useToast } from "@/components/ui/Toast";
import { drenar, enfileirar, gerarClientKey, lerFila, type OperacaoFila } from "@/lib/sync/fila";
import { aplicarRascunho, gravarRascunho, lerRascunho, limparRascunho, primeiroPendente, rascunhoDasSeries } from "@/lib/sync/rascunho";
import { dataBR } from "@/lib/format";
import type { SessaoCompleta, UltimaExecucao } from "@/lib/data/sessoes";
import type { ExercicioPrescrito, SessionSet } from "@/lib/supabase/types-sessoes";
import type { VideoSource } from "@/lib/video";
import { BRAND } from "@/config/brand";

type ExercicioView = ExercicioPrescrito & { video: VideoSource | null; instrucoes: string[]; descricao: string | null };

type Props = {
  treino: { id: string; letra: string; nome: string; observacoes: string | null };
  exercicios: ExercicioView[];
  ultimas: Record<string, UltimaExecucao | null>;
  sessaoInicial: SessaoCompleta | null;
  outraSessao: { id: string; treinoId: string | null; nome: string | null } | null;
  sessaoConcluida: SessaoCompleta | null;
};

type SerieLocal = {
  clientKey: string;
  serie: number;
  tipo: "valida" | "aquecimento";
  carga: string;
  reps: string;
  rir: string;
  desconforto: string;
  concluida: boolean;
  sincronizada: boolean;
};

type EstadoSync = "sincronizado" | "pendente" | "enviando" | "offline" | "erro";

const TECNICA_LABEL: Record<string, string> = {
  normal: "",
  superset: "Superset: faça junto com o exercício do mesmo bloco, sem descanso entre eles.",
  biset: "Bi-set: dois exercícios em sequência, sem descanso entre eles.",
  dropset: "Drop set: ao chegar perto da falha, reduza a carga e continue sem descanso.",
  rest_pause: "Rest-pause: pause 10–15 s ao chegar perto da falha e continue até completar as reps.",
  cluster: "Cluster: divida a série em blocos curtos com pausas de 10–20 s.",
  piramide: "Pirâmide: a carga e as repetições mudam a cada série (veja a prescrição de cada uma).",
  isometria: "Isometria: segure a posição pelo tempo indicado.",
  unilateral: "Unilateral: faça um lado de cada vez. Registre uma série por lado ou o total.",
  myo_reps: "Myo-reps: faça a série até perto da falha, descanse 3–5 respirações e faça mini-séries curtas com a mesma carga.",
};

function repsDaSerie(ex: ExercicioPrescrito, serie: number): string {
  const cfg = ex.series_config as { modo?: string; series?: Array<{ ordem: number; reps: string }> } | null | undefined;
  if (cfg?.modo === "detalhado" && cfg.series?.length) return cfg.series[serie - 1]?.reps ?? ex.reps;
  return ex.reps;
}

export function TreinoAtivoClient({ treino, exercicios, ultimas, sessaoInicial, outraSessao, sessaoConcluida }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [sessao, setSessao] = useState<SessaoCompleta | null>(sessaoInicial);
  const [iniciando, setIniciando] = useState(false);
  const [series, setSeries] = useState<Record<string, SerieLocal[]>>({}); // session_exercise_id → séries
  const [aberto, setAberto] = useState<string | null>(() => sessaoInicial?.exercicios.find((e) => e.status === "pendente")?.id ?? sessaoInicial?.exercicios[0]?.id ?? null);
  // `fim` (epoch ms) permite retomar o descanso se o app fechar no meio dele.
  const [timer, setTimer] = useState<{ seg: number; key: number; fim: number } | null>(null);
  const [sync, setSync] = useState<EstadoSync>("sincronizado");
  const [pendentes, setPendentes] = useState(0);
  const [finalizando, setFinalizando] = useState(false);
  const [concluida, setConcluida] = useState<SessaoCompleta | null>(sessaoConcluida);
  const [feedback, setFeedback] = useState<"leve" | "ok" | "pesado" | "dor" | null>(null);
  const [adaptacaoAberta, setAdaptacaoAberta] = useState<string | null>(null);
  const drenando = useRef(false);
  // Rascunho (o que ainda não foi concluído): só é gravado depois de restaurado,
  // para a tela vazia do primeiro render não apagar o que estava guardado.
  const hidratadaRef = useRef<string | null>(null);
  const planejadasRef = useRef<Record<string, number>>({});
  const storage = typeof window !== "undefined" ? window.localStorage : null;

  // ------------------------------------------------------------------------
  // Estado local a partir da sessão (reconciliação com o servidor)
  // ------------------------------------------------------------------------
  const hidratar = useCallback(
    (s: SessaoCompleta) => {
      const fila = storage ? lerFila(storage, s.id) : [];
      const pendentesPorKey = new Map(fila.filter((f) => f.tipo === "serie").map((f) => [f.clientKey, f]));
      const next: Record<string, SerieLocal[]> = {};
      for (const se of s.exercicios) {
        const planejadas = Math.max(1, se.series_planejadas + ((se.prescricao as { series_aquecimento?: number })?.series_aquecimento ?? 0));
        const porSerie = new Map<number, SessionSet>();
        for (const x of se.series) porSerie.set(x.serie, x);
        const lista: SerieLocal[] = [];
        const aquec = (se.prescricao as { series_aquecimento?: number })?.series_aquecimento ?? 0;
        for (let i = 1; i <= Math.max(planejadas, se.series.length); i++) {
          const salvo = porSerie.get(i);
          const keyBase = `set:${se.id}:${i}`;
          const pend = [...pendentesPorKey.values()].find((f) => f.payload.session_exercise_id === se.id && f.payload.serie === i);
          const p = pend?.payload as { carga_kg?: number | null; reps?: number | null; rir?: number | null; desconforto?: number | null } | undefined;
          lista.push({
            clientKey: salvo?.client_key ?? pend?.clientKey ?? keyBase,
            serie: i,
            tipo: i <= aquec ? "aquecimento" : "valida",
            carga: p?.carga_kg != null ? String(p.carga_kg) : salvo?.carga_kg != null ? String(salvo.carga_kg) : "",
            reps: p?.reps != null ? String(p.reps) : salvo?.reps != null ? String(salvo.reps) : "",
            rir: p?.rir != null ? String(p.rir) : salvo?.rir != null ? String(salvo.rir) : "",
            desconforto: p?.desconforto != null ? String(p.desconforto) : salvo?.desconforto != null ? String(salvo.desconforto) : "",
            concluida: Boolean(salvo) || Boolean(pend),
            sincronizada: Boolean(salvo) && !pend,
          });
        }
        next[se.id] = lista;
        planejadasRef.current[se.id] = Math.max(planejadas, se.series.length);
      }
      // Volta de onde parou: valores digitados, séries extras, exercício aberto e descanso.
      const primeiraVez = hidratadaRef.current !== s.id;
      const rascunho = primeiraVez && storage ? lerRascunho(storage, s.id) : null;
      const { series: comRascunho, restaurou } = aplicarRascunho(next, rascunho);
      setSeries(comRascunho);
      setPendentes(fila.length);
      setSync(fila.length ? "pendente" : "sincronizado");
      if (primeiraVez) {
        const ordem = s.exercicios.map((e) => e.id);
        setAberto(rascunho?.aberto && ordem.includes(rascunho.aberto) ? rascunho.aberto : primeiroPendente(ordem, comRascunho));
        const resta = rascunho?.descansoAte ? Math.ceil((rascunho.descansoAte - Date.now()) / 1000) : 0;
        if (resta > 0) setTimer({ seg: resta, key: Date.now(), fim: rascunho!.descansoAte! });
        const jaFez = Object.values(comRascunho).some((l) => l.some((x) => x.concluida));
        if (restaurou || jaFez) toast.success("Você voltou de onde parou. Nada do que registrou foi perdido.");
        hidratadaRef.current = s.id;
      }
    },
    [storage, toast]
  );

  // Grava o rascunho a cada mudança (digitação, exercício aberto, descanso).
  useEffect(() => {
    if (!sessao || !storage || hidratadaRef.current !== sessao.id) return;
    gravarRascunho(storage, sessao.id, { series: rascunhoDasSeries(series, planejadasRef.current), aberto, descansoAte: timer?.fim ?? null });
  }, [series, aberto, timer, sessao, storage]);

  // Reconciliação com a fila local (localStorage é um sistema externo: sincroniza fora do render)
  useEffect(() => {
    if (!sessao) return;
    const id = window.setTimeout(() => hidratar(sessao), 0);
    return () => window.clearTimeout(id);
  }, [sessao, hidratar]);

  const online = useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => navigator.onLine,
    () => true
  );

  // ------------------------------------------------------------------------
  // Envio idempotente da fila
  // ------------------------------------------------------------------------
  const enviar = useCallback(async (op: OperacaoFila) => {
    try {
      let res: Response;
      if (op.tipo === "serie") {
        res = await fetch(`/api/sessoes/${op.sessionId}/series`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...op.payload, client_key: op.clientKey }) });
      } else if (op.tipo === "exercicio") {
        res = await fetch(`/api/sessoes/${op.sessionId}/exercicios/${op.payload.session_exercise_id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(op.payload.patch) });
      } else {
        res = await fetch(`/api/sessoes/${op.sessionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(op.payload) });
      }
      if (res.ok) return { ok: true as const };
      const body = await res.json().catch(() => ({}));
      const definitivo = res.status === 400 || res.status === 404 || res.status === 409 || res.status === 403;
      return { ok: false as const, definitivo, erro: body.error ?? `HTTP ${res.status}` };
    } catch {
      return { ok: false as const, erro: "sem conexão" };
    }
  }, []);

  const sincronizar = useCallback(async () => {
    if (!sessao || !storage || drenando.current) return;
    drenando.current = true;
    setSync("enviando");
    const r = await drenar(storage, sessao.id, enviar);
    drenando.current = false;
    setPendentes(r.restantes.length);
    if (r.restantes.length === 0) {
      setSync("sincronizado");
      setSeries((cur) => {
        const next: Record<string, SerieLocal[]> = {};
        for (const [k, v] of Object.entries(cur)) next[k] = v.map((s) => (s.concluida ? { ...s, sincronizada: true } : s));
        return next;
      });
    } else {
      setSync(online ? "erro" : "offline");
    }
    if (r.erro && r.restantes.length === 0) toast.warn(`Uma operação foi rejeitada pelo servidor: ${r.erro}`);
  }, [sessao, storage, enviar, online, toast]);

  // tenta drenar quando volta a conexão / a cada 20 s se houver pendências
  useEffect(() => {
    if (!sessao || !online || pendentes === 0) return;
    const inicial = window.setTimeout(() => void sincronizar(), 0);
    const id = window.setInterval(() => void sincronizar(), 20_000);
    return () => {
      window.clearTimeout(inicial);
      window.clearInterval(id);
    };
  }, [online, pendentes, sessao, sincronizar]);

  // ------------------------------------------------------------------------
  // Ações
  // ------------------------------------------------------------------------
  async function iniciar() {
    setIniciando(true);
    try {
      const chave = `sess:${treino.id}:${new Date().toISOString().slice(0, 10)}:${gerarClientKey("s").slice(2, 10)}`;
      const res = await fetch("/api/sessoes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ treino_id: treino.id, client_key: chave }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Não foi possível iniciar");
      setSessao(data as SessaoCompleta);
      setAberto((data as SessaoCompleta).exercicios[0]?.id ?? null);
      window.history.replaceState(null, "", `?sessao=${(data as SessaoCompleta).id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sem conexão para iniciar o treino. Tente de novo.");
    } finally {
      setIniciando(false);
    }
  }

  function atualizar(seId: string, idx: number, patch: Partial<SerieLocal>) {
    setSeries((cur) => ({ ...cur, [seId]: cur[seId].map((s, i) => (i === idx ? { ...s, ...patch } : s)) }));
  }

  function concluirSerie(seId: string, idx: number, ex: ExercicioView) {
    if (!sessao || !storage) return;
    const s = series[seId][idx];
    const reps = s.reps.trim() === "" ? null : Number(s.reps.replace(",", "."));
    const carga = s.carga.trim() === "" ? null : Number(s.carga.replace(",", "."));
    if (reps === null && carga === null && ex.tecnica !== "isometria") {
      toast.warn("Informe pelo menos as repetições para concluir a série.");
      return;
    }
    const payload = {
      session_exercise_id: seId,
      serie: s.serie,
      tipo: s.tipo,
      carga_kg: Number.isFinite(carga as number) ? carga : null,
      reps: Number.isFinite(reps as number) ? Math.round(reps as number) : null,
      rir: s.rir === "" ? null : Number(s.rir),
      desconforto: s.desconforto === "" ? null : Number(s.desconforto),
      concluida_em: new Date().toISOString(),
    };
    enfileirar(storage, sessao.id, { tipo: "serie", sessionId: sessao.id, clientKey: s.clientKey, payload });
    atualizar(seId, idx, { concluida: true, sincronizada: false });
    setPendentes((n) => n + 1);
    setSync("pendente");
    if (ex.descanso_seg && ex.descanso_seg > 0 && s.tipo === "valida") {
      const seg = ex.descanso_seg;
      const fim = new Date().getTime() + seg * 1000;
      setTimer((t) => ({ seg, key: (t?.key ?? 0) + 1, fim }));
    }
    if (navigator.vibrate) navigator.vibrate(30);
    void sincronizar();
  }

  function adicionarSerieExtra(seId: string) {
    const sufixo = gerarClientKey("x").slice(2, 8); // gerado fora do updater (updater precisa ser puro)
    setSeries((cur) => {
      const lista = cur[seId] ?? [];
      const n = lista.length + 1;
      return { ...cur, [seId]: [...lista, { clientKey: `set:${seId}:${n}:${sufixo}`, serie: n, tipo: "valida", carga: "", reps: "", rir: "", desconforto: "", concluida: false, sincronizada: false }] };
    });
  }

  function marcarExercicio(seId: string, status: "pulado" | "nao_consegui" | "concluido") {
    if (!sessao || !storage) return;
    enfileirar(storage, sessao.id, { tipo: "exercicio", sessionId: sessao.id, clientKey: `ex:${seId}:${status}`, payload: { session_exercise_id: seId, patch: { status } } });
    setPendentes((n) => n + 1);
    void sincronizar();
  }

  async function pedirAdaptacao(ex: ExercicioView, seId: string, motivo: "nao_consegui" | "desconforto" | "sem_equipamento", descricao: string) {
    try {
      const res = await fetch("/api/adaptacoes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session_id: sessao?.id ?? null, session_exercise_id: seId, exercicio_id: ex.id, exercicio_nome: ex.nome, motivo, descricao: descricao || null }) });
      if (!res.ok) throw new Error();
      marcarExercicio(seId, "nao_consegui");
      toast.success(`Pedido enviado. O ${BRAND.name} vai revisar este exercício.`);
      setAdaptacaoAberta(null);
    } catch {
      toast.error("Não foi possível enviar agora. Tente de novo quando a conexão voltar.");
    }
  }

  async function finalizar(status: "concluida" | "abandonada") {
    if (!sessao || !storage) return;
    setFinalizando(true);
    enfileirar(storage, sessao.id, { tipo: "finalizar", sessionId: sessao.id, clientKey: `fim:${sessao.id}`, payload: { status, feedback_percepcao: feedback } });
    setPendentes((n) => n + 1);
    const r = await drenar(storage, sessao.id, enviar);
    setPendentes(r.restantes.length);
    if (r.restantes.length) {
      setSync(online ? "erro" : "offline");
      setFinalizando(false);
      toast.warn("Suas séries ficaram guardadas no aparelho. Assim que a conexão voltar, finalizamos o treino automaticamente.");
      return;
    }
    limparRascunho(storage, sessao.id);
    const res = await fetch(`/api/sessoes/${sessao.id}`);
    const data = (await res.json().catch(() => null)) as SessaoCompleta | null;
    setConcluida(data ?? { ...sessao, status });
    setFinalizando(false);
    router.refresh();
  }

  // ------------------------------------------------------------------------
  // Telas
  // ------------------------------------------------------------------------
  const totalPlanejado = useMemo(() => Object.values(series).flat().filter((s) => s.tipo === "valida").length, [series]);
  const totalFeito = useMemo(() => Object.values(series).flat().filter((s) => s.tipo === "valida" && s.concluida).length, [series]);

  if (concluida) {
    const feitas = concluida.series_concluidas;
    const planejadas = concluida.series_planejadas;
    const recordes = detectarRecordesLocais(concluida, ultimas);
    return (
      <div className="space-y-5">
        <Card className="border-success/40 bg-grain-strong">
          <CardBody className="text-center py-8 space-y-2">
            <Icon name="check" size={40} className="mx-auto text-success" />
            <h1 className="text-2xl font-bold">{concluida.status === "abandonada" ? "Treino encerrado" : "Treino concluído"}</h1>
            <p className="text-fg-muted">
              Você realizou <span className="text-fg font-bold">{feitas}</span> de <span className="text-fg font-bold">{planejadas}</span> séries propostas.
            </p>
            {concluida.duracao_seg ? <p className="text-sm text-fg-subtle">{Math.round(concluida.duracao_seg / 60)} min de treino</p> : null}
          </CardBody>
        </Card>
        {recordes.length ? (
          <Card className="border-accent/40">
            <CardBody className="space-y-1">
              <p className="text-[11px] uppercase tracking-wider text-accent font-bold">Marcas de hoje</p>
              {recordes.map((r) => (
                <p key={r} className="text-sm">
                  {r}
                </p>
              ))}
            </CardBody>
          </Card>
        ) : null}
        <Card>
          <CardBody className="space-y-3">
            <p className="font-semibold text-sm">Como foi o treino? (opcional)</p>
            <div className="grid grid-cols-4 gap-2">
              {(["leve", "ok", "pesado", "dor"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={async () => {
                    setFeedback(f);
                    await fetch(`/api/sessoes/${concluida.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: concluida.status === "abandonada" ? "abandonada" : "concluida", feedback_percepcao: f }) }).catch(() => undefined);
                  }}
                  aria-pressed={feedback === f}
                  className={`touch rounded-lg border px-2 py-2 text-sm font-semibold ${feedback === f ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted hover:text-fg"}`}
                >
                  {f === "leve" ? "Leve" : f === "ok" ? "Na medida" : f === "pesado" ? "Pesado" : "Senti dor"}
                </button>
              ))}
            </div>
            {feedback === "dor" ? <p className="text-xs text-fg-muted">Obrigado por avisar. O {BRAND.name} verá isso antes do próximo treino. Se a dor for forte, procure avaliação.</p> : null}
          </CardBody>
        </Card>
        <Link href="/aluno" className="touch inline-flex w-full items-center justify-center rounded-lg bg-accent px-5 py-3 font-bold text-bg">
          Voltar ao início
        </Link>
      </div>
    );
  }

  if (!sessao) {
    return (
      <div className="space-y-5">
        <Link href="/aluno/treinar" className="text-fg-muted text-sm hover:text-fg inline-flex items-center gap-1">
          ← Treinos
        </Link>
        <Card className="border-accent/40 bg-grain-strong">
          <CardBody className="space-y-3">
            <p className="text-[11px] uppercase tracking-wider text-accent font-bold">Treino {treino.letra}</p>
            <h1 className="text-2xl font-bold leading-tight">{treino.nome}</h1>
            <p className="text-sm text-fg-muted">{exercicios.length} exercícios · {exercicios.reduce((n, e) => n + e.series, 0)} séries</p>
            {treino.observacoes ? <p className="text-sm text-fg-muted border-l-2 border-accent/50 pl-3">{treino.observacoes}</p> : null}
            {outraSessao ? (
              <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
                Você tem um treino em andamento ({outraSessao.nome}).{" "}
                <Link href={`/aluno/treino/${outraSessao.treinoId}?sessao=${outraSessao.id}`} className="text-accent underline">
                  Continuar aquele
                </Link>{" "}
                ou comece este agora.
              </div>
            ) : null}
            <Button variant="primary" size="lg" className="w-full touch" loading={iniciando} onClick={iniciar}>
              <Icon name="play" /> Começar treino
            </Button>
          </CardBody>
        </Card>
        <ol className="space-y-2" aria-label="Exercícios deste treino">
          {exercicios.map((e, i) => (
            <li key={e.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
              <span className="w-7 h-7 rounded-full bg-bg border border-border text-xs font-bold flex items-center justify-center text-fg-muted" aria-hidden>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{e.nome}</p>
                <p className="text-xs text-fg-subtle">
                  {e.series} × {e.reps}
                  {e.descanso_seg ? ` · descanso ${e.descanso_seg}s` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const syncLabel: Record<EstadoSync, { texto: string; cor: string }> = {
    sincronizado: { texto: "Tudo salvo", cor: "text-success" },
    pendente: { texto: `${pendentes} pendente(s) de sincronização`, cor: "text-warning" },
    enviando: { texto: "Salvando…", cor: "text-fg-muted" },
    offline: { texto: `Sem conexão · ${pendentes} guardada(s) no aparelho`, cor: "text-warning" },
    erro: { texto: `Falha ao salvar · ${pendentes} pendente(s)`, cor: "text-danger" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link href="/aluno/treinar" className="text-fg-muted text-sm hover:text-fg inline-flex items-center gap-1">
          ← Treinos
        </Link>
        <p className={`text-xs font-semibold ${syncLabel[sync].cor}`} role="status" aria-live="polite">
          {syncLabel[sync].texto}
          {sync === "erro" ? (
            <button type="button" onClick={() => void sincronizar()} className="ml-2 underline">
              tentar agora
            </button>
          ) : null}
        </p>
      </div>

      <header className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center shrink-0" aria-hidden>
          <span className="text-xl font-black text-bg">{treino.letra}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold leading-tight truncate">{treino.nome}</h1>
          <p className="text-xs text-fg-subtle">
            {totalFeito} de {totalPlanejado} séries · {sessao.exercicios.length} exercícios
          </p>
        </div>
      </header>

      {timer ? (
        <div className="sticky top-2 z-30">
          <RestTimer key={timer.key} duracaoSeg={timer.seg} autoStart onComplete={() => setTimer(null)} onDismiss={() => setTimer(null)} />
        </div>
      ) : null}

      <div className="space-y-3">
        {sessao.exercicios.map((se, idx) => {
          const ex = exercicios.find((e) => e.id === se.exercicio_id) ?? (exercicios[idx] as ExercicioView | undefined);
          if (!ex) return null;
          const lista = series[se.id] ?? [];
          const feitas = lista.filter((s) => s.tipo === "valida" && s.concluida).length;
          const planejadas = lista.filter((s) => s.tipo === "valida").length;
          const completo = planejadas > 0 && feitas >= planejadas;
          const ultima = ultimas[ex.id];
          const expandido = aberto === se.id;
          const detalheTecnica = descreverTecnica({ tecnica: ex.tecnica, tecnicaExtras: ex.tecnica_extras, tecnicaSeries: ex.tecnica_series }, Math.max(0, ex.series - (ex.series_aquecimento ?? 0)));
          const tecnicaTxt = [TECNICA_LABEL[ex.tecnica] ?? "", detalheTecnica ? `Hoje: ${detalheTecnica}.` : ""].filter(Boolean).join(" ");
          return (
            <Card key={se.id} className={completo ? "border-success/40" : expandido ? "border-accent/40" : ""}>
              <CardBody className="p-0">
                <button type="button" onClick={() => setAberto(expandido ? null : se.id)} aria-expanded={expandido} className="w-full flex items-center gap-3 text-left px-4 py-3 touch">
                  <span className={`w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${completo ? "bg-success border-success text-bg" : "bg-bg border-border text-fg-muted"}`} aria-hidden>
                    {completo ? <Icon name="check" size={16} /> : idx + 1}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-sm leading-tight">{ex.nome}</span>
                    <span className="block text-xs text-fg-subtle mt-0.5">
                      {ex.series} × {ex.reps}
                      {ex.series_aquecimento ? ` (${ex.series_aquecimento} aquec.)` : ""}
                      {ex.descanso_seg ? ` · ${ex.descanso_seg}s` : ""}
                      {ex.rir != null ? ` · RIR ${ex.rir}` : ex.ie != null ? ` · esforço ${ex.ie}/10` : ""}
                    </span>
                  </span>
                  <span className="text-xs font-mono text-fg-subtle shrink-0">
                    {feitas}/{planejadas}
                  </span>
                  <Icon name={expandido ? "up" : "down"} className="text-fg-subtle shrink-0" />
                </button>

                {expandido ? (
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                    {ex.video ? <VideoPlayer source={ex.video} lazy /> : null}
                    {ex.observacoes ? (
                      <p className="text-sm text-fg-muted rounded-md bg-accent-soft/60 border border-accent/20 px-3 py-2">
                        <span className="text-accent font-semibold">Nota do {BRAND.name}:</span> {ex.observacoes}
                      </p>
                    ) : null}
                    {tecnicaTxt ? <p className="text-xs text-fg-muted">{tecnicaTxt}</p> : null}
                    {ex.unilateral && ex.tecnica !== "unilateral" ? <p className="text-xs text-fg-muted">{TECNICA_LABEL.unilateral}</p> : null}
                    {ex.instrucoes.length ? (
                      <details className="text-xs text-fg-muted">
                        <summary className="cursor-pointer text-fg-subtle">Como executar</summary>
                        <ol className="list-decimal pl-4 mt-1 space-y-0.5">
                          {ex.instrucoes.map((i, k) => (
                            <li key={k}>{i}</li>
                          ))}
                        </ol>
                      </details>
                    ) : null}

                    {ultima ? (
                      <p className="text-xs text-fg-subtle">
                        Última vez ({dataBR(ultima.data)}
                        {ultima.nomeTreino ? `, ${ultima.nomeTreino}` : ""}): {ultima.series.map((s) => `${s.carga_kg ?? "—"}kg×${s.reps ?? "—"}`).join(" · ")}
                      </p>
                    ) : (
                      <p className="text-xs text-fg-subtle">Primeira vez registrando este exercício.</p>
                    )}

                    <div className="space-y-2">
                      <div className="grid grid-cols-[28px_1fr_1fr_56px_44px] gap-2 text-[10px] uppercase tracking-wider text-fg-subtle font-semibold px-1">
                        <span>#</span>
                        <span>Carga (kg)</span>
                        <span>Reps</span>
                        <span>RIR</span>
                        <span className="sr-only">Concluir</span>
                      </div>
                      {lista.map((s, i) => {
                        const ref = ultima?.series.find((u) => u.serie === s.serie) ?? ultima?.series.at(-1);
                        return (
                          <div key={s.clientKey} className={`grid grid-cols-[28px_1fr_1fr_56px_44px] gap-2 items-center ${s.tipo === "aquecimento" ? "opacity-80" : ""}`}>
                            <span className="text-xs font-mono text-fg-muted" title={s.tipo === "aquecimento" ? "Aquecimento (não conta como série válida)" : undefined}>
                              {s.tipo === "aquecimento" ? "A" : s.serie}
                            </span>
                            <input
                              type="text"
                              inputMode="decimal"
                              aria-label={`Carga da série ${s.serie} em quilos`}
                              value={s.carga}
                              placeholder={ref?.carga_kg != null ? String(ref.carga_kg) : "kg"}
                              onChange={(e) => atualizar(se.id, i, { carga: e.target.value, concluida: false, sincronizada: false })}
                              className={`h-11 w-full rounded-md border bg-bg px-2 text-center font-mono text-base ${s.concluida ? "border-success/50" : "border-border"} focus:border-accent`}
                            />
                            <input
                              type="text"
                              inputMode="numeric"
                              aria-label={`Repetições da série ${s.serie}`}
                              value={s.reps}
                              placeholder={ref?.reps != null ? String(ref.reps) : repsDaSerie(ex, s.serie) || "reps"}
                              onChange={(e) => atualizar(se.id, i, { reps: e.target.value, concluida: false, sincronizada: false })}
                              className={`h-11 w-full rounded-md border bg-bg px-2 text-center font-mono text-base ${s.concluida ? "border-success/50" : "border-border"} focus:border-accent`}
                            />
                            <select aria-label={`Repetições em reserva da série ${s.serie}`} value={s.rir} onChange={(e) => atualizar(se.id, i, { rir: e.target.value })} className="h-11 w-full rounded-md border border-border bg-bg px-1 text-center font-mono text-sm">
                              <option value="">—</option>
                              {[0, 1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => concluirSerie(se.id, i, ex)}
                              aria-label={s.concluida ? `Concluir série ${s.serie} novamente (já registrada${s.sincronizada ? "" : ", aguardando sincronização"})` : `Concluir série ${s.serie}`}
                              className={`h-11 w-11 rounded-md flex items-center justify-center border transition-colors ${s.concluida ? (s.sincronizada ? "bg-success text-bg border-success" : "bg-warning/80 text-bg border-warning") : "bg-accent text-bg border-accent hover:bg-accent-hover"}`}
                            >
                              <Icon name="check" size={18} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button type="button" onClick={() => adicionarSerieExtra(se.id)} className="touch rounded-md border border-border px-3 py-2 text-xs font-semibold text-fg-muted hover:text-fg">
                        + Série extra
                      </button>
                      <button type="button" onClick={() => setAdaptacaoAberta(adaptacaoAberta === se.id ? null : se.id)} className="touch rounded-md border border-border px-3 py-2 text-xs font-semibold text-fg-muted hover:text-fg">
                        Não consegui este exercício
                      </button>
                      <button type="button" onClick={() => marcarExercicio(se.id, "pulado")} className="touch rounded-md border border-border px-3 py-2 text-xs font-semibold text-fg-subtle hover:text-fg">
                        Pular hoje
                      </button>
                    </div>
                    {adaptacaoAberta === se.id ? <AdaptacaoForm onEnviar={(motivo, desc) => pedirAdaptacao(ex, se.id, motivo, desc)} onCancelar={() => setAdaptacaoAberta(null)} /> : null}
                  </div>
                ) : null}
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card className="border-success/30">
        <CardBody className="space-y-3">
          <p className="text-sm text-fg-muted text-center">
            {totalFeito >= totalPlanejado ? "Todas as séries registradas." : `${totalPlanejado - totalFeito} série(s) ainda em aberto — tudo bem concluir assim mesmo.`}
          </p>
          <Button variant="success" size="lg" className="w-full touch" loading={finalizando} onClick={() => finalizar("concluida")}>
            Concluir treino
          </Button>
          <button type="button" onClick={() => finalizar("abandonada")} className="w-full text-xs text-fg-subtle hover:text-fg py-2">
            Encerrar sem concluir (guarda o que foi feito)
          </button>
        </CardBody>
      </Card>
    </div>
  );
}

function AdaptacaoForm({ onEnviar, onCancelar }: { onEnviar: (motivo: "nao_consegui" | "desconforto" | "sem_equipamento", descricao: string) => void; onCancelar: () => void }) {
  const [motivo, setMotivo] = useState<"nao_consegui" | "desconforto" | "sem_equipamento">("nao_consegui");
  const [desc, setDesc] = useState("");
  return (
    <div className="rounded-lg border border-border bg-bg p-3 space-y-2">
      <p className="text-sm font-semibold">O que aconteceu?</p>
      <div className="grid grid-cols-3 gap-2">
        {([
          ["nao_consegui", "Não consegui"],
          ["desconforto", "Desconforto"],
          ["sem_equipamento", "Sem aparelho"],
        ] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setMotivo(k)} aria-pressed={motivo === k} className={`touch rounded-md border px-2 py-2 text-xs font-semibold ${motivo === k ? "border-accent text-accent bg-accent/10" : "border-border text-fg-muted"}`}>
            {l}
          </button>
        ))}
      </div>
      <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} maxLength={300} placeholder="Conte rapidinho (opcional)" className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm" />
      {motivo === "desconforto" ? <p className="text-xs text-fg-muted">Se for dor forte ou aguda, pare o exercício. O pedido vai para o {BRAND.name} revisar — nada é trocado automaticamente.</p> : null}
      <div className="flex gap-2">
        <Button size="sm" variant="primary" onClick={() => onEnviar(motivo, desc)}>
          Enviar pedido
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

/** Recordes reais da sessão comparados com a última execução conhecida (só carga). */
function detectarRecordesLocais(s: SessaoCompleta, ultimas: Record<string, UltimaExecucao | null>): string[] {
  const out: string[] = [];
  for (const e of s.exercicios) {
    const u = e.exercicio_id ? ultimas[e.exercicio_id] : null;
    if (!u || !u.series.length) continue;
    const maxAntes = Math.max(...u.series.map((x) => x.carga_kg ?? 0));
    const maxHoje = Math.max(...e.series.filter((x) => x.tipo !== "aquecimento").map((x) => x.carga_kg ?? 0));
    if (maxHoje > maxAntes && maxHoje > 0) out.push(`${e.nome}: melhor carga até agora (${maxHoje} kg, antes ${maxAntes} kg).`);
  }
  return out.slice(0, 3);
}
