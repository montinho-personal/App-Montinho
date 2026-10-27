// Personal liga/desliga o protocolo livre (por metas) do aluno e grava as faixas de séries por semana.
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTreinadorApi } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { salvarLivreMetas } from "@/lib/data/livre-metas";
import { GRUPOS_SELECIONAVEIS } from "@/lib/grupos";
import { lerJson } from "@/lib/validacao/schemas";

const faixa = z.object({ min: z.coerce.number().int().min(0).max(60), max: z.coerce.number().int().min(0).max(60) }).refine((m) => m.max >= m.min, { message: "O máximo precisa ser maior ou igual ao mínimo." });
const schema = z.object({ ligado: z.boolean(), metas: z.partialRecord(z.enum(GRUPOS_SELECIONAVEIS as [string, ...string[]]), faixa) });
type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, schema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  if (!(await getAluno(id))) return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
  const metas = Object.fromEntries(Object.entries(data.metas).filter(([, m]) => m && m.max > 0));
  if (data.ligado && !Object.keys(metas).length) return NextResponse.json({ error: "Coloque a faixa de séries de pelo menos um músculo." }, { status: 422 });
  try {
    await salvarLivreMetas(id, metas, data.ligado);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível salvar" }, { status: 400 });
  }
}
