// POST — lê o WOD de uma foto do quadro, print ou PDF e devolve os blocos
// prontos para o WOD livre (a pessoa confere e toca em Começar). A IA só
// transcreve; quem valida é wodDaLeitura. Sem IA ligada: { ia: false }.
import { NextResponse } from "next/server";
import { FEATURES, isDemoMode } from "@/lib/env";
import { requireAlunoTreinoLivreApi } from "@/lib/treino/livre-guarda";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { lerWod } from "@/lib/ia/ler-wod";
import { LEITURA_EXEMPLO, wodDaLeitura } from "@/lib/modalidades/leitura-wod";
import { lerJson, lerTreinoArquivoSchema } from "@/lib/validacao/schemas";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!FEATURES.multimodalidade) return NextResponse.json({ error: "Indisponível" }, { status: 404 });
  const { error } = await requireAlunoTreinoLivreApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, lerTreinoArquivoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  if (!isDemoMode() && !FEATURES.iaMemoria) return NextResponse.json({ ia: false, wod: null });
  const leitura = isDemoMode() ? LEITURA_EXEMPLO : await lerWod(data.base64, data.tipo);
  const itens = await listarBiblioteca().catch(() => []);
  const wod = wodDaLeitura(leitura, itens.map((i) => ({ id: i.id, nome: i.nome, sinonimos: i.sinonimos ?? [] })));
  return NextResponse.json({ ia: true, wod, exemplo: isDemoMode() });
}
