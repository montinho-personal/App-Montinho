// Treino enviado pelo visitante: abrir o arquivo (link de 5 min; a RLS decide
// quem vê) e, para o personal, marcar como montado/descartado.
import { NextResponse } from "next/server";
import { getSessao, requireTreinadorApi } from "@/lib/auth/session";
import { linkDoTreinoEnviado, resolverTreinoEnviado } from "@/lib/data/treinos-enviados";
import { lerJson, resolverTreinoEnviadoSchema } from "@/lib/validacao/schemas";

type Ctx = { params: Promise<{ id: string }> };
const idValido = (id: string) => /^[\w-]{1,64}$/.test(id);

export async function GET(_request: Request, { params }: Ctx) {
  if (!(await getSessao())) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await params;
  if (!idValido(id)) return NextResponse.json({ error: "Arquivo inválido" }, { status: 400 });
  const url = await linkDoTreinoEnviado(id).catch(() => null);
  if (!url) return NextResponse.json({ error: "Arquivo não encontrado (na demonstração os arquivos não são guardados)." }, { status: 404 });
  return NextResponse.redirect(url);
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { id } = await params;
  if (!idValido(id)) return NextResponse.json({ error: "Envio inválido" }, { status: 400 });
  const { data, error: vErr } = await lerJson(request, resolverTreinoEnviadoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const ok = await resolverTreinoEnviado(id, data.status).catch(() => false);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Envio não encontrado" }, { status: 404 });
}
