// Lê a estratégia do Montinho Strategy — o arquivo “Enviar para o app
// Montinho” (.json, exato) ou o relatório em PDF — e devolve o que foi
// encontrado, para o personal conferir antes de salvar. Não grava nada.
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { estrategiaValida, lerArquivoStrategy, lerEstrategia, type EstrategiaImportada } from "@/lib/estrategia/ler";
import { estrategiaSchema } from "@/lib/validacao/schemas";
import { diasDaEstrategia, focoDoDia } from "@/lib/estrategia/divisao";
import { textoDoPdf } from "@/lib/estrategia/pdf";

export const runtime = "nodejs";
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const form = await request.formData().catch(() => null);
  const arquivo = form?.get("arquivo");
  if (!(arquivo instanceof File)) return NextResponse.json({ error: "Envie o arquivo do Montinho Strategy (.json) ou o PDF do relatório." }, { status: 400 });
  if (arquivo.size > MAX_BYTES) return NextResponse.json({ error: "Arquivo grande demais (máx. 8 MB)." }, { status: 413 });
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  let estrategia: EstrategiaImportada;
  const ehPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  if (ehPdf) {
    let texto: string;
    try {
      texto = await textoDoPdf(bytes);
    } catch {
      return NextResponse.json({ error: "Não consegui ler este PDF." }, { status: 422 });
    }
    estrategia = lerEstrategia(texto);
  } else {
    let dados: unknown;
    try {
      dados = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return NextResponse.json({ error: "Envie o PDF do relatório ou o arquivo “.montinho.json” do Montinho Strategy." }, { status: 415 });
    }
    const lida = lerArquivoStrategy(dados);
    const ok = lida ? estrategiaSchema.safeParse(lida) : null;
    if (!lida || !ok?.success) return NextResponse.json({ error: "Este arquivo não é do Montinho Strategy (ou está incompleto)." }, { status: 422 });
    estrategia = ok.data as EstrategiaImportada;
  }
  if (!estrategiaValida(estrategia)) return NextResponse.json({ error: "Não reconheci uma estratégia do Montinho Strategy (não encontrei objetivo e divisão/volume)." }, { status: 422 });
  const dias = diasDaEstrategia(estrategia).map((d) => ({ letra: d.letra, nome: d.nome, foco: focoDoDia(d) }));
  const naoReconhecidos = estrategia.volume.filter((v) => !v.grupo).map((v) => v.rotulo);
  return NextResponse.json({ estrategia, dias, naoReconhecidos, arquivo_nome: arquivo.name.slice(0, 200) });
}
