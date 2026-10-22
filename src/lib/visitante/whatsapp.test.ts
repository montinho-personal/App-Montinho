import { describe, expect, it } from "vitest";
import { whatsappBR } from "./whatsapp";

describe("whatsappBR", () => {
  it("aceita os jeitos comuns de digitar", () => {
    expect(whatsappBR("(11) 98106-3409")).toBe("+55 11 98106-3409");
    expect(whatsappBR("+55 11 98106-3409")).toBe("+55 11 98106-3409");
    expect(whatsappBR("5511981063409")).toBe("+55 11 98106-3409");
    expect(whatsappBR("011981063409")).toBe("+55 11 98106-3409");
    expect(whatsappBR("21 3333-4444")).toBe("+55 21 3333-4444");
  });
  it("recusa número incompleto, sem DDD ou inválido", () => {
    expect(whatsappBR("")).toBeNull();
    expect(whatsappBR("98106-3409")).toBeNull();
    expect(whatsappBR("11 8106-34")).toBeNull();
    expect(whatsappBR("11 88106-3409")).toBeNull();
    expect(whatsappBR("00 98106-3409")).toBeNull();
  });
});
