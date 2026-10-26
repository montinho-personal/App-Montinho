// “🎥 Enviar execução ao Montinho” (pedido do Montinho, 26/10/2026): o vídeo NÃO
// fica guardado no app. O botão abre o WhatsApp do Montinho com a mensagem já
// escrita (exercício, treino, data e as séries de hoje); o aluno só anexa o vídeo.
import { BRAND } from "@/config/brand";

export type SerieFeita = { carga: string; reps: string };

const limpo = (v: string) => v.trim().replace(".", ",");

/** “40 kg × 10 · 42,5 kg × 8” (só as séries com algo anotado). */
export function resumoSeries(series: SerieFeita[]): string {
  return series
    .filter((s) => s.reps.trim() || s.carga.trim())
    .map((s) => (s.carga.trim() ? `${limpo(s.carga)} kg × ${s.reps.trim() || "?"}` : `${s.reps.trim()} reps`))
    .join(" · ");
}

export function textoExecucao(e: { nomeAluno?: string | null; exercicio: string; treino?: string | null; dataISO: string; series: SerieFeita[] }): string {
  const data = `${e.dataISO.slice(8, 10)}/${e.dataISO.slice(5, 7)}`;
  const primeiro = (e.nomeAluno ?? "").trim().split(" ")[0];
  const linhas = [
    `Oi, ${BRAND.name}!${primeiro ? ` Aqui é ${primeiro}.` : ""} Segue o vídeo da minha execução para você conferir 🎥`,
    "",
    `🏋️ Exercício: ${e.exercicio}`,
    ...(e.treino ? [`📋 Treino: ${e.treino}`] : []),
    `📅 Data: ${data}`,
  ];
  const s = resumoSeries(e.series);
  if (s) linhas.push(`📊 Hoje: ${s}`);
  linhas.push("", "(vou anexar o vídeo aqui embaixo)");
  return linhas.join("\n");
}

export function linkExecucao(texto: string, numero = BRAND.contact.whatsapp): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
