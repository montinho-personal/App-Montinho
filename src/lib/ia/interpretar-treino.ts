// Ditado inteligente: a IA organiza o que foi falado (ou escrito/colado) em
// exercícios da biblioteca do Montinho. Ela só ESCOLHE entre os exercícios da
// lista enviada (por número) e lê séries, repetições, descanso e método; o
// app confere tudo (número existe, valores dentro dos limites) e a pessoa vê
// a prévia antes de aplicar. Só no servidor, só com a camada de IA ligada.
// A lista da biblioteca vai no início (com cache), a fala por último.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const METODOS_IA = ["normal", "piramide", "piramide_decrescente", "biset", "triset", "superset", "combinado", "pre_exaustao", "rest_pause", "dropset", "cluster", "myo_reps", "tres_sete", "super_slow", "negativo", "isometria", "unilateral"] as const;
export type MetodoIA = (typeof METODOS_IA)[number];

export type ItemParaIA = { id: string; nome: string; sinonimos: string[] };

export type ExercicioInterpretado = {
  falado: string;
  /** Exercício da biblioteca escolhido (null = não existe na biblioteca). */
  bibliotecaId: string | null;
  /** Nome como a pessoa disse, quando não achou na biblioteca. */
  nomeLivre: string | null;
  series: number | null;
  reps: string | null;
  descansoSeg: number | null;
  cargaKg: number | null;
  metodo: MetodoIA | null;
  /** Mesmo número = mesmo bi-set/tri-set. */
  bloco: number | null;
};
export type TreinoInterpretado = { nome: string | null; exercicios: ExercicioInterpretado[] };
export type ResultadoInterpretacao = { treinos: TreinoInterpretado[]; metodoGeral: MetodoIA | null };

export const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["treinos", "metodo_geral"],
  properties: {
    metodo_geral: { anyOf: [{ type: "string", enum: [...METODOS_IA] }, { type: "null" }], description: "Método que vale para todos (ex.: “todos em pirâmide”)" },
    treinos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nome", "exercicios"],
        properties: {
          nome: { type: ["string", "null"], description: "Nome do treino, se a pessoa disse (ex.: “Treino A – Peito”)" },
          exercicios: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["falado", "numero", "nome_livre", "series", "reps", "descanso_seg", "carga_kg", "metodo", "bloco"],
              properties: {
                falado: { type: "string", description: "Trecho da fala deste exercício" },
                numero: { type: ["integer", "null"], description: "Número do exercício na lista da biblioteca; null se nenhum serve" },
                nome_livre: { type: ["string", "null"], description: "Só quando numero é null: o nome como a pessoa disse, limpo" },
                series: { type: ["integer", "null"] },
                reps: { type: ["string", "null"], description: "Número (10), faixa (8-12) ou sequência (12/10/8)" },
                descanso_seg: { type: ["integer", "null"] },
                carga_kg: { type: ["number", "null"] },
                metodo: { anyOf: [{ type: "string", enum: [...METODOS_IA] }, { type: "null" }] },
                bloco: { type: ["integer", "null"], description: "Exercícios do mesmo bi-set/tri-set têm o mesmo número" },
              },
            },
          },
        },
      },
    },
  },
} as const;

const Resposta = z.object({
  metodo_geral: z.enum(METODOS_IA).nullable(),
  treinos: z.array(
    z.object({
      nome: z.string().nullable(),
      exercicios: z.array(
        z.object({
          falado: z.string(),
          numero: z.number().int().nullable(),
          nome_livre: z.string().nullable(),
          series: z.number().int().nullable(),
          reps: z.string().nullable(),
          descanso_seg: z.number().int().nullable(),
          carga_kg: z.number().nullable(),
          metodo: z.enum(METODOS_IA).nullable(),
          bloco: z.number().int().nullable(),
        })
      ),
    })
  ),
});

