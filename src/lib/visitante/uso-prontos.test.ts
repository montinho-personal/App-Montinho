import { describe, expect, it } from "vitest";
import { usoDosProntos } from "./uso-prontos";
import { MARCA_MONTE_IA, marcaDoPronto, TREINOS_PRONTOS } from "./treinos-prontos";

const musa = TREINOS_PRONTOS.find((t) => t.slug === "operacao-musa-do-bumbum")!;
const dl = (iso: string) => iso.slice(0, 10);
const T = (id: string, aluno: string, obs: string | null, ativo = true, criado = "2026-10-01") => ({ id, aluno_id: aluno, observacoes: obs, ativo, created_at: `${criado}T12:00:00Z` });

describe("uso dos treinos prontos", () => {
  it("conta pessoas, quem está fazendo agora, treinos feitos e o Monte com IA", () => {
    const treinos = [
      T("a1", "ana", marcaDoPronto(musa)), T("a2", "ana", marcaDoPronto(musa)),
      T("b1", "bia", marcaDoPronto(musa), false), // trocou de treino: conta em “escolheram”
      T("c1", "caio", MARCA_MONTE_IA),
      T("d1", "duda", null), // treino próprio comum: fora
    ];
    const sessoes = [
      { aluno_id: "ana", treino_id: "a1", data: "2026-10-20", concluida: true },
      { aluno_id: "ana", treino_id: "a2", data: "2026-10-21", concluida: true },
      { aluno_id: "ana", treino_id: "a2", data: "2026-10-22", concluida: false },
      { aluno_id: "bia", treino_id: "b1", data: "2026-10-05", concluida: true },
      { aluno_id: "caio", treino_id: "c1", data: "2026-09-01", concluida: true },
    ];
    const uso = usoDosProntos(treinos, sessoes, "2026-10-23", dl);
    const m = uso.find((u) => u.chave === musa.slug)!;
    expect(m).toMatchObject({ escolheram: 2, comAtivo: 1, fazendoAgora: 1, treinosFeitos: 3, ultimaEscolha: "2026-10-01" });
    const ia = uso.find((u) => u.chave === "monte-com-ia")!;
    expect(ia).toMatchObject({ escolheram: 1, comAtivo: 1, fazendoAgora: 0, treinosFeitos: 1 });
    expect(uso).toHaveLength(2);
  });
  it("desafio concluído quando bate a meta dentro dos dias", () => {
    const meta = Math.round((musa.desafioDias / 7) * musa.parametros.dias);
    const sessoes = Array.from({ length: meta }, (_, i) => ({ aluno_id: "ana", treino_id: "a1", data: `2026-10-${String(2 + i).padStart(2, "0")}`, concluida: true }));
    const [u] = usoDosProntos([T("a1", "ana", marcaDoPronto(musa))], sessoes, "2026-10-23", dl);
    expect(u.desafiosConcluidos).toBe(1);
  });
});
