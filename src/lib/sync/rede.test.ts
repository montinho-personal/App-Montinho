import { describe, expect, it, vi } from "vitest";
import { fetchComPrazo } from "./rede";

describe("fetchComPrazo", () => {
  it("desiste quando a resposta não chega", async () => {
    vi.useFakeTimers();
    const pendurado = ((_: string, init?: RequestInit) =>
      new Promise<Response>((_r, rej) => init?.signal?.addEventListener("abort", () => rej(new Error("abortado"))))) as typeof fetch;
    const p = fetchComPrazo("/x", {}, 1000, pendurado);
    vi.advanceTimersByTime(1001);
    await expect(p).rejects.toThrow("abortado");
    vi.useRealTimers();
  });
  it("devolve a resposta quando chega a tempo", async () => {
    const ok = (async () => new Response("{}", { status: 200 })) as typeof fetch;
    const r = await fetchComPrazo("/x", {}, 1000, ok);
    expect(r.ok).toBe(true);
  });
});
