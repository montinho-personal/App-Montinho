import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAlunoApi } from "@/lib/auth/session";
import { definirConsentimentoPulso } from "@/lib/data/pulso";
import { lerJson } from "@/lib/validacao/schemas";

const schema = z.object({ sim: z.boolean() });

/** Liga/desliga o consentimento do Pulso para dado de saúde (Perfil). */
export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, schema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  try {
    return NextResponse.json({ consentimento: await definirConsentimentoPulso(sessao.alunoId, data.sim) });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar agora." }, { status: 500 });
  }
}
