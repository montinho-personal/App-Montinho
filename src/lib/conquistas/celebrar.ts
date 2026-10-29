// Regras puras da tela “Celebrar conquistas” do personal: filtros por tipo,
// ordem (falta celebrar primeiro, depois as mais recentes), números do topo e
// a mensagem pronta do WhatsApp (primeiro nome, sem pronome, com o troféu).

export type ConquistaCelebrar = { id: string; alunoId: string; codigo: string; categoria: string; titulo: string; data: string; reconhecida: boolean; dispensada?: boolean };

/** Filtros por tipo de conquista (o personal vê o que importa celebrar). */
export const TIPOS_CELEBRAR: Array<{ v: string; l: string; ok: (c: Pick<ConquistaCelebrar, "codigo" | "categoria">) => boolean }> = [
  { v: "", l: "Todos os tipos", ok: () => true },
  { v: "medalhas", l: "Novas medalhas", ok: (c) => c.codigo !== "recorde" && c.codigo !== "eu_voltei" },
  { v: "metas", l: "Metas e constância", ok: (c) => c.categoria === "constancia" },
  { v: "retornos", l: "Retornos após pausa", ok: (c) => c.categoria === "retomada" },
  { v: "marcos", l: "Marcos de acompanhamento", ok: (c) => ["acompanhamento", "pratica", "comeco"].includes(c.categoria) },
  { v: "recordes", l: "Recordes pessoais", ok: (c) => c.codigo === "recorde" },
];

export type Situacao = "todas" | "falta" | "celebradas" | "dispensadas";

/** Falta celebrar primeiro; dentro de cada grupo, a mais recente primeiro. */
export function ordenarParaCelebrar<T extends Pick<ConquistaCelebrar, "reconhecida" | "data">>(lista: T[]): T[] {
  return [...lista].sort((a, b) => Number(a.reconhecida) - Number(b.reconhecida) || (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));
}

export function filtrarParaCelebrar<T extends ConquistaCelebrar>(lista: T[], f: { tipo?: string; alunoId?: string; situacao?: Situacao }): T[] {
  const ok = TIPOS_CELEBRAR.find((t) => t.v === (f.tipo ?? ""))?.ok ?? (() => true);
  return lista.filter(
    (c) =>
      (!f.alunoId || c.alunoId === f.alunoId) &&
      ok(c) &&
      (f.situacao === "dispensadas"
        ? !!c.dispensada
        : !c.dispensada && (!f.situacao || f.situacao === "todas" || (f.situacao === "falta" ? !c.reconhecida : c.reconhecida))),
  );
}

export function resumoCelebrar(lista: Array<Pick<ConquistaCelebrar, "alunoId" | "reconhecida" | "dispensada">>) {
  const celebradas = lista.filter((c) => c.reconhecida).length;
  const dispensadas = lista.filter((c) => c.dispensada && !c.reconhecida).length;
  return { total: lista.length, alunos: new Set(lista.map((c) => c.alunoId)).size, celebradas, dispensadas, falta: lista.length - celebradas - dispensadas };
}

/** “Falta celebrar” com mais de `dias` dias: candidatas a dispensar de uma vez (não inundar o aluno de mensagens antigas). */
export function antigasParaDispensar<T extends Pick<ConquistaCelebrar, "reconhecida" | "dispensada" | "data">>(lista: T[], agoraMs: number, dias = 7): T[] {
  const limite = agoraMs - dias * 86_400_000;
  return lista.filter((c) => !c.reconhecida && !c.dispensada && Date.parse(c.data) < limite);
}

export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] || nome;

/** Mensagem pronta do WhatsApp: chama pelo primeiro nome e cita o troféu. */
export function mensagemWhatsConquista(nome: string, titulo: string, codigo?: string): string {
  const n = primeiroNome(nome);
  const o = codigo === "recorde" ? `o recorde pessoal (${titulo})` : `o troféu “${titulo}”`;
  return `Fala, ${n}! Vi no app que saiu ${o}. Parabéns! 🏆\n\nIsso é resultado da constância, ${n}. Bora para o próximo! 💪`;
}
