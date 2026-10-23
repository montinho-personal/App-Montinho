// Medidas e avaliações (0078): o aluno (as próprias) ou o personal (de qualquer aluno).
import { NextResponse } from "next/server";
import { requireAcessoAlunoApi } from "@/lib/auth/session";
import { salvarMedidas } from "@/lib/data/medidas";
import { sincronizarConquistas } from "@/lib/data/conquistas";
import { getAluno } from "@/lib/db";
import { lerJson, medidasSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const raw = await request.clone().json().catch(() => null);
  const alunoId = typeof raw?.aluno_id === "string" ? raw.aluno_id : "";
  const { sessao, error } = await requireAcessoAlunoApi(alunoId);
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, medidasSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const { aluno_id, ...m } = data;
  try {
    const registro = await salvarMedidas(aluno_id, sessao.role === "treinador" ? "personal" : "aluno", m);
    // O aluno já vê o troféu “Ponto de Partida” na hora (o personal não grava conquistas).
    let novas: unknown[] = [];
    if (sessao.role === "aluno") {
      const aluno = await getAluno(aluno_id);
      if (aluno) novas = (await sincronizarConquistas(aluno).catch(() => ({ novas: [] }))).novas;
    }
    return NextResponse.json({ ok: true, registro, novas }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível salvar";
    return NextResponse.json({ error: /Preencha/.test(msg) ? msg : "Não foi possível salvar as medidas agora." }, { status: /Preencha/.test(msg) ? 400 : 500 });
  }
}
