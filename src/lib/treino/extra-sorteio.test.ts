import { describe, expect, it } from "vitest";
import { ajustarAoLimite, candidatosDoSorteio, sortearCandidato, tituloDoSorteio, type ItemSorteio } from "./extra-sorteio";
import type { OpcaoPlano } from "@/lib/visitante/gerar-treino";

const ex = (slug: string, grupo: string, series = 4) => ({ slug, grupo, series, reps: "8-12", descansoSeg: 90, multi: true, prioridade: false }) as OpcaoPlano["treinos"][number]["exercicios"][number];
const plano = (treinos: Array<[string, ReturnType<typeof ex>[]]>): OpcaoPlano => ({ id: "A", titulo: "x", treinos: treinos.map(([letra, exercicios]) => ({ letra, nome: `Treino ${letra}`, exercicios, minutos: 50 })), seriesPorGrupo: [], dicas: [] });
const pronto = (slug: string) => ({ slug, nome: slug, emoji: "🏋️", chamada: "" });

describe("sorteio do treino extra", () => {
  it("cabe no limite: tira séries antes de tirar exercícios", () => {
    const itens: ItemSorteio[] = ["a", "b", "c", "d", "e"].map((s) => ({ slug: s, grupo: "quadriceps", series: 4, reps: "10" }) as ItemSorteio);
    expect(ajustarAoLimite(itens, 12).map((i) => i.series)).toEqual([2, 2, 2, 2, 2]);
    expect(ajustarAoLimite(itens, 15).map((i) => i.series)).toEqual([3, 3, 3, 3, 3]);
    expect(ajustarAoLimite(itens, 7)).toHaveLength(3);
  });

  it("tira os músculos das últimas 48 h e descarta treino curto demais", () => {
    const p = plano([
      ["A", [ex("agacha", "quadriceps"), ex("leg", "quadriceps"), ex("stiff", "posterior_coxa"), ex("pant", "panturrilha")]],
      ["B", [ex("supino", "peito"), ex("remada", "costas"), ex("desenv", "ombros"), ex("rosca", "biceps")]],
    ]);
    const c = candidatosDoSorteio([{ pronto: pronto("rainha"), plano: p }], ["quadriceps"] as never, 30);
    expect(c.map((x) => x.chave)).toEqual(["rainha:B"]);
    expect(c[0].encurtado).toBe(false);
  });

  it("não repete o que já saiu e recomeça quando acaba", () => {
    const p = plano([["A", [ex("a", "peito"), ex("b", "costas"), ex("c", "ombros")]], ["B", [ex("d", "peito"), ex("e", "costas"), ex("f", "ombros")]]]);
    const c = candidatosDoSorteio([{ pronto: pronto("shape"), plano: p }, { pronto: pronto("rei"), plano: p }], [], 30);
    const r1 = sortearCandidato(c, ["shape:A"], () => 0);
    expect(r1.escolhido?.slug).toBe("rei");
    const r2 = sortearCandidato(c, c.map((x) => x.chave), () => 0);
    expect(r2.recomecou).toBe(true);
    expect(sortearCandidato([], []).escolhido).toBeNull();
    expect(tituloDoSorteio({ nome: "Rainha do Agachamento", letra: "A" })).toBe("Extra sorteado: Rainha do Agachamento · Treino A");
  });
});