const INSTRUCOES = `Você organiza treinos de musculação ditados por voz (ou escritos/colados) em português do Brasil, para um app de personal trainer.
A fala vem do reconhecimento de voz do celular: sem pontuação, com palavras trocadas por sons parecidos (ex.: "by set" = bi-set, "rosca scot" = rosca Scott, "leg 45" = leg press 45°, "puxador" = puxada, "remada baixa" = remada sentada na polia) e às vezes com correções ("não, quatro séries" vale o último).

Para cada exercício falado:
- Escolha o exercício da BIBLIOTECA abaixo que a pessoa quis dizer e devolva o NÚMERO dele. Considere nome e sinônimos, jeitos populares de falar e o equipamento citado (barra, halter, máquina, polia, Smith).
- Se nada da biblioteca servir, numero = null e nome_livre = como a pessoa disse (ex.: "aquele de puxar").
- Leia séries × repetições ("4 de 10", "4 por 10", "três séries de doze", "12 10 8" = pirâmide 12/10/8), descanso ("descanso 90", "um minuto e meio" = 90) e carga ("30 quilos").
- Métodos: bi-set/tri-set/super-set ligam os exercícios seguintes no mesmo bloco; drop-set, rest-pause etc. valem para o exercício citado; "todos em pirâmide" vai em metodo_geral.
- Vários treinos ("treino A … treino B …", "dia 1 … dia 2 …"): separe em treinos com nome. Um treino só: um item com nome null.
- Não invente exercícios que não foram falados. Mantenha a ordem da fala. Use null para o que não foi dito.`;

export function listaBiblioteca(itens: ItemParaIA[]): string {
  return itens.map((i, k) => `${k + 1} | ${i.nome}${i.sinonimos.length ? ` | ${i.sinonimos.slice(0, 6).join("; ")}` : ""}`).join("\n");
}

const limitar = (n: number | null, min: number, max: number) => (n == null || !Number.isFinite(n) ? null : Math.min(max, Math.max(min, Math.round(n))));

/** null = não deu (erro, recusa ou resposta fora do formato): o app usa o leitor sem IA. */
export async function interpretarTreinoComIA(fala: string, itens: ItemParaIA[]): Promise<ResultadoInterpretacao | null> {
  if (!fala.trim() || !itens.length) return null;
  return organizarComIA(INSTRUCOES, `Fala: """${fala.slice(0, 4000)}"""`, itens, "interpretar-treino");
}

/**
 * Chamada comum (ditado e “Criar com IA”): mesmas regras de saída — a IA só
 * escolhe exercícios da lista por número e o app confere os limites.
 */
export async function organizarComIA(instrucoes: string, mensagem: string, itens: ItemParaIA[], rotulo: string): Promise<ResultadoInterpretacao | null> {
  try {
    const client = new Anthropic();
    const resposta = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> } },
      system: [
        { type: "text", text: instrucoes },
        { type: "text", text: `BIBLIOTECA (número | nome | sinônimos):\n${listaBiblioteca(itens)}`, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: mensagem }],
    });
    if (resposta.stop_reason === "refusal" || resposta.stop_reason === "max_tokens") return null;
    const bloco = resposta.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text");
    if (!bloco) return null;
    const r = Resposta.safeParse(JSON.parse(bloco.text));
    if (!r.success) return null;
    const treinos = r.data.treinos
      .map((t) => ({
        nome: t.nome?.trim().slice(0, 60) || null,
        exercicios: t.exercicios.slice(0, 20).map((e): ExercicioInterpretado => {
          const item = e.numero != null ? itens[e.numero - 1] : undefined;
          const reps = e.reps?.replace(/\s/g, "").match(/^\d{1,3}([-/]\d{1,3})*$/) ? e.reps.replace(/\s/g, "") : null;
          return {
            falado: e.falado.slice(0, 200),
            bibliotecaId: item?.id ?? null,
            nomeLivre: item ? null : (e.nome_livre ?? e.falado).trim().slice(0, 60) || null,
            series: limitar(e.series, 1, 10),
            reps,
            descansoSeg: limitar(e.descanso_seg, 15, 600),
            cargaKg: e.carga_kg != null && e.carga_kg > 0 && e.carga_kg <= 500 ? Math.round(e.carga_kg * 4) / 4 : null,
            metodo: e.metodo,
            bloco: e.bloco,
          };
        }),
      }))
      .filter((t) => t.exercicios.length);
    return { treinos, metodoGeral: r.data.metodo_geral };
  } catch (e) {
    if (e instanceof Anthropic.APIError) console.error(`[ia/${rotulo}]`, e.status, e.message);
    else console.error(`[ia/${rotulo}]`, e);
    return null;
  }
}
