import { describe, expect, it } from "vitest";
import { codigoDoLink } from "@/lib/chalala/link";
import { marcosCompartilhar, progressoCompartilhar, type EventoCompartilhar } from "./compartilhar";

const ev = (tipo: string, created_at: string, o: Partial<EventoCompartilhar> = {}): EventoCompartilhar => ({ tipo, origem: null, modelo: null, ref: null, created_at, ...o });

describe("troféus de compartilhamento", () => {
  it("Espalhando o Chalalá: o 1º compartilhamento ou download (cancelado não conta)", () => {
    const m = marcosCompartilhar([ev("compartilhar_cancelado", "2026-10-01T12:00:00Z"), ev("download", "2026-10-02T12:00:00Z")], null);
    expect(m.primeiro).toBe("2026-10-02T12:00:00Z");
  });
  it("Diário de Bordo: card do fim do treino em 4 semanas diferentes (várias na mesma semana contam 1)", () => {
    const xs = ["2026-09-28", "2026-09-29", "2026-10-05", "2026-10-12", "2026-10-19"].map((d) => ev("compartilhar_nativo", `${d}T15:00:00Z`, { origem: "conclusao" }));
    expect(marcosCompartilhar(xs.slice(0, 4), null).diario).toBeNull();
    expect(marcosCompartilhar(xs, null).diario).toBe("2026-10-19T15:00:00Z");
    expect(progressoCompartilhar(xs.slice(0, 3)).semanasDiario).toBe(2);
  });
  it("Vitrine de Troféus: 5 troféus DIFERENTES (pela celebração ou pelo card da medalha)", () => {
    const xs = [
      ev("compartilhar_nativo", "2026-10-01T10:00:00Z", { origem: "medalha", modelo: "primeiro_treino" }),
      ev("compartilhar_nativo", "2026-10-02T10:00:00Z", { origem: "medalha", modelo: "primeiro_treino" }),
      ev("download", "2026-10-03T10:00:00Z", { origem: "historico", ref: "medalha:treinos_10" }),
      ev("download", "2026-10-04T10:00:00Z", { origem: "historico", ref: "medalha:missao_cumprida" }),
      ev("compartilhar_nativo", "2026-10-05T10:00:00Z", { origem: "medalha", modelo: "cada_quilo_conta" }),
    ];
    expect(marcosCompartilhar(xs, null).vitrine).toBeNull();
    const com5 = [...xs, ev("compartilhar_nativo", "2026-10-06T10:00:00Z", { origem: "medalha", modelo: "treino_samurai" })];
    expect(marcosCompartilhar(com5, null).vitrine).toBe("2026-10-06T10:00:00Z");
  });
  it("Inspiração da Galera: alguém abriu o seu link; Trouxe um Amigo: 1ª indicação", () => {
    const m = marcosCompartilhar([ev("visita_link", "2026-10-07T10:00:00Z", { ref: "c:abcdef123456" })], "2026-10-08T10:00:00Z");
    expect([m.inspiracao, m.amigo]).toEqual(["2026-10-07T10:00:00Z", "2026-10-08T10:00:00Z"]);
  });
  it("código do link: opaco, 12 caracteres, igual ao do banco (md5)", () => {
    expect(codigoDoLink("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")).toMatch(/^[a-f0-9]{12}$/);
  });
});
