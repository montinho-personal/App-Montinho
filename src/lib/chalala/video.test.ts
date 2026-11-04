import { describe, expect, it } from "vitest";
import { segundosTexto, tamanhoGravacao, tipoDeGravacao, trechoDoVideo } from "./video";

describe("card com vídeo", () => {
  it("trecho de até 15 s a partir do início escolhido", () => {
    expect(trechoDoVideo(40, 0)).toEqual({ inicio: 0, duracao: 15 });
    expect(trechoDoVideo(40, 30)).toEqual({ inicio: 30, duracao: 10 });
    expect(trechoDoVideo(8, 0)).toEqual({ inicio: 0, duracao: 8 });
    expect(trechoDoVideo(8, 50)).toEqual({ inicio: 7, duracao: 1 });
    expect(trechoDoVideo(NaN, 3)).toEqual({ inicio: 0, duracao: 0 });
  });
  it("prefere MP4 e cai para WebM", () => {
    expect(tipoDeGravacao((t) => t === "video/mp4")?.ext).toBe("mp4");
    expect(tipoDeGravacao((t) => t === "video/webm")?.ext).toBe("webm");
    expect(tipoDeGravacao(() => false)).toBeNull();
  });
  it("reduz para 720 de largura com lados pares", () => {
    expect(tamanhoGravacao(1080, 1920)).toEqual({ w: 720, h: 1280, escala: 720 / 1080 });
    expect(segundosTexto(67)).toBe("1:07");
  });
});
