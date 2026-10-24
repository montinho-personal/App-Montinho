// ============================================================================
// Desafios entre alunos (pedido do Montinho, 24/10/2026). Puro e testável.
//
// Só o que o app mede sozinho, para ninguém precisar provar nada:
//  • mais_treinos — ganha quem fizer mais treinos no período;
//  • meta_fixa    — quem chegar a N treinos até o fim cumpre (todos podem);
//  • semanas      — N treinos por semana em TODAS as semanas do período;
//  • madrugador   — mais treinos começados antes das 6h (Brasília).
// Conta treino concluído com séries, no máximo 1 por dia (horário de Brasília).
// Nada de quilos: não favorece quem já é mais forte.
// ============================================================================

export type TipoDesafio = "mais_treinos" | "meta_fixa" | "semanas" | "madrugador";

export const TIPOS_DESAFIO: Record<TipoDesafio, { titulo: string; emoji: string; descricao: string; pedeMeta: boolean; metaPadrao: number | null; rotuloMeta: string | null }> = {
  mais_treinos: { titulo: "Quem treina mais", emoji: "🏋️", descricao: "Ganha quem fizer mais treinos no período.", pedeMeta: false, metaPadrao: null, rotuloMeta: null },
  meta_fixa: { titulo: "Meta de treinos", emoji: "🎯", descricao: "Todo mundo que chegar à meta até o fim cumpre o desafio.", pedeMeta: true, metaPadrao: 12, rotuloMeta: "treinos no período" },
  semanas: { titulo: "Semana em dia", emoji: "📅", descricao: "Cumpre quem treinar o combinado em todas as semanas.", pedeMeta: true, metaPadrao: 3, rotuloMeta: "treinos por semana" },
  madrugador: { titulo: "Madrugadores", emoji: "🌅", descricao: "Ganha quem fizer mais treinos começados antes das 6h.", pedeMeta: false, metaPadrao: null, rotuloMeta: null },
};

export const DURACOES_DESAFIO = [7, 14, 30] as const;
export const LIMITES_DESAFIO = { participantes: 30, horaMadrugada: 6, desafiosParaNato: 3 } as const;

const DIA = 86_400_000;
const FUSO = -3 * 3_600_000; // Brasília (sem horário de verão)

/** "2026-10-24" do instante, no horário de Brasília. */
export function diaBrasilia(iso: string | Date): string {
  const t = (typeof iso === "string" ? Date.parse(iso) : iso.getTime()) + FUSO;
  return new Date(t).toISOString().slice(0, 10);
}
const horaBrasilia = (iso: string) => new Date(Date.parse(iso) + FUSO).getUTCHours();
const somarDias = (dia: string, n: number) => new Date(Date.parse(`${dia}T00:00:00Z`) + n * DIA).toISOString().slice(0, 10);

/** Código do link: 6 letras/números sem 0/O e 1/I. */
export function gerarCodigoDesafio(aleatorio: () => number = Math.random): string {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += a[Math.floor(aleatorio() * a.length)];
  return s;
}

export type DesafioBase = { tipo: TipoDesafio; meta: number | null; inicio: string; fim: string };
export type ParticipanteDados = { alunoId: string; nome: string; status: "convidado" | "aceito" | "recusado"; eu: boolean; criador: boolean; treinos: string[] };
export type LinhaPlacar = {
  alunoId: string;
  nome: string;
  eu: boolean;
  criador: boolean;
  /** Número principal do placar (treinos, treinos de madrugada ou semanas cumpridas). */
  pontos: number;
  /** Texto do número (“5 treinos”, “2 de 3 semanas”). */
  rotulo: string;
  posicao: number;
  cumpriu: boolean;
};

/** Semanas do período (blocos de 7 dias a partir do início; a última pode ser menor e só conta se for completa). */
export function semanasDoDesafio(inicio: string, fim: string): Array<{ inicio: string; fim: string }> {
  const out: Array<{ inicio: string; fim: string }> = [];
  for (let d = inicio; d <= fim; d = somarDias(d, 7)) {
    const f = somarDias(d, 6);
    if (f <= fim) out.push({ inicio: d, fim: f });
  }
  return out.length ? out : [{ inicio, fim }];
}

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

