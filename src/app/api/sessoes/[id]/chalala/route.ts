// Resumo real da sessão concluída (tela “Chalalá!”) + conquistas desta sessão.
// Recalcula e grava conquistas de forma idempotente (reabrir não duplica).
import { NextResponse, after } from "next/server";
import { agendarLembreteTrofeu } from "@/lib/data/lembrete-trofeu";
import { requireAlunoDoTreinoApi } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { resumoChalala } from "@/lib/data/conquistas";
import { descobertaDaConclusao } from "@/lib/data/desbloqueia";
import { contextosDaConclusao } from "@/lib/desbloqueia/motor";
import { getPlanoAtivo } from "@/lib/data/programas";
import { listSessoes } from "@/lib/data/sessoes";
import { estadoSemana } from "@/lib/relatorios/calcular";
import { proximaMissao } from "@/lib/inicio/missao";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Aluno no app dele ou personal na aula presencial (aluno validado no servidor).
  const { sessao, error } = await requireAlunoDoTreinoApi(request);
  if (error) return error;
  const aluno = await getAluno(sessao.alunoId);
  if (!aluno) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
  const r = await resumoChalala(aluno, id);
  if (!r) return NextResponse.json({ error: "Sessão não encontrada ou ainda em andamento" }, { status: 404 });
  const descoberta = await descobertaDaConclusao(aluno.id, contextosDaConclusao({ metaCumpridaAgora: r.metaCumpridaAgora, modo: r.modo, recorde: r.recordes.length > 0 || !!r.evolucao?.tipo.startsWith("recorde"), maisReps: r.evolucao?.tipo === "mais_reps" })).catch(() => null);
  // Próxima missão (Fase 1): a mesma conta do Início, só com a prescrição real (sem treino extra/livre).
  let proxima: ReturnType<typeof proximaMissao> = null;
  if (r.status === "concluida" && r.modo !== "extra" && r.letra) {
    const [plano, sessoes] = await Promise.all([getPlanoAtivo(aluno.id).catch(() => null), listSessoes(aluno.id, { limite: 60 }).catch(() => [])]);
    const treinos = (plano?.treinos ?? []).filter((t) => t.ativo && t.exercicios.length > 0);
    const semana = estadoSemana(sessoes, plano?.programa?.frequencia, treinos.map((t) => t.letra));
    const t = treinos.find((x) => x.letra === semana.proximaLetra) ?? null;
    proxima = proximaMissao({ proximo: t ? { letra: t.letra, nome: t.nome } : null, meta: r.meta, pontos: r.pontosSemana });
  }
  // Depois de responder: lembrete no celular do próximo troféu que está perto (0104).
  if (r.status === "concluida") after(() => agendarLembreteTrofeu(aluno).catch(() => undefined));
  return NextResponse.json({ ...r, descoberta, proximaMissao: proxima });
}
