import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { criarDesafio } from "@/lib/data/desafios";
import { diaBrasilia } from "@/lib/desafios/regras";
import { lerJson, novoDesafioSchema } from "@/lib/validacao/schemas";

/** POST /api/desafios — qualquer aluno ou visitante cria um desafio (sem aprovação do personal). */
export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, novoDesafioSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const hoje = diaBrasilia(new Date());
  const limite = diaBrasilia(new Date(Date.now() + 14 * 86_400_000));
  if (data.inicio < hoje || data.inicio > limite) return NextResponse.json({ error: "O desafio começa de hoje até daqui a 14 dias." }, { status: 400 });
  try {
    const r = await criarDesafio(sessao.alunoId, { nome: data.nome, tipo: data.tipo, meta: data.meta, inicio: data.inicio, dias: data.dias }, data.convidar);
    return NextResponse.json(r);
  } catch {
    return NextResponse.json({ error: "Não foi possível criar o desafio agora." }, { status: 500 });
  }
}
