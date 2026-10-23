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
  it("aceita número de outro país com + e o código do país", () => {
    expect(whatsappBR("+258 83 848 9986")).toBe("+258838489986");
    expect(whatsappBR("+351 912 345 678")).toBe("+351912345678");
    expect(whatsappBR("00351 912345678")).toBe("+351912345678");
    expect(whatsappBR("+1 (305) 555-0123")).toBe("+13055550123");
    expect(whatsappBR("+55 (11) 98106-3409")).toBe("+55 11 98106-3409");
  });
  it("recusa internacional curto, longo demais ou sem o código do país", () => {
    expect(whatsappBR("+12 345")).toBeNull();
    expect(whatsappBR("+1234567890123456")).toBeNull();
    expect(whatsappBR("838489986")).toBeNull(); // sem + não dá para saber o país
  });
});
