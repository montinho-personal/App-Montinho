import { describe, expect, it } from "vitest";
import { caminhoDaFoto, ehJpeg, FOTO_MAX_BYTES, validarFoto } from "./foto";

const jpeg = (n = 100) => {
  const b = new Uint8Array(n);
  b[0] = 0xff; b[1] = 0xd8; b[2] = 0xff; b[n - 2] = 0xff; b[n - 1] = 0xd9;
  return b;
};

describe("foto de perfil", () => {
  it("aceita um JPEG de tamanho normal", () => {
    expect(ehJpeg(jpeg())).toBe(true);
    expect(validarFoto("image/jpeg", jpeg())).toEqual({ ok: true });
  });
  it("recusa tipo errado, vazio, grande demais e arquivo que só finge ser JPEG", () => {
    expect(validarFoto("image/png", jpeg())).toMatchObject({ ok: false, status: 415 });
    expect(validarFoto("text/html", jpeg())).toMatchObject({ ok: false, status: 415 });
    expect(validarFoto("image/jpeg", new Uint8Array(0))).toMatchObject({ ok: false, status: 400 });
    expect(validarFoto("image/jpeg", jpeg(FOTO_MAX_BYTES + 1))).toMatchObject({ ok: false, status: 413 });
    expect(validarFoto("image/jpeg", new TextEncoder().encode("<html><script>alert(1)</script></html>"))).toMatchObject({ ok: false, status: 400 });
  });
  it("a foto fica na pasta do próprio usuário", () => {
    expect(caminhoDaFoto("abc")).toBe("abc/avatar.jpg");
  });
});
