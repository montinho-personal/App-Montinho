import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { atualizarMemoria, excluirDaMemoria, feedbackMemoria, getMemoria } from "@/lib/data/memoria";
import { lerJson, memoriaPatchSchema } from "@/lib/validacao/schemas";
import type { BibliotecaPrograma } from "@/lib/supabase/types-sessoes";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const { id } = await params;
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const m = await getMemoria(id);
  if (!m) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(m);
}

/** PATCH — feedback de relevância (útil / não útil / usei e adaptei), favorito, justificativa, nome, tags. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, memoriaPatchSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  let m: BibliotecaPrograma | null = null;
  if (data.feedback) m = await feedbackMemoria(id, data.feedback, data.desfazer ?? false);
  const patch: Parameters<typeof atualizarMemoria>[1] = {};
  if (data.favorito !== undefined) patch.favorito = data.favorito;
  if (data.justificativa !== undefined) patch.justificativa = data.justificativa;
  if (data.nome !== undefined) patch.nome = data.nome;
  if (data.tags !== undefined) patch.tags = data.tags;
  if (Object.keys(patch).length) m = await atualizarMemoria(id, patch);
  if (!m) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(m);
}

/** DELETE — remove do acervo (o histórico do aluno permanece). */
export async function DELETE(_: Request, { params }: Ctx) {
  const { id } = await params;
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const ok = await excluirDaMemoria(id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
