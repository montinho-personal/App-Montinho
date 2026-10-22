import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { FEATURES, isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { acaoVisitanteSchema, lerJson } from "@/lib/validacao/schemas";
import { criarIntervencao } from "@/lib/data/acompanhamento";

const DIA_MS = 86_400_000;

/**
 * PATCH /api/treinador/visitantes/[id] — renovar o prazo, encerrar o acesso
 * (vira só leitura) ou converter em aluno da consultoria (nada se perde:
 * histórico, Jornada e medalhas continuam).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!FEATURES.modoVisitante) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  const { id } = await params;
  const { data: body, error: vErr } = await lerJson(request, acaoVisitanteSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  if (isDemoMode()) return NextResponse.json({ ok: true });

  const db = await getDb();
  const { data: aluno } = await db.from("alunos").select("id, modalidade").eq("id", id).maybeSingle();
  if (!aluno || aluno.modalidade !== "visitante") return NextResponse.json({ error: "Visitante não encontrado" }, { status: 404 });
  const agora = new Date();

  if (body.acao === "converter") {
    const { error: e } = await db.from("alunos").update({ modalidade: "consultoria", acesso_ate: null }).eq("id", id);
    if (e) return NextResponse.json({ error: "Não foi possível converter." }, { status: 500 });
    await criarIntervencao(id, sessao.userId, { tipo: "decisao", titulo: "Visitante virou aluno da consultoria", descricao: "Convertido pelo painel de visitantes.", referencia: { origem: "api/treinador/visitantes" } }).catch(() => undefined);
    return NextResponse.json({ ok: true });
  }

  let fim: Date;
  if (body.acao === "encerrar") fim = agora;
  else {
    const { data: acesso } = await db.from("acessos_visitante").select("fim").eq("aluno_id", id).maybeSingle();
    // renova a partir do fim atual (se ainda vale) ou de hoje
    const base = acesso?.fim && new Date(acesso.fim) > agora ? new Date(acesso.fim) : agora;
    fim = new Date(base.getTime() + body.dias * DIA_MS);
  }
  const { error: e } = await db.from("acessos_visitante").upsert({ aluno_id: id, tipo: "dias", fim: fim.toISOString(), updated_at: agora.toISOString() }, { onConflict: "aluno_id" });
  if (e) return NextResponse.json({ error: "Não foi possível alterar o acesso." }, { status: 500 });
  await db.from("alunos").update({ acesso_ate: fim.toISOString().slice(0, 10) }).eq("id", id);
  return NextResponse.json({ ok: true, fim: fim.toISOString() });
}
