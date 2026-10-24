// Código opaco do link compartilhado de cada aluno (só no servidor). É o mesmo
// que o banco calcula em meus_eventos_compartilhar(): md5(id || ':chalala'),
// 12 primeiros caracteres. Não identifica a pessoa para quem abre o link.
import { createHash } from "node:crypto";

export const codigoDoLink = (alunoId: string) => createHash("md5").update(`${alunoId}:chalala`).digest("hex").slice(0, 12);
