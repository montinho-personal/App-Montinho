// POST /api/medidas/arquivos/[id]/ler — o personal pede para a IA ler o arquivo
// da avaliação (PDF/foto/print) e devolve uma PRÉVIA com as medidas de cada data
// (nada é salvo aqui: quem salva é o personal, conferindo, pela /api/medidas).
import { NextResponse } from "next/server";
import { requireTreinadorApi } from "@/lib/auth/session";
import { baixarArquivo } from "@/lib/data/medidas";
import { FEATURES, isDemoMode } from "@/lib/env";
import { lerAvaliacao, type TipoAvaliacao } from "@/lib/ia/ler-avaliacao";
import { normalizarLeitura } from "@/lib/medidas/leitura";
import { dataLocal, somarDias } from "@/lib/aderencia/calcular";

export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };
const TIPOS: TipoAvaliacao[] = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export async function POST(_request: Request, { params }: Ctx) {
  const { error } = await requireTreinadorApi();
  if (error) return error;
  const { id } = await params;
  if (!/^[\w-]{1,64}$/.test(id)) return NextResponse.json({ error: "Arquivo inválido" }, { status: 400 });
  const hoje = dataLocal(new Date());
  // Demonstração: mostra o caminho completo sem chamar a IA.
  if (isDemoMode()) {
    const antes = somarDias(hoje, -90);
    return NextResponse.json({
      ia: true,
      exemplo: true,
      avaliacoes: normalizarLeitura(
        [
          { data: antes, medidas: { peso_kg: 71.2, gordura_pct: 29.4, cintura_cm: 76, abdomen_cm: 84, quadril_cm: 104, braco_cm: 29.5, coxa_cm: 58 }, extras: [{ nome: "Braço esquerdo", valor: 29, unidade: "cm" }, { nome: "Pescoço", valor: 32, unidade: "cm" }] },
          { data: hoje, medidas: { peso_kg: 68.6, gordura_pct: 26.1, cintura_cm: 72.5, abdomen_cm: 79, quadril_cm: 101, braco_cm: 30, coxa_cm: 57 }, extras: [{ nome: "Braço esquerdo", valor: 29.5, unidade: "cm" }, { nome: "Pescoço", valor: 31.5, unidade: "cm" }] },
        ],
        hoje
      ),
    });
  }
  if (!FEATURES.iaMemoria) return NextResponse.json({ ia: false, avaliacoes: [] });
  const arq = await baixarArquivo(id).catch(() => null);
  if (!arq) return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  if (!(TIPOS as string[]).includes(arq.tipo)) return NextResponse.json({ error: "A leitura automática aceita PDF, JPG, PNG ou WEBP. Fotos HEIC do iPhone: envie como print ou PDF." }, { status: 400 });
  const brutas = await lerAvaliacao(arq.base64, arq.tipo as TipoAvaliacao);
  if (!brutas) return NextResponse.json({ ia: true, avaliacoes: [], erro: "Não consegui ler as medidas deste arquivo. Dá para digitar em “+ Nova avaliação ou medidas”." });
  return NextResponse.json({ ia: true, avaliacoes: normalizarLeitura(brutas, hoje) });
}
