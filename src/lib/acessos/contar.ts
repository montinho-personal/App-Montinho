// Acessos do dia (0072): pessoas diferentes que abriram o app, 1 por pessoa por
// dia, separado em alunos e visitantes. Contas puras (o painel mostra só números).

export type AcessoDia = { alunoId: string; dia: string; visitante: boolean };
export type Contagem = { alunos: number; visitantes: number; total: number };
export type ResumoAcessos = {
  hoje: Contagem;
  ontem: Contagem;
  /** Pessoas diferentes nos últimos 7/30 dias (contando hoje). */
  dias7: Contagem;
  dias30: Contagem;
  /** Últimos 7 dias, do mais antigo para hoje. */
  porDia: Array<Contagem & { dia: string }>;
};

/** Dia de hoje no horário de Brasília (AAAA-MM-DD). */
export function diaBrasilia(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(agora);
}

export function somarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function contar(lista: AcessoDia[]): Contagem {
  const alunos = new Set<string>();
  const visitantes = new Set<string>();
  for (const a of lista) (a.visitante ? visitantes : alunos).add(a.alunoId);
  return { alunos: alunos.size, visitantes: visitantes.size, total: alunos.size + visitantes.size };
}

export function resumirAcessos(acessos: AcessoDia[], hoje: string): ResumoAcessos {
  const desde = (n: number) => somarDias(hoje, -(n - 1));
  const no = (dia: string) => acessos.filter((a) => a.dia === dia);
  return {
    hoje: contar(no(hoje)),
    ontem: contar(no(somarDias(hoje, -1))),
    dias7: contar(acessos.filter((a) => a.dia >= desde(7) && a.dia <= hoje)),
    dias30: contar(acessos.filter((a) => a.dia >= desde(30) && a.dia <= hoje)),
    porDia: Array.from({ length: 7 }, (_, i) => {
      const dia = somarDias(hoje, i - 6);
      return { dia, ...contar(no(dia)) };
    }),
  };
}
