// GET /api/ofertas — o cartão de oferta do aluno logado (só leitura): o que vale para ele.
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { contextoOferta } from "@/lib/data/ofertas";

export async function GET() {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  // O personal no app como aluno não vê oferta dos próprios planos.
  if (sessao.comoPersonal) return NextResponse.json({ contexto: null });
  const contexto = await contextoOferta(sessao.alunoId).catch(() => null);
  return NextResponse.json({ contexto }, { headers: { "cache-control": "no-store" } });
}
