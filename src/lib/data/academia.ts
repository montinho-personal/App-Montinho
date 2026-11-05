// ============================================================================
// Academia da Tribo — dados (0146). O BANCO conta, corrige e inaugura
// (obra_sincronizar / obra_ativar / obra_ajustar); aqui só lemos pela RLS e
// chamamos as funções. Regras e textos em src/lib/academia/regras.ts.
// Sem a 0146 no banco, tudo volta vazio (a tela avisa que está chegando).
// Na demo: uma obra fictícia em andamento, em memória.
// ============================================================================
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { dataLocal, somarDias } from "@/lib/aderencia/calcular";
import { PRIMEIRA_OBRA, type DadosObra, type ModeloObra, type Obra } from "@/lib/academia/regras";

export type Participante = { nome: string; kg: number | null; treinos: number; eu: boolean };
export type SemanaRitmo = { semana: string; treinos: number; pessoas: number; kg: number };
export type SerieConferir = { set_id: string; session_id: string; aluno: string | null; exercicio: string; carga: number | null; reps: number | null; treino_em: string };
export type Ajuste = { id: string; kg: number; motivo: string; em: string };
export type RascunhoObra = { nome: string; modelo: ModeloObra; area_m2: number; materiais_t: number; meta_kg: number; banner_dias: number; narrativa: string | null; mostrar_contribuicoes: boolean };

// ---------------------------------------------------------------------------
// Demo
// ---------------------------------------------------------------------------
type DemoAcademia = { obras: Array<DadosObra>; ajustes: Ajuste[] };
const g = globalThis as unknown as { __demoAcademia?: DemoAcademia };
function demo(): DemoAcademia {
  if (!g.__demoAcademia) {
    const hoje = dataLocal(new Date());
    const ativada = new Date(Date.now() - 12 * 86_400_000).toISOString();
    const por_dia = Array.from({ length: 12 }, (_, i) => ({ dia: somarDias(hoje, -11 + i), kg: 120_000 + ((i * 37) % 9) * 14_000 }));
    const total = por_dia.reduce((t, p) => t + p.kg, 0);
    g.__demoAcademia = {
      obras: [
        {
          id: "demo-obra-1", ordem: 1, modelo: "bairro", nome: PRIMEIRA_OBRA.nome, narrativa: null, area_m2: 200, materiais_t: 200, meta_kg: PRIMEIRA_OBRA.meta_kg,
          banner_dias: 30, mostrar_contribuicoes: true, estado: "ativa", ativada_em: ativada, concluida_em: null,
          total_kg: total, participantes: 11, treinos: Math.round(total / 8200), meu_kg: 168_400, meus_treinos: 21, por_dia,
        },
      ],
      ajustes: [],
    };
  }
  return g.__demoAcademia;
}

const num = (v: unknown) => (v == null ? 0 : Number(v) || 0);
function lerDados(j: Record<string, unknown> | null): DadosObra | null {
  if (!j || !j.id) return null;
  return {
    id: String(j.id), ordem: num(j.ordem), modelo: (j.modelo as ModeloObra) ?? "bairro", nome: String(j.nome ?? ""), narrativa: (j.narrativa as string) ?? null,
    area_m2: num(j.area_m2), materiais_t: num(j.materiais_t), meta_kg: num(j.meta_kg), banner_dias: num(j.banner_dias), mostrar_contribuicoes: j.mostrar_contribuicoes !== false,
    estado: (j.estado as Obra["estado"]) ?? "rascunho", ativada_em: (j.ativada_em as string) ?? null, concluida_em: (j.concluida_em as string) ?? null,
    total_kg: num(j.total_kg), participantes: num(j.participantes), treinos: num(j.treinos), meu_kg: num(j.meu_kg), meus_treinos: num(j.meus_treinos),
    por_dia: Array.isArray(j.por_dia) ? (j.por_dia as Array<{ dia: string; kg: unknown }>).map((p) => ({ dia: String(p.dia), kg: num(p.kg) })) : [],
  };
}

