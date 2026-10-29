import { describe, expect, it } from "vitest";
import { evolucaoExercicio } from "./calcular";
import type { SessaoCompleta } from "@/lib/data/sessoes";

const sessao = (id: string, dia: string, series: Array<{ tipo: string; carga_kg: number | null; reps: number | null }>) =>
  ({ id, status: "concluida", iniciado_em: `${dia}T12:00:00Z`, finalizado_em: `${dia}T13:00:00Z`, exercicios: [{ nome: "Crucifixo na polia", grupo_muscular: "peito", series: series.map((s, i) => ({ serie: i + 1, ...s })) }] }) as unknown as SessaoCompleta;

describe("média das séries válidas", () => {
  it("soma a carga das séries válidas (sem aquecimento, só com carga) e divide pelo número delas", () => {
    const p = evolucaoExercicio(
      [
        sessao("a", "2026-10-27", [{ tipo: "aquecimento", carga_kg: 20, reps: 15 }, { tipo: "valida", carga_kg: 45, reps: 12 }, { tipo: "valida", carga_kg: 40, reps: 12 }, { tipo: "valida", carga_kg: 35, reps: 12 }]),
        sessao("b", "2026-10-28", [{ tipo: "valida", carga_kg: 45, reps: 12 }, { tipo: "valida", carga_kg: 45, reps: 10 }, { tipo: "valida", carga_kg: 42.5, reps: 10 }, { tipo: "valida", carga_kg: null, reps: 10 }]),
      ],
      "Crucifixo na polia"
    );
    expect(p.map((x) => [x.cargaMax, x.cargaMedia])).toEqual([[45, 40], [45, 44.2]]);
  });
});

describe("força estimada e repetições com a mesma carga", () => {
  it("guarda o maior nº de reps em cada carga e escolhe a carga repetida", async () => {
    const { cargasRepetidas, repsNaCarga } = await import("./graficos-aluno");
    const p = evolucaoExercicio(
      [
        sessao("a", "2026-10-20", [{ tipo: "valida", carga_kg: 45, reps: 10 }, { tipo: "valida", carga_kg: 45, reps: 9 }, { tipo: "valida", carga_kg: 40, reps: 12 }]),
        sessao("b", "2026-10-24", [{ tipo: "valida", carga_kg: 45, reps: 11 }, { tipo: "valida", carga_kg: 50, reps: 8 }]),
        sessao("c", "2026-10-28", [{ tipo: "valida", carga_kg: 45, reps: 12 }, { tipo: "valida", carga_kg: 40, reps: 15 }]),
      ],
      "Crucifixo na polia"
    );
    expect(cargasRepetidas(p)).toEqual([45, 40]);
    expect(repsNaCarga(p, 45).map((x) => x.reps)).toEqual([10, 11, 12]);
    // Epley: 45 × (1 + 12/30) = 63
    expect(p.at(-1)?.e1rmMax).toBe(63);
  });
});
