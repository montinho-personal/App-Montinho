// POST /api/livre — começa um treino livre (ou devolve o que está em andamento). Só visitante em dia.
import { NextResponse } from "next/server";
import { iniciarSessaoLivre } from "@/lib/data/livre";
import { requireVisitanteEmDiaApi } from "@/lib/visitante/guarda-api";
import { lerJson, livreIniciarSchema } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { sessao, error } = await requireVisitanteEmDiaApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, livreIniciarSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const s = await iniciarSessaoLivre(sessao.alunoId, data.client_key);
    return NextResponse.json({ id: s.id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível começar agora.";
    return NextResponse.json({ error: msg }, { status: /em andamento/.test(msg) ? 409 : /acesso ao app terminou/i.test(msg) ? 403 : 500 });
  }
}
