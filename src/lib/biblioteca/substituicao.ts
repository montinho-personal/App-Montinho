// ============================================================================
// Sugestões de substituição — regras explícitas e explicáveis (sem IA).
//
// Um exercício só é candidato quando:
//   (a) o personal APROVOU a equivalência, ou
//   (b) ela está no catálogo como sugestão curada, ou
//   (c) tem o MESMO padrão de movimento E o mesmo músculo principal.
// Trabalhar o mesmo músculo, sozinho, nunca basta (ex.: cadeira extensora não
// substitui agachamento). Equivalências REJEITADAS pelo personal nunca voltam.
//
// Depois, o contexto do aluno ajusta a ordem e gera alertas:
//   equipamento indisponível → descartado (com motivo);
//   nível acima do aluno → alerta e penalidade;
//   estresse em região com restrição na anamnese → alerta e penalidade;
//   menos estresse na região restrita do que o original → bônus;
//   objetivo força → leve preferência por multiarticulares.
// Tudo é sugestão: a troca só acontece quando o personal confirma.
// ============================================================================

import type { Equipamento, GrupoMuscular } from "@/lib/supabase/types-extended";
import { GRUPO_LABEL } from "@/lib/grupos";
import { equipamentoDisponivel, nivelNumero } from "./itens";
import { NIVEL_LABEL, PADRAO_LABEL, REGIAO_ESTRESSE_LABEL, type Equivalencia, type ItemBiblioteca, type Nivel, type RegiaoEstresse } from "./tipos";

export type ContextoAluno = {
  equipamentos?: Equipamento[] | null;
  nivel?: Nivel | null;
  regioesRestritas?: RegiaoEstresse[] | null;
  objetivo?: string | null;
  musculosPrioritarios?: GrupoMuscular[] | null;
};

export type OrigemSugestao = "aprovada" | "curada" | "regra";

export type Sugestao = {
  item: ItemBiblioteca;
  score: number;
  origem: OrigemSugestao;
  motivos: string[];
  alertas: string[];
};

export type Descartada = { item: ItemBiblioteca; motivo: string };

export type ResultadoSubstituicao = { sugestoes: Sugestao[]; descartadas: Descartada[] };

export const ORIGEM_SUGESTAO_LABEL: Record<OrigemSugestao, string> = {
  aprovada: "Aprovada por você",
  curada: "Sugestão do catálogo",
  regra: "Mesmo padrão e músculo",
};

function sobreposicao(a: GrupoMuscular[], b: GrupoMuscular[]): number {
  if (!a.length && !b.length) return 1;
  const sa = new Set(a);
  const inter = b.filter((g) => sa.has(g)).length;
  const uniao = new Set([...a, ...b]).size;
  return uniao ? inter / uniao : 0;
}

export function sugerirSubstituicoes(
  origem: ItemBiblioteca,
  itens: ItemBiblioteca[],
  equivalencias: Equivalencia[],
  ctx: ContextoAluno = {},
  limite = 6
): ResultadoSubstituicao {
  const revisoes = new Map(equivalencias.filter((e) => e.exercicioId === origem.id).map((e) => [e.alternativaId, e]));
  const restritas = new Set(ctx.regioesRestritas ?? []);
  const nivelAluno = nivelNumero(ctx.nivel);
  const forca = /forca|força/i.test(ctx.objetivo ?? "");
  const sugestoes: Sugestao[] = [];
  const descartadas: Descartada[] = [];

  for (const cand of itens) {
    if (cand.id === origem.id || !cand.contaVolume) continue;
    const rev = revisoes.get(cand.id);
    if (rev?.status === "rejeitada") continue;

    const mesmoPadrao = !!origem.padrao && cand.padrao === origem.padrao;
    const mesmoGrupo = cand.grupo === origem.grupo;
    const aprovada = rev?.status === "aprovada";
    const curada = !!rev && rev.status === "sugerida";
    if (!aprovada && !curada && !(mesmoPadrao && mesmoGrupo)) continue;

    const motivos: string[] = [];
    const alertas: string[] = [];
    let score = 0;
    const origemSug: OrigemSugestao = aprovada ? "aprovada" : curada ? "curada" : "regra";

    if (aprovada) {
      score += 60;
      motivos.push("Você aprovou esta troca");
    } else if (curada) {
      score += 30;
      motivos.push("Equivalência sugerida pelo catálogo (aguarda sua revisão)");
    }
    if (mesmoPadrao) {
      score += 25;
      motivos.push(`Mesmo padrão: ${PADRAO_LABEL[origem.padrao!].toLowerCase()}`);
    } else if (cand.padrao) {
      alertas.push(`Padrão diferente (${PADRAO_LABEL[cand.padrao].toLowerCase()})`);
    }
    if (mesmoGrupo) {
      score += 20;
      motivos.push(`Mesmo músculo principal: ${GRUPO_LABEL[origem.grupo].toLowerCase()}`);
    } else {
      alertas.push(`Músculo principal muda para ${GRUPO_LABEL[cand.grupo].toLowerCase()}`);
    }
    const sob = sobreposicao(origem.secundarios, cand.secundarios);
    score += Math.round(sob * 10);
    if (origem.tipo && cand.tipo) {
      if (origem.tipo === cand.tipo) score += 10;
      else {
        score -= 10;
        alertas.push(cand.tipo === "monoarticular" ? "É monoarticular (o original é multiarticular)" : "É multiarticular (o original é monoarticular)");
      }
    }
    if (ctx.musculosPrioritarios?.includes(cand.grupo)) score += 5;
    if (forca && cand.tipo === "multiarticular") score += 5;

    if (!equipamentoDisponivel(cand, ctx.equipamentos)) {
      descartadas.push({ item: cand, motivo: "Equipamento não disponível para o aluno" });
      continue;
    }
    if (nivelAluno && nivelNumero(cand.nivel) > nivelAluno) {
      score -= 15;
      alertas.push(`Exige nível ${NIVEL_LABEL[cand.nivel!].toLowerCase()}`);
    }
    for (const r of cand.estresse) {
      if (restritas.has(r)) {
        score -= 40;
        alertas.push(`Exige atenção: ${REGIAO_ESTRESSE_LABEL[r].toLowerCase()} (restrição na anamnese)`);
      }
    }
    for (const r of origem.estresse) {
      if (restritas.has(r) && !cand.estresse.includes(r)) {
        score += 20;
        motivos.push(`Menos estresse em ${REGIAO_ESTRESSE_LABEL[r].toLowerCase()}`);
      }
    }
    sugestoes.push({ item: cand, score, origem: origemSug, motivos, alertas });
  }

  sugestoes.sort((a, b) => b.score - a.score || a.item.nome.localeCompare(b.item.nome, "pt-BR"));
  return { sugestoes: sugestoes.slice(0, limite), descartadas };
}
