// Treino livre: “não sei o nome do aparelho” → foto do aparelho → a IA olha a
// imagem e ESCOLHE, por número, até 3 exercícios da biblioteca do Montinho que
// combinam com ele. Não inventa exercício; quem confirma é a pessoa (toca no
// certo). Só no servidor e só com a camada de IA ligada. Nenhum dado pessoal
// vai junto: só a foto. A lista da biblioteca vai com cache.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { ItemParaIA } from "./interpretar-treino";

export const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["aparelho", "opcoes"],
  properties: {
    aparelho: { anyOf: [{ type: "string" }, { type: "null" }], description: "Nome popular do aparelho/equipamento na foto, em português (ex.: “cadeira extensora”); null se não dá para saber" },
    opcoes: {
      type: "array",
      description: "Até 4 exercícios da BIBLIOTECA feitos nesse aparelho, do mais provável ao menos provável",
      items: { type: "object", additionalProperties: false, required: ["numero"], properties: { numero: { type: "integer" } } },
    },
  },
} as const;

const Resposta = z.object({ aparelho: z.string().nullable(), opcoes: z.array(z.object({ numero: z.number().int() })) });

const INSTRUCOES = `Você ajuda alunos e o personal de uma academia no Brasil a achar o nome do exercício a partir da FOTO de um aparelho ou equipamento.
Recebe a foto e a BIBLIOTECA de exercícios do personal (número | nome | músculo | equipamento | sinônimos).

Como olhar a foto:
1. Procure primeiro a PLAQUINHA/ADESIVO com o nome ou o desenho do exercício (muitos aparelhos têm). Se der para ler, ela manda.
2. Se houver alguém usando o aparelho, a POSTURA mostra o exercício (sentado empurrando com as pernas, deitado puxando, etc.).
3. Repare nos detalhes que separam aparelhos parecidos:
   - cadeira extensora (rolo na frente da canela, empurra para cima) × cadeira flexora sentada/mesa flexora (rolo atrás do tornozelo, puxa para baixo/para trás);
   - leg press 45° (trenó inclinado) × leg press horizontal × hack (costas apoiadas num encosto inclinado, ombreiras) × agachamento no Smith (barra presa em trilhos);
   - cadeira adutora (pernas fecham) × abdutora (pernas abrem) — muitas vezes é a MESMA máquina: ofereça as duas;
   - peck deck/voador (abraça para frente) × crucifixo invertido na máquina (mesma máquina de costas): ofereça os dois;
   - polia/crossover: o ACESSÓRIO preso no cabo (corda, barra reta, barra W, triângulo, puxador unilateral) e a ALTURA da polia (alta, baixa) definem o exercício;
   - puxador/pulley (barra alta e banco com apoio de coxa) × remada sentada (cabo baixo, apoio de pés) × máquina articulada (alavancas com anilhas);
   - banco reto, inclinado ou declinado, halteres, barra livre, kettlebell, elástico, step, caixa.
4. Equipamento de uso único: 1 ou 2 opções bastam. Equipamento versátil (polia, Smith, banco, halteres, barra): até 4 opções, as mais comuns primeiro, combinando com o acessório e a posição que aparecem.

Regras:
- Escolha só da BIBLIOTECA, pelo NÚMERO, do mais provável ao menos provável. Nunca invente número.
- Prefira o exercício que bate com o equipamento listado (máquina, polia, Smith, halteres…).
- "aparelho" = nome popular em português do que está na foto (ex.: “cadeira extensora”, “polia com corda”).
- Se a foto não mostra um aparelho/equipamento de academia, ou nada da biblioteca serve, devolva opcoes vazia.`;

/** A lista que a IA lê: número | nome | músculo | equipamento | sinônimos. */
export function listaParaFoto(itens: ItemParaIA[]): string {
  return itens
    .map((i, k) => {
      const extra = i as ItemParaIA & { grupo?: string | null; equipamento?: string[] | null };
      return [k + 1, i.nome, extra.grupo ?? "", (extra.equipamento ?? []).join(", "), i.sinonimos.slice(0, 6).join("; ")].join(" | ");
    })
    .join("\n");
}

export type ReconhecimentoAparelho = { aparelho: string | null; ids: string[] };

/** null = não deu (sem IA, erro ou recusa): a pessoa segue pela busca. */
export async function reconhecerAparelho(base64Jpeg: string, itens: ItemParaIA[]): Promise<ReconhecimentoAparelho | null> {
  if (!itens.length) return null;
  try {
    const client = new Anthropic();
    const resposta = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> } },
      system: [
        { type: "text", text: INSTRUCOES },
        { type: "text", text: `BIBLIOTECA (número | nome | músculo | equipamento | sinônimos):\n${listaParaFoto(itens)}`, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64Jpeg } }, { type: "text", text: "Que aparelho é este e quais exercícios da biblioteca se fazem nele? Leia a plaquinha se houver." }] }],
    });
    if (resposta.stop_reason === "refusal" || resposta.stop_reason === "max_tokens") return null;
    const bloco = resposta.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text");
    if (!bloco) return null;
    const r = Resposta.safeParse(JSON.parse(bloco.text));
    if (!r.success) return null;
    const ids = [...new Set(r.data.opcoes.map((o) => itens[o.numero - 1]?.id).filter((x): x is string => !!x))].slice(0, 4);
    return { aparelho: r.data.aparelho?.trim().slice(0, 60) || null, ids };
  } catch (e) {
    if (e instanceof Anthropic.APIError) console.error("[ia/reconhecer-aparelho]", e.status, e.message);
    else console.error("[ia/reconhecer-aparelho]", e);
    return null;
  }
}
