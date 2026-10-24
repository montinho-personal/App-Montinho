import { describe, expect, it } from "vitest";
import { calcularAderencia, somarDias, type PausaAluno } from "@/lib/aderencia/calcular";
import type { SessaoConquista } from "./regras";
import { detectarConquistas } from "./regras";
import { proximaMedalha, vitrineDeMedalhas } from "./vitrine";
import { ESTRADA, caminhoDaJornada, ciclos, linhaDoTempo, montarJornada, rotuloCiclo, type Jornada } from "./jornada";
import { CATALOGO } from "./regras";

let n = 0;
const s = (dia: string, o: Partial<SessaoConquista> = {}): SessaoConquista => ({ id: `j${++n}`, iniciado_em: `${dia}T13:00:00Z`, status: "concluida", series_planejadas: 10, series_concluidas: 10, exercicios: [], ...o });
const metas = [{ desde: "2026-01-01", meta: 2, origem: "personal" as const }];

/** Pipeline real: motor oficial → conquistas → vitrine → jornada. */
function jornadaDe(sessoes: SessaoConquista[], hoje: string, inicio = "2026-08-03", pausas: PausaAluno[] = []) {
  const aderencia = calcularAderencia({ inicio, hoje, metas, sessoes, pausas });
  const conquistas = detectarConquistas({ sessoes, aderencia, hoje }).map((c, i) => ({ id: `k${i}`, codigo: c.codigo, titulo: c.titulo, descricao: c.descricao, conquistado_em: c.data, dados: c.dados }));
  const medalhas = vitrineDeMedalhas({ conquistas, sessoes, aderencia, hoje });
  const j = montarJornada({ medalhas, proxima: proximaMedalha(medalhas), conquistas, semanas: aderencia.semanas });
  return { j, conquistas, aderencia, medalhas };
}
const semanaCumprida = (seg: string) => [s(seg), s(somarDias(seg, 1))];

/** A estrada nunca tem buraco: acesas primeiro, depois só as que faltam. */
function semBuracos(j: Jornada) {
  j.nos.forEach((n, i) => expect(n.alcancado).toBe(i < j.posicao));
}
const ids = (j: Jornada) => j.nos.map((n) => n.id);

