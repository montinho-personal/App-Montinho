import { describe, expect, it } from "vitest";
import { linkExecucao, resumoSeries, textoExecucao } from "./execucao-whatsapp";

describe("enviar execução ao Montinho pelo WhatsApp", () => {
  it("resume só as séries anotadas, no jeito do Brasil", () => {
    expect(resumoSeries([{ carga: "40", reps: "10" }, { carga: "42.5", reps: "8" }, { carga: "", reps: "" }, { carga: "", reps: "12" }])).toBe("40 kg × 10 · 42,5 kg × 8 · 12 reps");
  });
  it("mensagem com exercício, treino, data e séries; link do Montinho", () => {
    const t = textoExecucao({ nomeAluno: "Aline de Souza", exercicio: "Supino reto barra", treino: "Treino A · Peito", dataISO: "2026-10-26", series: [{ carga: "40", reps: "10" }] });
    expect(t).toContain("Aqui é Aline.");
    expect(t).toContain("🏋️ Exercício: Supino reto barra");
    expect(t).toContain("📋 Treino: Treino A · Peito");
    expect(t).toContain("📅 Data: 26/10");
    expect(t).toContain("📊 Hoje: 40 kg × 10");
    expect(linkExecucao("oi")).toBe("https://wa.me/5511981063409?text=oi");
  });
  it("sem séries anotadas, sem a linha de hoje", () => {
    expect(textoExecucao({ exercicio: "Leg press", dataISO: "2026-10-26", series: [] })).not.toContain("Hoje:");
  });
});
