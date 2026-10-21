// Foto de perfil do aluno (regras PURAS, testadas).
// O celular reduz a foto para um quadrado de 512 px em JPEG antes de enviar;
// o servidor confere o tamanho e se o arquivo é mesmo um JPEG (não confia só
// no que o navegador diz).

export const FOTO_LADO_PX = 512;
export const FOTO_QUALIDADE = 0.86;
/** Um JPEG 512×512 tem ~40–150 KB; 600 KB é folga de sobra. */
export const FOTO_MAX_BYTES = 600_000;

/** Começa com FF D8 FF (assinatura de JPEG) e termina com FF D9. */
export function ehJpeg(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
}

export type ResultadoValidacao = { ok: true } | { ok: false; status: number; erro: string };

export function validarFoto(contentType: string | null, bytes: Uint8Array): ResultadoValidacao {
  if (!(contentType ?? "").toLowerCase().startsWith("image/jpeg")) return { ok: false, status: 415, erro: "Envie a foto em JPEG." };
  if (bytes.length === 0) return { ok: false, status: 400, erro: "Foto vazia." };
  if (bytes.length > FOTO_MAX_BYTES) return { ok: false, status: 413, erro: "Foto muito grande. Tente outra." };
  if (!ehJpeg(bytes)) return { ok: false, status: 400, erro: "O arquivo não é uma foto válida." };
  return { ok: true };
}

/** Pasta do usuário no armazenamento (a política do banco só deixa gravar na própria). */
export const caminhoDaFoto = (userId: string) => `${userId}/avatar.jpg`;
