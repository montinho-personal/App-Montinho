// Medidas e avaliações (0078): campos aceitos, limites e arquivos permitidos.
// Fonte única para o formulário, a validação da API e o comparador.

export type ChaveMedida =
  | "peso_kg" | "altura_cm" | "gordura_pct" | "massa_muscular_kg" | "massa_magra_kg" | "gordura_visceral" | "agua_pct"
  | "cintura_cm" | "abdomen_cm" | "quadril_cm" | "peito_cm" | "braco_cm" | "coxa_cm" | "panturrilha_cm";

export type CampoMedida = { chave: ChaveMedida; rotulo: string; unidade: string; min: number; max: number; grupo: "corpo" | "bioimpedancia" | "circunferencias" };

export const CAMPOS_MEDIDA: CampoMedida[] = [
  { chave: "peso_kg", rotulo: "Peso", unidade: "kg", min: 20, max: 350, grupo: "corpo" },
  { chave: "altura_cm", rotulo: "Altura", unidade: "cm", min: 100, max: 250, grupo: "corpo" },
  { chave: "gordura_pct", rotulo: "Gordura", unidade: "%", min: 2, max: 75, grupo: "bioimpedancia" },
  { chave: "massa_muscular_kg", rotulo: "Massa muscular", unidade: "kg", min: 5, max: 150, grupo: "bioimpedancia" },
  { chave: "massa_magra_kg", rotulo: "Massa magra", unidade: "kg", min: 10, max: 200, grupo: "bioimpedancia" },
  { chave: "gordura_visceral", rotulo: "Gordura visceral", unidade: "nível", min: 1, max: 60, grupo: "bioimpedancia" },
  { chave: "agua_pct", rotulo: "Água corporal", unidade: "%", min: 20, max: 80, grupo: "bioimpedancia" },
  { chave: "cintura_cm", rotulo: "Cintura", unidade: "cm", min: 30, max: 250, grupo: "circunferencias" },
  { chave: "abdomen_cm", rotulo: "Abdômen", unidade: "cm", min: 30, max: 250, grupo: "circunferencias" },
  { chave: "quadril_cm", rotulo: "Quadril", unidade: "cm", min: 40, max: 250, grupo: "circunferencias" },
  { chave: "peito_cm", rotulo: "Peito", unidade: "cm", min: 40, max: 250, grupo: "circunferencias" },
  { chave: "braco_cm", rotulo: "Braço", unidade: "cm", min: 10, max: 80, grupo: "circunferencias" },
  { chave: "coxa_cm", rotulo: "Coxa", unidade: "cm", min: 20, max: 120, grupo: "circunferencias" },
  { chave: "panturrilha_cm", rotulo: "Panturrilha", unidade: "cm", min: 15, max: 80, grupo: "circunferencias" },
];

export const GRUPO_MEDIDA: Record<CampoMedida["grupo"], string> = { corpo: "Corpo", bioimpedancia: "Bioimpedância / avaliação", circunferencias: "Circunferências" };

/** Arquivos de avaliação aceitos (PDF, foto, print) e tamanho máximo. */
export const TIPOS_ARQUIVO = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
export const MAX_ARQUIVO_BYTES = 15 * 1024 * 1024;
const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" };

/** Caminho no armazenamento privado: <aluno>/<data>-<aleatório>.<ext> (sem o nome original, que pode ter dado pessoal). */
export function caminhoDoArquivo(alunoId: string, tipo: string, aleatorio: string, data: string): string {
  return `${alunoId}/${data}-${aleatorio.replace(/[^a-z0-9]/gi, "").slice(0, 16)}.${EXT[tipo] ?? "bin"}`;
}

/** “72,5” → 72.5; vazio → null; fora do limite → erro com o nome do campo. */
export function lerMedida(campo: CampoMedida, texto: string): { valor: number | null; erro: string | null } {
  const t = texto.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return { valor: null, erro: null };
  const n = Number(t);
  if (!Number.isFinite(n)) return { valor: null, erro: `${campo.rotulo}: número inválido.` };
  if (n < campo.min || n > campo.max) return { valor: null, erro: `${campo.rotulo}: use um valor entre ${campo.min} e ${campo.max} ${campo.unidade}.` };
  return { valor: Math.round(n * 100) / 100, erro: null };
}
