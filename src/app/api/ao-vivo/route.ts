// “Treinando agora” (só o personal): treinos em andamento, para a tela ao vivo.
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { outrasAtividadesAgora, treinandoAgora } from "@/lib/data/ao-vivo";

export const dynamic = "force-dynamic";

export async function GET() {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  try {
    return NextResponse.json({ agora: new Date().toISOString(), lista: await treinandoAgora(), outras: await outrasAtividadesAgora().catch(() => []) });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar agora" }, { status: 500 });
  }
}
