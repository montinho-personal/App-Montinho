import { describe, expect, it } from "vitest";
import { escolherAtividade, janelaDeBusca, textoCardio, type AtividadeStrava } from "./combinar";

const a = (id: number, start: string, min: number, o: Partial<AtividadeStrava> = {}): AtividadeStrava => ({ id, name: `A${id}`, start_date: start, elapsed_time: min * 60, ...o });
const treino = { inicio: "2026-10-24T10:00:00Z", fim: "2026-10-24T11:00:00Z", duracaoSeg: 3600 };

describe("Strava — qual atividade é o treino", () => {
  it("escolhe a que mais se sobrepõe ao horário do treino", () => {
    const xs = [a(1, "2026-10-24T09:00:00Z", 20), a(2, "2026-10-24T09:58:00Z", 65), a(3, "2026-10-24T10:50:00Z", 30)];
    expect(escolherAtividade(treino, xs)?.id).toBe(2);
  });
  it("relógio ligado alguns minutos antes ainda casa; atividade de outro horário não", () => {
    expect(escolherAtividade(treino, [a(4, "2026-10-24T09:45:00Z", 70)])?.id).toBe(4);
    expect(escolherAtividade(treino, [a(5, "2026-10-24T14:00:00Z", 60)])).toBeNull();
    expect(escolherAtividade(treino, [])).toBeNull();
  });
  it("treino sem fim registrado usa a duração (ou 2 h)", () => {
    expect(escolherAtividade({ inicio: treino.inicio, fim: null, duracaoSeg: null }, [a(6, "2026-10-24T11:30:00Z", 20)])?.id).toBe(6);
  });
  it("janela de busca: 2 h antes até 3 h depois", () => {
    const j = janelaDeBusca(treino);
    expect(j.after).toBe(Date.parse("2026-10-24T08:00:00Z") / 1000);
    expect(j.before).toBe(Date.parse("2026-10-24T14:00:00Z") / 1000);
  });
});

describe("Strava — texto do resumo", () => {
  it("mostra só o que o relógio mandou, no padrão do Brasil", () => {
    expect(textoCardio({ fc_media: 132.4, fc_max: 171, duracao_seg: 3480, calorias: 1420 })).toBe("Média 132 bpm · máx. 171 bpm · 58 min · 1.420 kcal");
    expect(textoCardio({ fc_media: null, fc_max: null, duracao_seg: 4500, calorias: null })).toBe("1 h 15 min");
    expect(textoCardio({ fc_media: null, fc_max: null, duracao_seg: null, calorias: null })).toContain("não mandou");
  });
});
