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

import { descreverTecnica, METODOS } from "@/lib/volume/tecnicas";
import { gruposDoTreino, proximoNoBloco, rodadaDoBloco, rotulosDosExercicios, type ItemTreino } from "@/lib/treino/blocos";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { RestTimer } from "@/components/ui/RestTimer";
import { LembretePush } from "@/components/aluno/LembretePush";
import { BotaoVideoTelaCheia } from "@/components/ui/VideoTelaCheia";
import { useToast } from "@/components/ui/Toast";
import { drenar, enfileirar, gerarClientKey, lerFila, type OperacaoFila } from "@/lib/sync/fila";
import { listarSeries, verificarPendencias } from "@/lib/treino/pendencias";
import { conviteSerieExtra, type Deficit } from "@/lib/treino/serie-extra";
import { CABECALHO_ALUNO } from "@/lib/auth/cabecalho";
import type { OpcaoTroca, TrocasDoExercicio } from "@/lib/treino/troca";
import { GRUPO_LABEL } from "@/lib/grupos";
import { RitmoTreino } from "@/components/aluno/RitmoTreino";
import { NotaDoPersonal } from "@/components/aluno/NotaDoPersonal";
import { estimarPrescricao, descansoAposSerie } from "@/lib/tempo/prescricao";
import { offsetRelogio } from "@/lib/tempo/ritmo";
import type { ParametrosTempo } from "@/lib/tempo/estimar";
import { aplicarRascunho, gravarRascunho, lerRascunho, limparRascunho, primeiroPendente, rascunhoDasSeries } from "@/lib/sync/rascunho";
import { dataBR } from "@/lib/format";
import type { SessaoCompleta, UltimaExecucao } from "@/lib/data/sessoes";
import type { ExercicioPrescrito, SessionSet } from "@/lib/supabase/types-sessoes";
import type { VideoSource } from "@/lib/video";
import { BRAND } from "@/config/brand";
import { TelaChalala, type BaseConclusao } from "@/components/chalala/TelaChalala";
import { OPCOES_TEMPO_MIN, encurtarDescanso, ganhoDescansoReduzido, treinoPossivel } from "@/lib/treino/possivel";
import { dataLocal } from "@/lib/aderencia/calcular";
import { avaliarSerie, podeAvisar, principal, resumirExercicio, type Descoberta, type ExecucaoAnterior, type SerieReg } from "@/lib/evolucao/motor";
import { normalizarTecnica } from "@/lib/evolucao/adaptar";
import type { ConfigEvolucao } from "@/lib/data/evolucao";
import { AvisoEvolucao } from "@/components/evolucao/AvisoEvolucao";
import { bipe, usePrefsEvolucao } from "@/components/evolucao/preferencias";
import { LeituraRapida, marcarSugestao, sugestoesDaSessao, type ItemRapido } from "@/components/desbloqueia/LeituraRapida";
import { CHAMADA_CONTEXTO, REGRAS_DESBLOQUEIA, REPS_ALTAS, repsPrescritas, type PacoteTreino } from "@/lib/desbloqueia/motor";
import type { ContextoConhecimento } from "@/lib/desbloqueia/tipos";
import { enviarEvento } from "@/components/chalala/evento";
import type { PercepcaoExercicio } from "@/lib/supabase/types-sessoes";

/** Modo aula presencial: o personal registra o treino do aluno pelo painel. */
export type Presencial = { alunoId: string; nomeAluno: string; voltarHref: string };

type ExercicioView = ExercicioPrescrito & { video: VideoSource | null; instrucoes: string[]; descricao: string | null; /** Trocado hoje pelo aluno. */ trocado?: boolean };

type Props = {
  treino: { id: string; letra: string; nome: string; observacoes: string | null; tempos: Partial<ParametrosTempo> };
  exercicios: ExercicioView[];
  /** Horário do servidor na renderização (corrige relógio do aparelho). */
  agoraServidor: number;
  ultimas: Record<string, UltimaExecucao | null>;
  /** Séries que ficaram para trás nos últimos dias (convite da série extra). */
  perdidas?: Record<string, Deficit>;
  /** Aula presencial (painel do personal). */
  presencial?: Presencial | null;
  /** Opções de troca por exercício do plano (regras do personal/catálogo). */
  trocas?: Record<string, TrocasDoExercicio>;
  /** Última execução de cada opção de troca (para vir preenchido). */
  ultimasTroca?: Record<string, UltimaExecucao | null>;
  sessaoInicial: SessaoCompleta | null;
  outraSessao: { id: string; treinoId: string | null; nome: string | null } | null;
  sessaoConcluida: SessaoCompleta | null;
  /** Primeiro nome (só aparece no card se o aluno ativar). */
  nomeAluno?: string;
  /** “Meu treino possível hoje”: regra do personal (programa). */
  versaoReduzida?: { permitida: boolean; prioridades: string[] };
  /** Treino extra liberado que usa este treino (vem de /aluno/extra). */
  extra?: { id: string; titulo: string; recuperacao: string | null; tempoDisponivelMin: number | null } | null;
  /** Evolução Inteligente: histórico comparável por exercício e regras do personal. */
  historico?: Record<string, ExecucaoAnterior[]>;
  configEvolucao?: ConfigEvolucao;
  /** Montinho Desbloqueia: sugestões por momento e “por quê” escrito pelo personal. */
  desbloqueia?: PacoteTreino & { porques: Record<string, string> };
};

const METRICA: Record<Descoberta["tipo"], string> = { recorde_carga: "recorde", recorde_reps: "recorde", mais_carga: "mais_carga", mais_reps: "mais_reps", acima_media: "acima_media" };
const identidade = (ex: ExercicioView) => ({ exercicioId: ex.trocado ? null : ex.id, bibliotecaId: ex.biblioteca_id ?? null, nome: ex.nome, tecnica: normalizarTecnica(ex.tecnica) });

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

const CHECKIN_OPCOES = [
  { v: "muito_bem", l: "Muito bem" },
  { v: "normal", l: "Normal" },
  { v: "cansado", l: "Cansado" },
  { v: "desconforto", l: "Com desconforto" },
  { v: "prefiro_nao", l: "Prefiro não responder" },
] as const;

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
  piramide_decrescente: "Pirâmide decrescente: comece mais pesado e vá tirando peso, com mais repetições a cada série (veja a prescrição de cada uma).",
  triset: "Tri-set: três exercícios em sequência, sem descanso entre eles. Descanse só no fim da rodada.",
  combinado: "Combinado: dois exercícios feitos em sequência, sem descanso entre eles.",
  pre_exaustao: "Pré-exaustão: primeiro o exercício isolado, depois o composto, sem descanso entre eles.",
  tres_sete: "3/7: faça 3 repetições, descanse 15 s, depois 4, 5, 6 e 7 repetições, sempre com 15 s de pausa e a mesma carga.",
  super_slow: "Super slow: movimento bem lento, uns 4–5 s subindo e 4–5 s descendo, sem embalo.",
  negativo: "Negativo: capriche na descida, devagar e controlada (3–4 s); a subida pode ser normal.",
};

function repsDaSerie(ex: ExercicioPrescrito, serie: number): string {
  const cfg = ex.series_config as { modo?: string; series?: Array<{ ordem: number; reps: string }> } | null | undefined;
  if (cfg?.modo === "detalhado" && cfg.series?.length) return cfg.series[serie - 1]?.reps ?? ex.reps;
  return ex.reps;
}