/** Placar dos que aceitaram. `hoje` define se o desafio já acabou (para “cumpriu”/campeão). */
export function placarDesafio(d: DesafioBase, participantes: ParticipanteDados[]): LinhaPlacar[] {
  const aceitos = participantes.filter((p) => p.status === "aceito");
  const semanas = semanasDoDesafio(d.inicio, d.fim);
  const linhas = aceitos.map((p) => {
    const dias = [...new Set(p.treinos.map(diaBrasilia).filter((x) => x >= d.inicio && x <= d.fim))];
    let pontos = dias.length;
    let rotulo = plural(pontos, "treino", "treinos");
    let cumpriu = false;
    if (d.tipo === "madrugador") {
      const cedo = new Set(p.treinos.filter((t) => horaBrasilia(t) < LIMITES_DESAFIO.horaMadrugada).map(diaBrasilia).filter((x) => x >= d.inicio && x <= d.fim));
      pontos = cedo.size;
      rotulo = `${plural(pontos, "treino", "treinos")} antes das 6h`;
    } else if (d.tipo === "meta_fixa") {
      const meta = d.meta ?? 1;
      rotulo = `${Math.min(pontos, meta)} de ${meta} treinos`;
      cumpriu = pontos >= meta;
    } else if (d.tipo === "semanas") {
      const meta = d.meta ?? 1;
      const ok = semanas.filter((w) => dias.filter((x) => x >= w.inicio && x <= w.fim).length >= meta).length;
      pontos = ok;
      rotulo = `${ok} de ${plural(semanas.length, "semana", "semanas")}`;
      cumpriu = ok === semanas.length;
    }
    return { alunoId: p.alunoId, nome: p.nome, eu: p.eu, criador: p.criador, pontos, rotulo, posicao: 0, cumpriu, desempate: dias.length };
  });
  linhas.sort((a, b) => b.pontos - a.pontos || b.desempate - a.desempate || a.nome.localeCompare(b.nome, "pt-BR"));
  let pos = 0;
  linhas.forEach((l, i) => {
    if (i === 0 || l.pontos !== linhas[i - 1].pontos || l.desempate !== linhas[i - 1].desempate) pos = i + 1;
    l.posicao = pos;
  });
  // Disputa (mais treinos/madrugador): campeão(ões) = 1º lugar com pelo menos 1 ponto e 2+ participantes.
  if (d.tipo === "mais_treinos" || d.tipo === "madrugador") for (const l of linhas) l.cumpriu = l.posicao === 1 && l.pontos > 0 && linhas.length >= 2;
  return linhas.map(({ desempate: _d, ...l }) => (void _d, l));
}

export type SituacaoDesafio = "agendado" | "andamento" | "encerrado";
export function situacaoDesafio(d: { inicio: string; fim: string; cancelado: boolean }, hoje: string): SituacaoDesafio {
  if (d.cancelado || hoje > d.fim) return "encerrado";
  return hoje < d.inicio ? "agendado" : "andamento";
}

/** Texto curto da regra (“Quem treina mais · 24/10 a 06/11”). */
export function resumoDesafio(d: DesafioBase): string {
  const t = TIPOS_DESAFIO[d.tipo];
  const br = (x: string) => x.split("-").reverse().slice(0, 2).join("/");
  const meta = d.tipo === "meta_fixa" ? ` · meta de ${d.meta} treinos` : d.tipo === "semanas" ? ` · ${d.meta}× por semana` : "";
  return `${t.titulo}${meta} · ${br(d.inicio)} a ${br(d.fim)}`;
}

/** Mensagem do convite no WhatsApp (link com o código). */
export function mensagemConviteDesafio(p: { nome: string; criador: string; resumo: string; link: string }): string {
  return [`Olá! Bora encarar um desafio no app do Montinho? 💪`, `“${p.nome}” — ${p.resumo}`, `Entra por aqui: ${p.link}`].join("\n\n");
}

// ---------------------------------------------------------------------------
// Troféus dos desafios (para a sala de troféus)
// ---------------------------------------------------------------------------
export type ResultadoDesafio = { id: string; fim: string; souCriador: boolean; aceitos: number; venci: boolean; cumpri: boolean; aceitei: boolean };
export type MarcosDesafios = { criador: string | null; campeao: string | null; palavra: string | null; nato: string | null; ids: { criador: string | null; campeao: string | null; palavra: string | null; nato: string | null } };

/** Datas (fim do desafio) em que cada troféu foi ganho; só desafios já encerrados. */
export function marcosDesafios(rs: ResultadoDesafio[]): MarcosDesafios {
  const enc = [...rs].sort((a, b) => (a.fim < b.fim ? -1 : 1));
  const primeiro = (f: (r: ResultadoDesafio) => boolean) => enc.find(f) ?? null;
  const criador = primeiro((r) => r.souCriador && r.aceitos >= 2);
  const campeao = primeiro((r) => r.venci);
  const palavra = primeiro((r) => r.cumpri);
  const nato = enc.filter((r) => r.aceitei)[LIMITES_DESAFIO.desafiosParaNato - 1] ?? null;
  return {
    criador: criador?.fim ?? null,
    campeao: campeao?.fim ?? null,
    palavra: palavra?.fim ?? null,
    nato: nato?.fim ?? null,
    ids: { criador: criador?.id ?? null, campeao: campeao?.id ?? null, palavra: palavra?.id ?? null, nato: nato?.id ?? null },
  };
}
