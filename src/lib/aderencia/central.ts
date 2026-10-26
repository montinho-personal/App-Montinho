// ============================================================================
// Central de aderência do personal: linha por aluno e sinais OBSERVÁVEIS para
// acompanhamento (nunca rótulos psicológicos). Regras explícitas e testadas.
// ============================================================================

import { dataLocal, somarDias, tendencia, type ResultadoAderencia } from "./calcular";

export type Sinal = {
  tipo: "sem_treino_recente" | "queda_frequencia" | "retomou" | "meta_sequencia" | "em_pausa" | "sem_prescricao";
  texto: string;
  /** reconhecer = sugestão de parabenizar; acompanhar = merece contato humano; info = contexto. */
  natureza: "acompanhar" | "reconhecer" | "info";
};

/** Sugestão para o PERSONAL (nunca enviada automaticamente; rascunho editável). */
export type Sugestao = {
  tipo: "ausencia" | "plano_alterado" | "registro" | "queda" | "retomada" | "sequencia" | "pausa" | "sem_carga" | "avaliacao";
  titulo: string;
  /** Regra que gerou a sugestão, em linguagem simples. */
  regra: string;
  acao: "mensagem" | "reconhecer" | "verificar_registro" | "nenhuma";
  rascunho: string | null;
};

export type LinhaCentral = {
  alunoId: string;
  nome: string;
  meta: number | null;
  semanaPontos: number;
  aderencia28: number | null;
  tendencia: number | null;
  ultimaSessao: string | null;
  diasDesdeUltima: number | null;
  proximaPrevista: string | null;
  sinais: Sinal[];
  sugestoes: Sugestao[];
};

export type ContextoCentral = {
  /** Sessão ainda “em andamento” (ISO de início), se houver. */
  sessaoAbertaDesde?: string | null;
  /** Data (AAAA-MM-DD) da última alteração do plano. */
  planoAlteradoEm?: string | null;
  /** Tipo da pausa em curso (férias, lesão…). */
  pausaTipo?: string | null;
  /** Agora (para horas desde a sessão aberta). */
  agora?: Date;
  /** Últimos treinos concluídos seguidos, com séries, sem nenhuma carga anotada. */
  treinosSemCarga?: number;
  /** Data (AAAA-MM-DD) da última avaliação (medidas ou arquivo); null = nunca. */
  ultimaAvaliacao?: string | null;
  /** Desde quando acompanha (AAAA-MM-DD), para não cobrar avaliação de quem acabou de entrar. */
  inicio?: string | null;
};

export type RegrasCentral = { diasSemTreino: number; quedaPontos: number; pausaParaRetomada: number; janelaRetomada: number; sequenciaReconhecer: number; horasRegistroAberto: number; diasPlanoAlterado: number; treinosSemCarga: number; diasAvaliacao: number };

/** Padrões; o personal pode ajustar (preferencias_treinador.regras_acompanhamento). */
export const REGRAS_CENTRAL: RegrasCentral = {
  diasSemTreino: 10,
  quedaPontos: 20,
  pausaParaRetomada: 14,
  janelaRetomada: 7,
  sequenciaReconhecer: 4,
  horasRegistroAberto: 12,
  diasPlanoAlterado: 14,
  treinosSemCarga: 3,
  diasAvaliacao: 60,
};

export function mesclarRegras(r: Partial<RegrasCentral> | null | undefined): RegrasCentral {
  const out = { ...REGRAS_CENTRAL };
  for (const k of Object.keys(out) as Array<keyof RegrasCentral>) {
    const v = Number(r?.[k]);
    if (Number.isFinite(v) && v > 0) out[k] = Math.round(v);
  }
  return out;
}

const TIPO_PAUSA: Record<string, string> = { ferias: "férias", lesao: "lesão", descanso_prescrito: "descanso prescrito", viagem: "viagem", saude: "saúde", outro: "pausa" };

const dias = (a: string, b: string) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86_400_000);

