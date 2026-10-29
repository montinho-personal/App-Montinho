import { describe, expect, it } from "vitest";
import { missaoDeHoje, proximaMissao, type EntradaMissao } from "./missao";

const base: EntradaMissao = { proximo: { letra: "B", nome: "Costas e Ombros", exercicios: 6, minutos: 50 }, primeiroTreino: false, diasSemTreino: 2, retomada: false, pausada: false, meta: 3, pontos: 1, desconforto: false };

describe("Missão de Hoje", () => {
  it("aluno constante: próximo treino da prescrição + por quê + botão", () => {
    const m = missaoDeHoje({ ...base, linhas: [null, "🏆 Ainda hoje: Missão Cumprida", "📈 outra"] })!;
    expect(m.variante).toBe("normal");
    expect(m.titulo).toBe("Treino B · Costas e Ombros");
    expect(m.porque).toContain("Faltam 2 treinos");
    expect(m.cta).toBe("Começar meu treino");
    expect(m.linha).toBe("🏆 Ainda hoje: Missão Cumprida");
  });
  it("falta 1 para a meta", () => {
    expect(missaoDeHoje({ ...base, pontos: 2 })!.porque).toBe("Falta 1 treino para cumprir a meta da semana.");
  });
  it("aluno novo: primeiro treino com passos e sem linha extra", () => {
    const m = missaoDeHoje({ ...base, primeiroTreino: true, diasSemTreino: null, pontos: 0, linhas: ["x"] })!;
    expect(m.variante).toBe("primeiro");
    expect(m.cta).toBe("Começar minha jornada");
    expect(m.passos).toHaveLength(3);
    expect(m.linha).toBeNull();
  });
  it("retomada: sem culpa e sem cobrar treinos perdidos", () => {
    const m = missaoDeHoje({ ...base, retomada: true, diasSemTreino: 12 })!;
    expect(m.variante).toBe("retomada");
    expect(m.rotulo).toBe("Bom ter você de volta!");
    expect(m.cta).toBe("Ver meu próximo passo");
    expect(`${m.porque} ${m.cuidado}`).not.toMatch(/perdeu|atrasad|falhou/i);
  });
  it("meta cumprida = descanso: não chama para treinar", () => {
    const m = missaoDeHoje({ ...base, pontos: 3 })!;
    expect(m.variante).toBe("descanso");
    expect(m.cta).toBeNull();
  });
  it("pausa combinada vence tudo (até sem próximo treino)", () => {
    expect(missaoDeHoje({ ...base, pausada: true, retomada: true })!.variante).toBe("pausa");
    expect(missaoDeHoje({ ...base, pausada: true, proximo: null })!.cta).toBeNull();
  });
  it("desconforto: mantém o treino com aviso de cuidado", () => {
    const m = missaoDeHoje({ ...base, desconforto: true })!;
    expect(m.cta).not.toBeNull();
    expect(m.cuidado).toContain("Conte ao Montinho");
  });
  it("sem treino na prescrição: não inventa missão", () => {
    expect(missaoDeHoje({ ...base, proximo: null })).toBeNull();
  });
  it("sem meta definida: segue normal", () => {
    expect(missaoDeHoje({ ...base, meta: null, pontos: 0 })!.porque).toContain("constância");
  });
});

describe("Próxima missão no fim do treino", () => {
  it("mostra a letra seguinte", () => {
    expect(proximaMissao({ proximo: { letra: "C", nome: "Inferiores" }, meta: 3, pontos: 2 })!.titulo).toBe("Seu próximo treino: Treino C · Inferiores");
  });
  it("meta cumprida: manda descansar", () => {
    const p = proximaMissao({ proximo: { letra: "A", nome: "Peito" }, meta: 3, pontos: 3 })!;
    expect(p.titulo).toBe("Meta da semana cumprida!");
    expect(p.texto).toContain("Descanse");
  });
  it("sem próximo treino: nada", () => {
    expect(proximaMissao({ proximo: null, meta: 3, pontos: 1 })).toBeNull();
  });
});
