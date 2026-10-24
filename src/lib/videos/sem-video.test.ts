import { describe, expect, it } from "vitest";
import { exerciciosSemVideo } from "./sem-video";

const bib = new Map([
  ["b1", { nome: "Remada apoiada", temVideo: false }],
  ["b2", { nome: "Supino reto", temVideo: true }],
  ["b3", { nome: "Remada alta", temVideo: false }],
]);
const pessoas = new Map([
  ["a1", { id: "a1", nome: "Denis", visitante: false }],
  ["a2", { id: "a2", nome: "Leonardo", visitante: false }],
  ["v1", { id: "v1", nome: "Ruthe", visitante: true }],
]);

describe("exercícios sem vídeo", () => {
  it("lista quem faz, alunos primeiro; ignora quem tem vídeo e pessoas fora da lista", () => {
    const r = exerciciosSemVideo(
      [
        { nome: "x", bibliotecaId: "b3", videoUrl: null, alunoId: "v1" },
        { nome: "x", bibliotecaId: "b1", videoUrl: null, alunoId: "a2" },
        { nome: "x", bibliotecaId: "b1", videoUrl: null, alunoId: "a1" },
        { nome: "x", bibliotecaId: "b1", videoUrl: null, alunoId: "a1" },
        { nome: "x", bibliotecaId: "b2", videoUrl: null, alunoId: "a1" },
        { nome: "Abdominal remador no banco", bibliotecaId: null, videoUrl: "https://youtu.be/abc", alunoId: "a1" },
        { nome: "Abdominal na polia", bibliotecaId: null, videoUrl: null, alunoId: "fora" },
      ],
      bib,
      pessoas
    );
    expect(r.map((s) => [s.exercicio, s.pessoas.map((p) => p.nome)])).toEqual([
      ["Remada apoiada", ["Denis", "Leonardo"]],
      ["Remada alta", ["Ruthe"]],
    ]);
  });

  it("nome livre sem vídeo aparece marcado", () => {
    const r = exerciciosSemVideo([{ nome: "Abdominal remador no banco", bibliotecaId: null, videoUrl: null, alunoId: "a1" }], bib, pessoas);
    expect(r).toEqual([{ exercicio: "Abdominal remador no banco", nomeLivre: true, pessoas: [{ id: "a1", nome: "Denis", visitante: false }] }]);
  });
});
