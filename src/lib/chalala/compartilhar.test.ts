import { describe, expect, it, vi } from "vitest";
import { compartilharArquivo, podeCompartilharArquivo } from "./compartilhar";

const arq = new File([new Uint8Array([1, 2, 3])], "card.png", { type: "image/png" });

describe("compartilhamento web", () => {
  it("navegador compatível: usa a folha do sistema (sem afirmar que publicou)", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const baixar = vi.fn();
    expect(await compartilharArquivo({ share, canShare: () => true }, arq, "Treino pago!", baixar)).toBe("enviado_ao_sistema");
    expect(share).toHaveBeenCalledWith({ files: [arq], text: "Treino pago!" });
    expect(baixar).not.toHaveBeenCalled();
  });
  it("sem compartilhamento nativo: baixa a imagem", async () => {
    const baixar = vi.fn();
    expect(await compartilharArquivo({}, arq, "", baixar)).toBe("baixado");
    expect(baixar).toHaveBeenCalledWith(arq);
    expect(podeCompartilharArquivo({ share: vi.fn(), canShare: () => false }, arq)).toBe(false);
  });
  it("cancelado pelo usuário não baixa nem conta como erro", async () => {
    const erro = Object.assign(new Error("x"), { name: "AbortError" });
    const baixar = vi.fn();
    expect(await compartilharArquivo({ share: vi.fn().mockRejectedValue(erro), canShare: () => true }, arq, "", baixar)).toBe("cancelado");
    expect(baixar).not.toHaveBeenCalled();
  });
  it("falha do compartilhamento (ex.: permissão) cai para download", async () => {
    const erro = Object.assign(new Error("x"), { name: "NotAllowedError" });
    const baixar = vi.fn();
    expect(await compartilharArquivo({ share: vi.fn().mockRejectedValue(erro), canShare: () => true }, arq, "", baixar)).toBe("baixado");
  });
  it("canShare que lança exceção é tratado como sem suporte", () => {
    expect(podeCompartilharArquivo({ share: vi.fn(), canShare: () => { throw new Error("x"); } }, arq)).toBe(false);
  });
});
