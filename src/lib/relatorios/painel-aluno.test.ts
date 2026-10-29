import { describe, expect, it } from "vitest";
import { carga, compararPeriodos, delta, painelEvolucao } from "./painel-aluno";

const agora = new Date("2026-10-29T15:00:00Z");
const s = (diasAtras: number, cargaKg = 50, reps = 10, n = 3) => ({
  iniciado_em: new Date(agora.getTime() - diasAtras * 86_400_000).toISOString(),
  status: "concluida",
  duracao_seg: 3600,
  exercicios: [{ series: Array.from({ length: n }, () => ({ tipo: "normal", carga_kg: cargaKg, reps })) }],
});

describe("painel da Evolução", () => {
  it("compara o período com o anterior", () => {
    const c = compararPeriodos([s(1), s(3), s(10), s(40)], 30, agora);
    expect(c.atual.treinos).toBe(3);
    expect(c.anterior.treinos).toBe(1);
    expect(c.atual.cargaKg).toBe(4500);
  });
  it("deltas e carga", () => {
    expect(delta(3, 1)?.texto).toBe("▲ +2");
    expect(delta(1, 3)?.tom).toBe("baixa");
    expect(delta(2, 0)?.tom).toBe("novo");
    expect(delta(0, 0)).toBeNull();
    expect(delta(150, 100, true)?.texto).toBe("▲ +50%");
    expect(delta(2500, 100, true)?.texto).toBe("▲ 25× mais");
    expect(carga(4500)).toBe("4,5 t");
    expect(carga(800)).toBe("800 kg");
  });
  it("manchete: carga em alta primeiro; sem treino, convida", () => {
    const p = painelEvolucao({ sessoes: [s(1), s(2)], dias: 30, emAlta: [{ chave: "supino", nome: "Supino reto", pontos: [], primeira: 40, ultima: 50, ganhoKg: 10, ganhoPct: 25, desde: "2026-09-12" }], invisivel: [], medidas: [], sequencia: 3, agora });
    expect(p.manchete).toBe("Você está mais forte");
    expect(p.sub).toContain("+25%");
    expect(p.numeros[2].valor).toBe("3 🔥");
    expect(p.destaques[0].valor).toBe("40 → 50 kg");
    const vazio = painelEvolucao({ sessoes: [], dias: 7, emAlta: [], invisivel: [], medidas: [], sequencia: 0, agora });
    expect(vazio.manchete).toContain("próximo treino");
  });
  it("medidas com cor neutra", () => {
    const p = painelEvolucao({ sessoes: [], dias: 30, emAlta: [], invisivel: [], medidas: [{ data: "2026-09-01", peso_kg: 82, cintura_cm: null }, { data: "2026-10-20", peso_kg: 79.5, cintura_cm: null }], sequencia: 0, agora });
    expect(p.destaques.find((d) => d.id === "peso")).toMatchObject({ valor: "82 → 79,5 kg", tom: "neutro" });
  });
});
