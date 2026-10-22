import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { FEATURES, isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { conviteSchema, lerJson } from "@/lib/validacao/schemas";
import { codigoValido, normalizarCodigo } from "@/lib/visitante/acesso";

/** POST /api/treinador/convites — cria um código de convite (RLS: só treinador). */
export async function POST(request: Request) {
  if (!FEATURES.modoVisitante) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data: body, error: vErr } = await lerJson(request, conviteSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const codigo = normalizarCodigo(body.codigo);
  if (!codigoValido(codigo)) return NextResponse.json({ error: "Use de 4 a 32 letras, números ou hífen." }, { status: 400 });
  if (isDemoMode()) return NextResponse.json({ error: "No modo demonstração não é possível criar convites." }, { status: 501 });

  const db = await getDb();
  const { data, error: dbErr } = await db
    .from("convites")
    .insert({
      codigo,
      tipo_acesso: body.tipo_acesso,
      dias: body.tipo_acesso === "dias" ? body.dias : null,
      acesso_ate: body.tipo_acesso === "ate_data" ? body.acesso_ate : null,
      max_usos: body.max_usos ?? null,
      // validade do código: até o fim do dia em Brasília
      valido_ate: body.valido_ate ? `${body.valido_ate}T23:59:59-03:00` : null,
      origem: body.origem || null,
      campanha_id: body.campanha_id ?? null,
    })
    .select("*")
    .single();
  if (dbErr) return NextResponse.json({ error: dbErr.code === "23505" ? "Já existe um convite com esse código." : "Não foi possível criar o convite." }, { status: dbErr.code === "23505" ? 409 : 500 });
  return NextResponse.json(data, { status: 201 });
}
