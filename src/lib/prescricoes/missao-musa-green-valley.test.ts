import { describe, expect, it } from "vitest";
import { extraLiberadoSchema, salvarPlanoSchema } from "@/lib/validacao/schemas";
import { auditarPrescricao } from "./auditar";
import { EXTRAS, PRESCRICAO } from "./missao-musa-green-valley";
import { prescricoesParaAluno } from "./index";
import { AQUECIMENTO, FALHA } from "./regras";

const aud = auditarPrescricao(PRESCRICAO);
const T = (l: string) => aud.find((t) => t.letra === l)!;

describe("prescrição Missão Musa do Green Valley (Carol) — conforme a ficha do personal", () => {
  it("passa na mesma validação do montador (zod)", () => {
    const r = salvarPlanoSchema.safeParse(PRESCRICAO);
    expect(r.success ? "ok" : JSON.stringify(r.error.issues.slice(0, 3))).toBe("ok");
  });

  it("3 treinos em sequência (A → C; o Full Body virou extra), com os exercícios da ficha", () => {
    expect(PRESCRICAO.programa.nome).toBe("Missão Musa do Green Valley");
    expect(aud.map((t) => t.letra)).toEqual(["A", "B", "C"]);
    expect(PRESCRICAO.programa.frequencia).toEqual({ A: 1, B: 1, C: 1 });
    expect(PRESCRICAO.programa.calendario).toEqual({ modo: "rotativo", sequencia: ["A", "B", "C"], diasPorSemana: 3 });
    expect(T("A").itens.map((i) => i.nome)).toEqual(["Prancha frontal", "Hip thrust na máquina", "Leg press 45°", "Cadeira extensora", "Cadeira abdutora", "Panturrilha no leg press"]);
    expect(T("B").itens.map((i) => i.nome)).toEqual(["Remada sentada pegada aberta", "Puxada frontal aberta (pulley)", "Crucifixo na máquina (peck deck)", "Elevação lateral com halteres", "Elevação frontal com halteres", "Tríceps francês com halter"]);
    expect(T("C").itens.map((i) => i.nome)).toEqual(["Mesa flexora", "Flexora em pé unilateral", "Leg press 45°", "Cadeira adutora", "Abdominal supra na polia em pé"]);
  });

  it("séries por treino iguais à ficha (A 21 · B 24 · C 20) e repetições certas", () => {
    expect(aud.map((t) => [t.letra, t.series])).toEqual([["A", 21], ["B", 24], ["C", 20]]);
    const reps = (l: string) => PRESCRICAO.treinos.find((t) => t.letra === l)!.exercicios.map((e) => e.reps);
    expect(reps("A")).toEqual(["60s", "20/15/12/10", "15/12/10/10", "20/15/12/10", "20/15/12/10", "20/20/15/15"]);
    expect(reps("C")).toEqual(["20/15/12/10", "15/12/10/10", "15/12/10/10", "20/20/15/12", "20"]);
  });

  it("padrão do Montinho: até a falha, aquecimento no 1º (na elevação pélvica quando abre com prancha), bi-sets sem descanso entre os dois", () => {
    for (const t of PRESCRICAO.treinos) {
      const regra = t.exercicios.filter((e) => e.nome !== "Prancha frontal");
      expect(regra[0].observacoes).toContain(AQUECIMENTO);
      for (const e of regra.slice(1)) expect(e.observacoes).toContain(FALHA);
      for (const e of regra) expect(e.rir).toBe(0);
    }
    const blocos = PRESCRICAO.treinos.flatMap((t) => t.exercicios.filter((e) => e.bloco).map((e) => [e.nome, e.bloco, e.descanso_seg]));
    expect(blocos).toEqual([
      ["Elevação frontal com halteres", "B1", 0], ["Tríceps francês com halter", "B1", null],
    ]);
  });

  it("Full Body (antigo Treino D) como treino extra pronto, válido no painel de extras", () => {
    expect(EXTRAS).toHaveLength(1);
    const r = extraLiberadoSchema.safeParse(EXTRAS[0]);
    expect(r.success ? "ok" : JSON.stringify(r.error.issues.slice(0, 3))).toBe("ok");
    expect(EXTRAS[0].exercicios!.map((x) => `${x.nome} ${x.series}×${x.reps}`)).toEqual(["Cadeira extensora 4×20/15/12/10", "Desenvolvimento Arnold 4×12/12/10/10", "Rosca martelo 4×12/12/10/10", "Tríceps pulley com barra W 4×20/15/12/10", "Panturrilha no leg press 4×20"]);
    expect(EXTRAS[0].series_estimadas).toBe(20);
    expect(EXTRAS[0].exercicios!.every((x) => x.biblioteca_id)).toBe(true);
  });

  it("aparece só para a Carol", () => {
    expect(prescricoesParaAluno("Carol Zorzi (Carolina)").map((p) => p.id)).toEqual(["missao-musa-green-valley-v3"]);
    expect(prescricoesParaAluno("Daniel Galo").map((p) => p.id)).not.toContain("missao-musa-green-valley-v3");
  });
});
