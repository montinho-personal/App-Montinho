// Eventos do “Meu Chalalá” (métricas agregadas). Sem foto, sem texto livre.
import { NextResponse, after } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { registrarEvento, sincronizarConquistas } from "@/lib/data/conquistas";
import { eventoChalalaSchema, lerJson } from "@/lib/validacao/schemas";

/** Envios que podem dar troféu de compartilhamento: o troféu já fica gravado. */
const ENVIOS = new Set(["compartilhar_nativo", "download", "descoberta_compartilhada"]);

export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, eventoChalalaSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  await registrarEvento(sessao.alunoId, data).catch(() => undefined);
  if (ENVIOS.has(data.tipo)) {
    after(async () => {
      const aluno = await getAluno(sessao.alunoId).catch(() => null);
      if (aluno) await sincronizarConquistas(aluno).catch(() => undefined);
    });
  }
  return NextResponse.json({ ok: true });
}
