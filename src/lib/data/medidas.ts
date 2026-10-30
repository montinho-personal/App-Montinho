// Medidas e avaliações (0078). Sempre pelo cliente com RLS (login do aluno ou
// do personal). Arquivos ficam no bucket privado “avaliacoes”, na pasta do
// aluno; abrir um arquivo gera um link temporário (5 min).
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { demoStore, uid } from "@/lib/mock/store";
import { listEvolucao } from "@/lib/db";
import { caminhoDoArquivo, CAMPOS_MEDIDA, type ChaveMedida } from "@/lib/medidas/campos";
import { dataLocal } from "@/lib/aderencia/calcular";
import type { MedidaExtra } from "@/lib/medidas/leitura";
import type { AvaliacaoArquivo, Evolucao } from "@/lib/supabase/types";

export type NovasMedidas = { data: string; observacoes?: string | null; extras?: MedidaExtra[] } & Partial<Record<ChaveMedida, number | null>>;

function demoArquivos(): AvaliacaoArquivo[] {
  const g = globalThis as unknown as { __montinhoAvaliacoes?: AvaliacaoArquivo[] };
  g.__montinhoAvaliacoes ??= [];
  return g.__montinhoAvaliacoes;
}

export async function listarAvaliacoes(alunoId: string): Promise<{ medidas: Evolucao[]; arquivos: AvaliacaoArquivo[] }> {
  const medidas = ((await listEvolucao(alunoId)) as Evolucao[]).slice().sort((a, b) => (a.data < b.data ? 1 : -1));
  if (isDemoMode()) return { medidas, arquivos: demoArquivos().filter((a) => a.aluno_id === alunoId).sort((a, b) => (a.data_avaliacao < b.data_avaliacao ? 1 : -1)) };
  const db = await getDb();
  const { data } = await db.from("avaliacoes_arquivos").select("*").eq("aluno_id", alunoId).order("data_avaliacao", { ascending: false }).limit(100);
  return { medidas, arquivos: (data ?? []) as AvaliacaoArquivo[] };
}

/** Quando cada medida/arquivo de avaliação entrou no app (troféus de Monitoramento). */
export async function registrosDeAvaliacao(alunoId: string): Promise<string[]> {
  const { medidas, arquivos } = await listarAvaliacoes(alunoId).catch(() => ({ medidas: [] as Evolucao[], arquivos: [] as AvaliacaoArquivo[] }));
  return [...medidas.map((m) => m.created_at), ...arquivos.map((a) => a.created_at)].filter(Boolean);
}

/** Grava as medidas (só os campos preenchidos). Altura também vai para o cadastro do aluno. */
export async function salvarMedidas(alunoId: string, quem: "aluno" | "personal", m: NovasMedidas): Promise<Evolucao> {
  const valores = Object.fromEntries(CAMPOS_MEDIDA.map((c) => [c.chave, m[c.chave] ?? null]));
  const extras = m.extras ?? [];
  if (!Object.values(valores).some((v) => v != null) && !extras.length) throw new Error("Preencha pelo menos uma medida");
  // `extras` (0125) só vai quando existe, para quem ainda não rodou a migration continuar salvando o resto.
  const linha = { aluno_id: alunoId, data: m.data, observacoes: m.observacoes ?? null, origem: quem, ...valores, ...(extras.length ? { extras } : {}) };
  if (isDemoMode()) {
    const nova = { id: uid(), created_at: new Date().toISOString(), ...linha } as unknown as Evolucao;
    demoStore().evolucao.push(nova);
    return nova;
  }
  const db = await getDb();
  const { data, error } = await db.from("evolucao").insert(linha).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "Falha ao salvar as medidas");
  if (m.altura_cm) {
    if (quem === "personal") await db.from("alunos").update({ altura_cm: Math.round(m.altura_cm) }).eq("id", alunoId);
    else await db.rpc("salvar_minha_altura", { p_altura: m.altura_cm });
  }
  return data as Evolucao;
}

/** Link de envio direto ao armazenamento (o arquivo não passa pelo servidor do app). */
export async function prepararEnvio(alunoId: string, tipo: string): Promise<{ caminho: string; token: string | null }> {
  const caminho = caminhoDoArquivo(alunoId, tipo, crypto.randomUUID(), dataLocal(new Date()));
  if (isDemoMode()) return { caminho, token: null };
  const db = await getDb();
  const { data, error } = await db.storage.from("avaliacoes").createSignedUploadUrl(caminho);
  if (error || !data) throw new Error(error?.message ?? "Falha ao preparar o envio");
  return { caminho, token: data.token };
}

export async function registrarArquivo(alunoId: string, a: { caminho: string; nome: string; tipo: string; tamanho: number; data: string; descricao: string | null }): Promise<AvaliacaoArquivo> {
  if (!a.caminho.startsWith(`${alunoId}/`)) throw new Error("Caminho inválido");
  const linha = { aluno_id: alunoId, caminho: a.caminho, nome_original: a.nome.slice(0, 200), tipo_mime: a.tipo, tamanho_bytes: a.tamanho, data_avaliacao: a.data, descricao: a.descricao };
  if (isDemoMode()) {
    const novo: AvaliacaoArquivo = { id: uid(), evolucao_id: null, created_at: new Date().toISOString(), ...linha };
    demoArquivos().push(novo);
    return novo;
  }
  const db = await getDb();
  const { data, error } = await db.from("avaliacoes_arquivos").insert(linha).select("*").single();
  if (error || !data) throw new Error(error?.message ?? "Falha ao registrar o arquivo");
  return data as AvaliacaoArquivo;
}

/** Link temporário para abrir o arquivo (a RLS decide se a pessoa pode ver). */
export async function linkDoArquivo(id: string): Promise<string | null> {
  if (isDemoMode()) return null;
  const db = await getDb();
  const { data: a } = await db.from("avaliacoes_arquivos").select("caminho").eq("id", id).maybeSingle();
  if (!a) return null;
  const { data } = await db.storage.from("avaliacoes").createSignedUrl(String(a.caminho), 300);
  return data?.signedUrl ?? null;
}

/** Conteúdo do arquivo (para a leitura pela IA). A RLS decide se a pessoa pode ver. */
export async function baixarArquivo(id: string): Promise<{ alunoId: string; tipo: string; base64: string } | null> {
  if (isDemoMode()) return null;
  const db = await getDb();
  const { data: a } = await db.from("avaliacoes_arquivos").select("aluno_id, caminho, tipo_mime").eq("id", id).maybeSingle();
  if (!a) return null;
  const { data, error } = await db.storage.from("avaliacoes").download(String(a.caminho));
  if (error || !data) return null;
  return { alunoId: String(a.aluno_id), tipo: String(a.tipo_mime), base64: Buffer.from(await data.arrayBuffer()).toString("base64") };
}

/** Primeira avaliação registrada (medidas ou arquivo) — troféu “Ponto de Partida”. */
export async function primeiraAvaliacao(alunoId: string): Promise<string | null> {
  const { medidas, arquivos } = await listarAvaliacoes(alunoId).catch(() => ({ medidas: [] as Evolucao[], arquivos: [] as AvaliacaoArquivo[] }));
  const datas = [...medidas.map((m) => `${m.data}T15:00:00Z`), ...arquivos.map((a) => a.created_at)].sort();
  return datas[0] ?? null;
}
