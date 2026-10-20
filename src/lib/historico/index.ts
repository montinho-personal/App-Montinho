// Importações de histórico de outro app (resumo transcrito de prints).
import { normalizarNome } from "@/lib/grupos";
import type { ImportacaoResumo } from "./resumo";
import * as adriana from "./adriana-nascimento";

export const IMPORTACOES: ImportacaoResumo[] = [adriana.IMPORTACAO];

export function importacoesParaAluno(nome: string | null | undefined): ImportacaoResumo[] {
  const n = normalizarNome(nome ?? "");
  return n ? IMPORTACOES.filter((i) => normalizarNome(i.alunoNome) === n) : [];
}
