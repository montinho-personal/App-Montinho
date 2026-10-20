// Configuração da Evolução Inteligente para um aluno (só o personal).
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireTreinadorApi } from "@/lib/auth/session";
import { salvarConfigEvolucao } from "@/lib/data/evolucao";
import { lerJson } from "@/lib/validacao/schemas";

const schema = z.object({
  avisos_ativos: z.boolean(),
  max_por_exercicio: z.number().int().min(0).max(5),
  max_por_sessao: z.number().int().min(0).max(10),
  metricas: z.array(z.enum(["recorde", "mais_carga", "mais_reps", "acima_media"])).max(4),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { id } = await params;
  const { data, error: vErr } = await lerJson(request, schema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    await salvarConfigEvolucao(id, data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível salvar." }, { status: 500 });
  }
}
