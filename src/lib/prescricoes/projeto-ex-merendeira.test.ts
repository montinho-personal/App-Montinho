import { describe, expect, it } from "vitest";
import { salvarPlanoSchema } from "@/lib/validacao/schemas";
import { auditarPrescricao } from "./auditar";
import { PRESCRICAO } from "./projeto-ex-merendeira";
import { prescricoesParaAluno } from "./index";
import { frequenciaDoCalendario, type Calendario } from "@/lib/volume/calcular";

const aud = auditarPrescricao(PRESCRICAO);
const T = (l: string) => aud.find((t) => t.letra === l)!;

describe("prescrição Projeto Ex-Merendeira (Natália) — conforme a ficha do personal", () => {
  it("passa na mesma validação do montador (zod)", () => {
    const r = salvarPlanoSchema.safeParse(PRESCRICAO);
    expect(r.success ? "ok" : JSON.stringify(r.error.issues.slice(0, 3))).toBe("ok");
  });

  it("4 treinos em sequência (Lower, Upper, Lower, Upper), sem dias fixos", () => {
    expect(aud.map((t) => t.letra)).toEqual(["A", "B", "C", "D"]);
    expect(PRESCRICAO.programa.modo_semana).toBe("rotativo");
    expect(frequenciaDoCalendario(PRESCRICAO.programa.calendario as Calendario)).toEqual({ A: 1, B: 1, C: 1, D: 1 });
    expect(T("A").itens.map((i) => i.nome)).toEqual(["Agachamento no Smith", "Leg press 45°", "Cadeira extensora", "Abdominal infra no banco declinado", "Abdominal supra na polia em pé"]);
    expect(T("C").itens.map((i) => i.nome)).toEqual(["Mesa flexora", "Levantamento terra sumô", "Hip thrust com barra", "Cadeira abdutora", "Bom dia no hack", "Panturrilha no leg press 45°"]);
  });

  it("séries por treino iguais à ficha (A 20 · B 24 · C 24 · D 24)", () => {
    expect(aud.map((t) => [t.letra, t.series])).toEqual([["A", 20], ["B", 24], ["C", 24], ["D", 24]]);
  });

  it("pirâmides, RIR e bi-sets como na ficha", () => {
    const e = (l: string, nome: string) => PRESCRICAO.treinos.find((t) => t.letra === l)!.exercicios.find((x) => x.nome === nome)!;
    expect(e("A", "Abdominal infra no banco declinado").reps).toBe("12/10/8/6");
    expect(e("A", "Agachamento no Smith")).toMatchObject({ tecnica: "piramide", rir: 3, reps: "15/12/10/10" });
    expect(e("B", "Remada cavalinho")).toMatchObject({ tecnica: "normal", rir: null, reps: "15", series: 4 });
    expect(e("B", "Desenvolvimento Arnold")).toMatchObject({ tecnica: "biset", bloco: "B1", rir: 3 });
    expect(e("B", "Crucifixo invertido com halteres")).toMatchObject({ tecnica: "biset", bloco: "B1", rir: null });
    expect(e("C", "Cadeira abdutora")).toMatchObject({ bloco: "C1", reps: "20" });
    expect(e("D", "Elevação frontal com halteres").observacoes).toMatch(/Alternada/);
  });

  it("descansos pelo padrão do Montinho, bi-sets sem descanso entre os exercícios", () => {
    for (const t of PRESCRICAO.treinos)
      for (const x of t.exercicios) {
        if (x.tecnica === "biset" && x.descanso_seg === 0) expect(x.descanso_apos_seg).toBe(0);
        else expect(x.descanso_seg).toBeNull();
      }
  });

  it("aparece só para a Natália", () => {
    expect(prescricoesParaAluno("Natalia Cristina Nascimento").map((p) => p.id)).toEqual(["projeto-ex-merendeira-v1"]);
    expect(prescricoesParaAluno("Adriana Nascimento").map((p) => p.id)).not.toContain("projeto-ex-merendeira-v1");
  });

  it("prioridade nas pernas: volume semanal direto por músculo", () => {
    const v: Record<string, number> = {};
    for (const t of PRESCRICAO.treinos) for (const x of t.exercicios) v[x.grupo_muscular!] = (v[x.grupo_muscular!] ?? 0) + x.series;
    expect(v).toEqual({ quadriceps: 12, abdomen: 8, costas: 12, ombro_anterior: 8, ombro_posterior: 8, biceps: 4, posteriores: 8, gluteo: 12, panturrilha: 8, peito: 4, ombro_lateral: 4, triceps: 4 });
  });
});
