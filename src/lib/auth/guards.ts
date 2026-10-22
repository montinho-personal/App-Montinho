// Regras puras de autorização (testáveis sem rede).

export type Papel = "treinador" | "aluno";

export type SessaoApp =
  | { mode: "live" | "demo"; userId: string; nome: string; role: "treinador"; alunoId: null }
  | { mode: "live" | "demo"; userId: string; nome: string; role: "aluno"; alunoId: string; modalidade?: "consultoria" | "visitante"; acessoFim?: string | null };

/** Visitante (Modo Visitante, 0052)? Alunos da consultoria e treinador: false. */
export function ehVisitante(sessao: SessaoApp | null): boolean {
  return sessao?.role === "aluno" && sessao.modalidade === "visitante";
}

/** Treinador acessa qualquer aluno; aluno só o próprio cadastro. */
export function podeAcessarAluno(sessao: SessaoApp | null, alunoId: string | null | undefined): boolean {
  if (!sessao || !alunoId) return false;
  if (sessao.role === "treinador") return true;
  return sessao.alunoId === alunoId;
}

/** Decide o destino de uma rota privada para o papel atual. Retorna null quando permitido. */
export function redirecionamentoPorPapel(role: Papel | null, pathname: string): string | null {
  if (!role) return `/login?next=${encodeURIComponent(pathname)}`;
  if (pathname.startsWith("/treinador") && role !== "treinador") return "/aluno";
  if (pathname.startsWith("/aluno") && role !== "aluno") return "/treinador";
  return null;
}

/** Caminho do storage privado pertence ao aluno? Estrutura esperada: <aluno_id>/arquivo */
export function caminhoStoragePermitido(sessao: SessaoApp | null, caminho: string): boolean {
  if (!sessao) return false;
  if (sessao.role === "treinador") return true;
  const pasta = caminho.split("/")[0];
  return pasta === sessao.alunoId;
}

/** Converte a identidade de demo guardada no cookie em sessão. Retorna null se inválida. */
export function sessaoDoCookieDemo(
  valor: string | undefined,
  personas: Array<{ chave: string; userId: string; nome: string; role: Papel; alunoId: string | null }>
): SessaoApp | null {
  if (!valor) return null;
  const p = personas.find((x) => x.chave === valor);
  if (!p) return null;
  if (p.role === "treinador") return { mode: "demo", userId: p.userId, nome: p.nome, role: "treinador", alunoId: null };
  if (!p.alunoId) return null;
  return { mode: "demo", userId: p.userId, nome: p.nome, role: "aluno", alunoId: p.alunoId };
}
