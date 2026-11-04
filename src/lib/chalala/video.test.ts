import { describe, expect, it } from "vitest";
import { corrigirDuracaoMp4, corrigirDuracaoWebm, segundosTexto, tamanhoGravacao, tipoDeGravacao, trechoDoVideo } from "./video";

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
  it("escreve a duração no WebM que veio sem (Segment de tamanho desconhecido)", () => {
    // EBML vazio + Segment(desconhecido) > Info(TimecodeScale) + Cluster(2 bytes)
    const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x80, 0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x15, 0x49, 0xa9, 0x66, 0x87, 0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40, 0x1f, 0x43, 0xb6, 0x75, 0x82, 0xaa, 0xbb]);
    const out = corrigirDuracaoWebm(webm, 12_500);
    expect(out.length).toBe(webm.length + 11);
    expect(out[21]).toBe(0x80 | (7 + 11)); // tamanho do Info
    expect([out[29], out[30], out[31]]).toEqual([0x44, 0x89, 0x88]);
    expect(new DataView(out.buffer).getFloat64(32, false)).toBe(12_500);
    expect([...out.slice(40)]).toEqual([0x1f, 0x43, 0xb6, 0x75, 0x82, 0xaa, 0xbb]);
    // já com duração ou arquivo estranho: não mexe
    expect(corrigirDuracaoWebm(out, 9_000)).toBe(out);
    const lixo = new Uint8Array([1, 2, 3]);
    expect(corrigirDuracaoWebm(lixo, 1000)).toBe(lixo);
  });
  it("preenche a duração zerada do MP4 (mvhd e tkhd), sem mudar o tamanho", () => {
    const caixa = (tipo: string, corpo: number[]) => { const t = 8 + corpo.length; return [t >>> 24, (t >>> 16) & 255, (t >>> 8) & 255, t & 255, ...[...tipo].map((c) => c.charCodeAt(0)), ...corpo]; };
    const u32 = (n: number) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
    const mvhd = caixa("mvhd", [0, 0, 0, 0, ...u32(0), ...u32(0), ...u32(1000), ...u32(0)]);
    const tkhd = caixa("tkhd", [0, 0, 0, 3, ...u32(0), ...u32(0), ...u32(1), ...u32(0), ...u32(0)]);
    const mp4 = new Uint8Array([...caixa("ftyp", [105, 115, 111, 109]), ...caixa("moov", [...mvhd, ...caixa("trak", tkhd)])]);
    const out = corrigirDuracaoMp4(mp4, 12_340);
    expect(out.length).toBe(mp4.length);
    const dv = new DataView(out.buffer);
    expect(dv.getUint32(12 + 8 + 8 + 16)).toBe(12_340); // mvhd duration
    expect(dv.getUint32(12 + 8 + 28 + 8 + 8 + 20)).toBe(12_340); // tkhd duration
    expect(corrigirDuracaoMp4(out, 5_000)).toBe(out); // já tem: não mexe
  });
});
