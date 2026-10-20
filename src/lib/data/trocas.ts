// Opções de troca de exercício para o aluno (regras em src/lib/treino/troca.ts).
import { getPlanoAtivo } from "./programas";
import { listarBiblioteca, listarEquivalenciasParaAluno } from "./biblioteca";
import { indicePorNome, interpretarEquipamentos } from "@/lib/biblioteca/itens";
import { normalizarNome } from "@/lib/grupos";
import { opcoesDeTroca, type TrocasDoExercicio } from "@/lib/treino/troca";

export async function trocasParaExercicios(alunoId: string, exercicios: Array<{ id: string; nome: string; biblioteca_id: string | null }>): Promise<Record<string, TrocasDoExercicio>> {
  const [itens, equivalencias, plano] = await Promise.all([listarBiblioteca(), listarEquivalenciasParaAluno(), getPlanoAtivo(alunoId)]);
  const porId = new Map(itens.map((i) => [i.id, i]));
  const porNome = indicePorNome(itens);
  const equipamentos = plano.programa?.equipamentos?.length ? interpretarEquipamentos(plano.programa.equipamentos) : null;
  const out: Record<string, TrocasDoExercicio> = {};
  for (const e of exercicios) {
    const origem = (e.biblioteca_id ? porId.get(e.biblioteca_id) : undefined) ?? porNome.get(normalizarNome(e.nome));
    out[e.id] = origem ? opcoesDeTroca(origem, itens, equivalencias, { equipamentos }) : { lento: false, opcoes: [] };
  }
  return out;
}
