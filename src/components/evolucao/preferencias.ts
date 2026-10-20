"use client";
// Preferências do aluno para a Evolução Inteligente (neste aparelho).
// O personal pode desligar ou limitar os avisos (config no banco); a escolha
// mais restritiva entre aluno e personal sempre vale.
import { useCallback, useSyncExternalStore } from "react";

export type PrefsEvolucao = { durante: boolean; aoConcluir: boolean; modo: "todas" | "recordes"; sons: boolean; animacoes: boolean };
export const PREFS_PADRAO: PrefsEvolucao = { durante: true, aoConcluir: true, modo: "todas", sons: false, animacoes: true };
const CHAVE = "montinho-evolucao-prefs-v1";
const ouvintes = new Set<() => void>();
let cache: { raw: string | null; v: PrefsEvolucao } | null = null;

function ler(): PrefsEvolucao {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CHAVE);
  } catch {
    /* sem armazenamento */
  }
  if (cache && cache.raw === raw) return cache.v;
  let v = PREFS_PADRAO;
  try {
    v = raw ? { ...PREFS_PADRAO, ...(JSON.parse(raw) as Partial<PrefsEvolucao>) } : PREFS_PADRAO;
  } catch {
    v = PREFS_PADRAO;
  }
  cache = { raw, v };
  return v;
}

export function usePrefsEvolucao(): [PrefsEvolucao, (p: Partial<PrefsEvolucao>) => void] {
  const prefs = useSyncExternalStore(
    (cb) => {
      ouvintes.add(cb);
      return () => ouvintes.delete(cb);
    },
    ler,
    () => PREFS_PADRAO,
  );
  const mudar = useCallback((p: Partial<PrefsEvolucao>) => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ ...ler(), ...p }));
    } catch {
      /* ignora */
    }
    ouvintes.forEach((f) => f());
  }, []);
  return [prefs, mudar];
}

/** Bipe curto e baixo (só se o aluno ligar “sons”). */
export function bipe() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.26);
  } catch {
    /* sem áudio */
  }
}
