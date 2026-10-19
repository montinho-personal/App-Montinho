import { NextResponse } from "next/server";
import { requireTreinador } from "@/lib/api-auth";
import type { TemplateTreinoEstrutura } from "@/lib/supabase/types-extended";

type ExercicioInsert = {
  treino_id: string;
  ordem: number;
  nome: string;
  series: number;
  reps: string;
  ie: number | null;
  descanso_seg: number | null;
  biblioteca_id: string | null;
};

/**
 * POST /api/treinos
 * Cria treinos para um aluno a partir de um template.
 * Body: { aluno_id, template_id?, estrutura? }
 * Aceita estrutura diretamente ou busca pelo template_id.
 */
export async function POST(request: Request) {
  const { admin, error } = await requireTreinador();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body?.aluno_id) {
    return NextResponse.json({ error: "aluno_id é obrigatório" }, { status: 400 });
  }

  let estrutura: TemplateTreinoEstrutura | null = body.estrutura ?? null;
  // Busca estrutura do template se fornecido template_id
  if (body.template_id && !estrutura) {
    const { data: tpl } = await admin!
      .from("templates_treino")
      .select("*")
      .eq("id", body.template_id)
      .maybeSingle();
    if (!tpl) return NextResponse.json({ error: "Template não encontrado" }, { status: 404 });
    estrutura = tpl.estrutura as TemplateTreinoEstrutura;

    // Incrementa uso_count
    await admin!
      .from("templates_treino")
      .update({ uso_count: (tpl.uso_count ?? 0) + 1 })
      .eq("id", body.template_id);
  }

  if (!estrutura) {
    return NextResponse.json({ error: "template_id ou estrutura são obrigatórios" }, { status: 400 });
  }

  // Remove treinos anteriores do aluno (substitui)
  if (body.substituir !== false) {
    await admin!.from("treinos").update({ ativo: false }).eq("aluno_id", body.aluno_id);
  }

  const letras = Object.keys(estrutura) as Array<keyof typeof estrutura>;
  const treinosCriados: unknown[] = [];

  for (let i = 0; i < letras.length; i++) {
    const letra = letras[i] as "A" | "B" | "C" | "D" | "E";
    const secao = estrutura[letra]!;

    const { data: treino, error: tErr } = await admin!
      .from("treinos")
      .insert({
        aluno_id: body.aluno_id,
        letra,
        nome: secao.nome,
        observacoes: body.observacoes ?? null,
        ordem: i,
        ativo: true,
      })
      .select()
      .single();

    if (tErr || !treino) continue;

    // Insere exercícios do treino
    const exerciciosPayload: ExercicioInsert[] = secao.exercicios.map((ex, ordem) => ({
      treino_id: treino.id,
      ordem,
      nome: ex.nome,
      series: ex.series,
      reps: ex.reps,
      ie: ex.ie ?? null,
      descanso_seg: ex.descanso_seg ?? null,
      biblioteca_id: ex.biblioteca_id ?? null,
    }));

    if (exerciciosPayload.length > 0) {
      await admin!.from("exercicios").insert(exerciciosPayload as never);
    }

    treinosCriados.push(treino);
  }

  return NextResponse.json({ ok: true, treinos: treinosCriados, total: treinosCriados.length }, { status: 201 });
}
