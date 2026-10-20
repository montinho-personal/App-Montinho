// Histórico de versões de um conteúdo (só o personal).
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { listarVersoes } from "@/lib/data/desbloqueia";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { id } = await params;
  return NextResponse.json({ versoes: await listarVersoes(id) });
}
