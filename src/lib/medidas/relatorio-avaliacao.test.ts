import { describe, expect, it } from "vitest";
import { calcularPollock, extrasDoPollock } from "./pollock";
import { ehAvaliacao7Dobras, imcDe, lerObservacao, mensagemRelatorio, relatorioAvaliacao, textoDiferenca } from "./relatorio-avaliacao";
import type { Evolucao } from "@/lib/supabase/types";

const vazio = { peso_kg: null, gordura_pct: null, cintura_cm: null, quadril_cm: null, braco_cm: null, coxa_cm: null, peito_cm: null } as const;
function avaliacao(id: string, data: string, dobra: number, peso: number, extra: Partial<Evolucao> = {}): Evolucao {
  const leituras = { peitoral: [dobra], axilar_media: [dobra], triceps: [dobra], subescapular: [dobra], abdominal: [dobra], suprailiaca: [dobra], coxa: [dobra] };
  const r = calcularPollock({ sexo: "F", idade: 30, pesoKg: peso, leituras });
  return { id, aluno_id: "a1", data, ...vazio, peso_kg: peso, gordura_pct: r.gorduraPct, massa_magra_kg: r.massaMagraKg, extras: extrasDoPollock(r), observacoes: `Avaliação de 7 dobras (Jackson & Pollock + Siri), mulher, 30 anos. Adipômetro Cescorf`, created_at: `${data}T12:00:00Z`, ...extra };
}

describe("Relatório da avaliação de 7 dobras", () => {
  it("lê sexo, idade e a observação do personal", () => {
    expect(lerObservacao("Avaliação de 7 dobras (Jackson & Pollock + Siri), homem, 41 anos. Pela manhã")).toEqual({ sexo: "M", idade: 41, observacao: "Pela manhã" });
    expect(lerObservacao("Avaliação de 7 dobras (Jackson & Pollock + Siri), mulher, 30 anos.")).toEqual({ sexo: "F", idade: 30, observacao: null });
    expect(lerObservacao("Bioimpedância da academia")).toEqual({ sexo: null, idade: null, observacao: "Bioimpedância da academia" });
  });

  it("primeira avaliação: números principais, IMC pela altura do cadastro, sem comparação", () => {
    const a = avaliacao("x1", "2026-11-04", 15, 62);
    const r = relatorioAvaliacao([a], "x1", 165)!;
    expect(r.principais.soma).toBe(105);
    expect(r.principais.gorduraPct).toBe(a.gordura_pct);
    expect(r.principais.imc).toBe(22.8);
    expect(r.dobras.every((d) => d.atual === 15 && d.anterior == null)).toBe(true);
    expect(r.comparacao).toEqual([]);
    expect(r.anterior).toBeNull();
    expect(r.observacao).toBe("Adipômetro Cescorf");
  });

  it("compara só com a avaliação de 7 dobras anterior (bioimpedância no meio fica fora)", () => {
    const a1 = avaliacao("x1", "2026-08-01", 18, 64);
    const bio: Evolucao = { id: "b1", aluno_id: "a1", data: "2026-09-15", ...vazio, peso_kg: 63, gordura_pct: 30, observacoes: null, created_at: "2026-09-15T12:00:00Z", cintura_cm: 75 };
    const a2 = avaliacao("x2", "2026-11-04", 15, 62, { cintura_cm: 72 });
    const r = relatorioAvaliacao([a2, bio, a1], "x2")!;
    expect(r.anterior).toEqual({ id: "x1", data: "2026-08-01" });
    const gord = r.comparacao.find((l) => l.rotulo === "% de gordura")!;
    expect(gord.anterior).toBe(a1.gordura_pct);
    expect(gord.diferenca).toBeLessThan(0);
    expect(r.dobras[0]).toMatchObject({ atual: 15, anterior: 18, diferenca: -3 });
    // Cintura (fita) compara com o último registro que tinha cintura, mesmo de outro tipo.
    expect(r.circunferencias).toEqual([{ rotulo: "Cintura", unidade: "cm", atual: 72, anterior: 75, diferenca: -3 }]);
  });

  it("avaliação refeita no mesmo dia não vira a “anterior”", () => {
    const ago = avaliacao("x1", "2026-08-01", 18, 64);
    const hoje1 = avaliacao("x2", "2026-11-04", 15, 62);
    const hoje2 = avaliacao("x3", "2026-11-04", 15, 62, { created_at: "2026-11-04T13:00:00Z" });
    expect(relatorioAvaliacao([ago, hoje1, hoje2], "x3")!.anterior?.id).toBe("x1");
  });

  it("linha que não é de 7 dobras não vira relatório", () => {
    const bio: Evolucao = { id: "b1", aluno_id: "a1", data: "2026-09-15", ...vazio, peso_kg: 63, observacoes: null, created_at: "2026-09-15T12:00:00Z" };
    expect(ehAvaliacao7Dobras(bio)).toBe(false);
    expect(relatorioAvaliacao([bio], "b1")).toBeNull();
  });

  it("textos neutros e mensagem do WhatsApp", () => {
    expect(textoDiferenca({ rotulo: "% de gordura", unidade: "%", atual: 22, anterior: 24.5, diferenca: -2.5 })).toBe("↓ −2,5 pontos");
    expect(textoDiferenca({ rotulo: "Peso", unidade: "kg", atual: 62, anterior: 62, diferenca: 0 })).toBe("igual");
    expect(imcDe(62, null)).toBeNull();
    const m = mensagemRelatorio("Natália Cristina", "2026-11-04", "https://app-montinho.vercel.app/avaliacao/x2");
    expect(m).toContain("Oi, Natália!");
    expect(m).toContain("04/11/2026");
    expect(m).toContain("https://app-montinho.vercel.app/avaliacao/x2");
  });
});
