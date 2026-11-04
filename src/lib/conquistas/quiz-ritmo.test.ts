import { describe, expect, it } from "vitest";
import { certasDoQuiz, quandoConta, trofeusDoQuiz, type RespostaQuiz } from "./quiz";

describe("quiz no ritmo do álbum", () => {
  const r = (id: string, em: string, liberadaEm: string | null): RespostaQuiz => ({ conteudo_id: id, acertou: true, em, liberadaEm });
  it("respondida antes de sair conta no dia em que sai; não saiu = não conta", () => {
    expect(quandoConta(r("a", "2026-11-04T15:00:00Z", "2026-11-11"))).toBe("2026-11-11T12:00:00.000Z");
    expect(quandoConta(r("a", "2026-11-12T15:00:00Z", "2026-11-11"))).toBe("2026-11-12T15:00:00Z");
    expect(quandoConta(r("a", "2026-11-04T15:00:00Z", null))).toBeNull();
  });
  it("maratona no 1º dia: só a pergunta liberada vira troféu", () => {
    const respostas = [r("d01", "2026-11-04T15:00:00Z", "2026-11-04"), ...Array.from({ length: 20 }, (_, i) => r(`x${i}`, "2026-11-04T15:10:00Z", null))];
    expect(certasDoQuiz(respostas)).toHaveLength(1);
    expect(trofeusDoQuiz(respostas).map((t) => t.codigo)).toEqual(["quiz_1"]);
  });
});
