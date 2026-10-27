// O próprio visitante (acesso em dia) monta o protocolo livre dele (0105):
// liga/desliga e grava as séries por semana de cada músculo. Aluno da
// consultoria não usa: quem define o protocolo dele é o personal.
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAlunoApi } from "@/lib/auth/session";
import { ehVisitante } from "@/lib/auth/guards";
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { salvarLivreMetas } from "@/lib/data/livre-metas";
import { GRUPOS_SELECIONAVEIS } from "@/lib/grupos";
import { lerJson } from "@/lib/validacao/schemas";

const faixa = z.object({ min: z.coerce.number().int().min(0).max(60), max: z.coerce.number().int().min(1).max(60) }).refine((m) => m.max >= m.min, { message: "O máximo precisa ser maior ou igual ao mínimo." });
const schema = z.object({ ligado: z.boolean(), metas: z.partialRecord(z.enum(GRUPOS_SELECIONAVEIS as [string, ...string[]]), faixa) });

export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  if (!ehVisitante(sessao)) return NextResponse.json({ error: "O protocolo do aluno é montado pelo Montinho." }, { status: 403 });
  const { data, error: vErr } = await lerJson(request, schema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  if (data.ligado && !Object.keys(data.metas).length) return NextResponse.json({ error: "Coloque a faixa de séries de pelo menos um músculo." }, { status: 422 });
  if (isDemoMode()) {
    await salvarLivreMetas(sessao.alunoId, data.metas, data.ligado);
    return NextResponse.json({ ok: true });
  }
  const db = await getDb();
  const { error: e } = await db.rpc("salvar_meu_protocolo_livre", { p_metas: data.metas, p_ligado: data.ligado });
  if (e) return NextResponse.json({ error: /salvar_meu_protocolo_livre/.test(e.message) ? "O protocolo livre ainda está sendo ativado. Tente mais tarde." : e.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
