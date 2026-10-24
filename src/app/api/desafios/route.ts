import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { criarDesafio } from "@/lib/data/desafios";
import { diaBrasilia, TIPOS_DESAFIO } from "@/lib/desafios/regras";
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
  const info = TIPOS_DESAFIO[data.tipo];
  if (info.meta && (data.meta == null || data.meta > info.meta.max)) return NextResponse.json({ error: `Escolha a meta (até ${info.meta.max} ${info.meta.rotulo}).` }, { status: 400 });
  if (data.tipo === "treino_desafio" && !data.exercicios?.length) return NextResponse.json({ error: "Escolha os exercícios do treino do desafio." }, { status: 400 });
  try {
    const r = await criarDesafio(sessao.alunoId, { nome: data.nome, tipo: data.tipo, meta: info.meta ? data.meta : null, inicio: data.inicio, dias: data.dias, foco: data.foco ?? null, exercicios: data.exercicios ?? null, modelo: data.modelo ?? null, revancheDe: data.revancheDe ?? null }, data.convidar);
    return NextResponse.json(r);
  } catch {
    return NextResponse.json({ error: "Não foi possível criar o desafio agora." }, { status: 500 });
  }
}