describe("Minha Jornada — estrada com paradas laterais", () => {
  it("estrada (22 medalhas do caminho) + paradas (as outras 22) cobrem as 44 da sala de troféus, sem repetir", () => {
    const estrada = Object.values(ESTRADA).flat();
    expect(new Set(estrada).size).toBe(estrada.length);
    expect(estrada).toHaveLength(22);
    for (const c of estrada) expect(c in CATALOGO).toBe(true);
    const { j } = jornadaDe([], "2026-08-05");
    expect(j.capitulos.map((c) => c.numero)).toEqual([1, 2, 3, 4, 5]);
  });
  it("aluno sem treinos: começo do capítulo 1, próxima = primeiro passo, nada aceso", () => {
    const { j } = jornadaDe([], "2026-08-05");
    expect(j.posicao).toBe(0);
    expect(j.capituloAtual).toBe(1);
    expect(j.proxima?.codigo).toBe("primeiro_treino");
    expect(ids(j).slice(0, 4)).toEqual(["primeiro_treino", "terceiro_especial", "primeira_meta_semanal", "criando_raizes"]);
    expect(j.missoesEmAberto).toEqual([]);
    semBuracos(j);
  });
  it("caso Denis: técnicas e Missão Cumprida no mesmo treino viram paradas ao lado do Primeiro passo", () => {
    const { medalhas: todas } = jornadaDe([], "2026-10-21");
    const medalhas = todas.map((m) => (["primeiro_treino"].includes(m.codigo) ? { ...m, conquistada: true, data: "2026-10-21T09:59:00Z" } : m));
    const paralelas = ["missao_cumprida", "cada_quilo_conta", "primeira_tecnica", "tecnicas_2"];
    const r = montarJornada({ medalhas: medalhas.map((m) => (paralelas.includes(m.codigo) ? { ...m, conquistada: true, data: "2026-10-21T09:59:00Z" } : m)), proxima: null, conquistas: [], semanas: [] });
    expect(r.posicao).toBe(1);
    expect(r.capituloAtual).toBe(1);
    expect(r.paradas).toEqual([{ apos: "primeiro_treino", itens: expect.arrayContaining([expect.objectContaining({ codigo: "tecnicas_2" })]) }]);
    expect(r.paradas[0].itens).toHaveLength(4);
    expect(ids(r)).not.toContain("tecnicas_2");
    semBuracos(r);
  });
  it("caso Adriana: “Criando raízes” antes de “O Terceiro É Especial” — acesas na ordem em que foram ganhas, sem buraco", () => {
    const { medalhas: base } = jornadaDe([], "2026-10-08", "2026-10-06");
    const ganhas: Record<string, string> = { primeiro_treino: "2026-10-07T15:00:00Z", criando_raizes: "2026-10-13T15:00:00Z", tecnicas_2: "2026-10-21T13:27:00Z" };
    const medalhas = base.map((m) => (ganhas[m.codigo] ? { ...m, conquistada: true, data: ganhas[m.codigo] } : m));
    const r = montarJornada({ medalhas, proxima: null, conquistas: [{ codigo: "recorde", conquistado_em: "2026-10-21T13:27:00Z" }], semanas: [] });
    expect(ids(r).slice(0, 4)).toEqual(["primeiro_treino", "criando_raizes", "terceiro_especial", "primeira_meta_semanal"]);
    expect(r.posicao).toBe(2);
    expect(r.paradas).toEqual([{ apos: "criando_raizes", itens: [expect.objectContaining({ codigo: "tecnicas_2" }), expect.objectContaining({ codigo: "recorde", total: 1 })] }]);
    semBuracos(r);
  });
  it("caso Renata: só abriu a evolução (0 treinos) — parada no começo da trilha, marcador no início", () => {
    const { medalhas: base } = jornadaDe([], "2026-10-23");
    const r = montarJornada({ medalhas: base.map((m) => (m.codigo === "relatorio_mensal" ? { ...m, conquistada: true, data: "2026-10-23T22:59:00Z" } : m)), proxima: null, conquistas: [], semanas: [] });
    expect(r.posicao).toBe(0);
    expect(r.capituloAtual).toBe(1);
    expect(r.paradas).toEqual([{ apos: null, itens: [expect.objectContaining({ codigo: "relatorio_mensal" })] }]);
  });
  it("portão dos 10 treinos: passa para a Ponte mesmo sem a Semana de Respeito, que vira missão em aberto", () => {
    // 10 treinos espaçados (meta 2 nunca cumprida).
    const xs = Array.from({ length: 10 }, (_, i) => s(somarDias("2026-08-04", i * 7)));
    const { j } = jornadaDe(xs, "2026-10-12");
    expect(j.capituloAtual).toBe(2);
    expect(ids(j)).toContain("treinos_10");
    expect(j.missoesEmAberto.map((m) => m.codigo)).toContain("primeira_meta_semanal");
    expect(ids(j)).not.toContain("primeira_meta_semanal");
    const t10 = j.nos.find((n) => n.id === "treinos_10")!;
    expect([t10.capitulo, t10.alcancado]).toEqual([2, true]);
    semBuracos(j);
  });
  it("tempo de cadastro sozinho não acende a estrada: 6 meses só vale no capítulo 5", () => {
    const semanas = Array.from({ length: 30 }, (_, i) => ({ inicio: somarDias("2026-01-05", i * 7), pausada: false }));
    const { medalhas } = jornadaDe([], "2026-08-02", "2026-01-05");
    const r = montarJornada({ medalhas, proxima: null, conquistas: [], semanas });
    expect(r.posicao).toBe(0);
    expect(r.nos.find((n) => n.id === "ciclo-26")).toMatchObject({ alcancado: false, capitulo: 5 });
    semBuracos(r);
  });
  it("histórico importado sem autorização não acende a estrada", () => {
    const { j } = jornadaDe([s("2026-08-04", { conta_aderencia: false }), s("2026-08-12", { conta_aderencia: false })], "2026-08-13");
    expect(j.posicao).toBe(0);
  });
  it("veterano: portões em sequência até o Horizonte (6 meses), estrada sem buracos", () => {
    const segs = Array.from({ length: 30 }, (_, i) => somarDias("2026-01-05", i * 7));
    const { j } = jornadaDe(segs.flatMap(semanaCumprida), "2026-08-02", "2026-01-05");
    expect(j.nos.find((x) => x.id === "treinos_50")?.alcancado).toBe(true);
    expect(j.nos.find((x) => x.id === "ciclo-26")?.alcancado).toBe(true);
    expect(j.capituloAtual).toBe(5);
    const cap = (id: string) => j.nos.find((n) => n.id === id)!.capitulo;
    expect([cap("treinos_10"), cap("treinos_25"), cap("ciclo-26")]).toEqual([2, 3, 5]);
    semBuracos(j);
  });
  it("pausa combinada não conta como semana de acompanhamento nos ciclos", () => {
    const semanas = Array.from({ length: 30 }, (_, i) => ({ inicio: somarDias("2026-01-05", i * 7), pausada: i < 5 }));
    expect(ciclos(semanas)).toEqual([{ semanas: 26, data: null, alcancado: false }]);
    const c = ciclos(semanas.map((w) => ({ ...w, pausada: false })));
    expect(c[0]).toMatchObject({ semanas: 26, alcancado: true });
    expect(c[1]).toMatchObject({ semanas: 52, alcancado: false });
    expect(rotuloCiclo(26)).toBe("6 meses de acompanhamento");
    expect(rotuloCiclo(78)).toBe("1 ano e meio de acompanhamento");
  });
});

