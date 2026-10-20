// Personal cria/edita um conteúdo do Desbloqueia. Cada gravação é uma nova
// versão (o histórico fica). Publicar exige passar na checagem editorial.
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { salvarConteudoEditorial } from "@/lib/data/desbloqueia";
import { problemasEditoriais } from "@/lib/desbloqueia/motor";
import { FONTES } from "@/lib/desbloqueia/fontes";
import type { ConteudoConhecimento } from "@/lib/desbloqueia/tipos";
import { lerJson, salvarConteudoConhecimentoSchema } from "@/lib/validacao/schemas";

export async function PUT(request: Request) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, salvarConteudoConhecimentoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const conteudo = { ...data.conteudo, status: data.status, versao: 1 } as ConteudoConhecimento;
  const problemas = problemasEditoriais(conteudo, Object.keys(FONTES));
  if (data.status === "publicado" && problemas.length) return NextResponse.json({ error: `Antes de publicar: ${problemas.join(" ")}` }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ...(await salvarConteudoEditorial(conteudo, data.status)), problemas });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível salvar." }, { status: 500 });
  }
}
