"use client";

// Microfone do navegador (pt-BR) para ditar texto. Mesma estratégia do
// “Ditar treino”: uma sessão por frase, religando sozinho até tocar em parar
// (no Android o modo contínuo repete/perde palavras) e, no Android, vale o
// último resultado de cada sessão (ele já traz a frase inteira).
import { useEffect, useRef, useState } from "react";
import { juntarFala } from "@/lib/treino/ditado";

type ResultadoFala = { isFinal: boolean; 0: { transcript: string } };
type Reconhecimento = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ResultadoFala> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function criarReconhecimento(): Reconhecimento | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Reconhecimento; webkitSpeechRecognition?: new () => Reconhecimento };
  const Ctor = w.webkitSpeechRecognition ?? w.SpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function useDitado() {
  const [texto, setTexto] = useState("");
  const [ouvindo, setOuvindo] = useState(false);
  const [erroMic, setErroMic] = useState<string | null>(null);
  const [temMic, setTemMic] = useState(false);
  const rec = useRef<Reconhecimento | null>(null);
  const querOuvir = useRef(false);
  const textoRef = useRef("");

  useEffect(() => {
    textoRef.current = texto;
  }, [texto]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- só no navegador dá para saber se há microfone
    setTemMic(!!criarReconhecimento());
    return () => {
      querOuvir.current = false;
      rec.current?.stop();
    };
  }, []);

  function iniciarSessao() {
    const r = criarReconhecimento();
    if (!r) return;
    const base = textoRef.current.trim();
    r.lang = "pt-BR";
    r.continuous = false;
    r.interimResults = true;
    r.onresult = (ev) => {
      const partes = Array.from(ev.results).map((x) => x[0]?.transcript ?? "");
      const falado = /Android/i.test(navigator.userAgent) ? (partes[partes.length - 1] ?? "").trim() : juntarFala(partes);
      const novo = juntarFala([base, falado]);
      textoRef.current = novo;
      setTexto(novo);
    };
    r.onerror = (ev) => {
      if (ev.error === "aborted") return;
      querOuvir.current = false;
      if (ev.error === "no-speech") {
        if (!textoRef.current.trim()) setErroMic("Não ouvi nada. Toque e fale de novo.");
        return;
      }
      setErroMic(ev.error === "not-allowed" || ev.error === "service-not-allowed" ? "Permita o microfone para este site (cadeado ao lado do endereço → Permissões → Microfone)." : ev.error === "network" ? "O reconhecimento de voz precisa de internet. Tente de novo." : "O microfone parou. Toque para continuar.");
    };
    r.onend = () => {
      if (querOuvir.current) {
        try {
          iniciarSessao();
          return;
        } catch {
          querOuvir.current = false;
        }
      }
      setOuvindo(false);
    };
    rec.current = r;
    r.start();
  }

  function alternar() {
    setErroMic(null);
    if (ouvindo) {
      parar();
      return;
    }
    try {
      querOuvir.current = true;
      iniciarSessao();
      setOuvindo(true);
    } catch {
      querOuvir.current = false;
      setErroMic("Não foi possível ligar o microfone.");
    }
  }

  function parar() {
    querOuvir.current = false;
    rec.current?.stop();
    setOuvindo(false);
  }

  return { texto, setTexto, ouvindo, erroMic, temMic, alternar, parar };
}
