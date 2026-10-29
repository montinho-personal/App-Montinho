// Lê o arquivo da avaliação física/bioimpedância (PDF, foto ou print) com a
// camada de IA e devolve as medidas de CADA data que aparece no arquivo
// (ex.: comparativo com a avaliação anterior e a atual). A IA só transcreve
// números; quem confere limites e datas é src/lib/medidas/leitura.ts e quem
// decide salvar é o personal, na prévia. Só no servidor e só com a camada de
// IA ligada. Vai só o arquivo (sem nome, e-mail ou id do aluno no pedido).
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CAMPOS_MEDIDA } from "@/lib/medidas/campos";

export type TipoAvaliacao = "application/pdf" | "image/jpeg" | "image/png" | "image/webp";

const numero = { anyOf: [{ type: "number" }, { type: "null" }] } as const;

export const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["avaliacoes"],
  properties: {
    avaliacoes: {
      type: "array",
      description: "Uma entrada por DATA de avaliação encontrada no arquivo (ex.: a anterior e a atual), da mais antiga para a mais recente",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["data", "medidas", "extras"],
        properties: {
          data: { type: "string", description: "Data da avaliação no formato AAAA-MM-DD" },
          medidas: {
            type: "object",
            additionalProperties: false,
            required: CAMPOS_MEDIDA.map((c) => c.chave),
            properties: Object.fromEntries(CAMPOS_MEDIDA.map((c) => [c.chave, { ...numero, description: `${c.rotulo} em ${c.unidade}; null se não estiver no arquivo` }])),
          },
          extras: {
            type: "array",
            description: "Todas as outras medidas numéricas dessa data que não cabem nos campos acima",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["nome", "valor", "unidade"],
              properties: { nome: { type: "string" }, valor: { type: "number" }, unidade: { type: "string" } },
            },
          },
        },
      },
    },
  },
} as const;

const Resposta = z.object({
  avaliacoes: z.array(z.object({ data: z.string(), medidas: z.record(z.string(), z.number().nullable()), extras: z.array(z.object({ nome: z.string(), valor: z.number(), unidade: z.string() })) })),
});

const INSTRUCOES = `Você transcreve laudos de avaliação física e de bioimpedância (PDF, foto ou print) de um personal trainer brasileiro.
O arquivo pode ter UMA ou VÁRIAS datas (ex.: “Comparativo antropométrico” com a avaliação anterior e a atual lado a lado). Devolva UMA entrada por data, da mais antiga para a mais recente.

Campos fixos (use null quando não houver):
- peso_kg, altura_cm, gordura_pct (% de gordura), massa_muscular_kg (massa muscular / massa muscular esquelética), massa_magra_kg (massa magra / massa livre de gordura), gordura_visceral (nível), agua_pct (% de água corporal).
- Circunferências em cm: cintura_cm, abdomen_cm, quadril_cm, peito_cm (tórax/peitoral), braco_cm, coxa_cm, panturrilha_cm.
- Quando houver lado direito e esquerdo (ex.: braço D e E), ponha o DIREITO relaxado no campo fixo e TODAS as variações (esquerdo, contraído, proximal/medial/distal) também em extras com o nome completo.

Extras: TODA outra medida numérica da data (antebraço, pescoço, ombro, dobras cutâneas em mm, soma de dobras, IMC, RCQ, taxa metabólica basal, idade metabólica, massa de gordura em kg, massa óssea etc.), com o nome como está no laudo e a unidade (cm, mm, kg, %, kcal, anos, kg/m²…).

Regras:
- Datas no formato AAAA-MM-DD. Se o laudo só disser “anterior/atual” sem data, use a data impressa no cabeçalho para a atual e não invente a anterior (deixe só a atual).
- Copie os números exatamente; vírgula decimal vira ponto. Não calcule nem estime nada que não está escrito.
- Não inclua nomes de pessoas, telefones ou textos que não sejam medidas.
- Se o arquivo não tiver medidas legíveis, devolva avaliacoes vazia.`;

export type LeituraBruta = z.infer<typeof Resposta>["avaliacoes"];

/** null = não deu (sem IA, erro, recusa ou ilegível). */
export async function lerAvaliacao(base64: string, tipo: TipoAvaliacao): Promise<LeituraBruta | null> {
  const arquivo: Anthropic.Beta.BetaContentBlockParam =
    tipo === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : { type: "image", source: { type: "base64", media_type: tipo, data: base64 } };
  try {
    const client = new Anthropic();
    const resposta = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> } },
      system: INSTRUCOES,
      messages: [{ role: "user", content: [arquivo, { type: "text", text: "Transcreva as medidas de cada data desta avaliação." }] }],
    });
    if (resposta.stop_reason === "refusal" || resposta.stop_reason === "max_tokens") return null;
    const bloco = resposta.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text");
    if (!bloco) return null;
    const r = Resposta.safeParse(JSON.parse(bloco.text));
    return r.success ? r.data.avaliacoes : null;
  } catch (e) {
    if (e instanceof Anthropic.APIError) console.error("[ia/ler-avaliacao]", e.status, e.message);
    else console.error("[ia/ler-avaliacao]", e);
    return null;
  }
}
