// Dados do “Copiar resumo da fase” (lib/relatorios/resumo-fase). Leitura com RLS (só o personal chama).
import { getAluno, listCheckIns, listEvolucao, listFotos } from "@/lib/db";
import { getPlanoAtivo, listVersoes } from "@/lib/data/programas";
import { listSessoes } from "@/lib/data/sessoes";
import { aderenciaDoAluno } from "@/lib/data/aderencia";
import { dataLocal, somarDias } from "@/lib/aderencia/calcular";
import { resumoDaFase, trechosDeFase, type ResumoFase, type TrechoDeFase } from "@/lib/relatorios/resumo-fase";

const DIA_MS = 86_400_000;

export async function resumoDaFaseDoAluno(alunoId: string, inicio: string, fim: string): Promise<ResumoFase | null> {
  const aluno = await getAluno(alunoId);
  if (!aluno) return null;
  const hoje = dataLocal(new Date());
  const diasDesde = Math.max(1, Math.ceil((Date.now() - Date.parse(`${inicio}T00:00:00-03:00`)) / DIA_MS) + 2);
  const [plano, sessoes, aderencia, medidas, fotos, checkins] = await Promise.all([
    getPlanoAtivo(alunoId),
    listSessoes(alunoId, { desde: `${somarDias(inicio, -1)}T00:00:00-03:00`, ate: `${somarDias(fim, 1)}T23:59:59-03:00`, limite: 500, status: "todas" }),
    aderenciaDoAluno(aluno).catch(() => null),
    listEvolucao(alunoId).catch(() => []),
    listFotos(alunoId).catch(() => []),
    listCheckIns(alunoId, diasDesde).catch(() => []),
  ]);
  const p = plano.programa;
  return resumoDaFase({
    aluno: { nome: aluno.profile?.nome ?? "Aluno", objetivo: p?.objetivo ?? aluno.objetivo ?? null, nivel: p?.nivel ?? null },
    protocolo: p ? { nome: p.nome ?? null, fase: p.fase ?? null } : null,
    inicio,
    fim: fim > hoje ? hoje : fim,
    geradoEm: new Date().toISOString(),
    sessoes: sessoes.map((s) => ({ ...s, data: dataLocal(s.iniciado_em), exercicios: s.exercicios.filter((e) => e.status !== "pulado").map((e) => ({ nome: e.nome, grupo: e.grupo_muscular ?? null, series: e.series.map((x) => ({ tipo: x.tipo, carga_kg: x.carga_kg, reps: x.reps })) })) })),
    semanas: aderencia?.semanas ?? [],
    ficha: plano.treinos.filter((t) => t.ativo).flatMap((t) => t.exercicios.map((e) => e.nome)),
    medidas,
    fotos: fotos.map((f) => f.data),
    checkins,
  });
}

/** Períodos das fases (mais recente primeiro), para as sugestões de datas. */
export async function trechosDeFaseDoAluno(alunoId: string): Promise<TrechoDeFase[]> {
  const versoes = await listVersoes(alunoId, 100).catch(() => []);
  const snap = (v: (typeof versoes)[number]) => (v.snapshot as { programa?: { fase?: string | null } } | null)?.programa?.fase ?? null;
  return trechosDeFase(versoes.map((v) => ({ data: dataLocal(v.created_at), fase: snap(v) })), dataLocal(new Date()));
}
