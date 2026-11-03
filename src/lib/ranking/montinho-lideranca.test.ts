import { describe, expect, it } from "vitest";
import { liderancaDoMontinho, textoDoClube } from "./montinho-lideranca";

const linhas = [{ ref: "nat", nome: "Natalia C.", eu: false }, { ref: "rei", nome: "Reinaldo F.", eu: false }];

describe("liderança do Montinho", () => {
  it("em 1º: ninguém na frente", () => {
    expect(liderancaDoMontinho(1, linhas)).toEqual({ lider: true, naFrente: [] });
  });
  it("em 2º: quem está antes dele", () => {
    expect(liderancaDoMontinho(2, linhas)?.naFrente.map((p) => p.ref)).toEqual(["nat"]);
  });
  it("sem posição: nada", () => {
    expect(liderancaDoMontinho(null, linhas)).toBeNull();
  });
  it("retomou a liderança quando alguém já passou", () => {
    const t = textoDoClube(1, { lider: true, naFrente: [] }, false);
    expect(t.titulo).toBe("👑 O Montinho retomou a liderança!");
    expect(t.frase).toContain("1 pessoa já passou o Montinho, mas ele voltou para a frente");
    expect(textoDoClube(1, { lider: true, naFrente: [] }, true).titulo).toBe("👑 Você retomou a liderança!");
  });
  it("alguém na frente agora", () => {
    const l = liderancaDoMontinho(2, linhas);
    expect(textoDoClube(1, l, false).titulo).toBe("🔥 Natalia está na frente do Montinho agora!");
    expect(textoDoClube(1, l, true).titulo).toBe("🔥 Natalia está na sua frente agora!");
    expect(textoDoClube(1, liderancaDoMontinho(2, [{ ref: "a", nome: "Aline S.", eu: true }]), false).titulo).toBe("🔥 Você está na frente do Montinho agora!");
  });
  it("sem ninguém no clube e ele em 1º: texto de sempre", () => {
    expect(textoDoClube(0, { lider: true, naFrente: [] }, false).titulo).toBe("Ninguém passou o Montinho ainda");
  });
});
