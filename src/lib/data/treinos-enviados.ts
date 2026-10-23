// Treinos enviados pelo visitante (print, foto do papel, PDF) — 0080.
// Sempre com RLS: o visitante envia e vê os dele; só o personal resolve.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { uid } from "@/lib/mock/store";
import { caminhoDoArquivo } from "@/lib/medidas/campos";
import { dataLocal } from "@/lib/aderencia/calcular";

export type TreinoEnviado = { id: string; aluno_id: string; caminho: string; tipo_mime: string; tamanho_bytes: number; observacao: string | null; status: "pendente" | "montado" | "descartado"; created_at: string; resolvido_em: string | null };
export type TreinoEnviadoComNome = TreinoEnviado & { nome: string; telefone: string | null };

function demo(): TreinoEnviado[] {
  const g = globalThis as unknown as { __montinhoTreinosEnviados?: TreinoEnviado[] };
  g.__montinhoTreinosEnviados ??= [];
  return g.__montinhoTreinosEnviados;
}

/** Link de envio direto ao armazenamento (o arquivo não passa pelo servidor do app). */
export async function prepararEnvioTreino(alunoId: string, tipo: string): Promise<{ caminho: string; token: string | null }> {
  const caminho = caminhoDoArquivo(alunoId, tipo, crypto.randomUUID(), dataLocal(new Date()));
  if (isDemoMode()) return { caminho, token: null };
  const db = await getDb();
  const { data, error } = await db.storage.from("treinos-enviados").createSignedUploadUrl(caminho);
  if (error || !data) throw new Error(error?.message ?? "Falha ao preparar o envio");
  return { caminho, token: data.token };
}

export async function registrarTreinoEnviado(alunoId: string, a: { caminho: string; tipo: string; tamanho: number; observacao: string | null }): Promise<TreinoEnviado> {
  if (!a.caminho.startsWith(`${alunoId}/`)) throw new Error("Caminho inválido");
  const linha = { aluno_id: alunoId, caminho: a.caminho, tipo_mime: a.tipo, tamanho_bytes: a.tamanho, observacao: a.observacao };
  if (isDemoMode()) {
    const novo: TreinoEnviado = { id: uid(), status: "pendente", created_at: new Date().toISOString(), resolvido_em: null, ...linha };
    demo().push(novo);
    return novo;
  }
  const db = await getDb();
  const { data, error } = await db.from("treinos_enviados").insert(linha).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "Falha ao registrar o envio");
  return data as TreinoEnviado;
}

/** Envios ainda abertos do próprio visitante (para avisar “o Montinho vai montar”). */
export async function meusEnviosPendentes(alunoId: string): Promise<TreinoEnviado[]> {
  if (isDemoMode()) return demo().filter((t) => t.aluno_id === alunoId && t.status === "pendente");
  const db = await getDb();
  const { data } = await db.from("treinos_enviados").select("*").eq("aluno_id", alunoId).eq("status", "pendente").order("created_at", { ascending: false });
  return (data ?? []) as TreinoEnviado[];
}

/** Lista do personal: “Treinos para montar”. */
export async function treinosParaMontar(): Promise<TreinoEnviadoComNome[]> {
  if (isDemoMode()) return demo().filter((t) => t.status === "pendente").map((t) => ({ ...t, nome: "Visitante (demonstração)", telefone: null }));
  const db = await getDb();
  const { data } = await db.from("treinos_enviados").select("*, aluno:alunos(telefone, profile:profiles(nome))").eq("status", "pendente").order("created_at", { ascending: true }).limit(100);
  type Linha = TreinoEnviado & { aluno: { telefone: string | null; profile: { nome: string | null } | null } | null };
  return ((data ?? []) as Linha[]).map(({ aluno, ...t }) => ({ ...t, nome: aluno?.profile?.nome ?? "Visitante", telefone: aluno?.telefone ?? null }));
}

export async function resolverTreinoEnviado(id: string, status: "montado" | "descartado"): Promise<boolean> {
  if (isDemoMode()) {
    const t = demo().find((x) => x.id === id);
    if (!t) return false;
    Object.assign(t, { status, resolvido_em: new Date().toISOString() });
    return true;
  }
  const db = await getDb();
  const { data, error } = await db.from("treinos_enviados").update({ status, resolvido_em: new Date().toISOString() }).eq("id", id).select("id");
  return !error && (data?.length ?? 0) > 0;
}

/** Link temporário (5 min) para abrir o arquivo; a RLS decide quem vê. */
export async function linkDoTreinoEnviado(id: string): Promise<string | null> {
  if (isDemoMode()) return null;
  const db = await getDb();
  const { data: t } = await db.from("treinos_enviados").select("caminho").eq("id", id).maybeSingle();
  if (!t) return null;
  const { data } = await db.storage.from("treinos-enviados").createSignedUrl(String(t.caminho), 300);
  return data?.signedUrl ?? null;
}
