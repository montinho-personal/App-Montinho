// POST /api/livre — começa um treino livre (ou devolve o que está em andamento).
// Aluno ou visitante em dia. Como treino extra, segue as regras do extra:
// liberado pelo personal, semana cumprida e sem dor forte.
import { NextResponse } from "next/server";
import { iniciarSessaoLivre } from "@/lib/data/livre";
import { getConfigExtra } from "@/lib/data/extras";
import { contextoExtraGerado } from "@/lib/data/extra-gerado";
import { requireAlunoTreinoLivreApi } from "@/lib/treino/livre-guarda";
import { lerJson, livreIniciarSchema } from "@/lib/validacao/schemas";
import { BRAND } from "@/config/brand";

export async function POST(request: Request) {
  const { sessao, error } = await requireAlunoTreinoLivreApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, livreIniciarSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  if (data.extra) {
    if (data.extra.corpo === "dor") return NextResponse.json({ error: `Com dor forte, nada de extra hoje. Converse com o ${BRAND.name} antes de treinar mais.` }, { status: 409 });
    const [config, ctx] = await Promise.all([getConfigExtra(sessao.alunoId), contextoExtraGerado(sessao.alunoId)]);
    if (!config?.habilitado) return NextResponse.json({ error: `O ${BRAND.name} ainda não liberou treinos extras para você.` }, { status: 403 });
    if (ctx.bloqueio) return NextResponse.json({ error: ctx.bloqueio }, { status: 409 });
  }
  try {
    const corpo = data.extra && data.extra.corpo !== "dor" ? { corpo: data.extra.corpo } : null;
    const s = await iniciarSessaoLivre(sessao.alunoId, data.client_key, { extra: corpo });
    return NextResponse.json({ id: s.id }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Não foi possível começar agora.";
    return NextResponse.json({ error: msg }, { status: /em andamento/.test(msg) ? 409 : /acesso ao app terminou/i.test(msg) ? 403 : 500 });
  }
}
