import { describe, expect, it } from "vitest";
import { aplicarRascunho, gravarRascunho, lerRascunho, limparRascunho, primeiroPendente, rascunhoDasSeries, VALIDADE_RASCUNHO_MS } from "./rascunho";

function memoria() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}
const serie = (n: number, extra: Partial<{ carga: string; reps: string; concluida: boolean; clientKey: string }> = {}) => ({
  clientKey: extra.clientKey ?? `set:e1:${n}`, serie: n, tipo: "valida" as const, carga: extra.carga ?? "", reps: extra.reps ?? "", rir: "", desconforto: "", concluida: extra.concluida ?? false, sincronizada: !!extra.concluida,
});

describe("rascunho do treino em andamento", () => {
  it("guarda só o que não foi concluído (digitado ou série extra)", () => {
    const tela = { e1: [serie(1, { carga: "40", reps: "10", concluida: true }), serie(2, { carga: "42,5" }), serie(3), serie(4, { clientKey: "set:e1:4:x" })] };
    const r = rascunhoDasSeries(tela, { e1: 3 });
    expect(r.e1.map((s) => [s.serie, s.carga, !!s.extra])).toEqual([[2, "42,5", false], [4, "", true]]);
  });

  it("app fechou e reabriu: volta a carga digitada, a série extra, o exercício aberto e o descanso", () => {
    const st = memoria();
    const agora = 1_000_000;
    gravarRascunho(st, "s1", { series: { e1: [{ clientKey: "set:e1:2", serie: 2, carga: "42,5", reps: "8", rir: "", desconforto: "" }, { clientKey: "set:e1:4:x", serie: 4, carga: "", reps: "", rir: "", desconforto: "", extra: true }] }, aberto: "e1", descansoAte: agora + 60_000 }, agora);
    const r = lerRascunho(st, "s1", agora + 5_000)!;
    expect(r.aberto).toBe("e1");
    expect(r.descansoAte).toBe(agora + 60_000);
    const servidor = { e1: [serie(1, { carga: "40", reps: "10", concluida: true }), serie(2), serie(3)] };
    const { series, restaurou } = aplicarRascunho(servidor, r);
    expect(restaurou).toBe(true);
    expect(series.e1.map((s) => [s.serie, s.carga, s.reps, s.concluida])).toEqual([[1, "40", "10", true], [2, "42,5", "8", false], [3, "", "", false], [4, "", "", false]]);
  });

  it("nunca sobrescreve série já concluída (servidor vence o rascunho)", () => {
    const r = { v: 1 as const, series: { e1: [{ clientKey: "set:e1:1", serie: 1, carga: "99", reps: "1", rir: "", desconforto: "" }] }, aberto: null, descansoAte: null, salvoEm: 0 };
    const { series } = aplicarRascunho({ e1: [serie(1, { carga: "40", reps: "10", concluida: true })] }, r);
    expect(series.e1[0].carga).toBe("40");
  });

  it("rascunho velho (treino esquecido) ou corrompido é ignorado", () => {
    const st = memoria();
    gravarRascunho(st, "s1", { series: { e1: [{ clientKey: "k", serie: 1, carga: "1", reps: "", rir: "", desconforto: "" }] }, aberto: "e1", descansoAte: null }, 0);
    expect(lerRascunho(st, "s1", VALIDADE_RASCUNHO_MS + 1)).toBeNull();
    st.setItem("montinho:rascunho:s2", "{quebrado");
    expect(lerRascunho(st, "s2")).toBeNull();
  });

  it("finalizar limpa o rascunho; rascunho vazio não ocupa espaço", () => {
    const st = memoria();
    gravarRascunho(st, "s1", { series: {}, aberto: "e1", descansoAte: null });
    limparRascunho(st, "s1");
    expect(st.m.size).toBe(0);
    gravarRascunho(st, "s1", { series: {}, aberto: null, descansoAte: null });
    expect(st.m.size).toBe(0);
  });

  it("abre no primeiro exercício com série por fazer", () => {
    const s = { a: [{ tipo: "valida", concluida: true }], b: [{ tipo: "aquecimento", concluida: false }, { tipo: "valida", concluida: false }], c: [{ tipo: "valida", concluida: false }] };
    expect(primeiroPendente(["a", "b", "c"], s)).toBe("b");
    expect(primeiroPendente(["a"], { a: [{ tipo: "valida", concluida: true }] })).toBe("a");
  });
});
