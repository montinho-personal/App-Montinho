// Treino livre: “não sei o nome do aparelho” → foto do aparelho → a IA olha a
// imagem e ESCOLHE, por número, até 3 exercícios da biblioteca do Montinho que
// combinam com ele. Não inventa exercício; quem confirma é a pessoa (toca no
// certo). Só no servidor e só com a camada de IA ligada. Nenhum dado pessoal
// vai junto: só a foto. A lista da biblioteca vai com cache.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { listaBiblioteca, type ItemParaIA } from "./interpretar-treino";

export const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["aparelho", "opcoes"],
  properties: {
    aparelho: { anyOf: [{ type: "string" }, { type: "null" }], description: "Nome popular do aparelho/equipamento na foto, em português (ex.: “cadeira extensora”); null se não dá para saber" },
    opcoes: {
      type: "array",
      description: "Até 3 exercícios da BIBLIOTECA feitos nesse aparelho, do mais provável ao menos provável",
      items: { type: "object", additionalProperties: false, required: ["numero"], properties: { numero: { type: "integer" } } },
    },
  },
} as const;

const Resposta = z.object({ aparelho: z.string().nullable(), opcoes: z.array(z.object({ numero: z.number().int() })) });

const INSTRUCOES = `Você ajuda alunos de academia no Brasil que não sabem o nome do aparelho que estão vendo.
Recebe a FOTO de um aparelho ou equipamento de academia e a BIBLIOTECA de exercícios do personal (número | nome | sinônimos).
- Identifique o aparelho/equipamento (ex.: cadeira extensora, leg press 45°, polia/crossover, Smith, banco inclinado, halteres).
- Escolha até 3 exercícios da BIBLIOTECA que se fazem nesse aparelho, do mais provável ao menos provável, devolvendo o NÚMERO de cada um.
- Aparelho de uso único (ex.: cadeira extensora): 1 opção basta. Equipamento versátil (polia, Smith, banco, halteres): até 3 opções comuns.
- Se a foto não mostrar um aparelho de academia, ou nada da biblioteca servir, devolva opcoes vazia.
- Nunca invente número que não está na lista.`;

export type ReconhecimentoAparelho = { aparelho: string | null; ids: string[] };

/** null = não deu (sem IA, erro ou recusa): a pessoa segue pela busca. */
export async function reconhecerAparelho(base64Jpeg: string, itens: ItemParaIA[]): Promise<ReconhecimentoAparelho | null> {
  if (!itens.length) return null;
  try {
    const client = new Anthropic();
    const resposta = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> } },
      system: [
        { type: "text", text: INSTRUCOES },
        { type: "text", text: `BIBLIOTECA (número | nome | sinônimos):\n${listaBiblioteca(itens)}`, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64Jpeg } }, { type: "text", text: "Que aparelho é este e quais exercícios da biblioteca se fazem nele?" }] }],
    });
    if (resposta.stop_reason === "refusal" || resposta.stop_reason === "max_tokens") return null;
    const bloco = resposta.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text");
    if (!bloco) return null;
    const r = Resposta.safeParse(JSON.parse(bloco.text));
    if (!r.success) return null;
    const ids = [...new Set(r.data.opcoes.map((o) => itens[o.numero - 1]?.id).filter((x): x is string => !!x))].slice(0, 3);
    return { aparelho: r.data.aparelho?.trim().slice(0, 60) || null, ids };
  } catch (e) {
    if (e instanceof Anthropic.APIError) console.error("[ia/reconhecer-aparelho]", e.status, e.message);
    else console.error("[ia/reconhecer-aparelho]", e);
    return null;
  }
}
