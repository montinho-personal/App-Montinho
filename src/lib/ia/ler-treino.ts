// Leitura de treino por foto/print/PDF (Modo Visitante) com a camada de IA.
// Só roda no servidor e só com AI_PROVIDER=anthropic + ANTHROPIC_API_KEY
// (FEATURES.iaMemoria). A IA apenas TRANSCREVE o treino no formato de linhas
// que o leitor puro (src/lib/visitante/importar-treino.ts) entende; quem casa
// com a biblioteca e monta o rascunho é o código do app, e a pessoa confere
// tudo antes de salvar. Nenhum dado pessoal vai junto: só a imagem/arquivo.
import Anthropic from "@anthropic-ai/sdk";

export const TIPOS_LEITURA = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export type TipoLeitura = (typeof TIPOS_LEITURA)[number];

const INSTRUCOES = `Você transcreve fichas de treino de musculação (foto de papel, print do WhatsApp ou PDF) para um app brasileiro.
Responda SOMENTE com o treino em texto simples, uma linha por exercício, neste formato:
Treino A - <nome do treino, se houver>
<nome do exercício como está escrito> <séries>x<repetições> [<carga> kg] [descanso <segundos>s]

Regras:
- Mantenha o nome do exercício como está na ficha (corrija só erros óbvios de digitação).
- Repetições podem ser faixa (8-12) ou sequência (12/10/8). Sem número de séries/repetições: escreva só o nome.
- Se houver vários treinos/dias (A, B, C ou Dia 1, Dia 2), comece cada um com a linha “Treino X - nome”.
- Ignore textos que não são exercícios (cabeçalhos, logos, observações gerais, telefones, nomes de pessoas).
- Se a imagem não tiver um treino legível, responda exatamente: SEM TREINO`;

/** Transcreve o treino do arquivo. null = não conseguiu (sem IA, ilegível ou erro). */
export async function transcreverTreino(base64: string, tipo: TipoLeitura): Promise<string | null> {
  const client = new Anthropic();
  const arquivo: Anthropic.Beta.BetaContentBlockParam =
    tipo === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : { type: "image", source: { type: "base64", media_type: tipo, data: base64 } };
  try {
    const resposta = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: INSTRUCOES,
      messages: [{ role: "user", content: [arquivo, { type: "text", text: "Transcreva o treino desta ficha." }] }],
    });
    if (resposta.stop_reason === "refusal") return null;
    const texto = resposta.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (!texto || /^SEM TREINO$/i.test(texto)) return null;
    return texto.slice(0, 8000);
  } catch (e) {
    if (e instanceof Anthropic.APIError) console.error("[ia/ler-treino]", e.status, e.message);
    else console.error("[ia/ler-treino]", e);
    return null;
  }
}
