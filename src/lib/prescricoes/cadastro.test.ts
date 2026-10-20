// Cadastro de ponta a ponta no modo demonstração: grava pelo mesmo
// salvarPlano do montador, relê o plano, audita e repete sem duplicar.
import { beforeAll, describe, expect, it } from "vitest";

process.env.NEXT_PUBLIC_DEMO_MODE = "true";

describe("cadastro da prescrição (salvarPlano real, modo demo)", async () => {
  const { salvarPlano, getPlanoAtivo } = await import("@/lib/data/programas");
  const { demoStore } = await import("@/lib/mock/store");
  const { PRESCRICAO } = await import("./miss-terracos-tambore");
  const { auditarPrescricao } = await import("./auditar");
  const { assinaturaTreinos } = await import("./index");
  const ALUNA = "teste-prescricao";

  beforeAll(() => {
    const st = demoStore();
    st.alunos.push({ ...st.alunos[0], id: ALUNA });
  });

  it("grava os 4 treinos e o plano relido bate com a ficha", async () => {
    const r = await salvarPlano(ALUNA, "treinador", { ...PRESCRICAO });
    expect(r.versao.versao).toBe(1);
    const plano = await getPlanoAtivo(ALUNA);
    expect(plano.programa?.frequencia).toEqual({ A: 1, B: 1, C: 1, D: 1 });
    const aud = auditarPrescricao({ treinos: plano.treinos as never });
    expect(aud.map((t) => [t.letra, t.exercicios, t.series, t.posicoes])).toEqual([["A", 6, 21, 6], ["B", 6, 24, 5], ["C", 7, 25, 6], ["D", 6, 24, 5]]);
    const legPress = plano.treinos.find((t) => t.letra === "A")!.exercicios.find((e) => e.nome === "Leg press 180")!;
    expect((legPress.series_config as { series: Array<{ reps: string }> }).series.map((s) => s.reps)).toEqual(["20", "15", "12", "10"]);
    expect(plano.treinos.find((t) => t.letra === "C")!.exercicios.find((e) => e.nome === "Levantamento terra sumô")!.rir).toBe(0);
    expect(plano.treinos.flatMap((t) => t.exercicios).every((e) => e.carga_alvo === null)).toBe(true);
    expect(assinaturaTreinos(plano.treinos)).toBe(assinaturaTreinos(PRESCRICAO.treinos));
  });

  it("idempotência: o plano ativo já é a prescrição → a assinatura impede regravar", async () => {
    const plano = await getPlanoAtivo(ALUNA);
    expect(assinaturaTreinos(plano.treinos)).toBe(assinaturaTreinos(PRESCRICAO.treinos));
    const nomes = plano.treinos.flatMap((t) => t.exercicios.map((e) => `${t.letra}:${e.nome}`));
    expect(nomes.length).toBe(25);
  });
});
