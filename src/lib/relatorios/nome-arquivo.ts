// PURO: nome do arquivo do PDF (o navegador usa o título da página ao “Salvar
// como PDF”). Pedido do Montinho, 06/11/2026: nome do aluno + tipo do relatório
// + “Montinho Personal Trainer” aparecendo no arquivo. Sem / \ : * ? " < > |.
export function nomeDoArquivo(tipo: string, nome: string, dataIso: string): string {
  const [a, m, d] = dataIso.slice(0, 10).split("-");
  const limpo = (s: string) => s.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
  return `${limpo(tipo)} - ${limpo(nome) || "Aluno"} - Montinho Personal Trainer - ${d}-${m}-${a}`;
}
