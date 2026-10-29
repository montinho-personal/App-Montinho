"use client";

// Treino livre em andamento: a pessoa escolhe o exercício na hora, anota as
// séries (carga × repetições, normal/aquecimento/técnica), a técnica do
// exercício e uma anotação. Cada série é gravada ao tocar no ✓.
import { RecadosAoVivo } from "@/components/ao-vivo/RecadosAoVivo";
import { TelaAcesaTreino } from "@/components/treinos/TelaAcesa";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { RestTimer } from "@/components/ui/RestTimer";
import { GRUPO_LABEL } from "@/lib/grupos";
import { EscolherExercicio, type ItemBusca } from "@/components/livre/EscolherExercicio";
import { lerCarga, lerReps, tiposDeSerie } from "@/lib/treino/livre";
import { EscolherTecnica, type EscolhaTecnica } from "@/components/livre/EscolherTecnica";
import { SerieEmBlocos, type BlocoDigitado } from "@/app/(aluno)/aluno/treino/[treinoId]/SerieEmBlocos";
import { blocosPlanejados, configEfetiva, registraEmBlocos, somaBlocos, type ConfigTecnica } from "@/lib/treino/tecnica-config";
import { codigoBloco, configDasRespostas, infoTecnica, respostasPadrao, juntaExercicios, juntarBlocosAdjacentes, proximoDaRodada, resumoEscolha, seriesComTecnica } from "@/lib/treino/tecnica-aluno";
import { gruposDoTreino, rotulosDosExercicios } from "@/lib/treino/blocos";
import { COR_TECNICA } from "@/lib/volume/tecnicas";
import type { Tecnica } from "@/lib/volume/calcular";
import type { SerieTipo } from "@/lib/supabase/types-sessoes";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";
import { PlacarMetas } from "@/components/livre-metas/PlacarMetas";
import { avisoDaSerie, contaNoPlacar, linhaDoGrupo, somarNoPlacar, sugestaoDeAgora, type LinhaPlacar } from "@/lib/treino/livre-metas";

export type SerieTela = { key: string; serie: number; tipo: SerieTipo; carga: string; reps: string; salva: boolean; /** Série em blocos (rest-pause, drop-set…): cada pedaço. */ blocos?: BlocoDigitado[]; /** Técnica só desta série (ex.: pirâmide e, na última, um drop-set). */ tec?: { tecnica: string; config: ConfigTecnica | null } };
export type ExercicioTela = { seId: string; nome: string; grupo: GrupoMuscular | null; tecnica: string; /** Como a técnica é feita (finalização × séries, blocos). */ config: ConfigTecnica | null; /** Bi-set/tri-set: mesmo código = juntos. */ bloco: string | null; observacao: string; ultima: string | null; series: SerieTela[] };

/** Técnicas que dá para pôr numa série só (“⚡ Série com técnica”). */
const TECNICAS_DA_SERIE = ["dropset", "rest_pause", "myo_reps", "cluster", "tres_sete"] as const;
const configDaSerie = (t: string): ConfigTecnica | null => configDasRespostas(t, { ...respostasPadrao(t), onde: "finalizar", series: 1 });

/**
 * Técnica da série registrada em blocos: a do exercício (configurada) ou a
 * escolhida só para esta série. Série salva de técnica diferente da do
 * exercício (ao reabrir) volta com a configuração padrão da técnica.
 */
function tecDaSerie(e: ExercicioTela, s: SerieTela): { tecnica: string; config: ConfigTecnica | null } | null {
  if (s.tec) return s.tec;
  if (!registraEmBlocos(s.tipo)) return null;
  if (s.tipo === e.tecnica) return e.config ? { tecnica: e.tecnica, config: e.config } : null;
  return { tecnica: s.tipo, config: configDaSerie(s.tipo) };
}
/** Série desta linha registrada em blocos. */
const emBlocos = (e: ExercicioTela, s: SerieTela) => !!tecDaSerie(e, s);

/**
 * Séries do exercício depois de escolher a técnica: as salvas ficam; as vazias
 * dão lugar às da técnica. Finalização = séries normais + N da técnica no fim;
 * “em N séries” = N séries da técnica.
 */
function seriesParaTecnica(e: ExercicioTela, tecnica: string, config: ConfigTecnica | null, chave: () => string): SerieTela[] {
  const tipoTec = infoTecnica(tecnica)?.serie;
  const n = tipoTec && registraEmBlocos(tipoTec) ? seriesComTecnica(tecnica, config) : 0;
  const ficam = e.series.filter((s) => s.salva || ((s.carga.trim() || s.reps.trim()) && !registraEmBlocos(s.tipo)));
  const out: SerieTela[] = ficam.map((s) => (s.salva ? s : { ...s, tipo: s.tipo === "aquecimento" ? "aquecimento" : "valida", blocos: undefined }));
  const ult = [...out].reverse().find((s) => s.tipo === "valida");
  if (n && tipoTec) {
    const fin = configEfetiva(tecnica, config)?.aplicar === "finalizacao";
    // Finalização sem nenhuma série normal ainda: começa por uma normal.
    if (fin && !out.some((s) => s.tipo === "valida")) out.push({ key: chave(), serie: 0, tipo: "valida", carga: "", reps: "", salva: false });
    for (let i = 0; i < n; i++) out.push({ key: chave(), serie: 0, tipo: tipoTec, carga: ult?.carga ?? "", reps: "", salva: false, blocos: [] });
  } else if (!out.some((s) => !s.salva)) {
    out.push({ key: chave(), serie: 0, tipo: "valida", carga: ult?.carga ?? "", reps: "", salva: false });
  }
  return out.map((s, i) => ({ ...s, serie: i + 1 }));
}

const novaChave = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
/** Descanso depois da série, igual ao treino normal (aquecimento descansa menos). */
const DESCANSO_SEG = { valida: 90, aquecimento: 60 } as const;

