import { describe, expect, it } from "vitest";
import { salvarPlanoSchema } from "@/lib/validacao/schemas";
import { auditarPrescricao } from "./auditar";
import { PRESCRICAO } from "./missao-mr-bellagio";
import { prescricoesParaAluno } from "./index";
import { frequenciaDoCalendario } from "@/lib/volume/calcular";

const aud = auditarPrescricao(PRESCRICAO);
const T = (l: string) => aud.find((t) => t.letra === l)!;

describe("prescrição Missão Mr. Bellagio (Denis) — conforme a ficha do personal", () => {
  it("passa na mesma validação do montador (zod)", () => {
    const r = salvarPlanoSchema.safeParse(PRESCRICAO);
    expect(r.success ? "ok" : JSON.stringify(r.error.issues.slice(0, 3))).toBe("ok");
  });

  it("5 treinos, segunda a sexta, na ordem da ficha", () => {
    expect(aud.map((t) => t.letra)).toEqual(["A", "B", "C", "D", "E"]);
    expect(frequenciaDoCalendario(PRESCRICAO.programa.calendario!)).toEqual({ A: 1, B: 1, C: 1, D: 1, E: 1 });
    expect(T("A").itens.map((i) => i.nome)).toEqual(["Crucifixo na máquina (peck deck)", "Supino reto com barra", "Supino inclinado na máquina", "Elevação lateral com halteres", "Tríceps francês na polia", "Abdominal supra na polia em pé"]);
    expect(T("E").itens.map((i) => i.nome)).toEqual(["Prancha frontal", "Remada sentada pegada aberta", "Remada sentada na polia pegada supinada", "Face pull", "Rosca inclinada com halteres", "Rosca inversa na polia com barra W", "Rosca martelo", "Abdominal remador"]);
  });

  it("séries por treino iguais à ficha (A 24 · B 26 · C 26 · D 24 · E 30)", () => {
    expect(aud.map((t) => [t.letra, t.series])).toEqual([["A", 24], ["B", 26], ["C", 26], ["D", 24], ["E", 30]]);
  });

  it("descansos pelo padrão do Montinho (sem descanso individual), bi-sets sem descanso entre os exercícios", () => {
    for (const t of PRESCRICAO.treinos)
      for (const e of t.exercicios) {
        if (e.tecnica === "biset" && e.descanso_seg === 0) expect(e.descanso_apos_seg).toBe(0);
        else expect(e.descanso_seg).toBeNull();
      }
  });

  it("aparece só para o Denis", () => {
    expect(prescricoesParaAluno("Denis Cruz").map((p) => p.id)).toEqual(["missao-mr-bellagio-v1"]);
    expect(prescricoesParaAluno("Adriana Nascimento").map((p) => p.id)).not.toContain("missao-mr-bellagio-v1");
  });

  it("volume semanal direto por músculo (séries válidas, 1×/semana cada treino)", () => {
    const v: Record<string, number> = {};
    for (const t of PRESCRICAO.treinos) for (const e of t.exercicios) v[e.grupo_muscular!] = (v[e.grupo_muscular!] ?? 0) + e.series;
    expect(v).toEqual({ peito: 20, ombro_lateral: 8, triceps: 8, abdomen: 12, core: 6, costas: 20, ombro_posterior: 8, biceps: 20, gluteo: 8, quadriceps: 8, posteriores: 4, panturrilha: 4, ombro_anterior: 4 });
  });
});
