import { describe, expect, it } from "vitest";
import { antesDepois, ganho, mensagemParabens, numeroBR, porExercicio } from "./painel-tela";

const ant = (carga: number, reps: number) => ({ carga, reps, data: "2026-10-26T10:00:00Z", sessaoId: "s0", serie: 1 });
const d = (exercicio: string, atual: [number, number], anterior: [number, number] | null, tipo: "mais_carga" | "mais_reps" | "acima_media" = "mais_carga") => ({
  tipo,
  exercicio,
  atual: { carga: atual[0], reps: atual[1], serie: 1 },
  anterior: anterior ? ant(anterior[0], anterior[1]) : null,
  media: anterior ? null : { reps: 10.5, carga: atual[0], sessoes: 3 },
});

describe("tela de evoluções", () => {
  it("formata números com vírgula", () => {
    expect(numeroBR(31.5)).toBe("31,5");
    expect(numeroBR(0.1 + 0.2)).toBe("0,3");
  });

  it("mostra antes → hoje e o ganho em destaque", () => {
    const x = d("Panturrilha no leg press 45°", [31.5, 25], [25, 20]);
    expect(antesDepois(x)).toBe("25 kg × 20 → 31,5 kg × 25");
    expect(ganho(x)).toBe("+6,5 kg · +5 reps");
    expect(ganho(d("Remada", [40, 11], [40, 10], "mais_reps"))).toBe("+1 rep");
    expect(ganho(d("Supino", [30, 12], null, "acima_media"))).toBe("+1,5 reps");
    expect(antesDepois(d("Supino", [30, 12], null, "acima_media"))).toBe("média 10,5 reps → 30 kg × 12");
  });

  it("uma evolução por exercício, até 3", () => {
    const l = [d("A", [1, 1], [1, 0]), d("a", [2, 1], [1, 1]), d("B", [1, 1], [1, 0]), d("C", [1, 1], [1, 0]), d("D", [1, 1], [1, 0])];
    expect(porExercicio(l).map((x) => x.exercicio)).toEqual(["A", "B", "C"]);
  });

  it("mensagem do WhatsApp usa o primeiro nome e não usa pronomes", () => {
    const m = mensagemParabens("João Silva", [d("Agachamento", [60, 10], [55, 10])]);
    expect(m).toContain("Fala, João!");
    expect(m).toContain("• Agachamento: 55 kg × 10 → 60 kg × 10 (+5 kg)");
    expect(m).not.toMatch(/\b(você|seu|sua|ele|ela)\b/i);
    expect(mensagemParabens("Ana", [])).not.toMatch(/\b(você|seu|sua)\b/i);
  });
});
