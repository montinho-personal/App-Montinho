import { NextResponse } from "next/server";
import { requireTreinador } from "@/lib/api-auth";

type ExInput = {
  nome: string;
  series: number;
  reps: string;
  ie: number | null;
  descanso_seg: number | null;
  observacoes: string | null;
  series_config?: unknown;
};

type TreinoInput = {
  id?: string | null;
  letra: "A" | "B" | "C" | "D" | "E";
  nome: string;
  ativo?: boolean;
  observacoes?: string | null;
  exercicios: ExInput[];
};

type ExercicioInsert = {
  treino_id: string;
  ordem: number;
  nome: string;
  series: number;
  reps: string;
  ie: number | null;
  descanso_seg: number | null;
  observacoes: string | null;
  series_config: unknown;
};

/**
 * PUT /api/alunos/[id]/treinos
 * Salva TODOS os treinos A-E de uma vez (Montador A-E). Replace dos exercícios.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireTreinador();
  if (error) return error;

  const { id: alunoId } = await params;
  const body = await req.json().catch(() => null);
  const treinos = body?.treinos as TreinoInput[] | undefined;

  if (!Array.isArray(treinos)) {
    return NextResponse.json({ error: "treinos inválido" }, { status: 400 });
  }

  const salvos: unknown[] = [];

  for (let i = 0; i < treinos.length; i++) {
    const t = treinos[i];
    const treinoPayload = {
      aluno_id: alunoId,
      letra: t.letra,
      nome: t.nome?.trim() || `Treino ${t.letra}`,
      observacoes: t.observacoes ?? null,
      ordem: i,
      ativo: t.ativo ?? true,
    };

    const result = t.id
      ? await admin!.from("treinos").update(treinoPayload).eq("id", t.id).select("*").single()
      : await admin!.from("treinos").insert(treinoPayload).select("*").single();

    if (result.error || !result.data) {
      return NextResponse.json(
        { error: result.error?.message ?? "Erro ao salvar treino" },
        { status: 500 }
      );
    }

    const treino = result.data;
    await admin!.from("exercicios").delete().eq("treino_id", treino.id);

    const exercicios: ExercicioInsert[] = t.exercicios
      .filter((e) => e.nome?.trim())
      .map((e, ordem) => ({
        treino_id: treino.id,
        ordem,
        nome: e.nome.trim(),
        series: e.series || 0,
        reps: e.reps ?? "",
        ie: e.ie,
        descanso_seg: e.descanso_seg,
        observacoes: e.observacoes,
        series_config: e.series_config ?? null,
      }));

    if (exercicios.length) {
      const { error: exErr } = await admin!.from("exercicios").insert(exercicios as never);
      if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
    }

    salvos.push(treino);
  }

  return NextResponse.json({ ok: true, treinos: salvos });
}
