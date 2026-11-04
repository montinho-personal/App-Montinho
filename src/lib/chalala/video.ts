// Card com VÍDEO (pedido do Montinho, 04/11/2026: “é possível colocar vídeo também?”;
// começa pelo card “Treino pago”). Regras puras: trecho escolhido, tamanho da
// gravação e o tipo de arquivo que o aparelho consegue gerar. Tudo é feito no
// próprio celular; nada vai para o servidor.

/** Duração máxima do vídeo do card (o tamanho de um Story). */
export const MAX_SEGUNDOS_VIDEO = 15;
/** Tamanho máximo do arquivo escolhido. */
export const MAX_MB_VIDEO = 200;
/** Largura da gravação: o card é desenhado em 1080 e reduzido para o celular aguentar. */
export const LARGURA_GRAVACAO = 720;

/** Trecho que vai para o card: começa em `inicio` (dentro do vídeo) e dura até 15 s. */
export function trechoDoVideo(total: number, inicio: number, max = MAX_SEGUNDOS_VIDEO): { inicio: number; duracao: number } {
  const t = Number.isFinite(total) && total > 0 ? total : 0;
  const ini = Math.max(0, Math.min(Math.max(0, t - 1), Number.isFinite(inicio) ? inicio : 0));
  return { inicio: Math.round(ini * 10) / 10, duracao: Math.round(Math.max(0, Math.min(max, t - ini)) * 10) / 10 };
}

/** Tipos de vídeo, do melhor (MP4, aceito em todo lugar) ao que sobrar. */
export const TIPOS_VIDEO = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];

export function tipoDeGravacao(suporta: (t: string) => boolean): { mime: string; ext: "mp4" | "webm" } | null {
  for (const t of TIPOS_VIDEO) {
    try {
      if (suporta(t)) return { mime: t, ext: t.startsWith("video/mp4") ? "mp4" : "webm" };
    } catch {
      // segue para o próximo
    }
  }
  return null;
}

/** Tamanho da gravação mantendo a proporção do card. */
export function tamanhoGravacao(w: number, h: number, largura = LARGURA_GRAVACAO): { w: number; h: number; escala: number } {
  const escala = Math.min(1, largura / w);
  // Codificadores de vídeo pedem lados pares.
  const par = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  return { w: par(w * escala), h: par(h * escala), escala };
}

/** “0:07” */
export const segundosTexto = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// ── Duração do WebM ──────────────────────────────────────────────────────────
// O Chrome grava WebM SEM a duração no cabeçalho; o Instagram/WhatsApp então
// leem o vídeo como curtinho (ou cortam). Aqui a duração é escrita no bloco
// Info do arquivo (EBML), sem mexer nos quadros.

type Vint = { len: number; valor: number; desconhecido: boolean };

function lerVint(b: Uint8Array, i: number): Vint | null {
  if (i >= b.length) return null;
  const p = b[i];
  let len = 1;
  let mask = 0x80;
  while (len <= 8 && !(p & mask)) {
    len++;
    mask >>= 1;
  }
  if (len > 8 || i + len > b.length) return null;
  let valor = p & (mask - 1);
  let todosUm = valor === mask - 1;
  for (let k = 1; k < len; k++) {
    valor = valor * 256 + b[i + k];
    if (b[i + k] !== 0xff) todosUm = false;
  }
  return { len, valor, desconhecido: todosUm };
}

function escreverVint(valor: number, len: number): Uint8Array | null {
  if (valor >= 2 ** (7 * len) - 1) return null;
  const out = new Uint8Array(len);
  let v = valor;
  for (let k = len - 1; k >= 0; k--) {
    out[k] = v % 256;
    v = Math.floor(v / 256);
  }
  out[0] |= 0x80 >> (len - 1);
  return out;
}

function lerId(b: Uint8Array, i: number): { id: number; len: number } | null {
  const v = lerVint(b, i);
  if (!v) return null;
  let id = 0;
  for (let k = 0; k < v.len; k++) id = id * 256 + b[i + k];
  return { id, len: v.len };
}

const ID_SEGMENT = 0x18538067;
const ID_INFO = 0x1549a966;
const ID_DURATION = 0x4489;

