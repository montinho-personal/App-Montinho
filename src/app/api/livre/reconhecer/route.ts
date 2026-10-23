// POST /api/livre/reconhecer — foto do aparelho → até 3 exercícios da biblioteca
// que combinam (a pessoa escolhe). Sem IA ligada: { ia: false } e segue pela busca.
import { NextResponse } from "next/server";
import { FEATURES, isDemoMode } from "@/lib/env";
import { listarBiblioteca } from "@/lib/data/biblioteca";
import { reconhecerAparelho } from "@/lib/ia/reconhecer-aparelho";
import { requireAlunoTreinoLivreApi } from "@/lib/treino/livre-guarda";
import { lerJson, livreFotoAparelhoSchema } from "@/lib/validacao/schemas";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { error } = await requireAlunoTreinoLivreApi();
  if (error) return error;
  const { data, error: vErr } = await lerJson(request, livreFotoAparelhoSchema);
  if (vErr) return NextResponse.json(vErr.body, { status: vErr.status });
  const biblioteca = await listarBiblioteca();
  // Demonstração: mostra o caminho sem chamar a IA.
  if (isDemoMode()) {
    const ids = ["cadeira-extensora", "cadeira-extensora-unilateral"].map((s) => biblioteca.find((i) => i.slug === s)?.id).filter((x): x is string => !!x);
    return NextResponse.json({ ia: true, exemplo: true, aparelho: "Cadeira extensora", opcoes: ids.map((id) => ({ id })) });
  }
  if (!FEATURES.iaMemoria) return NextResponse.json({ ia: false });
  const r = await reconhecerAparelho(data.base64, biblioteca.map((i) => ({ id: i.id, nome: i.nome, sinonimos: i.sinonimos })));
  if (!r) return NextResponse.json({ ia: true, aparelho: null, opcoes: [] });
  return NextResponse.json({ ia: true, aparelho: r.aparelho, opcoes: r.ids.map((id) => ({ id })) });
}