describe("Minha Jornada — linha do tempo", () => {
  it("eventos reais, sem duplicar, do mais recente para o mais antigo; mensagem do personal identificada", () => {
    const { conquistas, aderencia } = jornadaDe([...semanaCumprida("2026-08-03"), ...semanaCumprida("2026-08-10")], "2026-08-20");
    const ev = linhaDoTempo({ conquistas: [...conquistas, ...conquistas], semanas: aderencia.semanas, hoje: "2026-08-20", reconhecimentos: [{ id: "r1", mensagem: "Parabéns!", created_at: "2026-08-15T12:00:00Z" }] });
    expect(new Set(ev.map((e) => e.chave)).size).toBe(ev.length);
    expect(ev.filter((e) => e.tipo === "meta")).toHaveLength(2);
    expect(ev.find((e) => e.tipo === "reconhecimento")).toMatchObject({ autor: "personal", detalhe: "Parabéns!" });
    expect(ev.find((e) => e.codigo === "primeiro_treino")?.titulo).toBe("Primeiro passo");
    const datas = ev.map((e) => e.data);
    expect([...datas].sort().reverse()).toEqual(datas);
  });
  it("semana atual cumprida não ganha data no futuro", () => {
    const { aderencia } = jornadaDe(semanaCumprida("2026-08-17"), "2026-08-19");
    const ev = linhaDoTempo({ conquistas: [], semanas: aderencia.semanas, hoje: "2026-08-19", reconhecimentos: [] });
    expect(ev[0].data.slice(0, 10)).toBe("2026-08-19");
  });
});

describe("caminho semana a semana", () => {
  it("cor da fase, começo de fase e retorno depois de parar", () => {
    const semanas = ["2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05"].map((inicio, i) => ({ inicio, status: (i === 2 || i === 3 ? "sem_treino" : "cumprida") as "cumprida" | "sem_treino", concluidas: 0, parciais: 0, extras: 0 }));
    const sessoes = [
      { iniciado_em: "2026-09-08T13:00:00Z", status: "concluida", fase: "adaptacao" },
      { iniciado_em: "2026-09-15T13:00:00Z", status: "concluida", fase: "adaptacao" },
      { iniciado_em: "2026-10-06T13:00:00Z", status: "concluida", fase: "intensificacao" },
    ];
    const c = caminhoDaJornada({ semanas, sessoes, conquistas: [{ codigo: "eu_voltei", conquistado_em: "2026-10-06T13:00:00Z", dados: { diasAfastado: 21 } }] });
    expect(c.semanas.map((w) => w.fase)).toEqual(["adaptacao", "adaptacao", null, null, "intensificacao"]);
    expect(c.semanas.map((w) => w.novaFase)).toEqual(["adaptacao", null, null, null, "intensificacao"]);
    expect(c.semanas[4]).toMatchObject({ retorno: true, diasParado: 21, treinos: 1 });
    expect(c.faseAtual).toBe("intensificacao");
    expect(c.retornos).toBe(1);
  });
});
