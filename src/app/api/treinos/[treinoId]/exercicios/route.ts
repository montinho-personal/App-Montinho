import { NextResponse } from "next/server";
import { requireTreinador } from "@/lib/api-auth";
import { saveExerciciosTreino, isMockMode, type ExercicioInput } from "@/lib/db";

/**
 * PUT /api/treinos/[treinoId]/exercicios
 * Substitui (replace em batch) os exercícios do treino e atualiza o nome.
 * Usado pelo Montador (salvar manual + autosave).
 * Body: { nome: string, exercicios: ExercicioInput[] }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ treinoId: string }> }
) {
  const { treinoId } = await params;

  // Em mock mode não há Supabase — pula a auth e persiste em memória (demo).
  if (!isMockMode) {
    const { error } = await requireTreinador();
    if (error) return error;
  }

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.exercicios)) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  // Sanitiza: só linhas com nome; series/ie viram int; vazio → null.
  const exercicios: ExercicioInput[] = (body.exercicios as unknown[])
    .map((raw) => {
      const e = raw as Record<string, unknown>;
      const nome = String(e.nome ?? "").trim();
      if (!nome) return null;
      const series = parseInt(String(e.series ?? "")) || 0;
      const ie = e.ie != null && String(e.ie) !== "" ? parseInt(String(e.ie)) : null;
      const descanso =
        e.descanso_seg != null && String(e.descanso_seg) !== ""
          ? parseInt(String(e.descanso_seg))
          : null;
      return {
        nome,
        series,
        reps: String(e.reps ?? "").trim(),
        ie: ie != null && !Number.isNaN(ie) ? ie : null,
        descanso_seg: descanso != null && !Number.isNaN(descanso) ? descanso : null,
        observacoes: String(e.observacoes ?? "").trim() || null,
      } satisfies ExercicioInput;
    })
    .filter((x): x is ExercicioInput => x !== null);

  const nome = String(body.nome ?? "").trim() || "Treino";

  try {
    const result = await saveExerciciosTreino(treinoId, nome, exercicios);
    return NextResponse.json({ ...result, mock: isMockMode }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao salvar";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