// ---------------------------------------------------------------------------
// Leitura (aluno e personal)
// ---------------------------------------------------------------------------
/** A obra em andamento (ou a última inaugurada); com id, aquela obra. */
export async function dadosDaObra(id?: string | null): Promise<DadosObra | null> {
  if (isDemoMode()) {
    const d = demo();
    return (id ? d.obras.find((o) => o.id === id) : d.obras.find((o) => o.estado === "ativa") ?? d.obras.find((o) => o.estado === "concluida")) ?? null;
  }
  const db = await getDb();
  const { data, error } = await db.rpc("obra_dados", { p_obra: id ?? null });
  if (error) return null;
  return lerDados(data as Record<string, unknown> | null);
}

/** Todas as obras que a pessoa pode ver (o personal vê também os rascunhos). */
export async function listarObras(): Promise<Obra[]> {
  if (isDemoMode()) return demo().obras.map((o) => ({ id: o.id, ordem: o.ordem, modelo: o.modelo, nome: o.nome, narrativa: o.narrativa, area_m2: o.area_m2, materiais_t: o.materiais_t, meta_kg: o.meta_kg, banner_dias: o.banner_dias, mostrar_contribuicoes: o.mostrar_contribuicoes, estado: o.estado, ativada_em: o.ativada_em, concluida_em: o.concluida_em }));
  const db = await getDb();
  const { data, error } = await db.from("obras").select("id, ordem, modelo, nome, narrativa, area_m2, materiais_t, meta_kg, banner_dias, mostrar_contribuicoes, estado, ativada_em, concluida_em").order("ordem");
  if (error) return [];
  return ((data ?? []) as Array<Record<string, unknown>>).map((o) => ({ ...(o as unknown as Obra), area_m2: num(o.area_m2), materiais_t: num(o.materiais_t), meta_kg: num(o.meta_kg) }));
}

export async function participantesDaObra(id: string): Promise<Participante[]> {
  if (isDemoMode()) {
    const nomes = ["Aline S.", "Atleta da Tribo", "João P.", "Marina C.", "Rafael L.", "Camila R.", "Bia T.", "Atleta da Tribo", "Denis M.", "Natália S.", "Carol F."];
    return nomes.map((nome, i) => ({ nome, kg: 260_000 - i * 17_000, treinos: 28 - i * 2, eu: i === 0 }));
  }
  const db = await getDb();
  const { data, error } = await db.rpc("obra_participantes_lista", { p_obra: id });
  if (error) return [];
  return ((data ?? []) as Array<{ nome: string; kg: number | null; treinos: number; eu: boolean }>).map((p) => ({ nome: p.nome, kg: p.kg == null ? null : num(p.kg) * 1, treinos: num(p.treinos), eu: !!p.eu }));
}

/** No fim do treino: o banco confere se vale e registra (sem a 0146, nada acontece). */
export async function sincronizarObra(sessionId: string): Promise<void> {
  if (isDemoMode()) return;
  const db = await getDb();
  await db.rpc("obra_sincronizar", { p_session: sessionId });
}

// ---------------------------------------------------------------------------
// Personal
// ---------------------------------------------------------------------------
export async function ritmoSemanal(semanas = 8): Promise<SemanaRitmo[]> {
  if (isDemoMode()) {
    const seg = (d: number) => somarDias(dataLocal(new Date()), -d);
    return [5, 4, 3, 2, 1, 0].map((w) => ({ semana: seg(w * 7), treinos: 30 + w, pessoas: 12, kg: 290_000 + (5 - w) * 25_000 }));
  }
  const db = await getDb();
  const { data, error } = await db.rpc("obra_ritmo_semanal", { p_semanas: semanas });
  if (error) return [];
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({ semana: String(r.semana), treinos: num(r.treinos), pessoas: num(r.pessoas), kg: num(r.kg) }));
}

export async function paraConferir(obraId: string): Promise<SerieConferir[]> {
  if (isDemoMode()) return [];
  const db = await getDb();
  const { data, error } = await db.rpc("obra_para_conferir", { p_obra: obraId });
  if (error) return [];
  return (data ?? []) as SerieConferir[];
}

export async function ajustesDaObra(obraId: string): Promise<Ajuste[]> {
  if (isDemoMode()) return demo().ajustes;
  const db = await getDb();
  const { data } = await db.from("obra_ajustes").select("id, kg, motivo, em").eq("obra_id", obraId).order("em", { ascending: false });
  return ((data ?? []) as Array<Record<string, unknown>>).map((a) => ({ id: String(a.id), kg: num(a.kg), motivo: String(a.motivo), em: String(a.em) }));
}

