// ============================================================================
// WOD por foto/print/PDF (pedido do Montinho, 01/11/2026): a IA só TRANSCREVE
// o quadro/arquivo num JSON simples; aqui (PURO) viram os blocos do app, com
// limites, formatos conhecidos e os movimentos casados com a biblioteca quando
// o nome bate. A pessoa confere tudo antes de começar.
// ============================================================================
import { indicePorNome } from "@/lib/biblioteca/itens";
import { normalizarNome } from "@/lib/grupos";
import { normalizarBlocos, novoBloco } from "./blocos";
import { FORMATOS, LIMITES_BLOCOS, TIPOS_BLOCO, type BlocoTreino, type Formato, type MovimentoBloco, type TipoBloco } from "./tipos";

export type MovimentoLido = { nome?: unknown; reps?: unknown; carga?: unknown; distancia_m?: unknown; calorias?: unknown; scaled?: unknown };
export type BlocoLido = { tipo?: unknown; formato?: unknown; titulo?: unknown; minutos?: unknown; rounds?: unknown; time_cap_min?: unknown; intervalo_seg?: unknown; trabalho_seg?: unknown; descanso_seg?: unknown; esquema?: unknown; texto?: unknown; movimentos?: unknown };
export type LeituraWod = { modalidade?: unknown; titulo?: unknown; blocos?: unknown };
export type WodLido = { modalidade: "cross" | "hyrox" | "funcional" | "hibrido"; titulo: string | null; blocos: BlocoTreino[] };

const txt = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : typeof v === "number" && Number.isFinite(v) ? String(v) : null);
const num = (v: unknown, min: number, max: number) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN;
  return Number.isFinite(n) && n >= min ? Math.min(max, Math.round(n)) : null;
};
const MODAIS = ["cross", "hyrox", "funcional", "hibrido"] as const;

function movimento(m: MovimentoLido, indice: ReturnType<typeof indicePorNome<{ id: string; nome: string; sinonimos: string[] }>>): MovimentoBloco | null {
  const nome = txt(m?.nome, 80);
  if (!nome) return null;
  const item = indice.get(normalizarNome(nome));
  return {
    biblioteca_id: item?.id ?? null,
    nome: item?.nome ?? nome,
    reps: txt(m.reps, 40),
    carga: txt(m.carga, 40),
    distancia_m: num(m.distancia_m, 1, 50000),
    calorias: num(m.calorias, 1, 2000),
    scaled: txt(m.scaled, 80),
  };
}

/** JSON lido pela IA → blocos do app. Sem nada aproveitável = null. */
export function wodDaLeitura(leitura: LeituraWod | null | undefined, itens: Array<{ id: string; nome: string; sinonimos: string[] }> = []): WodLido | null {
  if (!leitura || !Array.isArray(leitura.blocos)) return null;
  const indice = indicePorNome(itens);
  const blocos: BlocoTreino[] = [];
  for (const raw of leitura.blocos.slice(0, LIMITES_BLOCOS.maxBlocos) as BlocoLido[]) {
    if (!raw || typeof raw !== "object") continue;
    let tipo = (typeof raw.tipo === "string" && raw.tipo in TIPOS_BLOCO ? raw.tipo : "metcon") as TipoBloco;
    const movs = (Array.isArray(raw.movimentos) ? (raw.movimentos as MovimentoLido[]) : []).slice(0, LIMITES_BLOCOS.maxMovimentos).map((m) => movimento(m, indice)).filter((m): m is MovimentoBloco => !!m);
    let texto = txt(raw.texto, 1500);
    // Força com séries e carga não cabe no WOD livre: vira texto de técnica, para não perder nada.
    if (tipo === "forca") {
      tipo = "tecnica";
      const linhas = movs.map((m) => [m.nome, m.reps, m.carga].filter(Boolean).join(" "));
      texto = [txt(raw.titulo, 80) ?? "Força", ...linhas, texto].filter(Boolean).join("\n").slice(0, 1500);
    }
    const formato = (typeof raw.formato === "string" && raw.formato in FORMATOS ? raw.formato : null) as Formato | null;
    const b = novoBloco(tipo, blocos, tipo === "metcon" || tipo === "circuito" ? formato ?? (tipo === "metcon" ? "livre" : "circuito") : null);
    const capMin = num(raw.time_cap_min, 1, 180);
    blocos.push({
      ...b,
      titulo: txt(raw.titulo, 80),
      minutos: num(raw.minutos, 1, 180) ?? b.minutos ?? null,
      rounds: num(raw.rounds, 1, 100) ?? b.rounds ?? null,
      time_cap_seg: capMin ? capMin * 60 : b.time_cap_seg ?? null,
      intervalo_seg: num(raw.intervalo_seg, 10, 600) ?? b.intervalo_seg ?? null,
      trabalho_seg: num(raw.trabalho_seg, 5, 600) ?? b.trabalho_seg ?? null,
      descanso_seg: num(raw.descanso_seg, 0, 600) ?? b.descanso_seg ?? null,
      esquema: txt(raw.esquema, 40),
      texto,
      movimentos: tipo === "tecnica" ? [] : movs,
    });
  }
  const finais = normalizarBlocos(blocos).filter((b) => b.movimentos.length || b.texto || b.tipo === "metcon" || b.tipo === "circuito");
  if (!finais.length) return null;
  const modalidade = (MODAIS as readonly string[]).includes(leitura.modalidade as string) ? (leitura.modalidade as WodLido["modalidade"]) : "cross";
  return { modalidade, titulo: txt(leitura.titulo, 80), blocos: finais };
}

/** Demonstração: o caminho completo sem chamar a IA. */
export const LEITURA_EXEMPLO: LeituraWod = {
  modalidade: "cross",
  titulo: "WOD da box",
  blocos: [
    { tipo: "aquecimento", texto: "3 rounds: 200 m de remo, 10 air squats, 10 push-ups" },
    { tipo: "forca", titulo: "Back Squat", movimentos: [{ nome: "Back Squat", reps: "5x5", carga: "70%" }] },
    { tipo: "metcon", formato: "amrap", minutos: 12, movimentos: [{ nome: "Wall Ball", reps: "15", carga: "9/6 kg" }, { nome: "Burpee", reps: "10" }, { nome: "Pull-up", reps: "5", scaled: "com elástico" }] },
  ],
};
