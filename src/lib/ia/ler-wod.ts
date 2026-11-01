// WOD por foto/print/PDF (pedido do Montinho, 01/11/2026). Só roda no servidor
// e só com a IA ligada (FEATURES.iaMemoria). A IA apenas TRANSCREVE o quadro
// num JSON simples; quem valida e monta os blocos é o app
// (src/lib/modalidades/leitura-wod.ts) e a pessoa confere antes de começar.
// Nenhum dado pessoal vai junto: só a imagem/arquivo.
import Anthropic from "@anthropic-ai/sdk";
import type { LeituraWod } from "@/lib/modalidades/leitura-wod";
import type { TipoLeitura } from "./ler-treino";

const INSTRUCOES = `Você transcreve treinos de Cross Training, HYROX e funcional (foto do quadro da box, print do WhatsApp ou PDF) para um app brasileiro.
Responda SOMENTE com um JSON válido, sem texto antes ou depois, neste formato:
{"modalidade":"cross|hyrox|funcional|hibrido","titulo":"nome do WOD ou null","blocos":[{"tipo":"aquecimento|tecnica|forca|metcon|volta_calma|corrida|estacao|circuito","formato":"amrap|emom|for_time|rounds_for_time|chipper|tabata|intervalo|death_by|ladder|livre|circuito|null","titulo":"texto curto ou null","minutos":número ou null,"rounds":número ou null,"time_cap_min":número ou null,"intervalo_seg":número ou null,"trabalho_seg":número ou null,"descanso_seg":número ou null,"esquema":"ex.: 21-15-9 ou null","texto":"o que não for movimento (aquecimento, observações) ou null","movimentos":[{"nome":"movimento como está escrito","reps":"texto ou null","carga":"texto ou null","distancia_m":número ou null,"calorias":número ou null,"scaled":"versão adaptada se houver ou null"}]}]}

Regras:
- Cada parte do quadro (aquecimento, força/skill, WOD/metcon, volta à calma) é um bloco, na ordem.
- “AMRAP 12” = formato amrap, minutos 12. “EMOM 10” = emom, minutos 10. “For time (cap 15)” = for_time, time_cap_min 15. “5 rounds for time” = rounds_for_time, rounds 5.
- Mantenha o nome do movimento como está escrito (corrija só erros óbvios de digitação). Cargas como “43/29 kg” vão em “carga”.
- Ignore logos, nomes de pessoas, telefones e o que não é treino.
- Se não houver treino legível, responda exatamente: {"blocos":[]}`;

/** Lê o WOD do arquivo. null = não conseguiu (sem IA, ilegível ou erro). */
export async function lerWod(base64: string, tipo: TipoLeitura): Promise<LeituraWod | null> {
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
      messages: [{ role: "user", content: [arquivo, { type: "text", text: "Transcreva o treino deste quadro/arquivo." }] }],
    });
    if (resposta.stop_reason === "refusal") return null;
    const texto = resposta.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    const ini = texto.indexOf("{");
    const fim = texto.lastIndexOf("}");
    if (ini < 0 || fim <= ini) return null;
    return JSON.parse(texto.slice(ini, fim + 1)) as LeituraWod;
  } catch (e) {
    if (e instanceof Anthropic.APIError) console.error("[ia/ler-wod]", e.status, e.message);
    else console.error("[ia/ler-wod]", e);
    return null;
  }
}
