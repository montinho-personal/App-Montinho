import { describe, expect, it } from "vitest";
import { contarNovas, curto, ehNova, haQuanto, juntarVistos, montarCentral, textoContador, type ItemCentral } from "./central";

const agora = "2026-10-30T12:00:00.000Z";
const item = (id: string, quando: string, tipo: ItemCentral["tipo"] = "trofeu"): ItemCentral => ({ id, tipo, emoji: "🏆", titulo: id, href: "/aluno", quando });

describe("central de notificações", () => {
  it("ação primeiro, depois do mais recente ao mais antigo, sem velhos nem repetidos", () => {
    const l = montarCentral(
      [item("a", "2026-10-29T10:00:00Z"), item("b", "2026-10-30T09:00:00Z", "recado"), item("c", "2026-09-01T10:00:00Z"), item("d", "2026-10-20T10:00:00Z", "acao"), item("a", "2026-10-29T10:00:00Z"), item("futuro", "2026-11-05T10:00:00Z")],
      agora
    );
    expect(l.map((x) => x.id)).toEqual(["d", "b", "a"]);
  });
  it("conta como nova o que não foi visto; sem histórico, só os últimos 3 dias", () => {
    const l = [item("velho", "2026-10-20T10:00:00Z"), item("hoje", "2026-10-30T10:00:00Z"), item("convite", "2026-10-10T10:00:00Z", "acao")];
    expect(contarNovas(l, null, agora)).toBe(2);
    expect(contarNovas(l, new Set(["hoje"]), agora)).toBe(2);
    expect(ehNova(l[1], new Set(["hoje"]), agora)).toBe(false);
  });
  it("contador e textos", () => {
    expect(textoContador(0)).toBe("");
    expect(textoContador(4)).toBe("4");
    expect(textoContador(12)).toBe("9+");
    expect(haQuanto("2026-10-30T11:55:00Z", agora)).toBe("5 min");
    expect(haQuanto("2026-10-29T10:00:00Z", agora)).toBe("ontem");
    expect(curto("a ".repeat(100), 20).length).toBe(20);
    expect(juntarVistos(["x", "y"], ["y", "z"])).toEqual(["y", "z", "x"]);
  });
});
