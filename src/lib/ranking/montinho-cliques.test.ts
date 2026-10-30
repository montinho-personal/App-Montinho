import { describe, expect, it } from "vitest";
import { quemViuOMontinho } from "./montinho-cliques";

describe("quem viu o Montinho no Ranking", () => {
  it("conta pessoas, vezes e quem compartilhou o card", () => {
    const r = quemViuOMontinho(
      [
        { aluno_id: "a", tipo: "montinho_ranking_aberto", created_at: "2026-10-29T10:00:00Z" },
        { aluno_id: "a", tipo: "montinho_ranking_aberto", created_at: "2026-10-30T10:00:00Z" },
        { aluno_id: "b", tipo: "montinho_ranking_aberto", created_at: "2026-10-29T12:00:00Z" },
        { aluno_id: "b", tipo: "compartilhar_nativo", ref: "montinho:ranking", created_at: "2026-10-29T12:01:00Z" },
        { aluno_id: "c", tipo: "compartilhar_cancelado", ref: "montinho:ranking", created_at: "2026-10-29T12:01:00Z" },
        { aluno_id: "d", tipo: "download", ref: "medalha:x", created_at: "2026-10-29T12:01:00Z" },
      ],
      { a: { nome: "Ana", visitante: false }, b: { nome: "Bia", visitante: true } },
    );
    expect([r.pessoas, r.vezes, r.compartilharam]).toEqual([2, 3, 1]);
    expect(r.lista.map((p) => [p.nome, p.vezes, p.compartilhou])).toEqual([["Ana", 2, false], ["Bia", 1, true]]);
  });
});