export function TreinoAtivoClient({ treino, exercicios, ultimas, perdidas = {}, presencial = null, trocas = {}, ultimasTroca = {}, sessaoInicial, outraSessao, sessaoConcluida, agoraServidor, nomeAluno = "", versaoReduzida = { permitida: false, prioridades: [] }, extra = null, historico = {}, configEvolucao, desbloqueia }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [prefsEvo] = usePrefsEvolucao();
  const [aviso, setAviso] = useState<Descoberta | null>(null);
  const [sugestaoAviso, setSugestaoAviso] = useState<{ id: string; chamada: string } | null>(null);
  const [sugestaoDescanso, setSugestaoDescanso] = useState<{ id: string; chamada: string } | null>(null);
  const [leitura, setLeitura] = useState<ItemRapido | null>(null);
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
  // Status marcado nesta tela (pular / não consegui) antes do servidor confirmar.
  const [statusEx, setStatusEx] = useState<Record<string, string>>({});
  const [percepcaoEx, setPercepcaoEx] = useState<Record<string, PercepcaoExercicio>>({});
  const [perguntandoEsforco, setPerguntandoEsforco] = useState<string | null>(null);
  // Conferência ao concluir: mostra o que falta marcar antes de finalizar.
  const [conferindo, setConferindo] = useState(false);
  const conferenciaRef = useRef<HTMLDivElement>(null);
  // Ritmo: pausas do treino (persistidas no rascunho) e correção do relógio do aparelho.
  const [pausas, setPausas] = useState<{ totalMs: number; desde: number | null }>({ totalMs: 0, desde: null });
  const [offsetMs, setOffsetMs] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- relógio do aparelho só existe no navegador
    setOffsetMs(offsetRelogio(agoraServidor, Date.now()));
  }, [agoraServidor]);
  const [checkinPre, setCheckinPre] = useState<(typeof CHECKIN_OPCOES)[number]["v"] | null>(null);
  const [checkinNota, setCheckinNota] = useState("");
  // Aula presencial: toda chamada leva o aluno da aula (validado no servidor).
  const alunoAula = presencial?.alunoId ?? null;
  const cab = useMemo((): Record<string, string> => { const h: Record<string, string> = {}; if (alunoAula) h[CABECALHO_ALUNO] = alunoAula; return h; }, [alunoAula]);
  const voltarHref = presencial ? presencial.voltarHref : "/aluno/treinar";
  // Meu treino possível hoje: tempo disponível (min) escolhido antes de começar.
  const [tempoDisp, setTempoDisp] = useState<number | null>(null);
  const [tempoOutro, setTempoOutro] = useState("");
  const [pedidoTempo, setPedidoTempo] = useState(false);
  // Opção do aluno para encaixar mais exercícios: descansos 20% menores.
  const [descansoMenor, setDescansoMenor] = useState(false);
  // Troca de exercício: painel aberto e trocas feitas nesta tela (seId → biblioteca_id; null = original).
  const [trocaAberta, setTrocaAberta] = useState<string | null>(null);
  const [trocadoLocal, setTrocadoLocal] = useState<Record<string, string | null>>({});
  const [trocando, setTrocando] = useState(false);
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
      for (const [idx, se] of s.exercicios.entries()) {
        // Já vem preenchido com o que o aluno fez da última vez (ele só ajusta, se precisar).
        const exDoPlano = exercicios.find((e) => e.id === se.exercicio_id) ?? exercicios[idx];
        const anterior = se.substituido_de && se.biblioteca_id ? (ultimasTroca[se.biblioteca_id] ?? null) : exDoPlano ? ultimas[exDoPlano.id] : null;
        // Série a série do último treino: 1ª com a 1ª, 2ª com a 2ª… (aquecimentos fora); série a mais repete a última.
        const validasAntes = anterior?.series.filter((u) => u.tipo !== "aquecimento").sort((a, b) => a.serie - b.serie) ?? [];
        const daUltimaVez = (n: number) => validasAntes[n - 1] ?? validasAntes.at(-1) ?? null;
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
            carga: p?.carga_kg != null ? String(p.carga_kg) : salvo?.carga_kg != null ? String(salvo.carga_kg) : salvo || i <= aquec || daUltimaVez(i - aquec)?.carga_kg == null ? "" : String(daUltimaVez(i - aquec)!.carga_kg).replace(".", ","),
            reps: p?.reps != null ? String(p.reps) : salvo?.reps != null ? String(salvo.reps) : salvo || i <= aquec || daUltimaVez(i - aquec)?.reps == null ? "" : String(daUltimaVez(i - aquec)!.reps),
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
        if (rascunho?.pausas) setPausas(rascunho.pausas);
        const resta = rascunho?.descansoAte ? Math.ceil((rascunho.descansoAte - Date.now()) / 1000) : 0;
        if (resta > 0) setTimer({ seg: resta, key: Date.now(), fim: rascunho!.descansoAte! });
        const jaFez = Object.values(comRascunho).some((l) => l.some((x) => x.concluida));
        if (restaurou || jaFez) toast.success("Você voltou de onde parou. Nada do que registrou foi perdido.");
        hidratadaRef.current = s.id;
      }
    },
    [storage, toast, exercicios, ultimas, ultimasTroca]
  );

  // Grava o rascunho a cada mudança (digitação, exercício aberto, descanso).
  useEffect(() => {
    if (!sessao || !storage || hidratadaRef.current !== sessao.id) return;
    gravarRascunho(storage, sessao.id, { series: rascunhoDasSeries(series, planejadasRef.current), aberto, descansoAte: timer?.fim ?? null, pausas });
  }, [series, aberto, timer, sessao, storage, pausas]);

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
        res = await fetch(`/api/sessoes/${op.sessionId}/series`, { method: "POST", headers: { "Content-Type": "application/json", ...cab }, body: JSON.stringify({ ...op.payload, client_key: op.clientKey }) });
      } else if (op.tipo === "exercicio") {
        res = await fetch(`/api/sessoes/${op.sessionId}/exercicios/${op.payload.session_exercise_id}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...cab }, body: JSON.stringify(op.payload.patch) });
      } else {
        res = await fetch(`/api/sessoes/${op.sessionId}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...cab }, body: JSON.stringify(op.payload) });
      }
      if (res.ok) return { ok: true as const };
      const body = await res.json().catch(() => ({}));
      const definitivo = res.status === 400 || res.status === 404 || res.status === 409 || res.status === 403;
      return { ok: false as const, definitivo, erro: body.error ?? `HTTP ${res.status}` };
    } catch {
      return { ok: false as const, erro: "sem conexão" };
    }
  }, [cab]);

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
      const res = await fetch("/api/sessoes", { method: "POST", headers: { "Content-Type": "application/json", ...cab }, body: JSON.stringify({ treino_id: treino.id, client_key: chave, checkin_pre: checkinPre, checkin_pre_nota: checkinPre === "desconforto" && checkinNota.trim() ? checkinNota.trim() : null, tempo_disponivel_min: extra ? extra.tempoDisponivelMin : possivel && possivel.status !== "inviavel" && possivel.status !== "nao_autorizado" ? tempoDisp : null, descanso_reduzido: !extra && !!possivel?.descansoReduzido && possivel.status !== "inviavel", extra_id: extra?.id ?? null, recuperacao: extra?.recuperacao ?? null }) });
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

  // Bi-set/tri-set: exercícios do mesmo bloco viram uma coisa só na tela.
  function itensDoTreino(): ItemTreino[] {
    if (!sessao) return [];
    return sessao.exercicios.map((se, i) => {
      const e = exercicios.find((x) => x.id === se.exercicio_id) ?? exercicios[i];
      return { id: se.id, bloco: e?.bloco ?? null, tecnica: e?.tecnica ?? null };
    });
  }
  function contagemSeries(mais?: string): Record<string, { feitas: number; planejadas: number }> {
    const c: Record<string, { feitas: number; planejadas: number }> = {};
    for (const [id, l] of Object.entries(series)) {
      const validas = l.filter((x) => x.tipo === "valida");
      c[id] = { feitas: validas.filter((x) => x.concluida).length + (id === mais ? 1 : 0), planejadas: validas.length };
    }
    return c;
  }
  function irParaExercicio(seId: string) {
    setAberto(seId);
    requestAnimationFrame(() => document.getElementById(`ex-${seId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function concluirSerie(seId: string, idx: number, ex: ExercicioView, silencioso = false) {
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
    const ordem = sessao.exercicios.map((x) => x.id);
    // Descanso da versão do dia (pode ter sido encurtado ao começar).
    const doDia = (sessao.snapshot as { exercicios?: ExercicioPrescrito[] } | null)?.exercicios?.find((x) => x.id === ex.id) ?? ex;
    let descanso = descansoAposSerie(doDia, s.serie, ordem.indexOf(seId) === ordem.length - 1, temposSessao);
    // No bi-set: sem descanso entre os exercícios; vai direto para o próximo da rodada.
    let irPara: string | null = null;
    const grupo = s.tipo === "valida" ? gruposDoTreino(itensDoTreino()).find((g) => g.ids.length > 1 && g.ids.includes(seId)) : undefined;
    if (grupo) {
      const r = proximoNoBloco(grupo, seId, contagemSeries(seId));
      irPara = r.proximo !== seId ? r.proximo : null;
      if (!r.fimDaRodada) descanso = null;
    }
    if (!silencioso && descanso && descanso > 0) {
      const seg = descanso;
      const fim = new Date().getTime() + seg * 1000;
      setTimer((t) => ({ seg, key: (t?.key ?? 0) + 1, fim }));
    }
    if (!silencioso && irPara) irParaExercicio(irPara);
    if (!silencioso && navigator.vibrate) navigator.vibrate(30);
    if (!silencioso) {
      const avisou = avisarEvolucao(ex, { serie: s.serie, tipo: s.tipo, carga: payload.carga_kg, reps: payload.reps });
      // Descanso: só depois de algumas séries e se nada foi sugerido nesta sessão.
      const feitas = Object.values(series).flat().filter((x) => x.concluida).length + 1;
      if (!avisou && descanso && descanso > 0 && feitas >= 3) setSugestaoDescanso(proporSugestao("descanso"));
    }
    void sincronizar();
  }

  /** Desbloqueia: no máximo 1 sugestão automática por sessão, só do que o aluno ainda não explorou. */
  function proporSugestao(ctx: ContextoConhecimento): { id: string; chamada: string } | null {
    const id = desbloqueia?.porContexto[ctx];
    if (!sessao || !id) return null;
    const ja = sugestoesDaSessao(sessao.id);
    if (ja.length >= REGRAS_DESBLOQUEIA.sugestoesPorSessao || ja.includes(id)) return null;
    marcarSugestao(sessao.id, id);
    enviarEvento({ tipo: "sugestao_vista", modelo: id, origem: "treino" });
    return { id, chamada: CHAMADA_CONTEXTO[ctx] };
  }
  function abrirLeitura(id: string | null | undefined) {
    const item = id ? desbloqueia?.itens[id] : null;
    if (item) setLeitura(item);
  }

  /** Opção de troca ativa neste exercício da sessão (ou null = o do plano). */
  function trocaAtiva(se: SessaoCompleta["exercicios"][number]): OpcaoTroca | null {
    const bid = se.id in trocadoLocal ? trocadoLocal[se.id] : se.substituido_de ? se.biblioteca_id : null;
    if (!bid) return null;
    const op = (trocas[se.exercicio_id ?? ""]?.opcoes ?? []).find((o) => o.id === bid);
    return op ?? { id: bid, nome: se.nome, grupo: (se.grupo_muscular ?? "outro") as OpcaoTroca["grupo"], rapido: false, motivo: "", alerta: null, video: null };
  }

  /** Troca (ou desfaz) e já preenche peso/reps com a última vez do novo exercício. */
  async function trocarExercicio(se: SessaoCompleta["exercicios"][number], bibliotecaId: string | null) {
    if (!sessao) return;
    setTrocando(true);
    const res = await fetch(`/api/sessoes/${sessao.id}/exercicios/${se.id}/trocar`, { method: "POST", headers: { "Content-Type": "application/json", ...cab }, body: JSON.stringify({ biblioteca_id: bibliotecaId, original: { nome: se.substituido_de?.nome ?? exercicios.find((e) => e.id === se.exercicio_id)?.nome ?? se.nome, biblioteca_id: se.substituido_de ? se.substituido_de.biblioteca_id : (exercicios.find((e) => e.id === se.exercicio_id)?.biblioteca_id ?? null) } }) }).catch(() => null);
    setTrocando(false);
    const corpo = res ? await res.json().catch(() => ({})) : {};
    if (!res?.ok) {
      toast.error(corpo.error ?? "Sem conexão: não deu para trocar agora.");
      return;
    }
    setTrocadoLocal((cur) => ({ ...cur, [se.id]: bibliotecaId }));
    setTrocaAberta(null);
    const exDoPlano = exercicios.find((e) => e.id === se.exercicio_id);
    const anterior = bibliotecaId ? ultimasTroca[bibliotecaId] : exDoPlano ? ultimas[exDoPlano.id] : null;
    const validasAntes = anterior?.series.filter((u) => u.tipo !== "aquecimento").sort((a, b) => a.serie - b.serie) ?? [];
    setSeries((cur) => {
      let n = 0;
      return {
        ...cur,
        [se.id]: (cur[se.id] ?? []).map((x) => {
          if (x.concluida || x.tipo === "aquecimento") return x;
          const u = validasAntes[n++] ?? validasAntes.at(-1) ?? null;
          return { ...x, carga: u?.carga_kg != null ? String(u.carga_kg).replace(".", ",") : "", reps: u?.reps != null ? String(u.reps) : "" };
        }),
      };
    });
    toast.success(bibliotecaId ? "Exercício trocado. Séries e repetições continuam as do seu treino." : "Voltou para o exercício do plano.");
  }

  /** Evolução Inteligente: no máximo 1 aviso por exercício e 3 por sessão (limites do personal). */
  function avisarEvolucao(ex: ExercicioView, serie: SerieReg): boolean {
    if (!sessao || !prefsEvo.durante || configEvolucao?.avisos_ativos === false) return false;
    const permitidas = configEvolucao?.metricas ?? ["recorde", "mais_carga", "mais_reps", "acima_media"];
    const ds = avaliarSerie({ ...identidade(ex), serie, dor: sessao.checkin_pre === "desconforto" }, historico[ex.id] ?? []).filter((d) => permitidas.includes(METRICA[d.tipo] as never));
    const d = principal(ds, { soRecordes: prefsEvo.modo === "recordes" });
    if (!d) return false;
    const chave = `montinho-evo-avisos:${sessao.id}`;
    let mostrados: Array<{ exercicio: string }> = [];
    try {
      mostrados = JSON.parse(localStorage.getItem(chave) ?? "[]");
    } catch {
      mostrados = [];
    }
    if (!podeAvisar(mostrados, ex.nome, { porExercicio: configEvolucao?.max_por_exercicio ?? 1, porSessao: configEvolucao?.max_por_sessao ?? 3 })) return false;
    try {
      localStorage.setItem(chave, JSON.stringify([...mostrados, { exercicio: ex.nome }]));
    } catch {
      /* ignora */
    }
    setAviso(d);
    setSugestaoAviso(d.tipo.startsWith("recorde") ? proporSugestao("recorde") : d.tipo === "mais_reps" ? proporSugestao("mais_reps") : null);
    if (prefsEvo.sons) bipe();
    return true;
  }

  function adicionarSerieExtra(seId: string) {
    const sufixo = gerarClientKey("x").slice(2, 8); // gerado fora do updater (updater precisa ser puro)
    setSeries((cur) => {
      const lista = cur[seId] ?? [];
      const n = lista.length + 1;
      return { ...cur, [seId]: [...lista, { clientKey: `set:${seId}:${n}:${sufixo}`, serie: n, tipo: "valida", carga: "", reps: "", rir: "", desconforto: "", concluida: false, sincronizada: false }] };
    });
  }

  function marcarExercicio(seId: string, status: "pulado" | "nao_consegui" | "concluido", percepcao?: PercepcaoExercicio | null) {
    if (!sessao || !storage) return;
    const patch = percepcao !== undefined ? { status, percepcao } : { status };
    enfileirar(storage, sessao.id, { tipo: "exercicio", sessionId: sessao.id, clientKey: `ex:${seId}:${status}:${percepcao ?? "-"}`, payload: { session_exercise_id: seId, patch } });
    setStatusEx((cur) => ({ ...cur, [seId]: status }));
    if (percepcao) setPercepcaoEx((cur) => ({ ...cur, [seId]: percepcao }));
    setPendentes((n) => n + 1);
    void sincronizar();
  }

  /** Finaliza o exercício com a percepção de esforço e já abre o próximo pendente. */
  function finalizarExercicio(seId: string, percepcao: PercepcaoExercicio | null) {
    if (!sessao) return;
    marcarExercicio(seId, "concluido", percepcao);
    setPerguntandoEsforco(null);
    const ordem = sessao.exercicios.map((x) => x.id);
    const proximo = ordem.slice(ordem.indexOf(seId) + 1).find((id) => {
      const st = statusEx[id] ?? sessao.exercicios.find((x) => x.id === id)?.status;
      return st !== "concluido" && st !== "pulado" && st !== "nao_consegui" && (series[id] ?? []).some((x) => x.tipo === "valida" && !x.concluida);
    });
    setAberto(proximo ?? null);
    if (proximo) setTimeout(() => document.getElementById(`ex-${proximo}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  }

  async function pedirAdaptacao(ex: ExercicioView, seId: string, motivo: "nao_consegui" | "desconforto" | "sem_equipamento", descricao: string) {
    try {
      if (presencial) {
        // Na aula o personal já está vendo: só registra, sem abrir pedido de ajuste.
        marcarExercicio(seId, "nao_consegui");
        setAdaptacaoAberta(null);
        toast.success("Marcado como não feito hoje.");
        return;
      }
      const res = await fetch("/api/adaptacoes", { method: "POST", headers: { "Content-Type": "application/json", ...cab }, body: JSON.stringify({ session_id: sessao?.id ?? null, session_exercise_id: seId, exercicio_id: ex.id, exercicio_nome: ex.nome, motivo, descricao: descricao || null }) });
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
    enfileirar(storage, sessao.id, { tipo: "finalizar", sessionId: sessao.id, clientKey: `fim:${sessao.id}`, payload: { status, feedback_percepcao: feedback, pausado_seg: Math.round((pausas.totalMs + (pausas.desde ? new Date().getTime() + offsetMs - pausas.desde : 0)) / 1000) } });
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
    const res = await fetch(`/api/sessoes/${sessao.id}`, { headers: cab });
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
  // Plano de tempo congelado no início da sessão (snapshot); sem snapshot, usa o treino atual.
  // (o React Compiler memoriza estes cálculos)
  const snapshotSessao = sessao?.snapshot as { treino?: { tempos?: Partial<ParametrosTempo> }; exercicios?: ExercicioPrescrito[] } | null | undefined;
  const temposSessao: Partial<ParametrosTempo> = snapshotSessao?.treino?.tempos ?? treino.tempos ?? {};
  const plano = estimarPrescricao(snapshotSessao?.exercicios ?? exercicios, temposSessao);
  const descansoDoDia = (ex: ExercicioPrescrito) => snapshotSessao?.exercicios?.find((x) => x.id === ex.id)?.descanso_seg ?? ex.descanso_seg;
  const exerciciosFeitos = sessao
    ? sessao.exercicios.filter((se) => {
        const st = statusEx[se.id] ?? se.status;
        if (st === "pulado" || st === "nao_consegui") return true;
        const l = (series[se.id] ?? []).filter((x) => x.tipo === "valida");
        return l.length > 0 && l.every((x) => x.concluida);
      }).length
    : 0;
  function pausar() {
    const agora = new Date().getTime() + offsetMs;
    setPausas((p) => (p.desde ? p : { ...p, desde: agora }));
  }
  function retomar() {
    const agora = new Date().getTime() + offsetMs;
    setPausas((p) => (p.desde ? { totalMs: p.totalMs + Math.max(0, agora - p.desde), desde: null } : p));
  }
  const pendencias = useMemo(
    () => (sessao ? verificarPendencias(sessao.exercicios.map((se, i) => ({ seId: se.id, nome: (exercicios.find((e) => e.id === se.exercicio_id) ?? exercicios[i])?.nome ?? "Exercício", status: statusEx[se.id] ?? se.status })), series) : []),
    [sessao, exercicios, series, statusEx]
  );
  const totalPreenchidas = pendencias.reduce((n, p) => n + p.preenchidas.length, 0);
  const totalFaltam = pendencias.reduce((n, p) => n + p.faltam.length, 0);

  function tentarConcluir() {
    if (!pendencias.length) return void finalizar("concluida");
    setConferindo(true);
    if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
    window.setTimeout(() => conferenciaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }

  function irPara(seId: string) {
    setAberto(seId);
    window.setTimeout(() => document.getElementById(`ex-${seId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function marcarPreenchidasEConcluir() {
    if (!sessao) return;
    for (const p of pendencias) {
      const se = sessao.exercicios.find((x) => x.id === p.seId);
      const ex = se ? exercicios.find((e) => e.id === se.exercicio_id) : undefined;
      if (!ex) continue;
      for (const n of p.preenchidas) {
        const idx = (series[p.seId] ?? []).findIndex((x) => x.serie === n);
        if (idx >= 0) concluirSerie(p.seId, idx, ex, true);
      }
    }
    void finalizar("concluida");
  }

  if (concluida) {
    const base: BaseConclusao = {
      sessaoId: concluida.id,
      status: concluida.status === "abandonada" ? "abandonada" : "concluida",
      nomeTreino: concluida.nome_treino ?? treino.nome,
      series: concluida.series_concluidas,
      seriesPlanejadas: concluida.series_planejadas,
      duracaoMin: concluida.duracao_seg ? Math.max(1, Math.round(concluida.duracao_seg / 60)) : null,
      data: dataLocal(concluida.finalizado_em ?? concluida.iniciado_em),
    };
    if (presencial) {
      // Mesma comemoração do app do aluno (medalhas com "toque para abrir"),
      // para o aluno ver na hora, durante a aula.
      return <TelaChalala base={base} nome={presencial.nomeAluno} presencial={{ nomeAluno: presencial.nomeAluno, voltarHref: presencial.voltarHref, cabecalhos: cab }} />;
    }
    return (
      <TelaChalala base={base} nome={nomeAluno}>
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
                      await fetch(`/api/sessoes/${concluida.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...cab }, body: JSON.stringify({ status: concluida.status === "abandonada" ? "abandonada" : "concluida", feedback_percepcao: f }) }).catch(() => undefined);
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
      </TelaChalala>
    );
  }

  const argsPossivel = tempoDisp && !extra ? { exercicios, tempos: treino.tempos, tempoDisponivelMin: tempoDisp, permiteReduzida: versaoReduzida.permitida, prioridadesMusculares: versaoReduzida.prioridades } : null;
  const possivelNormal = argsPossivel ? treinoPossivel(argsPossivel) : null;
  const possivelMenor = argsPossivel ? treinoPossivel({ ...argsPossivel, descansoReduzido: true }) : null;
  const ganhoDescanso = possivelNormal && possivelMenor ? ganhoDescansoReduzido(possivelNormal, possivelMenor) : { ajuda: false, recuperados: [] };
  const possivel = ganhoDescanso.ajuda && descansoMenor ? possivelMenor : possivelNormal;

  async function pedirAjusteTempo() {
    if (!possivel) return;
    const res = await fetch("/api/adaptacoes", { method: "POST", headers: { "Content-Type": "application/json", ...cab }, body: JSON.stringify({ motivo: "sem_tempo", exercicio_nome: treino.nome, descricao: `Tenho ${possivel.tempoDisponivelMin} min hoje para o treino ${treino.letra} (estimado em ${Math.round(possivel.originalSeg / 60)} min). Pode sugerir uma versão?` }) }).catch(() => null);
    if (res?.ok) {
      setPedidoTempo(true);
      toast.success(`Pedido enviado. O ${BRAND.name} vai ver e responder.`);
    } else toast.error("Não foi possível enviar agora. Tente de novo.");
  }

  if (!sessao) {
    const completoMin = Math.round(estimarPrescricao(exercicios, treino.tempos).totalSeg / 60);
    const adiadosIds = new Set(possivel?.status === "reduzido" ? possivel.adiados.map((a) => a.id) : []);
    const cortesIds = new Set(possivel?.status === "reduzido" ? possivel.cortes.map((c) => c.id) : []);
    const bloqueado = possivel?.status === "inviavel" || possivel?.status === "nao_autorizado";
    return (
      <div className="space-y-5">
        <Link href={voltarHref} className="text-fg-muted text-sm hover:text-fg inline-flex items-center gap-1">
          ← {presencial ? presencial.nomeAluno : "Treinos"}
        </Link>
        <Card className="border-accent/40 bg-grain-strong">
          <CardBody className="space-y-3">
            {presencial ? <p className="rounded-md border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">👥 Aula presencial · registrando para {presencial.nomeAluno}</p> : null}
            <p className="text-[11px] uppercase tracking-wider text-accent font-bold">Treino {treino.letra}</p>
            <h1 className="text-2xl font-bold leading-tight">{treino.nome}</h1>
            <p className="text-sm text-fg-muted">{exercicios.length} exercícios · {exercicios.reduce((n, e) => n + e.series, 0)} séries</p>
            {treino.observacoes ? <p className="text-sm text-fg-muted border-l-2 border-accent/50 pl-3">{treino.observacoes}</p> : null}
            {outraSessao ? (
              <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
                {presencial ? `${presencial.nomeAluno} tem` : "Você tem"} um treino em andamento ({outraSessao.nome}).{" "}
                <Link href={presencial ? `${presencial.voltarHref}/aula/${outraSessao.treinoId}?sessao=${outraSessao.id}` : `/aluno/treino/${outraSessao.treinoId}?sessao=${outraSessao.id}`} className="text-accent underline">
                  Continuar aquele
                </Link>{" "}
                ou comece este agora.
              </div>
            ) : null}
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">Como você está hoje? <span className="font-normal text-fg-subtle">(opcional)</span></legend>
              <div className="flex flex-wrap gap-1.5">
                {CHECKIN_OPCOES.map((o) => (
                  <button key={o.v} type="button" aria-pressed={checkinPre === o.v} onClick={() => setCheckinPre(checkinPre === o.v ? null : o.v)} className={`touch rounded-full border px-3 py-1.5 text-xs font-semibold ${checkinPre === o.v ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>
                    {o.l}
                  </button>
                ))}
              </div>
              {checkinPre === "desconforto" ? (
                <div className="space-y-1.5">
                  <input value={checkinNota} onChange={(e) => setCheckinNota(e.target.value.slice(0, 300))} placeholder="Onde e como? (opcional)" className="h-10 w-full rounded-md border border-border bg-bg px-3 text-sm" aria-label="Descreva o desconforto" />
                  <p className="text-xs text-fg-muted">Respeite seus limites hoje. Se for dor forte ou diferente do normal, fale com o {BRAND.name} antes de treinar. Isso não substitui avaliação profissional.</p>
                </div>
              ) : checkinPre === "cansado" ? (
                <p className="text-xs text-fg-muted">Tudo bem. Faça o que for possível com boa execução; o {BRAND.name} verá como você chegou hoje.</p>
              ) : null}
            </fieldset>
            {extra ? (
              <div className="rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm">
                <p className="font-semibold">Treino extra: {extra.titulo}</p>
                <p className="text-xs text-fg-muted">Liberado pelas regras do {BRAND.name}. Fica registrado separado e não conta na meta semanal.</p>
              </div>
            ) : (
              <fieldset className="space-y-2">
                <legend className="text-sm font-semibold">
                  Quanto tempo você tem hoje? <span className="font-normal text-fg-subtle">(opcional · completo ≈ {completoMin} min)</span>
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {OPCOES_TEMPO_MIN.map((m) => (
                    <button key={m} type="button" aria-pressed={tempoDisp === m && !tempoOutro} onClick={() => { setTempoOutro(""); setPedidoTempo(false); setTempoDisp(tempoDisp === m ? null : m); }} className={`touch rounded-full border px-3 py-1.5 text-xs font-semibold ${tempoDisp === m && !tempoOutro ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>
                      {m} min
                    </button>
                  ))}
                  <label className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-fg-muted">
                    outro
                    <input inputMode="numeric" value={tempoOutro} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 3); setTempoOutro(v); setPedidoTempo(false); setTempoDisp(v && Number(v) >= 10 ? Math.min(240, Number(v)) : null); }} className="w-10 bg-transparent text-center font-mono text-fg outline-none" aria-label="Tempo disponível em minutos" placeholder="—" />
                    min
                  </label>
                </div>
                {possivel ? (
                  <div role="status" className={`rounded-lg border p-3 text-sm space-y-1 ${bloqueado || possivel.apertado ? "border-warning/40 bg-warning/10" : possivel.status === "reduzido" ? "border-accent/40 bg-accent/10" : "border-success/30 bg-success/10"}`}>
                    <p className="font-semibold">{possivel.status === "completo" ? (possivel.apertado ? "Dá para fazer completo, com tempo apertado" : "Cabe no seu tempo") : possivel.status === "reduzido" ? `Versão de hoje: cerca de ${Math.round(possivel.estimadoSeg / 60)} min` : "Sem versão segura para esse tempo"}</p>
                    {possivel.explicacao.slice(possivel.status === "reduzido" ? 1 : 0).map((t) => (
                      <p key={t} className="text-xs text-fg-muted">{t}</p>
                    ))}
                    {possivel.status === "reduzido" || possivel.apertado ? (() => {
                      const lentos = exercicios.filter((e) => !adiadosIds.has(e.id) && trocas[e.id]?.lento && trocas[e.id].opcoes.some((o) => o.rapido)).map((e) => e.nome);
                      return lentos.length ? <p className="text-xs text-fg-muted">⚡ Para ganhar tempo: {lentos.join(", ")} {lentos.length > 1 ? "levam" : "leva"} tempo para montar. No treino, toque em “⇄ Trocar exercício” para usar uma máquina parecida.</p> : null;
                    })() : null}
                    {ganhoDescanso.ajuda && possivelMenor ? (
                      <div className="mt-2 space-y-2 rounded-md border border-border bg-bg/40 p-2.5">
                        <p className="text-xs font-semibold">{descansoMenor ? "⏱ Descanso 20% menor escolhido" : "⏱ Quer encaixar mais? Descanso 20% menor"}</p>
                        <p className="text-xs text-fg-muted">
                          Ex.: 1:30 vira 1:10 (nunca abaixo de 45 s).{" "}
                          {possivelMenor.status === "completo"
                            ? `Assim dá para fazer o treino completo em cerca de ${Math.round(possivelMenor.estimadoSeg / 60)} min.`
                            : `Assim cabe${ganhoDescanso.recuperados.length > 1 ? "m" : ""} também: ${ganhoDescanso.recuperados.join(", ")} (cerca de ${Math.round(possivelMenor.estimadoSeg / 60)} min).`}
                        </p>
                        <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Descanso de hoje">
                          {[false, true].map((v) => (
                            <button key={String(v)} type="button" aria-pressed={descansoMenor === v} onClick={() => setDescansoMenor(v)} className={`touch rounded-lg border px-2 py-1.5 text-xs font-semibold ${descansoMenor === v ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>
                              {v ? "Descanso 20% menor" : "Descanso normal"}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {bloqueado && !presencial ? (
                      pedidoTempo ? <p className="text-xs font-semibold text-success">Pedido de ajuste enviado.</p> : (
                        <button type="button" onClick={() => void pedirAjusteTempo()} className="alvo text-xs font-semibold text-accent underline-offset-2 hover:underline">
                          Pedir ajuste ao {BRAND.name}
                        </button>
                      )
                    ) : null}
                  </div>
                ) : null}
              </fieldset>
            )}
            {bloqueado ? (
              <Button variant="secondary" size="lg" className="w-full touch" loading={iniciando} onClick={() => { setTempoDisp(null); setTempoOutro(""); void iniciar(); }}>
                <Icon name="play" /> Fazer o treino completo mesmo assim
              </Button>
            ) : (
              <Button variant="primary" size="lg" className="w-full touch" loading={iniciando} onClick={iniciar}>
                <Icon name="play" /> {extra ? "Começar treino extra" : possivel?.status === "reduzido" ? `Começar versão de ${Math.round(possivel.estimadoSeg / 60)} min` : "Começar treino"}
              </Button>
            )}
          </CardBody>
        </Card>
        <ol className="space-y-2" aria-label="Exercícios deste treino">
          {exercicios.map((e, i) => (
            <li key={e.id} className={`flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 ${adiadosIds.has(e.id) ? "border-dashed bg-transparent" : ""}`}>
              <span className="w-7 h-7 rounded-full bg-bg border border-border text-xs font-bold flex items-center justify-center text-fg-muted" aria-hidden>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{e.nome}</p>
                <p className="text-xs text-fg-subtle">
                  {cortesIds.has(e.id) ? e.series - 1 : e.series} × {e.reps}
                  {e.descanso_seg ? (possivel?.descansoReduzido && encurtarDescanso(e.descanso_seg) !== e.descanso_seg ? ` · descanso ${encurtarDescanso(e.descanso_seg)}s (era ${e.descanso_seg}s)` : ` · descanso ${e.descanso_seg}s`) : ""}
                  {adiadosIds.has(e.id) ? " · fica para outro dia" : cortesIds.has(e.id) ? " · 1 série a menos hoje" : e.prioridade === "essencial" && possivel?.status === "reduzido" ? " · essencial" : ""}
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
    <div className={`space-y-4 ${timer ? "pb-24" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <Link href={voltarHref} className="text-fg-muted text-sm hover:text-fg inline-flex items-center gap-1">
          ← {presencial ? presencial.nomeAluno : "Treinos"}
        </Link>
        <p className={`text-xs font-semibold ${syncLabel[sync].cor}`} role="status" aria-live="polite">
          {syncLabel[sync].texto}
          {sync === "erro" ? (
            <button type="button" onClick={() => void sincronizar()} className="alvo ml-2 underline">
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

      <RitmoTreino
        plano={plano}
        inicioIso={sessao.iniciado_em}
        offsetMs={offsetMs}
        pausas={pausas}
        seriesFeitas={totalFeito}
        exerciciosFeitos={exerciciosFeitos}
        exerciciosTotal={sessao.exercicios.length}
        onPausar={pausar}
        onRetomar={retomar}
      />

      {presencial ? <p className="rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent">👥 Aula presencial · {presencial.nomeAluno}. Tudo o que você marcar entra no histórico dela(e).</p> : <LembretePush compacto />}

      {aviso ? <AvisoEvolucao d={aviso} animar={prefsEvo.animacoes} onFechar={() => setAviso(null)} sugestao={sugestaoAviso ? { chamada: sugestaoAviso.chamada, onAbrir: () => abrirLeitura(sugestaoAviso.id) } : null} /> : null}
      {leitura ? <LeituraRapida item={leitura} onFechar={() => setLeitura(null)} /> : null}
      {perguntandoEsforco ? <PerguntaEsforco nome={(() => { const i = sessao.exercicios.findIndex((x) => x.id === perguntandoEsforco); const se = sessao.exercicios[i]; return (exercicios.find((e) => e.id === se?.exercicio_id) ?? exercicios[i])?.nome ?? "Exercício"; })()} onEscolher={(p) => finalizarExercicio(perguntandoEsforco, p)} onFechar={() => setPerguntandoEsforco(null)} /> : null}

      {timer ? (
        // Flutua na parte de baixo da tela (perto do polegar), acima do menu do
        // aluno: dá para ver e ajustar o descanso sem rolar a página para cima.
        <div className={`fixed inset-x-3 z-[45] mx-auto max-w-xl drop-shadow-2xl ${presencial ? "bottom-3" : "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-4"}`}>
          <RestTimer key={timer.key} duracaoSeg={timer.seg} autoStart onComplete={() => { setTimer(null); setSugestaoDescanso(null); }} onDismiss={() => { setTimer(null); setSugestaoDescanso(null); }} />
          {sugestaoDescanso ? (
            <button type="button" onClick={() => { abrirLeitura(sugestaoDescanso.id); setSugestaoDescanso(null); }} className="alvo mt-1 block w-full rounded-lg bg-card/95 px-3 py-1.5 text-left text-xs font-semibold text-accent">
              {sugestaoDescanso.chamada} →
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3">
        {(() => {
        const grupos = gruposDoTreino(itensDoTreino());
        const rotulos = rotulosDosExercicios(grupos);
        const cartao = (se: (typeof sessao.exercicios)[number], idx: number) => {
          const exPlano = exercicios.find((e) => e.id === se.exercicio_id) ?? (exercicios[idx] as ExercicioView | undefined);
          if (!exPlano) return null;
          const troca = trocaAtiva(se);
          const ex: ExercicioView = troca ? { ...exPlano, nome: troca.nome, biblioteca_id: troca.id, grupo_muscular: troca.grupo, video: troca.video ? { provider: troca.video.provider as VideoSource["provider"], id: troca.video.id } : null, instrucoes: [], trocado: true } : exPlano;
          const opcoesTroca = trocas[exPlano.id]?.opcoes ?? [];
          const montagemLenta = !troca && !!trocas[exPlano.id]?.lento && opcoesTroca.some((o) => o.rapido);
          const tempoCurto = !!sessao.tempo_disponivel_min;
          const lista = series[se.id] ?? [];
          const feitas = lista.filter((s) => s.tipo === "valida" && s.concluida).length;
          const planejadas = lista.filter((s) => s.tipo === "valida").length;
          const completo = planejadas > 0 && feitas >= planejadas;
          // Séries além do prescrito hoje (feitas com “+ Série extra”).
          const extrasFeitas = Math.max(0, feitas - (se.series_planejadas ?? planejadas));
          const ultima = troca ? (ultimasTroca[troca.id] ?? null) : ultimas[ex.id];
          const expandido = aberto === se.id;
          const detalheTecnica = descreverTecnica({ tecnica: ex.tecnica, tecnicaExtras: ex.tecnica_extras, tecnicaSeries: ex.tecnica_series }, Math.max(0, ex.series - (ex.series_aquecimento ?? 0)));
          const tecnicaTxt = [TECNICA_LABEL[ex.tecnica] ?? "", detalheTecnica ? `Hoje: ${detalheTecnica}.` : ""].filter(Boolean).join(" ");
          const pend = pendencias.find((p) => p.seId === se.id);
          const statusAtual = statusEx[se.id] ?? se.status;
          const podeTrocar = opcoesTroca.length > 0 && statusAtual !== "concluido" && !lista.some((x) => x.tipo !== "aquecimento" && x.concluida);
          const convite = completo && statusAtual !== "concluido" ? conviteSerieExtra(perdidas[ex.id] ?? { exercicio: 0, grupo: 0 }, { rotuloGrupo: ex.grupo_muscular ? GRUPO_LABEL[ex.grupo_muscular] : null, cuidado: sessao.checkin_pre === "desconforto" || sessao.checkin_pre === "cansado" }) : null;
          return (
            <Card key={se.id} id={`ex-${se.id}`} className={`scroll-mt-20 ${conferindo && pend ? "border-warning ring-1 ring-warning/50" : completo ? "border-success/40" : expandido ? "border-accent/40" : ""}`}>
              <CardBody className="p-0">
                <button type="button" onClick={() => setAberto(expandido ? null : se.id)} aria-expanded={expandido} className="w-full flex items-center gap-3 text-left px-4 py-3 touch">
                  <span className={`w-9 h-9 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 ${completo ? "bg-success border-success text-bg" : "bg-bg border-border text-fg-muted"}`} aria-hidden>
                    {completo ? <Icon name="check" size={16} /> : (rotulos[se.id] ?? idx + 1)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-sm leading-tight">
                      {ex.nome}
                      {ex.video ? <span className="ml-1.5 inline-flex items-center rounded-full border border-accent/40 px-1.5 py-px align-middle text-[10px] font-bold text-accent">▶ vídeo</span> : null}
                    </span>
                    <span className="block text-xs text-fg-subtle mt-0.5">
                      {(se.prescricao as { series?: number } | null)?.series ?? ex.series} × {ex.reps}
                      {ex.series_aquecimento ? ` (${ex.series_aquecimento} aquec.)` : ""}
                      {descansoDoDia(ex) ? ` · ${descansoDoDia(ex)}s` : ""}
                      {ex.rir != null ? ` · RIR ${ex.rir}` : ex.ie != null ? ` · esforço ${ex.ie}/10` : ""}
                    </span>
                    {statusAtual === "concluido" ? (
                      <span className="block text-[11px] font-semibold text-success mt-0.5">✓ Finalizado{(percepcaoEx[se.id] ?? se.percepcao) ? ` · ${ROTULO_ESFORCO[(percepcaoEx[se.id] ?? se.percepcao)!]}` : ""}</span>
                    ) : statusAtual === "pulado" || statusAtual === "nao_consegui" ? (
                      <span className="block text-[11px] text-fg-subtle mt-0.5">{statusAtual === "pulado" ? "Pulado hoje" : "Não consegui (pedido enviado)"}</span>
                    ) : conferindo && pend ? (
                      <span className="block text-[11px] font-semibold text-warning mt-0.5">Falta marcar: {listarSeries(pend.faltam)}</span>
                    ) : null}
                  </span>
                  <span className="text-xs font-mono text-fg-subtle shrink-0">
                    {feitas}/{planejadas}
                  </span>
                  <Icon name={expandido ? "up" : "down"} className="text-fg-subtle shrink-0" />
                </button>
                {completo && prefsEvo.aoConcluir ? <ResumoDoExercicio ex={ex} series={lista} historico={troca ? [] : (historico[ex.id] ?? [])} dor={sessao.checkin_pre === "desconforto"} /> : null}

                {expandido ? (
                  <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                    {troca ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 text-xs">
                        <span>⇄ Trocado hoje · no plano: <strong>{exPlano.nome}</strong></span>
                        {podeTrocar ? (
                          <button type="button" disabled={trocando} onClick={() => void trocarExercicio(se, null)} className="alvo font-semibold text-accent underline-offset-2 hover:underline">
                            Voltar ao original
                          </button>
                        ) : null}
                      </div>
                    ) : montagemLenta && tempoCurto && podeTrocar ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
                        <span>⏱ Tempo curto? Este exercício leva tempo para montar (anilhas/peso). Uma máquina parecida é mais rápida.</span>
                        <button type="button" onClick={() => { setTrocaAberta(se.id); requestAnimationFrame(() => document.getElementById(`troca-${se.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })); }} className="alvo font-semibold text-accent underline-offset-2 hover:underline">
                          Ver opções
                        </button>
                      </div>
                    ) : null}
                    {ex.video ? <BotaoVideoTelaCheia source={ex.video} titulo={ex.nome} /> : null}
                    <NotaDoPersonal nota={ex.observacoes} />
                    {!troca && desbloqueia?.porques[ex.id] ? (
                      <details className="rounded-md border border-accent/30 bg-accent-soft/40 px-3 py-2 text-sm" onToggle={(e) => (e.currentTarget.open ? enviarEvento({ tipo: "explicacao_aberta", origem: "treino" }) : undefined)}>
                        <summary className="cursor-pointer font-semibold text-accent">Por que esse exercício está no meu treino?</summary>
                        <p className="mt-1 text-fg">{desbloqueia.porques[ex.id]}</p>
                        <p className="mt-0.5 text-[11px] text-fg-subtle">Escrito pelo {BRAND.name} para você.</p>
                      </details>
                    ) : null}
                    {desbloqueia?.repsAltas && (repsPrescritas(ex.reps) ?? 0) >= REPS_ALTAS ? (
                      <button type="button" onClick={() => abrirLeitura(desbloqueia.repsAltas)} className="alvo text-left text-xs font-semibold text-accent underline-offset-2 hover:underline">
                        Por que {repsPrescritas(ex.reps)} repetições? →
                      </button>
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
                      <div className="grid grid-cols-[28px_1fr_1fr_44px] gap-2 text-[10px] uppercase tracking-wider text-fg-subtle font-semibold px-1">
                        <span>#</span>
                        <span>Carga (kg)</span>
                        <span>Reps</span>
                        <span className="sr-only">Concluir</span>
                      </div>
                      {lista.map((s, i) => {
                        const ref = ultima?.series.find((u) => u.serie === s.serie) ?? ultima?.series.at(-1);
                        return (
                          <div key={s.clientKey} className={`grid grid-cols-[28px_1fr_1fr_44px] gap-2 items-center ${s.tipo === "aquecimento" ? "opacity-80" : ""}`}>
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
                    {convite ? (
                      extrasFeitas >= convite.sugeridas ? (
                        <p role="status" className="rounded-lg border border-success/30 bg-success/10 p-3 text-xs font-semibold text-success">
                          ✓ {extrasFeitas > 1 ? `${extrasFeitas} séries extras feitas` : "Série extra feita"}: já conta no volume da semana.
                        </p>
                      ) : (
                        <div role="note" className={`space-y-2 rounded-lg border p-3 ${convite.tom === "repor" ? "border-accent/40 bg-accent/10" : "border-border bg-bg/40"}`}>
                          <p className="text-sm font-semibold">{convite.titulo}</p>
                          <p className="text-xs text-fg-muted">{convite.texto}</p>
                          <button type="button" onClick={() => adicionarSerieExtra(se.id)} className="touch rounded-md border border-accent/60 px-3 py-2 text-xs font-bold text-accent">
                            + Fazer série extra agora
                          </button>
                        </div>
                      )
                    ) : null}
                    {completo && statusAtual !== "concluido" ? (
                      <button type="button" onClick={() => setPerguntandoEsforco(se.id)} className="touch flex w-full items-center justify-center gap-2 rounded-lg bg-success px-4 py-3 text-base font-bold text-bg">
                        <Icon name="check" size={18} /> Finalizar exercício
                      </button>
                    ) : null}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button type="button" onClick={() => adicionarSerieExtra(se.id)} className="touch rounded-md border border-border px-3 py-2 text-xs font-semibold text-fg-muted hover:text-fg">
                        + Série extra
                      </button>
                      {podeTrocar ? (
                        <button type="button" onClick={() => { const abrir = trocaAberta !== se.id; setTrocaAberta(abrir ? se.id : null); if (abrir) requestAnimationFrame(() => document.getElementById(`troca-${se.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })); }} aria-expanded={trocaAberta === se.id} className="touch rounded-md border border-border px-3 py-2 text-xs font-semibold text-fg-muted hover:text-fg">
                          ⇄ Trocar exercício
                        </button>
                      ) : null}
                      <button type="button" onClick={() => setAdaptacaoAberta(adaptacaoAberta === se.id ? null : se.id)} className="touch rounded-md border border-border px-3 py-2 text-xs font-semibold text-fg-muted hover:text-fg">
                        Não consegui este exercício
                      </button>
                      <button type="button" onClick={() => marcarExercicio(se.id, "pulado")} className="touch rounded-md border border-border px-3 py-2 text-xs font-semibold text-fg-subtle hover:text-fg">
                        Pular hoje
                      </button>
                    </div>
                    {trocaAberta === se.id ? (
                      <div id={`troca-${se.id}`} role="dialog" aria-label={`Trocar ${exPlano.nome}`} className="scroll-mt-24 space-y-2 rounded-lg border border-accent/40 bg-bg/60 p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">Trocar por</p>
                          <button type="button" onClick={() => setTrocaAberta(null)} aria-label="Fechar" className="alvo text-fg-muted hover:text-fg">✕</button>
                        </div>
                        <p className="text-xs text-fg-muted">Mesmas séries, repetições e descanso do seu treino. Você marca peso e repetições normalmente.</p>
                        <ul className="space-y-1.5">
                          {opcoesTroca.filter((o) => o.id !== troca?.id).map((o) => (
                            <li key={o.id}>
                              <button type="button" disabled={trocando} onClick={() => void trocarExercicio(se, o.id)} className="touch w-full rounded-lg border border-border px-3 py-2 text-left hover:border-accent disabled:opacity-60">
                                <span className="block text-sm font-semibold">
                                  {o.nome}
                                  {o.rapido ? <span className="ml-1.5 rounded-full border border-success/50 px-1.5 py-px align-middle text-[10px] font-bold text-success">⚡ monta rápido</span> : null}
                                  {o.video ? <span className="ml-1.5 rounded-full border border-accent/40 px-1.5 py-px align-middle text-[10px] font-bold text-accent">▶ vídeo</span> : null}
                                </span>
                                <span className="block text-[11px] text-fg-subtle">
                                  {o.motivo}
                                  {ultimasTroca[o.id] ? ` · última vez: ${ultimasTroca[o.id]!.series.filter((x) => x.tipo !== "aquecimento").map((x) => `${x.carga_kg ?? "—"}kg×${x.reps ?? "—"}`).slice(0, 2).join(", ")}` : ""}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {adaptacaoAberta === se.id ? <AdaptacaoForm onEnviar={(motivo, desc) => pedirAdaptacao(ex, se.id, motivo, desc)} onCancelar={() => setAdaptacaoAberta(null)} /> : null}
                  </div>
                ) : null}
              </CardBody>
            </Card>
          );
        };
        const porId = new Map(sessao.exercicios.map((se, idx) => [se.id, { se, idx }]));
        const nomeDe = (id: string) => {
          const x = porId.get(id);
          const e = x ? (exercicios.find((y) => y.id === x.se.exercicio_id) ?? exercicios[x.idx]) : null;
          return trocaAtiva(x?.se as (typeof sessao.exercicios)[number])?.nome ?? e?.nome ?? "";
        };
        const cont = contagemSeries();
        return grupos.map((g) => {
          if (g.ids.length < 2) {
            const x = porId.get(g.ids[0]);
            return x ? cartao(x.se, x.idx) : null;
          }
          const rod = rodadaDoBloco(g, cont);
          const metodo = METODOS.find((m) => m.v === g.tecnica)?.l ?? "Bi-set";
          const agora = rod.concluido ? null : (g.ids.find((id) => (cont[id]?.feitas ?? 0) < (cont[id]?.planejadas ?? 0) && (cont[id]?.feitas ?? 0) < rod.atual) ?? null);
          const sequencia = g.ids.map((id) => rotulos[id]).join(" + ");
          return (
            <section key={g.ids.join("-")} aria-label={`${metodo} ${sequencia}`} className="overflow-hidden rounded-2xl border-2 border-accent/70 bg-accent/[0.06]">
              <div className="space-y-1.5 bg-accent/15 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-extrabold uppercase tracking-wide text-accent">🔗 {metodo} · {sequencia}</p>
                  {rod.total ? <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold text-bg">{rod.concluido ? "✓ concluído" : `Rodada ${rod.atual} de ${rod.total}`}</span> : null}
                </div>
                <p className="text-xs text-fg-muted">Faça {g.ids.length === 2 ? "os dois" : `os ${g.ids.length}`} em sequência, <strong className="text-fg">sem descanso entre eles</strong>. Descanse só depois do último — isso é 1 rodada.</p>
                {agora ? (
                  <button type="button" onClick={() => irParaExercicio(agora)} className="touch flex w-full items-center justify-between gap-2 rounded-lg border border-accent/50 bg-bg/60 px-3 py-2 text-left text-sm">
                    <span className="min-w-0 truncate"><span className="font-bold text-accent">Agora: {rotulos[agora]}</span> · {nomeDe(agora)}</span>
                    <span className="shrink-0 text-accent" aria-hidden>→</span>
                  </button>
                ) : null}
              </div>
              <div className="space-y-0 p-2">
                {g.ids.map((id, k) => {
                  const x = porId.get(id);
                  return (
                    <div key={id}>
                      {k > 0 ? <p className="py-1 text-center text-[11px] font-bold text-accent">↓ em seguida, sem descanso</p> : null}
                      {x ? cartao(x.se, x.idx) : null}
                    </div>
                  );
                })}
                <p className="pt-2 text-center text-[11px] font-semibold text-accent">⏱ Descanso só no fim da rodada</p>
              </div>
            </section>
          );
        });
        })()}
      </div>

      <Card className={conferindo && pendencias.length ? "border-warning" : "border-success/30"}>
        <CardBody className="space-y-3">
          {conferindo && pendencias.length ? (
            <div ref={conferenciaRef} role="alert" className="space-y-3">
              <p className="font-bold text-warning">{totalFaltam === 1 ? "Falta marcar 1 série" : `Faltam marcar ${totalFaltam} séries`}</p>
              <p className="text-sm text-fg-muted">
                {totalPreenchidas === 1 ? "1 já está preenchida: só falta tocar no ✓. " : totalPreenchidas ? `${totalPreenchidas} já estão preenchidas: só falta tocar no ✓. ` : ""}Confira antes de concluir — o que não for marcado não entra no seu histórico.
              </p>
              <ul className="space-y-1.5">
                {pendencias.map((p) => (
                  <li key={p.seId} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block font-semibold truncate">{p.nome}</span>
                      <span className="block text-xs text-fg-subtle">
                        {listarSeries(p.faltam)}
                        {p.preenchidas.length ? ` · ${p.preenchidas.length === p.faltam.length ? (p.faltam.length === 1 ? "preenchida, sem ✓" : "preenchidas, sem ✓") : `${listarSeries(p.preenchidas)} já ${p.preenchidas.length === 1 ? "preenchida" : "preenchidas"}`}` : ""}
                      </span>
                    </span>
                    <button type="button" onClick={() => irPara(p.seId)} className="touch shrink-0 rounded-md border border-accent px-3 py-1.5 text-xs font-bold text-accent">
                      Ir marcar
                    </button>
                  </li>
                ))}
              </ul>
              {totalPreenchidas ? (
                <Button variant="success" size="lg" className="w-full touch" loading={finalizando} onClick={marcarPreenchidasEConcluir}>
                  {totalPreenchidas === 1 ? (totalFaltam === 1 ? "Marcar a série e concluir" : "Marcar a série preenchida e concluir") : totalPreenchidas === totalFaltam ? `Marcar as ${totalPreenchidas} e concluir` : `Marcar as ${totalPreenchidas} preenchidas e concluir`}
                </Button>
              ) : null}
              <Button variant={totalPreenchidas ? "secondary" : "success"} size="lg" className="w-full touch" loading={finalizando && !totalPreenchidas} onClick={() => finalizar("concluida")}>
                Concluir assim mesmo
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-fg-muted text-center">
                {totalFeito >= totalPlanejado ? "Todas as séries registradas." : totalPlanejado - totalFeito === 1 ? "1 série ainda sem marcar." : `${totalPlanejado - totalFeito} séries ainda sem marcar.`}
              </p>
              <Button variant="success" size="lg" className="w-full touch" loading={finalizando} onClick={tentarConcluir}>
                Concluir treino
              </Button>
            </>
          )}
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


/** Síntese ao concluir o exercício: o que foi feito e a comparação confiável (se houver). */
function ResumoDoExercicio({ ex, series, historico, dor }: { ex: ExercicioView; series: SerieLocal[]; historico: ExecucaoAnterior[]; dor: boolean }) {
  const regs: SerieReg[] = series.filter((s) => s.concluida).map((s) => ({ serie: s.serie, tipo: s.tipo, carga: s.carga.trim() === "" ? null : Number(s.carga.replace(",", ".")), reps: s.reps.trim() === "" ? null : Math.round(Number(s.reps.replace(",", "."))) }));
  const r = resumirExercicio({ ...identidade(ex), dor }, regs, historico);
  const kg = (n: number) => `${String(n).replace(".", ",")} kg`;
  return (
    <div className="mx-4 mb-3 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-xs">
      <p className="font-bold uppercase tracking-wider text-success">Exercício concluído</p>
      <p className="text-fg-muted">Hoje: {r.series} {r.series === 1 ? "série" : "séries"}{r.melhor ? ` · melhor série ${kg(r.melhor.carga)} × ${r.melhor.reps}` : ""}</p>
      {r.comparacao?.anterior ? <p className="text-fg-muted">Última sessão: {kg(r.comparacao.anterior.carga)} × {r.comparacao.anterior.reps} · hoje: {kg(r.comparacao.atual.carga)} × {r.comparacao.atual.reps}</p> : null}
      <p className="mt-0.5 font-semibold text-fg">{r.mensagem}</p>
    </div>
  );
}

const ROTULO_ESFORCO: Record<PercepcaoExercicio, string> = { muito_leve: "Muito leve", moderado: "Moderado", pesado: "Pesado", muito_pesado: "Muito pesado" };
const OPCOES_ESFORCO: Array<{ v: PercepcaoExercicio; titulo: string; desc: string; emoji: string }> = [
  { v: "muito_leve", titulo: "Muito leve", desc: "Sobrou bastante: daria para fazer muito mais.", emoji: "🙂" },
  { v: "moderado", titulo: "Moderado", desc: "Exigiu esforço, mas com folga no fim.", emoji: "💪" },
  { v: "pesado", titulo: "Pesado", desc: "Cheguei perto do meu limite.", emoji: "🔥" },
];

/** Percepção de esforço ao finalizar o exercício: 1 toque, sem bloquear o treino. */
function PerguntaEsforco({ nome, onEscolher, onFechar }: { nome: string; onEscolher: (p: PercepcaoExercicio | null) => void; onFechar: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Como foi esse exercício?" className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={onFechar}>
      <div className="mx-auto w-full max-w-md space-y-3 rounded-t-2xl border border-border bg-card p-4 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Percepção de esforço</p>
            <p className="text-base font-bold leading-tight">Como foi {nome}?</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="alvo -mr-1 -mt-1 text-fg-muted hover:text-fg">✕</button>
        </div>
        <div className="grid gap-2">
          {OPCOES_ESFORCO.map((o) => (
            <button key={o.v} type="button" onClick={() => onEscolher(o.v)} className="touch flex items-center gap-3 rounded-xl border border-border bg-bg px-4 py-3 text-left hover:border-accent">
              <span className="text-2xl" aria-hidden>{o.emoji}</span>
              <span>
                <span className="block font-bold">{o.titulo}</span>
                <span className="block text-xs text-fg-muted">{o.desc}</span>
              </span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => onEscolher(null)} className="alvo w-full text-center text-sm text-fg-muted underline-offset-2 hover:underline">Finalizar sem responder</button>
      </div>
    </div>
  );
}
