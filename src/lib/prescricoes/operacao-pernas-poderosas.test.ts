import { describe, expect, it } from "vitest";
import { extraLiberadoSchema, salvarPlanoSchema } from "@/lib/validacao/schemas";
import { auditarPrescricao } from "./auditar";
import { EXTRAS, PRESCRICAO } from "./operacao-pernas-poderosas";
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

  it("3 treinos A → C na ordem da ficha (o D virou extra), com o nome da operação", () => {
    expect(PRESCRICAO.programa.nome).toBe("Operação Pernas Poderosas - Intensificação");
    expect(aud.map((t) => [t.letra, t.itens.length, t.series])).toEqual([["A", 6, 21], ["B", 8, 32], ["C", 6, 21]]);
    expect(PRESCRICAO.programa.frequencia).toEqual({ A: 1, B: 1, C: 1 });
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

  it("padrão do Montinho: aquecimento no 1º exercício depois da prancha", () => {
    expect(E("A", "Cadeira extensora").observacoes).toContain(AQUECIMENTO);
    expect(E("C", "Cadeira flexora").observacoes).toContain(AQUECIMENTO);
  });

  it("Treino D (abdômen e core) como treino extra pronto, válido no painel de extras", () => {
    expect(EXTRAS).toHaveLength(1);
    const r = extraLiberadoSchema.safeParse(EXTRAS[0]);
    expect(r.success ? "ok" : JSON.stringify(r.error.issues.slice(0, 3))).toBe("ok");
    expect(EXTRAS[0].exercicios!.map((x) => `${x.nome} ${x.series}×${x.reps}`)).toEqual(["Prancha frontal 2×60s", "Prancha lateral 2×60s", "Abdominal remador 4×20", "Abdominal remador no banco 4×20", "Abdominal infra (elevação de pernas deitado) 4×15"]);
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
    expect(plano.treinos.map((t) => t.letra)).toEqual(["A", "B", "C"]);
    const mesa = plano.treinos.find((t) => t.letra === "C")!.exercicios.find((e) => e.nome === "Mesa flexora")!;
    expect([mesa.tecnica, seriesDeFinalizacao(mesa.tecnica, mesa.tecnica_config)]).toEqual(["dropset", 1]);
    const { salvarExtra, listarExtras } = await import("@/lib/data/extras");
    await salvarExtra("teste-brigida", EXTRAS[0]);
    const extras = await listarExtras("teste-brigida");
    expect(extras.find((x) => x.titulo === "Treino D — Abdômen e core")?.exercicios).toHaveLength(5);
  });
});
