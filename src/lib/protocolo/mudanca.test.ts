import { describe, expect, it } from "vitest";
import { avisoDoProtocolo, mudancasDoProtocolo, proximaFase, segundaSeguinte, type SnapProtocolo } from "./mudanca";

const t = (letra: string, exs: string[], ativo = true) => ({ letra, nome: `Treino ${letra}`, ativo, exercicios: exs.map((nome) => ({ nome })) });
const base: SnapProtocolo = { programa: { fase: "adaptacao", frequencia: { A: 1, B: 1, C: 1 } }, treinos: [t("A", ["Supino reto", "Crucifixo"]), t("B", ["Agachamento"]), t("C", ["Remada"])] };

describe("o que mudou no protocolo", () => {
  it("Adaptação → Intensificação com troca de exercício e dia novo", () => {
    const novo: SnapProtocolo = { programa: { fase: "intensificacao", frequencia: { A: 1, B: 1, C: 1, D: 1 } }, treinos: [t("A", ["Supino reto", "Supino inclinado"]), t("B", ["agachamento "]), t("C", ["Remada"]), t("D", ["Stiff"])] };
    const m = mudancasDoProtocolo(base, novo)!;
    expect(m.mudouFase).toBe(true);
    expect(m.diasNovos.map((d) => d.letra)).toEqual(["D"]);
    expect(m.porDia).toEqual([{ letra: "A", nome: "Treino A", entraram: ["Supino inclinado"], sairam: ["Crucifixo"] }]);
    expect([m.semanaAntes, m.semanaDepois]).toEqual([3, 4]);
    const a = avisoDoProtocolo(m, "2026-11-11T15:00:00Z");
    expect(a.titulo).toMatch(/Intensificação/);
    expect(a.linhas).toContain("➕ Novo: Treino D");
    expect(a.linhas).toContain("🔁 Treino A: entrou Supino inclinado; saiu Crucifixo");
    expect(a.meta).toMatch(/4 treinos por semana, a partir de segunda, 16\/11/);
  });
  it("dia novo ainda vazio não aparece", () => {
    const m = mudancasDoProtocolo(base, { ...base, treinos: [...base.treinos, t("D", [])] })!;
    expect(m.diasNovos).toEqual([]);
    expect(m.relevante).toBe(false);
  });
  it("só mudar séries/reps não é aviso; primeira versão também não", () => {
    expect(mudancasDoProtocolo(base, base)!.relevante).toBe(false);
    expect(mudancasDoProtocolo(null, base)).toBeNull();
  });
  it("marcar Adaptação num protocolo sem fase não avisa; sem fase → Intensificação avisa", () => {
    const semFase: SnapProtocolo = { ...base, programa: { ...base.programa, fase: null } };
    expect(mudancasDoProtocolo(semFase, base)!.mudouFase).toBe(false);
    expect(mudancasDoProtocolo(semFase, base)!.relevante).toBe(false);
    const int: SnapProtocolo = { ...base, programa: { ...base.programa, fase: "intensificacao" } };
    expect(mudancasDoProtocolo(semFase, int)!.mudouFase).toBe(true);
  });
  it("segunda-feira seguinte e próxima fase", () => {
    expect(segundaSeguinte("2026-11-16T12:00:00Z")).toBe("2026-11-23");
    expect(proximaFase("adaptacao")).toBe("intensificacao");
    expect(proximaFase("consolidacao")).toBeNull();
  });
});
