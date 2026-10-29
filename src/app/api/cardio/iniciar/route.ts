// “▶ Começar” no cronômetro de cardio: grava o início com a hora do servidor.
// É essa hora que vale para os troféus de horário (madrugada, 4h, meia-noite).
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { podeRegistrar } from "@/lib/visitante/acesso";
import { iniciarCardio } from "@/lib/data/cardio";
import { iniciarCardioSchema, lerJson } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  // Visitante com acesso vencido não registra (o banco também barra: pode_registrar()).
  if (!podeRegistrar(sessao.modalidade ?? "consultoria", sessao.acessoFim ?? null)) return NextResponse.json({ error: "Seu acesso de 30 dias terminou. Para voltar a registrar, fale com o Montinho." }, { status: 403 });
  const { data, error: vErr } = await lerJson(request, iniciarCardioSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const inicio = await iniciarCardio(sessao.alunoId, data.modalidade ?? null).catch(() => null);
  return NextResponse.json({ inicio_id: inicio?.id ?? null, iniciado_em: inicio?.iniciado_em ?? null });
}
