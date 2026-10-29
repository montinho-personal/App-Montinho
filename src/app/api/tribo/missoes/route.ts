// Missões coletivas da Tribo: só o personal cria (RLS + zod).
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { criarMissao } from "@/lib/data/tribo";
import { lerJson, triboMissaoSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, triboMissaoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const m = await criarMissao({ nome: data.nome, descricao: data.descricao ?? null, meta_minutos: data.meta_minutos ?? null, meta_treinos: data.meta_treinos ?? null, inicio: data.inicio, fim: data.fim, recorrente: data.recorrente ?? false });
    return NextResponse.json({ ok: true, missao: m });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erro ao criar" }, { status: 500 });
  }
}
