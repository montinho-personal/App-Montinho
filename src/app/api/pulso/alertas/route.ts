// Montinho Pulso (painel do personal): acompanhado, dispensado, adiado ou contato
// registrado. O contato só é registrado quando o personal confirma que enviou.
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { marcarAlertaPulso, registrarContatoPulso } from "@/lib/data/pulso";
import { diaSP } from "@/lib/pulso/perguntas";
import { alertaPulsoSchema, lerJson } from "@/lib/validacao/schemas";

export async function POST(request: Request) {
  const { sessao, error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, alertaPulsoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    if (data.acao === "contato") await registrarContatoPulso(sessao.userId, data.aluno_id, data.chave);
    else {
      const ate = data.acao === "adiado" ? diaSP(new Date(Date.now() + (data.dias ?? 3) * 86_400_000)) : null;
      await marcarAlertaPulso(sessao.userId, data.aluno_id, data.chave, data.acao, ate);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar agora." }, { status: 500 });
  }
}