/** Escreve a duração (em ms, com a escala padrão do WebM) num WebM que não tem. Se não der, devolve o mesmo arquivo. */
export function corrigirDuracaoWebm(b: Uint8Array, ms: number): Uint8Array {
  if (!(ms > 0)) return b;
  // Cabeçalho EBML
  const h = lerId(b, 0);
  if (!h) return b;
  const hs = lerVint(b, h.len);
  if (!hs) return b;
  let i = h.len + hs.len + hs.valor;
  // Segment
  const seg = lerId(b, i);
  if (!seg || seg.id !== ID_SEGMENT) return b;
  const segTamPos = i + seg.len;
  const segTam = lerVint(b, segTamPos);
  if (!segTam) return b;
  i = segTamPos + segTam.len;
  const fimSeg = segTam.desconhecido ? b.length : Math.min(b.length, i + segTam.valor);
  while (i < fimSeg) {
    const el = lerId(b, i);
    if (!el) return b;
    const tam = lerVint(b, i + el.len);
    if (!tam || tam.desconhecido) return b;
    const dados = i + el.len + tam.len;
    if (el.id === ID_INFO) {
      // Já tem duração? Deixa como está.
      let j = dados;
      while (j < dados + tam.valor) {
        const f = lerId(b, j);
        if (!f) return b;
        const ft = lerVint(b, j + f.len);
        if (!ft) return b;
        if (f.id === ID_DURATION) return b;
        j += f.len + ft.len + ft.valor;
      }
      const duracao = new Uint8Array(11);
      duracao[0] = 0x44;
      duracao[1] = 0x89;
      duracao[2] = 0x88; // tamanho 8
      new DataView(duracao.buffer).setFloat64(3, ms, false);
      const novoTamInfo = escreverVint(tam.valor + 11, tam.len);
      if (!novoTamInfo) return b;
      let novoTamSeg: Uint8Array | null = null;
      if (!segTam.desconhecido) {
        novoTamSeg = escreverVint(segTam.valor + 11, segTam.len);
        if (!novoTamSeg) return b;
      }
      const fimInfo = dados + tam.valor;
      const out = new Uint8Array(b.length + 11);
      out.set(b.subarray(0, fimInfo), 0);
      out.set(novoTamInfo, i + el.len);
      if (novoTamSeg) out.set(novoTamSeg, segTamPos);
      out.set(duracao, fimInfo);
      out.set(b.subarray(fimInfo), fimInfo + 11);
      return out;
    }
    i = dados + tam.valor;
  }
  return b;
}

// ── Duração do MP4 ───────────────────────────────────────────────────────────
// MP4 gravado pelo navegador costuma vir “em fragmentos” e às vezes com a
// duração 0 no cabeçalho (moov). Preenche SÓ as durações zeradas (mvhd, tkhd,
// mehd), no mesmo lugar, sem mudar o tamanho do arquivo.
const CAIXAS_COM_FILHOS = new Set(["moov", "trak", "mvex"]);

export function corrigirDuracaoMp4(b: Uint8Array, ms: number): Uint8Array {
  if (!(ms > 0)) return b;
  const out = new Uint8Array(b);
  const dv = new DataView(out.buffer, out.byteOffset, out.byteLength);
  let escala = 0;
  let mudou = false;
  const preencher = (pos: number, v1: boolean) => {
    if (!escala || pos + (v1 ? 8 : 4) > out.length) return;
    const valor = Math.round((ms / 1000) * escala);
    if (v1) {
      if (dv.getUint32(pos) !== 0 || dv.getUint32(pos + 4) !== 0) return;
      dv.setUint32(pos, Math.floor(valor / 2 ** 32));
      dv.setUint32(pos + 4, valor % 2 ** 32);
    } else {
      if (dv.getUint32(pos) !== 0 || valor >= 2 ** 32) return;
      dv.setUint32(pos, valor);
    }
    mudou = true;
  };
  const andar = (ini: number, fim: number) => {
    let o = ini;
    while (o + 8 <= fim) {
      let tam = dv.getUint32(o);
      const tipo = String.fromCharCode(out[o + 4], out[o + 5], out[o + 6], out[o + 7]);
      let cab = 8;
      if (tam === 1) {
        if (o + 16 > fim) return;
        tam = dv.getUint32(o + 8) * 2 ** 32 + dv.getUint32(o + 12);
        cab = 16;
      } else if (tam === 0) tam = fim - o;
      if (tam < cab || o + tam > fim) return;
      const c = o + cab;
      const v1 = out[c] === 1;
      if (tipo === "mvhd") {
        escala = dv.getUint32(c + (v1 ? 20 : 12));
        preencher(c + (v1 ? 24 : 16), v1);
      } else if (tipo === "tkhd") preencher(c + (v1 ? 28 : 20), v1);
      else if (tipo === "mehd") preencher(c + 4, v1);
      else if (CAIXAS_COM_FILHOS.has(tipo)) andar(c, o + tam);
      o += tam;
    }
  };
  andar(0, out.length);
  return mudou ? out : b;
}
