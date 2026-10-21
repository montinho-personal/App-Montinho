// Foto de perfil do aluno. POST = envia/troca (corpo = JPEG já reduzido no
// celular) · DELETE = remove. Só o próprio aluno, e só a própria foto.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { removerFotoPerfil, salvarFotoPerfil } from "@/lib/data/perfil";
import { FOTO_MAX_BYTES, validarFoto } from "@/lib/perfil/foto";

export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const declarado = Number(request.headers.get("content-length") ?? 0);
  if (declarado > FOTO_MAX_BYTES) return NextResponse.json({ error: "Foto muito grande. Tente outra." }, { status: 413 });
  const bytes = new Uint8Array(await request.arrayBuffer());
  const v = validarFoto(request.headers.get("content-type"), bytes);
  if (!v.ok) return NextResponse.json({ error: v.erro }, { status: v.status });
  try {
    const url = await salvarFotoPerfil(sessao.userId, bytes);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar a foto. Tente de novo." }, { status: 500 });
  }
}

export async function DELETE() {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  try {
    await removerFotoPerfil(sessao.userId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível remover a foto." }, { status: 500 });
  }
}
