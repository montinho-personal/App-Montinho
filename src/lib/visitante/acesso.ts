// ============================================================================
// Modo Visitante — regras puras de convite e acesso (sem rede, testáveis).
//
// O visitante é um aluno com modalidade "visitante". O prazo vem do convite:
//  • "permanente" → sem fim;
//  • "dias"       → N dias a partir do cadastro (padrão 30);
//  • "ate_data"   → até o fim do dia indicado (horário de Brasília).
// Acesso vencido = treino travado (o banco barra em pode_registrar()); o app
// fica aberto só para ver (evolução, ranking, conquistas) por mais
// DIAS_APP_APOS_FIM dias, com a oferta para fechar o plano em toda tela.
// Depois disso, o app fecha: só a tela de oferta (pedido do Montinho, 24/10/2026).
// ============================================================================

export type TipoAcesso = "permanente" | "dias" | "ate_data";
export type Modalidade = "consultoria" | "visitante";

export const DIAS_PADRAO = 30;
/** Avisar o visitante quando faltar isto ou menos. */
export const DIAS_AVISO = 5;
/** Dias em que o app continua aberto (só para ver) depois do fim do acesso. */
export const DIAS_APP_APOS_FIM = 7;

export type ConviteRegra = {
  codigo: string;
  tipo_acesso: TipoAcesso;
  dias: number | null;
  acesso_ate: string | null;
  max_usos: number | null;
  usos: number;
  valido_ate: string | null;
  ativo: boolean;
};

export type EstadoAcesso =
  | { estado: "permanente" }
  | { estado: "ativo"; fim: string; diasRestantes: number }
  | { estado: "vencendo"; fim: string; diasRestantes: number }
  | { estado: "vencido"; fim: string };

const DIA_MS = 86_400_000;

/** Código digitado pela pessoa → formato guardado (maiúsculas, sem espaços). */
export function normalizarCodigo(bruto: string): string {
  return bruto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

export function codigoValido(codigo: string): boolean {
  return /^[A-Z0-9-]{4,32}$/.test(codigo);
}

/** Sugestão de código legível: PREFIXO-XXXX (sem 0/O e 1/I, que confundem). */
export function gerarCodigo(prefixo = "MONTINHO", aleatorio: () => number = Math.random): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let sufixo = "";
  for (let i = 0; i < 4; i++) sufixo += alfabeto[Math.floor(aleatorio() * alfabeto.length)];
  const base = normalizarCodigo(prefixo).slice(0, 27) || "MONTINHO";
  return `${base}-${sufixo}`;
}

export type MotivoConviteInvalido = "inexistente" | "inativo" | "expirado" | "esgotado";

/** O convite ainda aceita cadastro? */
export function situacaoConvite(c: ConviteRegra | null, agora: Date = new Date()): { ok: true } | { ok: false; motivo: MotivoConviteInvalido } {
  if (!c) return { ok: false, motivo: "inexistente" };
  if (!c.ativo) return { ok: false, motivo: "inativo" };
  if (c.valido_ate && new Date(c.valido_ate).getTime() <= agora.getTime()) return { ok: false, motivo: "expirado" };
  if (c.max_usos != null && c.usos >= c.max_usos) return { ok: false, motivo: "esgotado" };
  return { ok: true };
}

export const MENSAGEM_CONVITE: Record<MotivoConviteInvalido, string> = {
  inexistente: "Não encontramos esse código. Confira se digitou certinho.",
  inativo: "Esse convite foi encerrado.",
  expirado: "O prazo desse convite já terminou.",
  esgotado: "As vagas desse convite já foram preenchidas.",
};

/** Fim do acesso para quem se cadastra agora com este convite (null = permanente). */
export function fimDoAcesso(c: Pick<ConviteRegra, "tipo_acesso" | "dias" | "acesso_ate">, inicio: Date = new Date()): Date | null {
  if (c.tipo_acesso === "permanente") return null;
  if (c.tipo_acesso === "ate_data" && c.acesso_ate) {
    // Fim do dia em Brasília (UTC−3): 23:59:59 local = 02:59:59 UTC do dia seguinte.
    const [a, m, d] = c.acesso_ate.split("-").map(Number);
    return new Date(Date.UTC(a, m - 1, d + 1, 2, 59, 59));
  }
  return new Date(inicio.getTime() + (c.dias ?? DIAS_PADRAO) * DIA_MS);
}

export function estadoDoAcesso(fim: string | null, agora: Date = new Date()): EstadoAcesso {
  if (!fim) return { estado: "permanente" };
  const restante = new Date(fim).getTime() - agora.getTime();
  if (restante <= 0) return { estado: "vencido", fim };
  const diasRestantes = Math.ceil(restante / DIA_MS);
  return diasRestantes <= DIAS_AVISO ? { estado: "vencendo", fim, diasRestantes } : { estado: "ativo", fim, diasRestantes };
}

/** Quando o app fecha para o visitante (fim do acesso + DIAS_APP_APOS_FIM). */
export function fechamentoDoApp(fim: string | null): string | null {
  return fim ? new Date(Date.parse(fim) + DIAS_APP_APOS_FIM * DIA_MS).toISOString() : null;
}

/** Passou do fim + os dias de vitrine: o app mostra só a tela de oferta. */
export function appEncerrado(fim: string | null, agora: Date = new Date()): boolean {
  const f = fechamentoDoApp(fim);
  return !!f && agora.getTime() > Date.parse(f);
}

/** Pode iniciar treino novo? (espelha public.pode_registrar() do banco) */
export function podeRegistrar(modalidade: Modalidade, fim: string | null, agora: Date = new Date()): boolean {
  return modalidade === "consultoria" || estadoDoAcesso(fim, agora).estado !== "vencido";
}

export function descreverPrazo(c: Pick<ConviteRegra, "tipo_acesso" | "dias" | "acesso_ate">): string {
  if (c.tipo_acesso === "permanente") return "Acesso sem prazo";
  if (c.tipo_acesso === "ate_data" && c.acesso_ate) return `Acesso até ${c.acesso_ate.split("-").reverse().join("/")}`;
  const n = c.dias ?? DIAS_PADRAO;
  return `${n} ${n === 1 ? "dia" : "dias"} de acesso`;
}

export function dataBR(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}
