// Reconhecimento ESCRITO pelo personal. Opcionalmente avisa o aluno por push
// com um texto genérico (sem conteúdo da mensagem nem dados de saúde).
import { NextResponse } from "next/server";
import webpush from "web-push";
import { requireTreinadorApi } from "@/lib/auth/session";
import { criarReconhecimento, inscricoesPushDoAluno } from "@/lib/data/conquistas";
import { lerJson, reconhecimentoSchema } from "@/lib/validacao/schemas";
import { BRAND } from "@/config/brand";

export async function POST(request: Request) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, reconhecimentoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  let r;
  try {
    r = await criarReconhecimento({ alunoId: data.aluno_id, conquistaId: data.conquista_id ?? null, mensagem: data.mensagem });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar o reconhecimento" }, { status: 500 });
  }

  let notificados = 0;
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (data.notificar !== false && publica && privada) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || BRAND.url, publica, privada);
    const corpo = JSON.stringify({ titulo: `${BRAND.name} deixou uma mensagem para você`, corpo: "Toque para ver o reconhecimento do seu personal.", url: `/aluno/conquistas?recado=${r.id}#recado`, tag: `reconhecimento-${r.id}` });
    for (const i of await inscricoesPushDoAluno(data.aluno_id)) {
      try {
        await webpush.sendNotification({ endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } }, corpo, { TTL: 24 * 3600, urgency: "normal" });
        notificados++;
      } catch {
        // Aparelho sem inscrição válida: a mensagem continua no app.
      }
    }
  }
  return NextResponse.json({ ok: true, id: r.id, notificados });
}
