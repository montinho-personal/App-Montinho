"use client";

// Campo de número que deixa APAGAR e digitar de novo (pedido do Montinho,
// 28/10/2026: ao apagar, o valor voltava sozinho para o mínimo). Enquanto a
// pessoa digita, o texto fica livre; o número só é corrigido para dentro de
// min–max quando ela sai do campo. Sem setas do type="number".
import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "min" | "max"> & {
  valor: number | null;
  min: number;
  max: number;
  onChange: (v: number) => void;
  /** Aceita vírgula/ponto (ex.: 42,5). */
  decimal?: boolean;
  /** Vazio é válido (campo opcional): ao sair vazio, chama onVazio em vez de corrigir para o mínimo. */
  onVazio?: () => void;
};

export const formatarNumero = (v: number | null) => (v == null || Number.isNaN(v) ? "" : String(v).replace(".", ","));

export function lerNumero(texto: string, decimal = false): number | null {
  const t = decimal ? texto.replace(",", ".") : texto;
  if (!t.trim() || t === ".") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function limparTexto(texto: string, decimal = false): string {
  if (!decimal) return texto.replace(/\D/g, "").slice(0, 5);
  const s = texto.replace(/[^\d,.]/g, "").replace(".", ",");
  const [int, ...resto] = s.split(",");
  return (resto.length ? `${int},${resto.join("").slice(0, 2)}` : int).slice(0, 8);
}

export function CampoNumero({ valor, min, max, onChange, decimal = false, onVazio, onBlur, onFocus, ...rest }: Props) {
  const [texto, setTexto] = useState(formatarNumero(valor));
  const focado = useRef(false);
  // Valor mudou por fora (botões +/−, outra tela): atualiza o texto se não estiver digitando.
  useEffect(() => {
    if (!focado.current) setTexto(formatarNumero(valor));
  }, [valor]);
  return (
    <input
      {...rest}
      type="text"
      inputMode={decimal ? "decimal" : "numeric"}
      value={texto}
      onFocus={(e) => {
        focado.current = true;
        onFocus?.(e);
      }}
      onChange={(e) => {
        const t = limparTexto(e.target.value, decimal);
        setTexto(t);
        const n = lerNumero(t, decimal);
        if (n != null && n >= min && n <= max) onChange(n);
      }}
      onBlur={(e) => {
        focado.current = false;
        const n = lerNumero(texto, decimal);
        if (n == null && onVazio) {
          onVazio();
          setTexto("");
        } else {
          const certo = Math.max(min, Math.min(max, n ?? valor ?? min));
          setTexto(formatarNumero(certo));
          if (certo !== valor) onChange(certo);
        }
        onBlur?.(e);
      }}
    />
  );
}
