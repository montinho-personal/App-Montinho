// Lê o relatório do Montinho Strategy (PDF) e devolve o que foi encontrado,
// para o personal conferir antes de salvar. Não grava nada.
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { estrategiaValida, lerEstrategia } from "@/lib/estrategia/ler";
import { diasDaEstrategia, focoDoDia } from "@/lib/estrategia/divisao";
import { textoDoPdf } from "@/lib/estrategia/pdf";

export const runtime = "nodejs";
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const form = await request.formData().catch(() => null);
  const arquivo = form?.get("arquivo");
  if (!(arquivo instanceof File)) return NextResponse.json({ error: "Envie o PDF do relatório." }, { status: 400 });
  if (arquivo.size > MAX_BYTES) return NextResponse.json({ error: "Arquivo grande demais (máx. 8 MB)." }, { status: 413 });
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  if (!(bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) return NextResponse.json({ error: "O arquivo não é um PDF." }, { status: 415 });
  let texto: string;
  try {
    texto = await textoDoPdf(bytes);
  } catch {
    return NextResponse.json({ error: "Não consegui ler este PDF." }, { status: 422 });
  }
  const estrategia = lerEstrategia(texto);
  if (!estrategiaValida(estrategia)) return NextResponse.json({ error: "Não reconheci um relatório do Montinho Strategy neste PDF (não encontrei objetivo e divisão/volume)." }, { status: 422 });
  const dias = diasDaEstrategia(estrategia).map((d) => ({ letra: d.letra, nome: d.nome, foco: focoDoDia(d) }));
  return NextResponse.json({ estrategia, dias, arquivo_nome: arquivo.name.slice(0, 200) });
}
