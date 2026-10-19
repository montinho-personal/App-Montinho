import { NextResponse } from "next/server";
import { requireTreinador } from "@/lib/api-auth";

function youtubeId(url: string) {
  return url.match(/[?&]v=([^&]+)/)?.[1] ?? url.match(/youtu\.be\/([^?]+)/)?.[1] ?? null;
}

/**
 * POST /api/importacoes/videos
 * Body: { raw_text } — linhas "nome do exercício; link YouTube".
 * Atualiza o vídeo dos exercícios da biblioteca com nome correspondente.
 */
export async function POST(req: Request) {
  const { db, error } = await requireTreinador();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const linhas = String(body?.raw_text ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const updates: Array<{ nome: string; link: string; id: string | null; count: number }> = [];
  for (const linha of linhas) {
    const [nomeRaw, linkRaw] = linha.split(/[;,]\s*/);
    const nome = nomeRaw?.trim();
    const link = linkRaw?.trim();
    if (!nome || !link) continue;
    const id = youtubeId(link);
    const update = await db!
      .from("exercicios_biblioteca")
      .update({
        video_provider: "youtube",
        video_id: id,
        thumbnail_url: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null,
      })
      .ilike("nome", nome)
      .select("id,nome");
    updates.push({ nome, link, id, count: update.data?.length ?? 0 });
  }

  await db!.from("squad_import_jobs").insert({
    tipo: "videos",
    status: "processado",
    raw_text: body?.raw_text ?? "",
    resultado: updates,
    processed_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, updates });
}