export async function salvarRascunho(r: RascunhoObra, id?: string | null): Promise<string> {
  if (isDemoMode()) {
    const d = demo();
    const atual = id ? d.obras.find((o) => o.id === id) : null;
    if (atual) {
      if (atual.estado !== "rascunho") throw new Error("Obra já ativada: só dá para mudar os dias do destaque.");
      Object.assign(atual, r);
      return atual.id;
    }
    const nova: DadosObra = { id: `demo-obra-${d.obras.length + 1}`, ordem: Math.max(0, ...d.obras.map((o) => o.ordem)) + 1, ...r, estado: "rascunho", ativada_em: null, concluida_em: null, total_kg: 0, participantes: 0, treinos: 0, meu_kg: 0, meus_treinos: 0, por_dia: [] };
    d.obras.push(nova);
    return nova.id;
  }
  const db = await getDb();
  if (id) {
    const { error } = await db.from("obras").update(r).eq("id", id).eq("estado", "rascunho");
    if (error) throw new Error(error.message);
    return id;
  }
  const { data: ult } = await db.from("obras").select("ordem").order("ordem", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await db.from("obras").insert({ ...r, ordem: num((ult as { ordem?: number } | null)?.ordem) + 1 }).select("id").single();
  if (error) throw new Error(error.message);
  return String((data as { id: string }).id);
}

/** Depois de ativada, só os dias do destaque e a exibição das contribuições mudam. */
export async function ajustarExibicao(id: string, campos: { banner_dias?: number; mostrar_contribuicoes?: boolean }): Promise<void> {
  if (isDemoMode()) {
    const o = demo().obras.find((x) => x.id === id);
    if (o) Object.assign(o, campos);
    return;
  }
  const db = await getDb();
  const { error } = await db.from("obras").update(campos).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function apagarRascunho(id: string): Promise<void> {
  if (isDemoMode()) {
    const d = demo();
    d.obras = d.obras.filter((o) => !(o.id === id && o.estado === "rascunho"));
    return;
  }
  const db = await getDb();
  const { error } = await db.from("obras").delete().eq("id", id).eq("estado", "rascunho");
  if (error) throw new Error(error.message);
}

export async function ativarObra(id: string, confirmacao: string): Promise<string> {
  if (isDemoMode()) {
    if (confirmacao.trim().toUpperCase() !== "ATIVAR") throw new Error("Digite ATIVAR para confirmar.");
    const d = demo();
    const o = d.obras.find((x) => x.id === id);
    if (!o || o.estado !== "rascunho") throw new Error("Essa obra já foi ativada.");
    if (d.obras.some((x) => x.estado === "ativa")) throw new Error("Já existe uma obra em andamento.");
    o.estado = "ativa";
    o.ativada_em = new Date().toISOString();
    return o.ativada_em;
  }
  const db = await getDb();
  const { data, error } = await db.rpc("obra_ativar", { p_obra: id, p_confirmacao: confirmacao });
  if (error) throw new Error(error.message);
  return String(data);
}

export async function ajustarObra(id: string, kg: number, motivo: string): Promise<void> {
  if (isDemoMode()) {
    const d = demo();
    const o = d.obras.find((x) => x.id === id && x.estado === "ativa");
    if (!o) throw new Error("Só dá para ajustar a obra em andamento.");
    o.total_kg += kg;
    d.ajustes.unshift({ id: `aj-${d.ajustes.length + 1}`, kg, motivo, em: new Date().toISOString() });
    return;
  }
  const db = await getDb();
  const { error } = await db.rpc("obra_ajustar", { p_obra: id, p_kg: kg, p_motivo: motivo });
  if (error) throw new Error(error.message);
}

export async function liberarSerie(setId: string, motivo: string): Promise<void> {
  if (isDemoMode()) return;
  const db = await getDb();
  const { error } = await db.rpc("obra_liberar_serie", { p_set: setId, p_motivo: motivo });
  if (error) throw new Error(error.message);
}
