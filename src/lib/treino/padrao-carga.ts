// Como o aluno anota o peso (0070) e o lembrete do “mesmo aparelho”.
// Anilhas (barra, Smith, leg press/hack de anilha): soma dos dois lados ou só um lado.
// Halteres: os dois halteres somados ou o peso de um halter.
// Regras puras: a tela só pergunta e mostra o rótulo certo na coluna da carga.

export type ModoCarga = "total" | "por_lado";
export type TipoPeso = "anilhas" | "halteres";
export type PadraoCarga = { anilhas: ModoCarga | null; halteres: ModoCarga | null };

export const PADRAO_CARGA_VAZIO: PadraoCarga = { anilhas: null, halteres: null };

const EQUIP_ANILHAS = new Set(["barra", "barra_w", "smith", "anilha"]);
// Leg press 45° e hack costumam ser carregados com anilhas dos dois lados.
const NOME_ANILHAS = /leg ?press 45|hack/i;
// Um halter só (ou um braço por vez): não existe “os dois” para somar.
const UM_HALTER = /unilateral|goblet|franc[eê]s|serrote|pull ?over|um halter|1 halter/i;

const sem = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Qual escolha vale para o exercício (ou null: máquina, polia, peso do corpo…). */
export function tipoDePeso(ex: { nome: string; equipamento?: readonly string[] | null; unilateral?: boolean | null }): TipoPeso | null {
  const eq = ex.equipamento ?? [];
  const nome = sem(ex.nome);
  if (eq.includes("halter")) return ex.unilateral || UM_HALTER.test(nome) ? null : "halteres";
  if (eq.some((e) => EQUIP_ANILHAS.has(e)) || NOME_ANILHAS.test(nome)) return "anilhas";
  return null;
}

export const OPCOES_CARGA: Record<TipoPeso, { pergunta: string; total: { titulo: string; exemplo: string }; por_lado: { titulo: string; exemplo: string } }> = {
  anilhas: {
    pergunta: "Com anilhas (barra, Smith, leg press), como você anota o peso?",
    total: { titulo: "Somo os dois lados", exemplo: "10 kg de cada lado → anoto 20" },
    por_lado: { titulo: "Só um lado", exemplo: "10 kg de cada lado → anoto 10" },
  },
  halteres: {
    pergunta: "Com halteres, como você anota o peso?",
    total: { titulo: "Somo os dois halteres", exemplo: "3 kg em cada mão → anoto 6" },
    por_lado: { titulo: "Peso de um halter", exemplo: "3 kg em cada mão → anoto 3" },
  },
};

/** Rótulo da coluna de carga conforme a escolha do aluno. */
export function rotuloColunaCarga(tipo: TipoPeso | null, modo: ModoCarga | null): string {
  if (!tipo || !modo) return "Carga (kg)";
  if (tipo === "anilhas") return modo === "total" ? "Total (kg)" : "Por lado (kg)";
  return modo === "total" ? "2 halteres (kg)" : "1 halter (kg)";
}

/** Frase curta do padrão escolhido (aparece ao lado do exercício). */
export function resumoPadrao(tipo: TipoPeso, modo: ModoCarga): string {
  return OPCOES_CARGA[tipo][modo].exemplo;
}

export const LEMBRETE_APARELHO = {
  titulo: "Anote sempre no mesmo aparelho",
  texto: "Máquina de outra marca ou outra academia muda o peso, mesmo sendo o mesmo exercício. Hoje em outro aparelho? Marque “Outro aparelho hoje”: você registra as repetições e a sua carga de referência continua a mesma.",
};

const SEM_CARGA = new Set(["peso_corporal", "barra_fixa", "paralelas", "trx", "bola", "roda"]);
/** Exercício em que se anota carga (o lembrete do aparelho não aparece em flexão, prancha…). */
export function anotaCarga(equipamento: readonly string[] | null | undefined): boolean {
  const eq = equipamento ?? [];
  return eq.length === 0 || eq.some((e) => !SEM_CARGA.has(e));
}
