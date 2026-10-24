// Código opaco do link dos cards do aluno (Inspiração da Galera): quando
// alguém abre /chalala?c=<código>, a visita conta para ele, sem revelar quem é.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { codigoDoLink } from "@/lib/chalala/link";

export async function GET() {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  return NextResponse.json({ codigo: codigoDoLink(sessao.alunoId) });
}
