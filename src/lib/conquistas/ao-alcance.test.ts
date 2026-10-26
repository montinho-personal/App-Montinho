import { describe, expect, it } from "vitest";
import { calcularAderencia } from "@/lib/aderencia/calcular";
import { samuraiNoTreino, trofeusNoTreino, trofeusNosProximosDias } from "./ao-alcance";
import { vitrineDeMedalhas } from "./vitrine";
import type { FamiliaTecnica, SessaoConquista } from "./regras";

let n = 0;
const s = (dia: string, o: Partial<SessaoConquista> = {}): SessaoConquista => ({ id: `a${++n}`, iniciado_em: `${dia}T13:00:00Z`, status: "concluida", series_planejadas: 10, series_concluidas: 10, ...o });
const metas = [{ desde: "2026-01-01", meta: 3, origem: "personal" as const }];
const ganhas = (...codigos: string[]) => codigos.map((codigo) => ({ codigo, conquistado_em: "2026-10-01T13:00:00Z" }));
const dias = (...ds: string[]) => ds.map((d) => s(d));
const tres = [{ nome: "Supino", tecnica: null }, { nome: "Remada", tecnica: null }, { nome: "Agachamento", tecnica: null }];
const COMECO = ganhas("primeiro_treino", "missao_cumprida", "cada_quilo_conta", "terceiro_especial", "primeira_meta_semanal", "relatorio_mensal", "strava_conectado", "compartilhou_primeiro");

function contexto(sessoes: SessaoConquista[], conquistas: ReturnType<typeof ganhas>, hoje: string, feitas: FamiliaTecnica[] = []) {
  const aderencia = calcularAderencia({ inicio: "2026-09-28", hoje, metas, sessoes });
  return { medalhas: vitrineDeMedalhas({ conquistas, sessoes, aderencia, hoje }), aderencia, tecnicasFeitas: new Set(feitas), hoje };
}
const codigos = (xs: Array<{ codigo: string }>) => xs.map((x) => x.codigo);

describe("troféus neste treino", () => {
  it("primeiro treino: primeiro passo, missão cumprida e cada quilo conta", () => {
    const c = contexto([], [], "2026-10-20");
    const itens = trofeusNoTreino({ ...c, treino: { exercicios: tres, extra: false, reduzido: false } });
    expect(codigos(itens)).toEqual(["primeiro_treino", "missao_cumprida", "cada_quilo_conta"]);
    expect(itens[0].oQueFazer).toMatch(/metade das séries/);
  });

  it("treino nº 10 e o que fecha a meta da semana (4 semanas seguidas)", () => {
    // 3 semanas cumpridas + 2 treinos nesta semana = 11; o 10º já saiu.
    const sessoes = dias("2026-09-29", "2026-09-30", "2026-10-01", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-19", "2026-10-20");
    const c = contexto(sessoes, [...COMECO, ...ganhas("treinos_10")], "2026-10-21");
    const itens = trofeusNoTreino({ ...c, treino: { exercicios: tres, extra: false, reduzido: false } });
    expect(codigos(itens)).toEqual(["semanas_consistentes_4"]);
    expect(itens[0].oQueFazer).toMatch(/4 semanas seguidas/);
  });

  it("falta 1 treino para o 10º, mas a meta da semana ainda não fecha neste treino", () => {
    const sessoes = dias("2026-09-29", "2026-09-30", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-20");
    const c = contexto(sessoes, COMECO, "2026-10-21");
    expect(codigos(trofeusNoTreino({ ...c, treino: { exercicios: tres, extra: false, reduzido: false } }))).toEqual(["treinos_10"]);
  });

  it("técnica nova na ficha conta (isometria em prancha não)", () => {
    const c = contexto([s("2026-10-20")], COMECO, "2026-10-21", ["piramide", "biset"]);
    const itens = trofeusNoTreino({ ...c, treino: { exercicios: [{ nome: "Prancha", tecnica: "isometria" }, { nome: "Supino", tecnica: "dropset" }], extra: false, reduzido: false } });
    expect(codigos(itens)).toEqual(["tecnicas_3"]);
    expect(itens[0].oQueFazer).toMatch(/Drop-set/);
  });

  it("treino extra só mexe nos troféus de extra", () => {
    const c = contexto([], [], "2026-10-20");
    expect(codigos(trofeusNoTreino({ ...c, treino: { exercicios: tres, extra: true, reduzido: false } }))).toEqual(["fui_alem"]);
  });

  it("versão curta: fiz o necessário", () => {
    const c = contexto([s("2026-10-20")], COMECO, "2026-10-21");
    expect(codigos(trofeusNoTreino({ ...c, treino: { exercicios: tres, extra: false, reduzido: true } }))).toContain("fiz_o_necessario");
  });

  it("Samurai: só com o horário gravado na janela e a medalha em aberto", () => {
    const c = contexto([], [], "2026-10-20");
    expect(samuraiNoTreino(c.medalhas, true)?.codigo).toBe("treino_samurai");
    expect(samuraiNoTreino(c.medalhas, false)).toBeNull();
    const ganho = contexto([], ganhas("treino_samurai"), "2026-10-20");
    expect(samuraiNoTreino(ganho.medalhas, true)).toBeNull();
  });
});

describe("troféus nos próximos dias", () => {
  it("o que cabe no ritmo da meta, a meta desta semana, técnicas da ficha e os de um toque", () => {
    const sessoes = dias("2026-09-29", "2026-09-30", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-20");
    const c = contexto(sessoes, ganhas("primeiro_treino", "missao_cumprida", "cada_quilo_conta", "terceiro_especial", "primeira_meta_semanal"), "2026-10-21");
    const itens = trofeusNosProximosDias({ ...c, treinos: [{ letra: "A", exercicios: [{ nome: "Supino", tecnica: "rest_pause" }] }, { letra: "B", exercicios: [{ nome: "Remada", tecnica: "rest_pause" }] }] });
    expect(codigos(itens)).toEqual(["treinos_10", "primeira_tecnica", "relatorio_mensal", "strava_conectado", "compartilhou_primeiro"]);
    expect(itens[0]).toMatchObject({ quando: "No próximo treino" });
    expect(itens[1].oQueFazer).toBe("Faça Rest-pause no Treino A.");
  });

  it("meta da semana que ainda cabe até domingo vira troféu de semanas seguidas", () => {
    const sessoes = dias("2026-09-29", "2026-09-30", "2026-10-01", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-13", "2026-10-14", "2026-10-15");
    const c = contexto(sessoes, [...COMECO, ...ganhas("treinos_10")], "2026-10-23");
    const itens = trofeusNosProximosDias({ ...c, treinos: [] });
    expect(itens.find((i) => i.codigo === "semanas_consistentes_4")).toMatchObject({ quando: "Até domingo", oQueFazer: "Faça mais 3 treinos e feche a meta da semana. São 4 semanas seguidas." });
  });

  it("meta que não cabe mais nos dias que restam não entra", () => {
    const sessoes = dias("2026-09-29", "2026-09-30", "2026-10-01", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-13", "2026-10-14", "2026-10-15");
    const c = contexto(sessoes, [...COMECO, ...ganhas("treinos_10")], "2026-10-25");
    expect(codigos(trofeusNosProximosDias({ ...c, treinos: [] }))).not.toContain("semanas_consistentes_4");
  });
});
