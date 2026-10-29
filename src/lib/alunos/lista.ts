// ============================================================================
// Lista de alunos do personal (pedido do Montinho, 29/10/2026) — regras PURAS:
// busca na hora (nome/sobrenome por pedaço, sem acento, e-mail e telefone só
// pelos números) e ordenação.
// ============================================================================

export type AlunoLista = { id: string; nome: string; email: string | null; telefone: string | null; status: string; inicio: string | null; ultimoTreino: string | null; acessoAte: string | null };

export const ORDENS = [
  { id: "az", rotulo: "A–Z" },
  { id: "novos", rotulo: "Mais novos" },
  { id: "antigos", rotulo: "Mais antigos" },
  { id: "treinou", rotulo: "Treinou por último" },
  { id: "parados", rotulo: "Mais tempo sem treinar" },
  { id: "vence", rotulo: "Acesso vence primeiro" },
] as const;
export type Ordem = (typeof ORDENS)[number]["id"];

const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Todas as palavras digitadas precisam aparecer, em qualquer ordem (“zan bea” acha “Beatriz Zanini”). */
export function bateBusca(a: AlunoLista, consulta: string): boolean {
  const termos = sem(consulta).split(/\s+/).filter(Boolean);
  if (!termos.length) return true;
  const texto = sem(`${a.nome} ${a.email ?? ""}`);
  const digitos = (a.telefone ?? "").replace(/\D/g, "");
  return termos.every((t) => texto.includes(t) || (/^\d+$/.test(t) && digitos.includes(t)));
}

const nomeAZ = (a: AlunoLista, b: AlunoLista) => sem(a.nome).localeCompare(sem(b.nome), "pt-BR");
/** Vazio vai sempre para o fim, nas duas direções. */
const porData = (k: keyof AlunoLista, desc: boolean) => (a: AlunoLista, b: AlunoLista) => {
  const x = a[k] as string | null;
  const y = b[k] as string | null;
  if (!x && !y) return nomeAZ(a, b);
  if (!x) return 1;
  if (!y) return -1;
  return (desc ? y.localeCompare(x) : x.localeCompare(y)) || nomeAZ(a, b);
};

export function ordenarAlunos<T extends AlunoLista>(lista: T[], ordem: Ordem): T[] {
  const xs = [...lista];
  if (ordem === "novos") return xs.sort(porData("inicio", true));
  if (ordem === "antigos") return xs.sort(porData("inicio", false));
  if (ordem === "treinou") return xs.sort(porData("ultimoTreino", true));
  if (ordem === "parados") {
    // Quem nunca treinou primeiro (precisa de atenção), depois o treino mais antigo.
    return xs.sort((a, b) => (!a.ultimoTreino && !b.ultimoTreino ? nomeAZ(a, b) : !a.ultimoTreino ? -1 : !b.ultimoTreino ? 1 : a.ultimoTreino.localeCompare(b.ultimoTreino) || nomeAZ(a, b)));
  }
  if (ordem === "vence") return xs.sort(porData("acessoAte", false));
  return xs.sort(nomeAZ);
}
