import { describe, expect, it } from "vitest";
import { salvarPlanoSchema } from "@/lib/validacao/schemas";
import { auditarPrescricao } from "./auditar";
import { PRESCRICAO } from "./operacao-pernas-poderosas";
import { prescricoesParaAluno } from "./index";
import { AQUECIMENTO } from "./regras";
import { seriesDeFinalizacao } from "@/lib/treino/tecnica-config";

const aud = auditarPrescricao(PRESCRICAO);
const T = (l: string) => PRESCRICAO.treinos.find((t) => t.letra === l)!;
const E = (l: string, nome: string) => T(l).exercicios.find((e) => e.nome === nome)!;

process.env.NEXT_PUBLIC_DEMO_MODE = "true";

describe("prescrição Operação Pernas Poderosas (Brigida) — conforme a ficha do personal", () => {
  it("passa na mesma validação do montador (zod)", () => {
    const r = salvarPlanoSchema.safeParse(PRESCRICAO);
    expect(r.success ? "ok" : JSON.stringify(r.error.issues.slice(0, 3))).toBe("ok");
  });

  it("4 treinos A → D na ordem da ficha, com o nome da operação", () => {
    expect(PRESCRICAO.programa.nome).toBe("Operação Pernas Poderosas - Intensificação");
    expect(aud.map((t) => [t.letra, t.itens.length, t.series])).toEqual([["A", 6, 21], ["B", 8, 32], ["C", 6, 21], ["D", 5, 16]]);
    expect(T("A").exercicios.map((e) => e.nome)).toEqual(["Prancha frontal", "Cadeira extensora", "Agachamento no Smith", "Leg press 45°", "Hip thrust com barra", "Cadeira abdutora"]);
    expect(T("C").exercicios.map((e) => e.reps)).toEqual(["60s", "20/15/12/10", "12/12/10/8", "20/15/12/10", "12/10/8/8", "20/15/12/10"]);
  });

  it("pirâmide + 1 série de finalização: rest-pause no hip thrust e na abdutora do C, drop-set na abdutora do A e na mesa flexora", () => {
    for (const [l, n, t] of [["A", "Hip thrust com barra", "rest_pause"], ["A", "Cadeira abdutora", "dropset"], ["C", "Mesa flexora", "dropset"], ["C", "Cadeira abdutora", "rest_pause"]] as const) {
      const e = E(l, n);
      expect([e.tecnica, seriesDeFinalizacao(e.tecnica, e.tecnica_config)]).toEqual([t, 1]);
      expect(e.observacoes).toContain("Pirâmide crescente");
    }
  });

  it("treino B todo em bi-sets (4 blocos), sem descanso entre os dois", () => {
    const b = T("B").exercicios;
    expect(b.map((e) => e.bloco)).toEqual(["B1", "B1", "B2", "B2", "B3", "B3", "B4", "B4"]);
    for (let i = 0; i < b.length; i += 2) expect([b[i].descanso_seg, b[i].descanso_apos_seg]).toEqual([0, 0]);
  });

  it("padrão do Montinho: aquecimento no 1º exercício depois da prancha; abdominal remador no banco com nome livre", () => {
    expect(E("A", "Cadeira extensora").observacoes).toContain(AQUECIMENTO);
    expect(E("D", "Abdominal remador").observacoes).toContain(AQUECIMENTO);
    expect(E("D", "Abdominal remador no banco")).toMatchObject({ biblioteca_id: null, grupo_origem: "manual", grupo_muscular: "abdomen" });
  });

  it("aparece só para a Brigida", () => {
    expect(prescricoesParaAluno("Brigida Cibelle Pereira").map((p) => p.id)).toEqual(["operacao-pernas-poderosas-intensificacao-v1"]);
  });

  it("grava de verdade (salvarPlano, demo) e o plano relido mantém finalização e nome livre", async () => {
    const { salvarPlano, getPlanoAtivo } = await import("@/lib/data/programas");
    const { demoStore } = await import("@/lib/mock/store");
    const st = demoStore();
    st.alunos.push({ ...st.alunos[0], id: "teste-brigida" });
    await salvarPlano("teste-brigida", "treinador", { ...PRESCRICAO });
    const plano = await getPlanoAtivo("teste-brigida");
    expect(plano.treinos.map((t) => t.letra)).toEqual(["A", "B", "C", "D"]);
    const mesa = plano.treinos.find((t) => t.letra === "C")!.exercicios.find((e) => e.nome === "Mesa flexora")!;
    expect([mesa.tecnica, seriesDeFinalizacao(mesa.tecnica, mesa.tecnica_config)]).toEqual(["dropset", 1]);
    expect(plano.treinos.find((t) => t.letra === "D")!.exercicios.some((e) => e.nome === "Abdominal remador no banco")).toBe(true);
  });
});
