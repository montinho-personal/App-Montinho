// POST — começa o WOD do dia (sessão extra com os blocos congelados; 0134).
import { NextResponse } from "next/server";
import { requireAlunoApi } from "@/lib/auth/session";
import { FEATURES } from "@/lib/env";
import { iniciarSessaoWod } from "@/lib/data/wod-dia";
import { lerJson, wodIniciarSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  if (!FEATURES.multimodalidade) return NextResponse.json({ error: "Indisponível" }, { status: 404 });
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, wodIniciarSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    return NextResponse.json(await iniciarSessaoWod(sessao.alunoId, data.wod_id, data.client_key), { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível começar o WOD";
    return NextResponse.json({ error: msg }, { status: /acesso ao app terminou/i.test(msg) ? 403 : /andamento|publicado/i.test(msg) ? 409 : 500 });
  }
}
