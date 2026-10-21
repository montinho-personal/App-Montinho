// Foto de perfil. Sempre pelo cliente com RLS: o aluno só grava na PRÓPRIA
// pasta (política do armazenamento) e só altera nome/avatar do próprio perfil.
import { isDemoMode } from "@/lib/env";
import { getDb } from "@/lib/supabase/rls";
import { caminhoDaFoto } from "@/lib/perfil/foto";

const BUCKET = "avatars";

// Demonstração: fotos só em memória (data URL), somem ao reiniciar.
function demo(): Map<string, string> {
  const g = globalThis as unknown as { __montinhoAvatars?: Map<string, string> };
  g.__montinhoAvatars ??= new Map();
  return g.__montinhoAvatars;
}

/** Foto enviada na demonstração para um perfil (null se não houver). */
export const avatarDemo = (profileId: string): string | null => demo().get(profileId) ?? null;

export async function avatarDoUsuario(userId: string): Promise<string | null> {
  if (isDemoMode()) return avatarDemo(userId);
  const db = await getDb();
  const { data } = await db.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
  return (data as { avatar_url: string | null } | null)?.avatar_url ?? null;
}

export async function salvarFotoPerfil(userId: string, bytes: Uint8Array): Promise<string> {
  if (isDemoMode()) {
    const url = `data:image/jpeg;base64,${Buffer.from(bytes).toString("base64")}`;
    demo().set(userId, url);
    return url;
  }
  const db = await getDb();
  const caminho = caminhoDaFoto(userId);
  const { error } = await db.storage.from(BUCKET).upload(caminho, bytes, { contentType: "image/jpeg", upsert: true, cacheControl: "3600" });
  if (error) throw new Error(error.message);
  // ?v= força o celular a buscar a foto nova (o arquivo tem sempre o mesmo nome).
  const url = `${db.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl}?v=${Date.now()}`;
  const { error: e2 } = await db.from("profiles").update({ avatar_url: url }).eq("id", userId);
  if (e2) throw new Error(e2.message);
  return url;
}

export async function removerFotoPerfil(userId: string): Promise<void> {
  if (isDemoMode()) {
    demo().delete(userId);
    return;
  }
  const db = await getDb();
  const { error } = await db.from("profiles").update({ avatar_url: null }).eq("id", userId);
  if (error) throw new Error(error.message);
  // Apagar o arquivo é "o que der": o vínculo já foi desfeito.
  await db.storage.from(BUCKET).remove([caminhoDaFoto(userId)]).catch(() => undefined);
}
