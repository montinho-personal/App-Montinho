import { describe, expect, it } from "vitest";
import { cardDaAvaliacao, cardDasMedidas, cardDaEvolucao, cardDoPeso, primeiroNome, setaNeutra } from "./card-relatorio";
import type { PainelEvolucao } from "./painel-aluno";
import type { RelatorioAvaliacao } from "@/lib/medidas/relatorio-avaliacao";

describe("cards dos relatórios", () => {
  it("seta neutra e primeiro nome", () => {
    expect(setaNeutra(-3.24, "kg")).toBe("↓ 3,2 kg");
    expect(setaNeutra(1, "cm")).toBe("↑ 1 cm");
    expect(setaNeutra(0, "kg")).toBe("igual");
    expect(primeiroNome("Aline Souza")).toBe("Aline");
  });

  it("evolução: números do período, cargas em alta e só o primeiro nome", () => {
    const painel: PainelEvolucao = {
      emoji: "💪", manchete: "x", sub: "y", destaques: [],
      numeros: [
        { valor: "12", rotulo: "treinos", delta: { texto: "▲ +3", tom: "alta" } },
        { valor: "8,2 t", rotulo: "levantados", delta: { texto: "▼ −10%", tom: "baixa" } },
        { valor: "4 🔥", rotulo: "semanas seguidas", delta: null },
      ],
    };
    const c = cardDaEvolucao({ painel, emAlta: [{ chave: "supino", nome: "Supino reto", pontos: [], primeira: 40, ultima: 50, ganhoKg: 10, ganhoPct: 25, desde: "2026-09-01" }], dias: 30, nome: "Aline Souza", hoje: "2026-11-04" })!;
    expect(c.titulo).toBe("MAIS FORTE A CADA TREINO");
    expect(c.numeros.map((n) => n.valor)).toEqual(["12", "8,2 t", "4"]);
    expect(c.numeros[0].detalhe).toBe("+3");
    expect(c.numeros[1].detalhe).toBeUndefined(); // queda não vai para o card
    expect(c.linhas[0]).toEqual({ titulo: "Supino reto", valor: "40 → 50 kg", detalhe: "+25% desde 01/09" });
    expect(c.nome).toBe("Aline");
    expect(c.data).toBe("04/11/2026");
  });

  it("peso: precisa de 2 registros; diferença neutra e gráfico", () => {
    expect(cardDoPeso({ pesos: [{ data: "2026-10-01", kg: 80 }], nome: "A", hoje: "2026-11-04" })).toBeNull();
    const c = cardDoPeso({ pesos: [{ data: "2026-09-01", kg: 82.5 }, { data: "2026-10-01", kg: 81 }, { data: "2026-11-01", kg: 79.3 }], nome: "João", hoje: "2026-11-04" })!;
    expect(c.numeros.map((n) => n.valor)).toEqual(["82,5 kg", "79,3 kg", "↓ 3,2 kg"]);
    expect(c.grafico).toEqual({ valores: [82.5, 81, 79.3], inicio: "01/09", fim: "01/11" });
  });

  it("medidas: só as que mudaram, corpo antes das circunferências, até 5", () => {
    const l = (rotulo: string, grupo: "corpo" | "circunferencias", antes: number, depois: number) => ({ chave: rotulo, rotulo, unidade: grupo === "corpo" ? "kg" : "cm", antes, depois, diferenca: depois - antes, grupo });
    const linhas = [l("Cintura", "circunferencias", 90, 86), l("Peso", "corpo", 80, 78), l("Braço direito", "circunferencias", 35, 35), l("Quadril", "circunferencias", 100, 98), l("Coxa direita", "circunferencias", 58, 59), l("Panturrilha direita", "circunferencias", 38, 39), l("Pescoço", "circunferencias", 40, 39)];
    const c = cardDasMedidas({ linhas, antes: "2026-08-01", depois: "2026-11-01", nome: "Bia", hoje: "2026-11-04" })!;
    expect(c.linhas.map((x) => x.titulo)).toEqual(["Peso", "Cintura", "Quadril", "Coxa direita", "Panturrilha direita"]);
    expect(c.linhas[1]).toEqual({ titulo: "Cintura", valor: "90 → 86 cm", detalhe: "↓ 4 cm" });
    expect(cardDasMedidas({ linhas: [l("Braço direito", "circunferencias", 35, 35)], antes: "2026-08-01", depois: "2026-11-01", nome: "Bia", hoje: "2026-11-04" })).toBeNull();
  });

  it("avaliação: números principais; com a anterior, a diferença em pontos de %", () => {
    const base: RelatorioAvaliacao = {
      id: "a2", data: "2026-11-01", sexo: "F", idade: 30, observacao: null,
      principais: { gorduraPct: 24.1, massaMagraKg: 50.2, massaGordaKg: 16, pesoKg: 66.2, alturaCm: 165, imc: 24.3, soma: 120, densidade: 1.04 },
      dobras: [], circunferencias: [],
      comparacao: [
        { rotulo: "% de gordura", unidade: "%", atual: 24.1, anterior: 26.3, diferenca: -2.2 },
        { rotulo: "Massa magra", unidade: "kg", atual: 50.2, anterior: 49.4, diferenca: 0.8 },
        { rotulo: "Peso", unidade: "kg", atual: 66.2, anterior: 66.2, diferenca: 0 },
      ],
      anterior: { id: "a1", data: "2026-08-01" },
    };
    const c = cardDaAvaliacao({ rel: base, nome: "Natália Lima" })!;
    expect(c.numeros.map((n) => [n.valor, n.detalhe])).toEqual([["24,1%", "↓ 2,2 pontos"], ["50,2 kg", "↑ 0,8 kg"], ["66,2 kg", "igual"]]);
    expect(c.linhas.map((x) => x.titulo)).toEqual(["% de gordura", "Massa magra"]);
    expect(c.sub).toBe("01/08/2026 → 01/11/2026");
    const primeira = cardDaAvaliacao({ rel: { ...base, comparacao: [], anterior: null }, nome: "Natália" })!;
    expect(primeira.titulo).toBe("MINHA AVALIAÇÃO");
    expect(primeira.linhas).toEqual([]);
    expect(primeira.numeros[0].detalhe).toBeUndefined();
  });
});