const relogio = (seg: number) => `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}`;
const FEEDBACK = [
  { id: "leve", rotulo: "😌 Leve" },
  { id: "ok", rotulo: "💪 Na medida" },
  { id: "pesado", rotulo: "🥵 Pesado" },
  { id: "dor", rotulo: "⚠️ Senti dor" },
] as const;

async function chamar(url: string, metodo: string, corpo: unknown): Promise<{ ok: boolean; json: Record<string, unknown> }> {
  try {
    const r = await fetch(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
    return { ok: r.ok, json: ((await r.json().catch(() => ({}))) ?? {}) as Record<string, unknown> };
  } catch {
    return { ok: false, json: { error: "Sem conexão. Confira a internet e tente de novo." } };
  }
}

export function LivreClient({ sessaoId, iniciadoEm, itens, inicial, extra = false, voltar = "/aluno", metas }: { sessaoId: string; iniciadoEm: string; itens: ItemBusca[]; inicial: ExercicioTela[]; extra?: boolean; voltar?: string; /** Treino livre por metas: placar da semana (com o que já foi salvo neste treino) e o contexto da sugestão. */ metas?: { placar: LinhaPlacar[]; hoje: string; recentes: GrupoMuscular[] } | null }) {
  const router = useRouter();
  // Ao abrir (ou voltar), todo exercício já tem onde anotar: as séries da técnica que faltam ou uma série vazia.
  const [exs, setExs] = useState<ExercicioTela[]>(() =>
    inicial.map((e) => {
      if (e.series.some((x) => !x.salva)) return e;
      const tipoTec = infoTecnica(e.tecnica)?.serie;
      const feitasTec = e.series.filter((x) => x.tipo === tipoTec).length;
      if (e.config && tipoTec && registraEmBlocos(tipoTec) && feitasTec < seriesComTecnica(e.tecnica, e.config)) return { ...e, series: seriesParaTecnica(e, e.tecnica, e.config, novaChave).slice(0, e.series.length + seriesComTecnica(e.tecnica, e.config) - feitasTec + (e.series.some((x) => x.tipo === "valida") ? 0 : 1)) };
      const ult = e.series.at(-1);
      return { ...e, series: [...e.series, { key: novaChave(), serie: e.series.length + 1, tipo: ult && ult.tipo !== "aquecimento" && !registraEmBlocos(ult.tipo) ? ult.tipo : "valida", carga: ult?.carga ?? "", reps: "", salva: false }] };
    })
  );
  const [aberto, setAberto] = useState<string | null>(inicial.at(-1)?.seId ?? null);
  const [buscando, setBuscando] = useState(inicial.length === 0);
  const [erro, setErro] = useState<string | null>(null);
  // Erro de um exercício aparece dentro do cartão dele (perto do botão tocado), não lá no topo.
  const [erroEx, setErroEx] = useState<{ seId: string; texto: string } | null>(null);
  // Séries sendo salvas/apagadas agora: o botão mostra que está trabalhando e não aceita outro toque.
  const [trabalhando, setTrabalhando] = useState<Set<string>>(() => new Set());
  const marcar = (key: string, on: boolean) => setTrabalhando((t) => { const n = new Set(t); if (on) n.add(key); else n.delete(key); return n; });
  const [ocupado, setOcupado] = useState(false);
  // Relógio só depois de abrir no aparelho (o servidor não sabe a hora do celular).
  const [agora, setAgora] = useState<number | null>(null);
  const [timer, setTimer] = useState<{ seg: number; key: number } | null>(null);
  const [terminando, setTerminando] = useState(false);
  const [feedback, setFeedback] = useState<(typeof FEEDBACK)[number]["id"] | null>(null);
  const [comentario, setComentario] = useState("");
  const [placar, setPlacar] = useState<LinhaPlacar[]>(metas?.placar ?? []);
  const [aviso, setAviso] = useState<string | null>(null);
  const [verPlacar, setVerPlacar] = useState(false);
  // Técnica: exercício com a janela aberta e o bi-set esperando o exercício novo da busca.
  const [escolhendoSerie, setEscolhendoSerie] = useState<string | null>(null);
  const [tecnicaDe, setTecnicaDe] = useState<string | null>(null);
  const [aJuntar, setAJuntar] = useState<{ ids: string[]; tecnica: Tecnica; faltam: number; bloco: string } | null>(null);
  const jaHoje = [...new Set(exs.filter((e) => e.series.some((s) => s.salva && contaNoPlacar(s.tipo))).map((e) => linhaDoGrupo(placar, e.grupo)?.grupo).filter((g): g is GrupoMuscular => !!g))];
  const sugestao = metas && placar.length ? sugestaoDeAgora(placar, { hoje: metas.hoje, recentes: metas.recentes, jaHoje }) : null;
  // Séries que já estão no placar (as salvas antes de abrir a tela já vêm na conta do servidor).
  const contadas = useRef(new Set(inicial.flatMap((e) => e.series.filter((x) => x.salva && contaNoPlacar(x.tipo)).map((x) => x.key))));
  /** Põe/tira a série do placar (só uma vez por série) e avisa quando entra na faixa ou chega no limite. */
  function contarNoPlacar(e: ExercicioTela, s: SerieTela, conta: boolean) {
    const ja = contadas.current.has(s.key);
    if (!placar.length || ja === conta) return;
    const antes = linhaDoGrupo(placar, e.grupo);
    if (!antes) return;
    if (conta) contadas.current.add(s.key);
    else contadas.current.delete(s.key);
    // Atualização em cima do placar mais recente: salvar várias séries seguidas não perde nenhuma.
    setPlacar((atual) => {
      const linha = linhaDoGrupo(atual, e.grupo);
      if (conta && linha) setAviso(avisoDaSerie(linha.feitas, linha.feitas + 1, linha));
      return somarNoPlacar(atual, e.grupo, conta ? 1 : -1);
    });
  }

  useEffect(() => {
    const primeiro = window.setTimeout(() => setAgora(Date.now()), 0);
    const t = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => {
      window.clearTimeout(primeiro);
      window.clearInterval(t);
    };
  }, []);
  const decorrido = agora === null ? 0 : Math.max(0, Math.round((agora - new Date(iniciadoEm).getTime()) / 1000));
  const seriesFeitas = exs.reduce((n, e) => n + e.series.filter((s) => s.salva && s.tipo !== "aquecimento").length, 0);

  const mudarEx = (seId: string, f: (e: ExercicioTela) => ExercicioTela) => setExs((l) => l.map((e) => (e.seId === seId ? f(e) : e)));
  const mudarSerie = (seId: string, key: string, patch: Partial<SerieTela>) => mudarEx(seId, (e) => ({ ...e, series: e.series.map((s) => (s.key === key ? { ...s, ...patch } : s)) }));

  // Um toque basta: fecha a busca na hora e ignora toques repetidos enquanto adiciona.
  const adicionando = useRef(false);
  async function adicionar(corpo: { biblioteca_id?: string; nome_livre?: string }) {
    if (adicionando.current) return;
    adicionando.current = true;
    setOcupado(true);
    setBuscando(false);
    setErro(null);
    const r = await chamar(`/api/livre/${sessaoId}/exercicios`, "POST", { client_key: novaChave(), tecnica: "normal", ...corpo });
    adicionando.current = false;
    setOcupado(false);
    if (!r.ok) {
      setBuscando(true);
      return setErro(String(r.json.error ?? "Não foi possível adicionar agora."));
    }
    const seId = String(r.json.id);
    setExs((l) => [...l, { seId, nome: String(r.json.nome), grupo: (r.json.grupo as GrupoMuscular | null) ?? null, tecnica: "normal", config: null, bloco: null, observacao: "", ultima: (r.json.ultima as string | null) ?? null, series: [{ key: novaChave(), serie: 1, tipo: "valida", carga: "", reps: "", salva: false }] }]);
    setBuscando(false);
    // Bi-set/tri-set esperando este exercício: entra junto.
    if (aJuntar) {
      const ids = [...aJuntar.ids, seId];
      await juntar(ids, aJuntar.tecnica, aJuntar.bloco);
      if (aJuntar.faltam > 1) {
        setAJuntar({ ...aJuntar, ids, faltam: aJuntar.faltam - 1 });
        setBuscando(true);
      } else {
        setAJuntar(null);
        setAberto(ids[0]);
        setAviso(`⚡ ${infoTecnica(aJuntar.tecnica)?.nome} montado! Faça um exercício depois do outro, sem descanso no meio.`);
      }
      return;
    }
    setAberto(seId);
  }

  /** Junta exercícios em bi-set/tri-set (grava em cada um e deixa lado a lado na tela). */
  async function juntar(ids: string[], tecnica: Tecnica, bloco: string) {
    setExs((l) => juntarBlocosAdjacentes(l.map((x) => (ids.includes(x.seId) ? { ...x, tecnica, config: null, bloco, series: x.series.map((y) => (y.salva || !registraEmBlocos(y.tipo) ? y : { ...y, tipo: "valida", blocos: undefined })) } : x))));
    for (const id of ids) {
      const r = await chamar(`/api/livre/${sessaoId}/exercicios/${id}`, "PATCH", { tecnica, tecnica_config: null, bloco });
      if (!r.ok) setErroEx({ seId: id, texto: String(r.json.error ?? "Não foi possível juntar agora.") });
    }
  }

  /** Separa o bi-set/tri-set: cada exercício volta a ser normal. */
  async function separar(bloco: string) {
    const ids = exs.filter((x) => x.bloco === bloco).map((x) => x.seId);
    setExs((l) => l.map((x) => (x.bloco === bloco ? { ...x, tecnica: "normal", bloco: null } : x)));
    for (const id of ids) await chamar(`/api/livre/${sessaoId}/exercicios/${id}`, "PATCH", { tecnica: "normal", tecnica_config: null, bloco: null });
  }

  /** Aplica a técnica escolhida na janela: grava e já ajusta as séries (ou junta os exercícios). */
  async function aplicarTecnica(e: ExercicioTela, esc: EscolhaTecnica) {
    setTecnicaDe(null);
    setErroEx(null);
    // Saindo de um bi-set: o parceiro que sobrar sozinho volta a ser normal.
    if (e.bloco && !juntaExercicios(esc.tecnica)) {
      const resto = exs.filter((x) => x.bloco === e.bloco && x.seId !== e.seId);
      if (resto.length === 1) await separar(e.bloco);
    }
    if (juntaExercicios(esc.tecnica)) {
      const bloco = e.bloco ?? codigoBloco(exs.map((x) => x.bloco));
      const ids = [e.seId, ...esc.parceiros];
      await juntar(ids, esc.tecnica, bloco);
      if (esc.novos > 0) {
        setAJuntar({ ids, tecnica: esc.tecnica, faltam: esc.novos, bloco });
        setBuscando(true);
      } else setAviso(`⚡ ${infoTecnica(esc.tecnica)?.nome} montado! Faça um exercício depois do outro, sem descanso no meio.`);
      return;
    }
    mudarEx(e.seId, (x) => ({ ...x, tecnica: esc.tecnica, config: esc.config, bloco: null, series: seriesParaTecnica(x, esc.tecnica, esc.config, novaChave) }));
    const r = await chamar(`/api/livre/${sessaoId}/exercicios/${e.seId}`, "PATCH", { tecnica: esc.tecnica, tecnica_config: esc.config, bloco: null });
    if (!r.ok) setErroEx({ seId: e.seId, texto: String(r.json.error ?? "Não foi possível salvar a técnica agora.") });
  }

  function maisSerie(e: ExercicioTela) {
    const ult = e.series.at(-1);
    // Finalização: a série nova é normal e entra antes da(s) série(s) da técnica.
    if (e.config && configEfetiva(e.tecnica, e.config)?.aplicar === "finalizacao" && ult && emBlocos(e, ult)) {
      const normal = [...e.series].reverse().find((x) => x.tipo === "valida");
      mudarEx(e.seId, (x) => {
        const i = x.series.findIndex((y) => emBlocos(x, y) && !y.salva);
        const nova: SerieTela = { key: novaChave(), serie: 0, tipo: "valida", carga: normal?.carga ?? "", reps: normal?.reps ?? "", salva: false };
        const lista = i < 0 ? [...x.series, nova] : [...x.series.slice(0, i), nova, ...x.series.slice(i)];
        return { ...x, series: lista.map((y, k) => ({ ...y, serie: k + 1 })) };
      });
      return;
    }
    // Depois de uma série com técnica só dela, a próxima volta a ser normal.
    const daSerie = !!ult && emBlocos(e, ult) && !(e.config && ult.tipo === e.tecnica);
    const tipo = ult?.tipo === "aquecimento" || daSerie ? "valida" : (ult?.tipo ?? "valida");
    const normal = [...e.series].reverse().find((x) => x.tipo === "valida");
    mudarEx(e.seId, (x) => ({ ...x, series: [...x.series, { key: novaChave(), serie: (ult?.serie ?? 0) + 1, tipo, carga: (daSerie ? normal?.carga : ult?.carga) ?? "", reps: daSerie ? (normal?.reps ?? "") : ult && emBlocos(x, ult) ? "" : (ult?.reps ?? ""), salva: false, ...(ult && emBlocos(x, ult) && !daSerie ? { blocos: [] } : {}) }] }));
  }

  /** “⚡ Série com técnica”: uma série só com a técnica escolhida (o resto do exercício fica como está). */
  function serieComTecnica(e: ExercicioTela, tecnica: string) {
    const ref = [...e.series].reverse().find((x) => x.tipo === "valida" && x.carga.trim());
    mudarEx(e.seId, (x) => ({ ...x, series: [...x.series, { key: novaChave(), serie: x.series.length + 1, tipo: tecnica as SerieTipo, carga: ref?.carga ?? "", reps: "", salva: false, blocos: [], tec: { tecnica, config: configDaSerie(tecnica) } }].map((y, k) => ({ ...y, serie: k + 1 })) }));
    setEscolhendoSerie(null);
  }

  async function salvarSerie(e: ExercicioTela, s: SerieTela) {
    if (trabalhando.has(s.key)) return;
    if (s.salva) return; // já salva e sem mudança: nada a fazer (não reinicia o descanso)
    // Série em blocos: reps = soma dos pedaços; carga = a do 1º (no drop-set cada pedaço guarda a sua).
    const pedacos = emBlocos(e, s) ? (s.blocos ?? []).map((b) => ({ carga: lerCarga(b.carga), reps: lerReps(b.reps) })).filter((b) => b.carga != null || b.reps != null) : null;
    if (pedacos && tecDaSerie(e, s)?.tecnica !== "dropset" && pedacos.length) pedacos.forEach((b, k) => (b.carga = k === 0 ? (b.carga ?? lerCarga(s.carga)) : (pedacos[0].carga ?? lerCarga(s.carga))));
    const carga = pedacos ? (pedacos[0]?.carga ?? lerCarga(s.carga)) : lerCarga(s.carga);
    const reps = pedacos ? (pedacos.some((b) => b.reps != null) ? somaBlocos(pedacos.map((b) => b.reps)) : null) : lerReps(s.reps);
    if (reps == null && carga == null) return setErroEx({ seId: e.seId, texto: `Série ${s.serie}: anote as repetições ou a carga antes do ✓.` });
    if (s.carga.trim() && carga == null) return setErroEx({ seId: e.seId, texto: `Série ${s.serie}: carga inválida. Use números, ex.: 42,5` });
    setErroEx(null);
    marcar(s.key, true);
    const r = await chamar(`/api/sessoes/${sessaoId}/series`, "POST", { session_exercise_id: e.seId, client_key: `livre:${s.key}`, serie: s.serie, tipo: s.tipo, carga_kg: carga, reps, ...(pedacos?.length ? { blocos: pedacos } : {}) });
    marcar(s.key, false);
    if (!r.ok) return setErroEx({ seId: e.seId, texto: `Série ${s.serie} não foi salva: ${String(r.json.error ?? "tente de novo.")}` });
    contarNoPlacar(e, s, contaNoPlacar(s.tipo));
    // Mudou o número enquanto salvava? Continua “a salvar” para o próximo ✓ gravar o valor novo.
    mudarEx(e.seId, (x) => ({ ...x, series: x.series.map((y) => (y.key === s.key && y.carga === s.carga && y.reps === s.reps && y.tipo === s.tipo && y.blocos === s.blocos ? { ...y, salva: true } : y)) }));
    if (navigator.vibrate) navigator.vibrate(30);
    // Bi-set/tri-set: vai para o próximo exercício da rodada sem descanso; no último, descansa e volta ao 1º.
    const membros = e.bloco && s.tipo !== "aquecimento" ? exs.filter((x) => x.bloco === e.bloco).map((x) => x.seId) : [];
    const rodada = proximoDaRodada(membros, e.seId);
    if (rodada) {
      const prox = exs.find((x) => x.seId === rodada.proximo)!;
      // O próximo precisa de uma linha para anotar.
      if (!prox.series.some((y) => !y.salva)) maisSerie(prox);
      if (!rodada.descansa) {
        setAviso(`➡️ Agora: ${prox.nome}, sem descanso.`);
        setAberto(prox.seId);
        requestAnimationFrame(() => document.getElementById(`livre-${prox.seId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
        return;
      }
      setAviso(`✅ Rodada feita! Descanse e volte para ${prox.nome}.`);
      setAberto(prox.seId);
    }
    const seg = s.tipo === "aquecimento" ? DESCANSO_SEG.aquecimento : DESCANSO_SEG.valida;
    setTimer((t) => ({ seg, key: (t?.key ?? 0) + 1 }));
  }

  async function apagarSerie(e: ExercicioTela, s: SerieTela) {
    if (trabalhando.has(s.key)) return;
    // Série já salva some do histórico: pede confirmação (evita apagar sem querer ao mirar no ✓).
    const salvaNoServidor = s.salva || contadas.current.has(s.key);
    if (salvaNoServidor && !window.confirm(`Apagar a série ${s.serie} (${s.carga || "—"} kg × ${s.reps || "—"})?`)) return;
    setErroEx(null);
    if (salvaNoServidor) {
      marcar(s.key, true);
      const r = await chamar(`/api/sessoes/${sessaoId}/series`, "DELETE", { client_key: `livre:${s.key}` });
      marcar(s.key, false);
      if (!r.ok) return setErroEx({ seId: e.seId, texto: String(r.json.error ?? "Não foi possível apagar a série.") });
      contarNoPlacar(e, s, false);
    }
    mudarEx(e.seId, (x) => ({ ...x, series: x.series.filter((y) => y.key !== s.key).map((y, i) => ({ ...y, serie: i + 1 })) }));
  }

  /** Tira o exercício do treino (posto por engano). Com séries salvas, confirma e apaga as séries antes. */
  async function tirar(e: ExercicioTela) {
    const salvas = e.series.filter((s) => s.salva);
    if (salvas.length && !window.confirm(`Tirar “${e.nome}” do treino? ${salvas.length === 1 ? "A série salva será apagada." : `As ${salvas.length} séries salvas serão apagadas.`}`)) return;
    setErroEx(null);
    for (const s of salvas) {
      const r = await chamar(`/api/sessoes/${sessaoId}/series`, "DELETE", { client_key: `livre:${s.key}` });
      if (!r.ok) return setErroEx({ seId: e.seId, texto: String(r.json.error ?? "Não foi possível apagar a série.") });
      contarNoPlacar(e, s, false);
    }
    const r = await chamar(`/api/livre/${sessaoId}/exercicios/${e.seId}`, "DELETE", {});
    if (!r.ok) return setErroEx({ seId: e.seId, texto: String(r.json.error ?? "Não foi possível tirar agora.") });
    setExs((l) => l.filter((x) => x.seId !== e.seId));
    if (aberto === e.seId) setAberto(null);
  }

  async function ajustar(e: ExercicioTela, patch: { tecnica?: string; observacao?: string }) {
    const r = await chamar(`/api/livre/${sessaoId}/exercicios/${e.seId}`, "PATCH", patch);
    if (!r.ok) setErroEx({ seId: e.seId, texto: String(r.json.error ?? "Não foi possível salvar agora.") });
  }

  async function terminar(status: "concluida" | "abandonada") {
    setOcupado(true);
    const r = await chamar(`/api/sessoes/${sessaoId}`, "PATCH", { status, feedback_percepcao: status === "concluida" ? feedback : null, feedback_comentario: comentario.trim() || null });
    setOcupado(false);
    if (!r.ok) return setErro(String(r.json.error ?? "Não foi possível terminar agora."));
    if (status === "abandonada") return router.push(voltar);
    router.refresh();
  }

  const pendentes = exs.reduce((n, e) => n + e.series.filter((s) => !s.salva && (s.carga.trim() || s.reps.trim())).length, 0);

  // Bi-set/tri-set: exercícios do mesmo bloco aparecem juntos, numerados 1A, 1B…
  const grupos = gruposDoTreino(exs.map((x) => ({ id: x.seId, bloco: x.bloco, tecnica: x.tecnica })));
  const rotulos = rotulosDosExercicios(grupos);
  const cartao = (e: ExercicioTela, rotulo: string) => {
          const abertoAqui = aberto === e.seId;
          const feitas = e.series.filter((s) => s.salva && s.tipo !== "aquecimento").length;
          const tipos = tiposDeSerie(e.tecnica);
          return (
            <li key={e.seId} id={`livre-${e.seId}`} className={`scroll-mt-24 rounded-xl border ${abertoAqui ? "border-accent/60" : "border-border"} bg-card`}>
              <div className="flex items-center">
              <button type="button" onClick={() => setAberto(abertoAqui ? null : e.seId)} aria-expanded={abertoAqui} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2 text-left">
                <span className="grid h-8 min-w-8 shrink-0 place-items-center rounded-lg bg-accent/15 px-1 text-sm font-bold text-accent">{rotulo}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-tight">{e.nome}</span>
                  <span className="block text-xs text-fg-subtle">{e.grupo ? GRUPO_LABEL[e.grupo] : "Exercício com o seu nome"} · {feitas} {feitas === 1 ? "série" : "séries"}{e.tecnica !== "normal" && !e.bloco ? ` · ${infoTecnica(e.tecnica)?.nome ?? e.tecnica}` : ""}</span>
                </span>
                <Icon name={abertoAqui ? "up" : "down"} size={18} className="shrink-0 text-fg-muted" />
              </button>
              <button type="button" onClick={() => void tirar(e)} aria-label={`Tirar ${e.nome} do treino`} className="alvo mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-fg-subtle hover:text-red">
                <Icon name="trash" size={18} />
              </button>
              </div>
              {erroEx?.seId === e.seId ? <p role="alert" className="mx-4 mb-3 rounded-lg border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">{erroEx.texto}</p> : null}
              {abertoAqui ? (
                <div className="space-y-3 border-t border-border px-4 py-3">
                  {e.ultima ? <p className="text-xs text-fg-muted">📌 {e.ultima}</p> : null}
                  {!e.bloco ? (
                    <button type="button" onClick={() => setTecnicaDe(e.seId)} className="alvo flex w-full items-center gap-3 rounded-lg border border-border border-l-4 bg-bg px-3 py-2 text-left" style={{ borderLeftColor: (COR_TECNICA[e.tecnica as Tecnica] ?? null) || "var(--color-border)" }}>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Técnica</span>
                        <span className="block text-sm font-semibold">{e.tecnica === "normal" ? "Sem técnica · séries normais" : (resumoEscolha(e.tecnica, e.config) ?? infoTecnica(e.tecnica)?.nome ?? e.tecnica)}</span>
                      </span>
                      <span className="shrink-0 rounded-full border border-accent/60 px-3 py-1 text-xs font-bold text-accent">{e.tecnica === "normal" ? "＋ Técnica / bi-set" : "Mudar"}</span>
                    </button>
                  ) : null}

                  <div className="space-y-2">
                    <div className="grid grid-cols-[2rem_1fr_1fr_2.75rem_2.25rem] items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
                      <span>Série</span><span>Carga (kg)</span><span>Reps</span><span className="sr-only">Salvar</span><span className="sr-only">Apagar</span>
                    </div>
                    {e.series.map((s) => { const t = tecDaSerie(e, s); return t ? (
                      <SerieEmBlocos
                        key={s.key}
                        rotulo={String(s.serie)}
                        titulo={`${s.tec || s.tipo !== e.tecnica ? "⚡ Só nesta série · " : configEfetiva(t.tecnica, t.config)?.aplicar === "finalizacao" ? "Finalização · " : ""}${infoTecnica(t.tecnica)?.nome ?? ""}`}
                        cor={COR_TECNICA[t.tecnica as Tecnica] ?? "#ba9e50"}
                        planejados={blocosPlanejados(t.tecnica, t.config)}
                        valores={s.blocos ?? []}
                        cargaRef={e.series.find((x) => x.tipo === "valida" && x.carga)?.carga || null}
                        cargaPorBloco={t.tecnica === "dropset"}
                        livre={t.tecnica === "rest_pause"}
                        alvoTotal={t.tecnica === "rest_pause" ? (configEfetiva(t.tecnica, t.config)?.repsAlvo ?? null) : null}
                        concluida={s.salva}
                        sincronizada={s.salva}
                        onChange={(v) => mudarSerie(e.seId, s.key, { blocos: v, carga: v[0]?.carga ?? s.carga, salva: false })}
                        onConcluir={() => void salvarSerie(e, s)}
                        onPausa={(seg) => setTimer((t) => ({ seg, key: (t?.key ?? 0) + 1 }))}
                      />
                    ) : (
                      <div key={s.key} className="space-y-1">
                        <div className="grid grid-cols-[2rem_1fr_1fr_2.75rem_2.25rem] items-center gap-2">
                          <span className="text-center font-mono text-sm text-fg-muted">{s.tipo === "aquecimento" ? "A" : s.serie}</span>
                          <input inputMode="decimal" value={s.carga} onChange={(ev) => mudarSerie(e.seId, s.key, { carga: ev.target.value, salva: false })} placeholder="kg" aria-label={`Carga da série ${s.serie}`} className="h-11 w-full rounded-lg border border-border bg-bg px-2 text-center text-base tabular-nums" />
                          <input inputMode="numeric" value={s.reps} onChange={(ev) => mudarSerie(e.seId, s.key, { reps: ev.target.value.replace(/\D/g, "").slice(0, 3), salva: false })} placeholder="reps" aria-label={`Repetições da série ${s.serie}`} className="h-11 w-full rounded-lg border border-border bg-bg px-2 text-center text-base tabular-nums" />
                          <button type="button" onClick={() => void salvarSerie(e, s)} aria-busy={trabalhando.has(s.key)} aria-label={trabalhando.has(s.key) ? "Salvando série" : s.salva ? "Série salva" : "Salvar série"} className={`grid h-11 w-11 place-items-center rounded-lg border ${trabalhando.has(s.key) ? "animate-pulse border-accent bg-accent/20 text-accent" : s.salva ? "border-success bg-success/20 text-success" : "border-accent text-accent"}`}>
                            {trabalhando.has(s.key) ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" aria-hidden /> : <Icon name="check" size={18} />}
                          </button>
                          <button type="button" disabled={trabalhando.has(s.key)} onClick={() => void apagarSerie(e, s)} aria-label={`Apagar série ${s.serie}`} className="grid h-11 w-9 place-items-center rounded-lg text-fg-subtle hover:text-red disabled:opacity-40">
                            <Icon name="x" size={16} />
                          </button>
                        </div>
                        {tipos.filter((t) => !(e.config && registraEmBlocos(t.id))).length > 1 ? (
                          <div className="ml-10 flex flex-wrap gap-1.5">
                            {tipos.filter((t) => !(e.config && registraEmBlocos(t.id))).map((t) => (
                              <button key={t.id} type="button" onClick={() => { if (s.tipo !== t.id) mudarSerie(e.seId, s.key, { tipo: t.id, salva: false }); }} aria-pressed={s.tipo === t.id} className={`min-h-9 rounded-full border px-3 text-xs ${s.tipo === t.id ? "border-accent bg-accent-soft text-fg" : "border-border text-fg-subtle"}`}>
                                {t.rotulo}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ); })}
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => { maisSerie(e); setEscolhendoSerie(null); }} className="alvo flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm font-semibold text-fg-muted hover:text-fg">
                        <Icon name="plus" size={16} /> Série normal
                      </button>
                      <button type="button" aria-expanded={escolhendoSerie === e.seId} onClick={() => setEscolhendoSerie(escolhendoSerie === e.seId ? null : e.seId)} className={`alvo flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed text-sm font-semibold ${escolhendoSerie === e.seId ? "border-accent text-accent" : "border-border text-fg-muted hover:text-fg"}`}>
                        ⚡ Série com técnica
                      </button>
                    </div>
                    {escolhendoSerie === e.seId ? (
                      <div className="space-y-2 rounded-lg border border-accent/40 bg-accent/5 p-3">
                        <p className="text-xs text-fg-muted">Só esta série terá a técnica. O resto do exercício continua como está{e.tecnica !== "normal" ? ` (${infoTecnica(e.tecnica)?.nome ?? e.tecnica})` : ""}.</p>
                        <div className="grid gap-1.5">
                          {TECNICAS_DA_SERIE.map((t) => (
                            <button key={t} type="button" onClick={() => serieComTecnica(e, t)} className="flex min-h-11 w-full flex-col items-start rounded-lg border border-border border-l-4 bg-bg px-3 py-2 text-left" style={{ borderLeftColor: COR_TECNICA[t as Tecnica] ?? "#ba9e50" }}>
                              <span className="text-sm font-bold">{infoTecnica(t)?.nome}</span>
                              <span className="text-[11px] text-fg-muted">{infoTecnica(t)?.oQueE}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <label className="block text-xs font-semibold text-fg-muted">
                    Anotação (opcional)
                    <textarea value={e.observacao} onChange={(ev) => mudarEx(e.seId, (x) => ({ ...x, observacao: ev.target.value.slice(0, 300) }))} onBlur={() => void ajustar(e, { observacao: e.observacao })} rows={2} placeholder="Ex.: máquina 3, banco na posição 4, senti mais o glúteo" className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm font-normal text-fg" />
                  </label>
                  {e.series.some((x) => x.salva) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setAberto(null);
                        setEscolhendoSerie(null);
                        setBuscando(true);
                        requestAnimationFrame(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
                      }}
                      className="touch flex w-full items-center justify-center gap-2 rounded-lg bg-success px-4 py-3 text-base font-bold text-bg"
                    >
                      <Icon name="check" size={18} /> Concluir exercício e escolher o próximo
                    </button>
                  ) : null}
                  <button type="button" onClick={() => void tirar(e)} className="alvo flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-red/40 text-sm font-semibold text-red">
                    <Icon name="trash" size={16} /> Tirar este exercício do treino
                  </button>
                </div>
              ) : null}
            </li>
          );
  };

  return (
    <div className="space-y-4 pb-24">
      <RecadosAoVivo sessaoId={sessaoId} />
      <div className="flex justify-end"><TelaAcesaTreino /></div>
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-accent">🎲 {extra ? "Treino extra · livre" : "Treino livre"}</p>
          <h1 className="text-2xl font-bold leading-tight">Decida na hora</h1>
          <p className="text-sm text-fg-muted">Escolha o exercício, anote as séries e siga para o próximo.{extra ? " Como extra, fica registrado à parte e não conta na meta semanal." : ""}</p>
        </div>
        <div className="shrink-0 rounded-xl border border-border bg-card px-3 py-2 text-right">
          <p className="font-mono text-lg font-bold tabular-nums">{relogio(decorrido)}</p>
          <p className="text-[11px] text-fg-subtle">{seriesFeitas} {seriesFeitas === 1 ? "série" : "séries"}</p>
        </div>
      </header>

      {timer ? (
        // Mesmo descanso do treino normal: flutua embaixo, perto do polegar, acima do menu.
        <div className="fixed inset-x-3 z-[45] mx-auto max-w-xl drop-shadow-2xl bottom-[calc(4.75rem+env(safe-area-inset-bottom)+var(--vv-fundo,0px))] md:bottom-4">
          <RestTimer key={timer.key} duracaoSeg={timer.seg} autoStart onComplete={() => setTimer(null)} onDismiss={() => setTimer(null)} />
        </div>
      ) : null}

      {placar.length ? (
        <div className="space-y-2">
          {aviso ? (
            <div role="status" className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${aviso.startsWith("✅") ? "border-success/50 bg-success/10" : "border-red/50 bg-red/10"}`}>
              <span className="flex-1">{aviso}</span>
              <button type="button" onClick={() => setAviso(null)} aria-label="Fechar aviso" className="text-fg-muted"><Icon name="x" size={14} /></button>
            </div>
          ) : null}
          {sugestao ? <p className="rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm">💡 {sugestao.texto}</p> : null}
          <button type="button" onClick={() => setVerPlacar((v) => !v)} aria-expanded={verPlacar} className="alvo text-sm font-semibold text-accent underline underline-offset-4">
            {verPlacar ? "Esconder o placar da semana" : "🎯 Ver o placar da semana por músculo"}
          </button>
          {verPlacar ? <PlacarMetas placar={placar} compacto /> : null}
        </div>
      ) : null}

      {erro ? <p role="alert" className="rounded-xl border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">{erro}</p> : null}

      <ol className="space-y-3">
        {grupos.map((g) => {
          const membros = g.ids.map((id) => exs.find((x) => x.seId === id)!).filter(Boolean);
          if (membros.length < 2) return cartao(membros[0], rotulos[membros[0].seId]);
          const cor = COR_TECNICA[(g.tecnica ?? "biset") as Tecnica] ?? "#a78bfa";
          const nomeTec = infoTecnica(g.tecnica)?.nome ?? "Bi-set";
          const rodada = Math.min(...membros.map((m) => m.series.filter((x) => x.salva && x.tipo !== "aquecimento").length)) + 1;
          return (
            <li key={`g-${membros[0].bloco}`} className="space-y-2 rounded-2xl border-2 p-2" style={{ borderColor: `${cor}99`, background: `${cor}12` }}>
              <div className="flex items-start gap-2 px-1">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black" style={{ color: cor }}>⚡ {nomeTec} · rodada {rodada}</span>
                  <span className="block text-xs text-fg-muted">{membros.map((m) => rotulos[m.seId]).join(" → ")} sem descanso no meio. Descanse só depois do último.</span>
                </span>
                <button type="button" onClick={() => void separar(membros[0].bloco!)} className="alvo shrink-0 rounded-full border border-border px-3 py-1 text-xs font-semibold text-fg-muted">Separar</button>
              </div>
              <ol className="space-y-2">{membros.map((m) => cartao(m, rotulos[m.seId]))}</ol>
            </li>
          );
        })}
      </ol>

      {buscando ? (
        <div className="space-y-2">
          {aJuntar ? (
            <p role="status" className="rounded-xl border-2 border-[#a78bfa]/70 bg-[#a78bfa]/10 px-3 py-2 text-sm font-semibold">
              ⚡ Escolha {aJuntar.faltam === 1 ? "o exercício" : `os ${aJuntar.faltam} exercícios`} para juntar com {exs.find((x) => x.seId === aJuntar.ids[0])?.nome} no {infoTecnica(aJuntar.tecnica)?.nome.toLowerCase()}.
            </p>
          ) : null}
          <EscolherExercicio itens={itens} placar={placar.length ? placar : undefined} onEscolher={(it) => void adicionar({ biblioteca_id: it.id })} onMeuNome={(nome) => void adicionar({ nome_livre: nome })} onFechar={() => { setBuscando(false); setAJuntar(null); }} />
        </div>
      ) : (
        <button type="button" disabled={ocupado} onClick={() => setBuscando(true)} className="alvo flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-base font-bold text-bg disabled:opacity-60">
          <Icon name="plus" size={20} /> {exs.length ? "Próximo exercício" : "Escolher o primeiro exercício"}
        </button>
      )}

      {terminando ? (
        <section className="space-y-3 rounded-xl border border-accent/50 bg-card p-4" aria-label="Terminar treino">
          {pendentes ? <p className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">Você tem {pendentes} {pendentes === 1 ? "série anotada sem salvar" : "séries anotadas sem salvar"}. Toque no ✓ delas para não perder.</p> : null}
          <p className="font-bold">Como foi o treino?</p>
          <div className="grid grid-cols-2 gap-2">
            {FEEDBACK.map((f) => (
              <button key={f.id} type="button" onClick={() => setFeedback(f.id)} aria-pressed={feedback === f.id} className={`min-h-11 rounded-lg border px-3 text-sm ${feedback === f.id ? "border-accent bg-accent-soft font-semibold" : "border-border"}`}>{f.rotulo}</button>
            ))}
          </div>
          {feedback === "dor" ? <p className="text-xs text-fg-muted">Sentiu dor? Pare o exercício que doeu e, se continuar, fale com o Montinho ou com um profissional de saúde.</p> : null}
          <textarea value={comentario} onChange={(ev) => setComentario(ev.target.value.slice(0, 500))} rows={2} placeholder="Algum comentário? (opcional)" className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm" />
          <Button variant="success" size="lg" className="w-full" loading={ocupado} disabled={!seriesFeitas} onClick={() => void terminar("concluida")}>Concluir treino</Button>
          {!seriesFeitas ? <p className="text-center text-xs text-fg-muted">Salve pelo menos uma série para concluir.</p> : null}
          <div className="flex justify-between gap-2 text-sm">
            <button type="button" onClick={() => setTerminando(false)} className="alvo text-fg-muted underline underline-offset-4">Voltar ao treino</button>
            <button type="button" onClick={() => { if (window.confirm(seriesFeitas ? "Encerrar sem concluir? As séries ficam guardadas e o treino conta como parcial." : "Cancelar este treino? Ele não conta na semana.")) void terminar("abandonada"); }} className="alvo text-red underline underline-offset-4">{seriesFeitas ? "Encerrar sem concluir" : "Cancelar treino"}</button>
          </div>
        </section>
      ) : exs.length ? (
        <Button variant="secondary" size="lg" className="w-full" onClick={() => setTerminando(true)}>Terminar treino</Button>
      ) : null}

      {/* Sempre dá para sair: sem séries cancela (não conta); com séries, encerra sem concluir (fica parcial). */}
      {!terminando ? (
        <div className="text-center">
          <button type="button" disabled={ocupado} onClick={() => { if (window.confirm(seriesFeitas ? "Encerrar sem concluir? As séries que você marcou ficam guardadas e o treino conta como parcial." : "Cancelar este treino? Nenhuma série foi marcada: ele não conta na semana e você pode começar outro.")) void terminar("abandonada"); }} className="alvo text-sm font-semibold text-red underline underline-offset-4 disabled:opacity-50">
            {seriesFeitas ? "Encerrar sem concluir" : "✖ Cancelar este treino"}
          </button>
        </div>
      ) : null}

      {tecnicaDe && exs.find((x) => x.seId === tecnicaDe) ? (
        <EscolherTecnica
          nome={exs.find((x) => x.seId === tecnicaDe)!.nome}
          atual={exs.find((x) => x.seId === tecnicaDe)!.tecnica}
          configAtual={exs.find((x) => x.seId === tecnicaDe)!.config}
          outros={exs.filter((x) => x.seId !== tecnicaDe && !x.bloco).map((x) => ({ seId: x.seId, nome: x.nome }))}
          onEscolher={(esc) => void aplicarTecnica(exs.find((x) => x.seId === tecnicaDe)!, esc)}
          onFechar={() => setTecnicaDe(null)}
        />
      ) : null}
    </div>
  );
}
