// Caminho da página para o Google Analytics sem nada que identifique alguém:
// ids (uuid, números longos, códigos de convite) viram “:id” e a parte depois
// do “?” (onde ficam tokens de login) nunca é enviada. Depois de pastas que
// sempre levam um id (aluno, treino, aula…), o pedaço vira “:id” mesmo que
// não pareça um uuid — só “novo” continua, por ser tela fixa.
const SEGUIDOS_DE_ID = new Set(["alunos", "treino", "meus-treinos", "descobertas", "aula"]);

export function caminhoAnonimo(pathname: string): string {
  const semQuery = pathname.split(/[?#]/)[0] || "/";
  return semQuery
    .split("/")
    .map((parte, i, partes) => {
      if (!parte) return parte;
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parte)) return ":id";
      if (/^\d{3,}$/.test(parte)) return ":id";
      if (partes[i - 1] === "convite") return ":codigo";
      if (SEGUIDOS_DE_ID.has(partes[i - 1]) && parte !== "novo") return ":id";
      if (parte.length > 40) return ":id";
      return parte;
    })
    .join("/");
}
