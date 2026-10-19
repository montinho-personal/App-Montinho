import { describe, expect, it } from "vitest";
import { drenar, enfileirar, gerarClientKey, lerFila, reconciliar, type StorageLike } from "./fila";

function memStorage(): StorageLike {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

describe("fila local idempotente (conexão instável)", () => {
  it("gera client_key única e estável por operação", () => {
    const a = gerarClientKey("set");
    const b = gerarClientKey("set");
    expect(a).not.toBe(b);
    expect(a.startsWith("set:")).toBe(true);
  });

  it("enfileirar substitui a mesma série (última edição vence) sem duplicar", () => {
    const st = memStorage();
    enfileirar(st, "s1", { tipo: "serie", sessionId: "s1", clientKey: "k1", payload: { reps: 10 } });
    enfileirar(st, "s1", { tipo: "serie", sessionId: "s1", clientKey: "k1", payload: { reps: 12 } });
    enfileirar(st, "s1", { tipo: "serie", sessionId: "s1", clientKey: "k2", payload: { reps: 8 } });
    const fila = lerFila(st, "s1");
    expect(fila.length).toBe(2);
    expect(fila[0].payload).toEqual({ reps: 12 });
  });

  it("'finalizar' fica sempre por último, mesmo se enfileirado antes de uma série", () => {
    const st = memStorage();
    enfileirar(st, "s1", { tipo: "finalizar", sessionId: "s1", clientKey: "fim", payload: {} });
    enfileirar(st, "s1", { tipo: "serie", sessionId: "s1", clientKey: "k9", payload: { reps: 8 } });
    const fila = lerFila(st, "s1");
    expect(fila.map((f) => f.tipo)).toEqual(["serie", "finalizar"]);
  });

  it("drena em ordem; erro transitório para e reenvia depois sem perder nada", async () => {
    const st = memStorage();
    enfileirar(st, "s1", { tipo: "serie", sessionId: "s1", clientKey: "k1", payload: {} });
    enfileirar(st, "s1", { tipo: "serie", sessionId: "s1", clientKey: "k2", payload: {} });
    let chamadas = 0;
    const r1 = await drenar(st, "s1", async (op) => {
      chamadas++;
      return op.clientKey === "k2" ? { ok: false, erro: "rede" } : { ok: true };
    });
    expect(r1.confirmadas).toBe(1);
    expect(r1.restantes.map((x) => x.clientKey)).toEqual(["k2"]);
    expect(r1.restantes[0].tentativas).toBe(1);
    const r2 = await drenar(st, "s1", async () => ({ ok: true }));
    expect(r2.confirmadas).toBe(1);
    expect(lerFila(st, "s1")).toEqual([]);
    expect(chamadas).toBe(2);
  });

  it("erro definitivo (validação) descarta a operação e segue a fila", async () => {
    const st = memStorage();
    enfileirar(st, "s1", { tipo: "serie", sessionId: "s1", clientKey: "ruim", payload: {} });
    enfileirar(st, "s1", { tipo: "serie", sessionId: "s1", clientKey: "boa", payload: {} });
    const r = await drenar(st, "s1", async (op) => (op.clientKey === "ruim" ? { ok: false, definitivo: true, erro: "400" } : { ok: true }));
    expect(r.confirmadas).toBe(1);
    expect(r.restantes).toEqual([]);
    expect(r.erro).toBe("400");
  });

  it("reenvio da mesma operação é idempotente do ponto de vista do cliente", async () => {
    const st = memStorage();
    enfileirar(st, "s1", { tipo: "serie", sessionId: "s1", clientKey: "k1", payload: { reps: 10 } });
    const enviados: string[] = [];
    await drenar(st, "s1", async (op) => {
      enviados.push(op.clientKey);
      return { ok: false, erro: "timeout" };
    });
    await drenar(st, "s1", async (op) => {
      enviados.push(op.clientKey);
      return { ok: true };
    });
    expect(enviados).toEqual(["k1", "k1"]); // mesma client_key → servidor faz upsert, não duplica
    expect(lerFila(st, "s1")).toEqual([]);
  });

  it("operação enfileirada DURANTE o envio não se perde (bug clássico de sobrescrita)", async () => {
    const st = memStorage();
    enfileirar(st, "s1", { tipo: "serie", sessionId: "s1", clientKey: "k1", payload: {} });
    const enviados: string[] = [];
    await drenar(st, "s1", async (op) => {
      enviados.push(op.clientKey);
      if (op.clientKey === "k1") enfileirar(st, "s1", { tipo: "serie", sessionId: "s1", clientKey: "k2", payload: {} }); // chega enquanto k1 está em voo
      return { ok: true };
    });
    expect(enviados).toEqual(["k1", "k2"]);
    expect(lerFila(st, "s1")).toEqual([]);
  });

  it("reconciliar prefere o estado confirmado pelo servidor", () => {
    const locais = new Map([["k1", { client_key: "k1", reps: 10 }], ["k2", { client_key: "k2", reps: 8 }]]);
    const r = reconciliar(locais, [{ client_key: "k1", reps: 12 }]);
    expect(r.get("k1")?.reps).toBe(12);
    expect(r.get("k2")?.reps).toBe(8);
  });

  it("storage corrompido não quebra: devolve fila vazia", () => {
    const st = memStorage();
    st.setItem("montinho:fila:s1", "{not json");
    expect(lerFila(st, "s1")).toEqual([]);
  });
});
