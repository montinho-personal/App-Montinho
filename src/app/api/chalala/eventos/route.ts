// Eventos do “Meu Chalalá” (métricas agregadas). Sem foto, sem texto livre.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { getAluno } from "@/lib/db";
import { registrarEvento, sincronizarConquistas } from "@/lib/data/conquistas";
import { eventoChalalaSchema, lerJson } from "@/lib/validacao/schemas";
import { paraComemorar } from "@/lib/conquistas/comemorar";
import { CODIGOS_COMPARTILHAR } from "@/lib/conquistas/regras";

/**
 * Envios que podem dar troféu de compartilhamento: grava na hora e devolve só os
 * troféus de compartilhar que acabaram de sair (nunca repete: não vistos e novos).
 */
const ENVIOS = new Set(["compartilhar_nativo", "download", "descoberta_compartilhada"]);

export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, eventoChalalaSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const t0 = new Date(Date.now() - 60_000).toISOString();
  await registrarEvento(sessao.alunoId, data).catch(() => undefined);
  if (!ENVIOS.has(data.tipo)) return NextResponse.json({ ok: true });
  const aluno = await getAluno(sessao.alunoId).catch(() => null);
  const sync = aluno ? await sincronizarConquistas(aluno).catch(() => null) : null;
  const novas = sync ? paraComemorar(sync.todas, t0, (c) => (CODIGOS_COMPARTILHAR as string[]).includes(c)) : [];
  return NextResponse.json({ ok: true, novas });
}
