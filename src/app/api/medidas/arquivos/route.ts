// Registra o arquivo de avaliação já enviado (e confere o “Ponto de Partida”).
import { NextResponse } from "next/server";
import { requireAcessoAlunoApi } from "@/lib/auth/session";
import { registrarArquivo } from "@/lib/data/medidas";
import { sincronizarConquistas } from "@/lib/data/conquistas";
import { getAluno } from "@/lib/db";
import { lerJson, registrarArquivoAvaliacaoSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { data, error: vErr } = await lerJson(request, registrarArquivoAvaliacaoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const { sessao, error } = await requireAcessoAlunoApi(data.aluno_id);
  if (error) return error;
  try {
    const arquivo = await registrarArquivo(data.aluno_id, { caminho: data.caminho, nome: data.nome, tipo: data.tipo, tamanho: data.tamanho, data: data.data, descricao: data.descricao ?? null });
    let novas: unknown[] = [];
    if (sessao.role === "aluno") {
      const aluno = await getAluno(data.aluno_id);
      if (aluno) novas = (await sincronizarConquistas(aluno).catch(() => ({ novas: [] }))).novas;
    }
    return NextResponse.json({ ok: true, arquivo, novas }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Não foi possível registrar o arquivo." }, { status: 500 });
  }
}
