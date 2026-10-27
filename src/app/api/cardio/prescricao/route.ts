// Visitante monta, troca ou encerra o PRÓPRIO cardio (autoria 'proprio').
// Só visitante com acesso em dia (o banco confere de novo pela RLS da 0098).
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { FEATURES } from "@/lib/env";
import { podeRegistrar } from "@/lib/visitante/acesso";
import { desativarPrescricaoCardio, salvarPrescricaoCardio } from "@/lib/data/cardio";
import { desativarPrescricaoCardioSchema, lerJson, prescricaoCardioSchema } from "@/lib/validacao/schemas";

async function visitanteEmDia() {
  const { sessao, error } = await requireAlunoApi();
  if (error) return { sessao: null, error };
  if (!FEATURES.modoVisitante || !ehVisitante(sessao)) return { sessao: null, error: NextResponse.json({ error: "Quem monta o seu cardio é o Montinho." }, { status: 403 }) };
  if (!podeRegistrar("visitante", sessao.acessoFim ?? null)) return { sessao: null, error: NextResponse.json({ error: "Seu acesso terminou." }, { status: 403 }) };
  return { sessao, error: null };
}

export async function POST(request: Request) {
  const { sessao, error } = await visitanteEmDia();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, prescricaoCardioSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const { substitui_id, ...p } = data;
    // Visitante não usa FC-alvo nem treino ligado (isso é prescrição do personal).
    const prescricao = await salvarPrescricaoCardio(sessao.alunoId, { ...p, fc_alvo_min: null, fc_alvo_max: null, treino_id: null }, substitui_id ?? null, "proprio");
    return NextResponse.json({ prescricao }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível salvar" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const { sessao, error } = await visitanteEmDia();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, desativarPrescricaoCardioSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    await desativarPrescricaoCardio(sessao.alunoId, data.prescricao_id, "proprio");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível encerrar" }, { status: 400 });
  }
}
