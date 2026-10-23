// Ditado inteligente: organiza a fala (ou texto colado) em exercícios da
// biblioteca com a IA. Sem IA ligada (ou na demonstração): { ia: false } e a
// tela segue com o leitor sem IA. A pessoa sempre confere antes de aplicar.
import { NextResponse } from "next/server";
import { getSessao } from "@/lib/auth/session";
import { FEATURES, isDemoMode } from "@/lib/env";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { interpretarTreinoComIA } from "@/lib/ia/interpretar-treino";
import { ditadoIASchema, lerJson } from "@/lib/validacao/schemas";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await getSessao())) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const { data, error } = await lerJson(request, ditadoIASchema);
  if (error) return NextResponse.json(error.body, { status: error.status });
  if (!FEATURES.iaMemoria || isDemoMode()) return NextResponse.json({ ia: false, resultado: null });
  const biblioteca = await listarBiblioteca();
  const resultado = await interpretarTreinoComIA(data.fala, biblioteca.map((i) => ({ id: i.id, nome: i.nome, sinonimos: i.sinonimos })));
  return NextResponse.json({ ia: true, resultado });
}