export function linhaCentral(
  aluno: { id: string; nome: string },
  r: ResultadoAderencia,
  ultimaSessao: string | null,
  hoje: string,
  datasSessoes: string[],
  ctx: ContextoCentral = {},
  regras: RegrasCentral = REGRAS_CENTRAL
): LinhaCentral {
  const REGRAS_CENTRAL = regras;
  const sinais: Sinal[] = [];
  const semana = r.semanaAtual;
  const desde = ultimaSessao ? dias(dataLocal(ultimaSessao), hoje) : null;
  const tend = tendencia(r);
  const emPausa = !!semana?.pausada || r.dias[hoje]?.tipos.includes("pausa");

  if (emPausa) sinais.push({ tipo: "em_pausa", texto: "Em pausa combinada", natureza: "info" });
  if (!semana?.meta) sinais.push({ tipo: "sem_prescricao", texto: "Sem treino prescrito nesta semana", natureza: "info" });
  if (!emPausa && semana?.meta && (desde === null || desde >= REGRAS_CENTRAL.diasSemTreino))
    sinais.push({ tipo: "sem_treino_recente", texto: desde === null ? "Nenhum treino registrado ainda" : `${desde} dias sem registrar treino`, natureza: "acompanhar" });
  if (tend !== null && tend <= -REGRAS_CENTRAL.quedaPontos) sinais.push({ tipo: "queda_frequencia", texto: `Aderência ${-tend} pontos abaixo das 4 semanas anteriores`, natureza: "acompanhar" });

  // Retomada: treinou nos últimos 7 dias depois de ≥ 14 dias sem treinar.
  const ord = [...new Set(datasSessoes)].sort();
  for (let i = ord.length - 1; i > 0; i--) {
    if (dias(ord[i], hoje) > REGRAS_CENTRAL.janelaRetomada) break;
    if (dias(ord[i - 1], ord[i]) >= REGRAS_CENTRAL.pausaParaRetomada) {
      sinais.push({ tipo: "retomou", texto: `Voltou a treinar após ${dias(ord[i - 1], ord[i])} dias`, natureza: "reconhecer" });
      break;
    }
  }
  if (r.sequencia.atual >= REGRAS_CENTRAL.sequenciaReconhecer) sinais.push({ tipo: "meta_sequencia", texto: `${r.sequencia.atual} semanas seguidas com a meta cumprida`, natureza: "reconhecer" });

  // Sugestões: distinguem ausência real de pausa, plano alterado e registro esquecido.
  const primeiro = aluno.nome.split(" ")[0];
  const sugestoes: Sugestao[] = [];
  const tipos = new Set(sinais.map((x) => x.tipo));
  const horasAberta = ctx.sessaoAbertaDesde ? ((ctx.agora ?? new Date()).getTime() - new Date(ctx.sessaoAbertaDesde).getTime()) / 3_600_000 : 0;
  const diasPlano = ctx.planoAlteradoEm ? dias(ctx.planoAlteradoEm, hoje) : null;
  const planoRecente = diasPlano !== null && diasPlano >= 0 && diasPlano <= REGRAS_CENTRAL.diasPlanoAlterado;
  if (emPausa) {
    sugestoes.push({ tipo: "pausa", titulo: `Em pausa combinada (${TIPO_PAUSA[ctx.pausaTipo ?? "outro"] ?? "pausa"})`, regra: "Durante pausas combinadas o app não gera alerta de ausência.", acao: "nenhuma", rascunho: null });
  } else {
    if (horasAberta >= REGRAS_CENTRAL.horasRegistroAberto)
      sugestoes.push({ tipo: "registro", titulo: `Treino aberto há ${Math.round(horasAberta)} h sem finalizar`, regra: `Sessão iniciada e não concluída há ${REGRAS_CENTRAL.horasRegistroAberto} h ou mais — pode ser só registro esquecido, não ausência.`, acao: "verificar_registro", rascunho: `Oi, ${primeiro}! Vi que um treino ficou aberto no app. Conseguiu terminar? Se sim, é só abrir e tocar em Concluir para ficar registrado.` });
    if (tipos.has("sem_treino_recente") || tipos.has("queda_frequencia")) {
      if (planoRecente)
        sugestoes.push({ tipo: "plano_alterado", titulo: `Plano alterado há ${diasPlano} dia(s)`, regra: `A frequência caiu e o plano mudou nos últimos ${REGRAS_CENTRAL.diasPlanoAlterado} dias; pode haver relação com a mudança.`, acao: "mensagem", rascunho: `Oi, ${primeiro}! Como está sendo o treino novo? Se algo ficou difícil de encaixar na rotina, me conta que eu ajusto.` });
      else if (tipos.has("sem_treino_recente") && horasAberta < REGRAS_CENTRAL.horasRegistroAberto)
        sugestoes.push({ tipo: "ausencia", titulo: desde === null ? "Ainda sem treino registrado" : `${desde} dias sem registrar treino`, regra: `Sem treino registrado há ${REGRAS_CENTRAL.diasSemTreino} dias ou mais, fora de pausa combinada e sem treino aberto.`, acao: "mensagem", rascunho: `Oi, ${primeiro}! Senti sua falta nos treinos. Está tudo bem? Se a rotina apertou, posso adaptar o treino para caber no seu tempo.` });
      else if (tipos.has("queda_frequencia"))
        sugestoes.push({ tipo: "queda", titulo: "Frequência abaixo do próprio histórico", regra: `Aderência das últimas 4 semanas ${REGRAS_CENTRAL.quedaPontos}+ pontos abaixo das 4 anteriores. Sessões feitas em outro dia (remanejadas) contam normalmente.`, acao: "mensagem", rascunho: `Oi, ${primeiro}! Percebi que as últimas semanas ficaram mais corridas. Quer que a gente ajuste a meta ou o treino para ficar mais viável?` });
    }
  }
  if (!emPausa && (ctx.treinosSemCarga ?? 0) >= REGRAS_CENTRAL.treinosSemCarga)
    sugestoes.push({ tipo: "sem_carga", titulo: `${ctx.treinosSemCarga} treinos seguidos sem anotar as cargas`, regra: `Os últimos ${REGRAS_CENTRAL.treinosSemCarga}+ treinos concluídos têm séries marcadas, mas nenhum peso anotado. Sem carga, o app não consegue mostrar evolução nem avisar quando subir o peso.`, acao: "mensagem", rascunho: `Oi, ${primeiro}! Vi que você está treinando, que ótimo! 💪 Uma dica: anota o peso de cada série no app. Assim eu acompanho sua evolução e o app te avisa quando dá para subir a carga.` });
  {
    const base = ctx.ultimaAvaliacao ?? ctx.inicio ?? null;
    const diasAv = base ? dias(base, hoje) : null;
    if (!emPausa && diasAv !== null && diasAv >= REGRAS_CENTRAL.diasAvaliacao)
      sugestoes.push({ tipo: "avaliacao", titulo: ctx.ultimaAvaliacao ? `Última avaliação há ${diasAv} dias` : "Ainda sem avaliação registrada", regra: `Sem medidas nem arquivo de avaliação há ${REGRAS_CENTRAL.diasAvaliacao}+ dias. Avaliar de tempos em tempos mostra a evolução além do peso na barra.`, acao: "mensagem", rascunho: `Oi, ${primeiro}! Que tal a gente marcar uma nova avaliação? Faz um tempinho desde a última, e é muito legal ver o quanto você evoluiu. 📏` });
  }
  if (tipos.has("retomou"))
    sugestoes.push({ tipo: "retomada", titulo: "Voltou a treinar", regra: `Treinou nos últimos ${REGRAS_CENTRAL.janelaRetomada} dias depois de ${REGRAS_CENTRAL.pausaParaRetomada}+ dias sem treino.`, acao: "reconhecer", rascunho: `Bom ter você de volta, ${primeiro}! Vamos reorganizar a rotina juntos, no seu ritmo.` });
  if (tipos.has("meta_sequencia"))
    sugestoes.push({ tipo: "sequencia", titulo: `${r.sequencia.atual} semanas seguidas com a meta`, regra: `Meta semanal cumprida ${REGRAS_CENTRAL.sequenciaReconhecer}+ semanas seguidas.`, acao: "reconhecer", rascunho: `Parabéns, ${primeiro}! ${r.sequencia.atual} semanas seguidas cumprindo a meta. Essa constância faz toda a diferença.` });

  const proxima = Object.values(r.dias)
    .filter((d) => d.data >= hoje && d.data <= somarDias(hoje, 13) && d.tipos.includes("previsto"))
    .map((d) => d.data)
    .sort()[0] ?? null;

  return {
    alunoId: aluno.id,
    nome: aluno.nome,
    meta: semana?.meta ?? null,
    semanaPontos: semana?.pontos ?? 0,
    aderencia28: r.indices.d28.pct,
    tendencia: tend,
    ultimaSessao,
    diasDesdeUltima: desde,
    proximaPrevista: proxima,
    sinais,
    sugestoes,
  };
}

export type OrdemCentral = "queda" | "tempo_sem_treino" | "melhora" | "retomaram" | "nome";

export function ordenarCentral<T extends LinhaCentral>(linhas: T[], ordem: OrdemCentral): T[] {
  const v = [...linhas];
  const nulos = (x: number | null, fallback: number) => (x === null ? fallback : x);
  switch (ordem) {
    case "queda":
      return v.sort((a, b) => nulos(a.tendencia, 999) - nulos(b.tendencia, 999));
    case "melhora":
      return v.sort((a, b) => nulos(b.tendencia, -999) - nulos(a.tendencia, -999));
    case "tempo_sem_treino":
      return v.sort((a, b) => nulos(b.diasDesdeUltima, 9999) - nulos(a.diasDesdeUltima, 9999));
    case "retomaram":
      return v.sort((a, b) => Number(b.sinais.some((s) => s.tipo === "retomou")) - Number(a.sinais.some((s) => s.tipo === "retomou")));
    default:
      return v.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }
}
