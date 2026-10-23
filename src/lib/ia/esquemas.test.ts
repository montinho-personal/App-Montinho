// A API recusa `enum` junto com `type: ["string", "null"]` (erro 400 visto em
// produção em 23/10/2026). Campos opcionais com enum usam anyOf com null.
import { describe, expect, it } from "vitest";
import { SCHEMA as PEDIDO } from "./entender-pedido";
import { SCHEMA as DITADO } from "./interpretar-treino";

function problemas(no: unknown, caminho = "$"): string[] {
  if (!no || typeof no !== "object") return [];
  const o = no as Record<string, unknown>;
  const aqui = Array.isArray(o.type) && "enum" in o ? [`${caminho}: enum com type em lista`] : [];
  return [...aqui, ...Object.entries(o).flatMap(([k, v]) => problemas(v, `${caminho}.${k}`))];
}

describe("formato pedido à IA", () => {
  it("nenhum enum junto de type em lista", () => {
    expect(problemas(PEDIDO)).toEqual([]);
    expect(problemas(DITADO)).toEqual([]);
  });
});
