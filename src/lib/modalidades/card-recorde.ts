// ============================================================================
// Card “Novo recorde pessoal” (Multimodalidade, fase 6): a mesma imagem pronta
// das medalhas (logo oficial completo, 1080×1920), com o recorde de força (RM
// exato) ou o benchmark. Só o primeiro nome da pessoa; nada de saúde.
// ============================================================================
import type { CardMedalha } from "@/lib/conquistas/compartilhavel";
import { textoResultado } from "./resultado";
import { rotuloRm, type LinhaBenchmark, type LinhaRecorde } from "./recordes";

const kg = (n: number) => `${String(n).replace(".", ",")} kg`;
const dataBR = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? "";

export function cardRecordeForca(r: LinhaRecorde, nome: string): CardMedalha {
  const destaque = `${kg(r.atual)} · ${rotuloRm(r.rm)}`;
  const porque = r.anterior != null ? `Antes ${kg(r.anterior)}: +${kg(r.ganhoKg ?? 0)} (+${String(r.ganhoPct ?? 0).replace(".", ",")}%).` : `Primeira marca de ${rotuloRm(r.rm)} registrada.`;
  return {
    selo: "PR",
    titulo: "Novo recorde pessoal",
    chamada: "MARCA PESSOAL",
    semAspas: true,
    destaque,
    frase: r.nome,
    porque,
    nome: primeiroNome(nome),
    data: dataBR(r.data),
    legenda: `NOVO RECORDE PESSOAL! ${r.nome}: ${destaque}. ${r.anterior != null ? `Antes eram ${kg(r.anterior)}. ` : ""}🏅 Treinando com @montinho_personal`,
  };
}

export function cardRecordeBenchmark(b: LinhaBenchmark, nomeBenchmark: string, nome: string): CardMedalha {
  const destaque = textoResultado(b.melhor);
  const condicao = b.condicao === "rx" ? "RX" : "Scaled";
  return {
    selo: "PR",
    titulo: "Novo recorde pessoal",
    chamada: "MARCA PESSOAL",
    semAspas: true,
    destaque,
    frase: `${nomeBenchmark} · ${condicao}`,
    porque: b.melhorou && b.diferenca && b.diferenca !== "igual" ? `${b.diferenca} em relação à vez anterior.` : b.vezes > 1 ? `Melhor resultado em ${b.vezes} tentativas.` : "Primeira marca neste benchmark.",
    nome: primeiroNome(nome),
    data: dataBR(b.melhor.data),
    legenda: `NOVO RECORDE PESSOAL! ${nomeBenchmark} (${condicao}): ${destaque}. 🏅 Treinando com @montinho_personal`,
  };
}
