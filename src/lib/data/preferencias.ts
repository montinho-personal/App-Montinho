// Preferências pessoais do treinador (hoje: padrões de tempo do treino).
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import type { ParametrosTempo } from "@/lib/tempo/estimar";
import { mesclarRegras, type RegrasCentral } from "@/lib/aderencia/central";
import { MODELO_IDS, MODELOS_PADRAO, mesclarModelos, type ModeloId, type ModelosMensagem } from "@/lib/acompanhamento/modelos";

type DemoPrefs = Map<string, Partial<ParametrosTempo>>;
function demo(): DemoPrefs {
  const g = globalThis as unknown as { __montinhoPrefs?: DemoPrefs };
  g.__montinhoPrefs ??= new Map();
  return g.__montinhoPrefs;
}

export async function lerTemposTreinador(userId: string): Promise<Partial<ParametrosTempo>> {
  if (isDemoMode()) return demo().get(userId) ?? {};
  const db = await getDb();
  const { data } = await db.from("preferencias_treinador").select("tempos").eq("profile_id", userId).maybeSingle();
  return (data?.tempos as Partial<ParametrosTempo> | null) ?? {};
}

export async function salvarTemposTreinador(userId: string, tempos: Partial<ParametrosTempo>): Promise<void> {
  if (isDemoMode()) {
    demo().set(userId, tempos);
    return;
  }
  const db = await getDb();
  const { error } = await db.from("preferencias_treinador").upsert({ profile_id: userId, tempos, atualizado_em: new Date().toISOString() }, { onConflict: "profile_id" });
  if (error) throw new Error(error.message);
}

// Regras dos sinais de acompanhamento (Central de aderência) e modelos de
// mensagem do WhatsApp. Os dois ficam na mesma coluna jsonb
// (preferencias_treinador.regras_acompanhamento; modelos na chave "modelos"),
// sem migration nova. Gravar um preserva o outro.
type Bruto = Partial<RegrasCentral> & { modelos?: Partial<Record<ModeloId, string>> };
function demoRegras(): Map<string, Bruto> {
  const g = globalThis as unknown as { __montinhoRegras?: Map<string, Bruto> };
  g.__montinhoRegras ??= new Map();
  return g.__montinhoRegras;
}

async function lerBruto(userId: string): Promise<Bruto> {
  if (isDemoMode()) return demoRegras().get(userId) ?? {};
  const db = await getDb();
  const { data } = await db.from("preferencias_treinador").select("regras_acompanhamento").eq("profile_id", userId).maybeSingle();
  return (data?.regras_acompanhamento as Bruto | null) ?? {};
}

async function gravarBruto(userId: string, bruto: Bruto): Promise<void> {
  if (isDemoMode()) {
    demoRegras().set(userId, bruto);
    return;
  }
  const db = await getDb();
  const { error } = await db.from("preferencias_treinador").upsert({ profile_id: userId, regras_acompanhamento: bruto, atualizado_em: new Date().toISOString() }, { onConflict: "profile_id" });
  if (error) throw new Error(error.message);
}

export async function lerRegrasAcompanhamento(userId: string): Promise<RegrasCentral> {
  return mesclarRegras(await lerBruto(userId));
}

export async function salvarRegrasAcompanhamento(userId: string, regras: Partial<RegrasCentral>): Promise<void> {
  const atual = await lerBruto(userId);
  await gravarBruto(userId, { ...regras, ...(atual.modelos ? { modelos: atual.modelos } : {}) });
}

export async function lerModelosMensagem(userId: string): Promise<ModelosMensagem> {
  return mesclarModelos((await lerBruto(userId)).modelos);
}

/** Grava só os modelos que diferem do padrão (o resto segue o padrão). */
export async function salvarModelosMensagem(userId: string, modelos: Partial<Record<ModeloId, string>>): Promise<void> {
  const atual = await lerBruto(userId);
  const proprios: Partial<Record<ModeloId, string>> = {};
  for (const id of MODELO_IDS) {
    const v = modelos[id]?.trim();
    if (v && v !== MODELOS_PADRAO[id]) proprios[id] = v;
  }
  await gravarBruto(userId, { ...atual, modelos: proprios });
}
