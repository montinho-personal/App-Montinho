// Lê um treino de foto/print/PDF com a IA e devolve o texto transcrito; quem
// monta o rascunho (e a pessoa confere) é o app. Sem IA ligada: { ia: false }.
import { NextResponse } from "next/server";
import { FEATURES, isDemoMode } from "@/lib/env";
import { transcreverTreino } from "@/lib/ia/ler-treino";
import { requireVisitanteEmDiaApi } from "@/lib/visitante/guarda-api";
import { lerJson, lerTreinoArquivoSchema } from "@/lib/validacao/schemas";

export const maxDuration = 60;

// Demonstração: mostra o caminho completo sem chamar a IA.
const EXEMPLO = "Treino A - Peito e tríceps\nSupino reto 4x10 30kg\nCrucifixo máquina 3x12\nTríceps corda 3x12-15\n\nTreino B - Costas e bíceps\nPuxada frente 4x10\nRemada baixa 3x12\nRosca direta 3x10 12kg";

export async function POST(request: Request) {
  const { error } = await requireVisitanteEmDiaApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, lerTreinoArquivoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  if (isDemoMode()) return NextResponse.json({ ia: true, texto: EXEMPLO, exemplo: true });
  if (!FEATURES.iaMemoria) return NextResponse.json({ ia: false, texto: null });
  const texto = await transcreverTreino(data.base64, data.tipo);
  return NextResponse.json({ ia: true, texto });
}
