// Marca conquistas do próprio aluno como vistas (a celebração não repete).
// Só a coluna vista_em; o banco garante (privilégio por coluna + RLS).
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAlunoApi } from "@/lib/auth/session";
import { marcarConquistasVistas } from "@/lib/data/conquistas";
import { lerJson } from "@/lib/validacao/schemas";

const schema = z.object({ ids: z.array(z.string().min(1).max(64)).min(1).max(50) });

export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, schema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  await marcarConquistasVistas(sessao.alunoId, data.ids).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
