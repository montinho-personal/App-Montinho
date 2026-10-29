// Personal: dispensa (ou volta para a lista) conquistas do “Celebrar” — nada é apagado.
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { dispensarConquistas } from "@/lib/data/celebrar";
import { dispensarConquistasSchema, lerJson } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, dispensarConquistasSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    const n = await dispensarConquistas(data.itens.map((i) => ({ alunoId: i.aluno_id, conquistaId: i.conquista_id })), data.desfazer ?? false);
    return NextResponse.json({ ok: true, n });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Não foi possível dispensar" }, { status: 400 });
  }
}
