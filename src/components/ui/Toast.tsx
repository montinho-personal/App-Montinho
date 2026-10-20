"use client";

import { createContext, useCallback, useContext, useRef, useState, useMemo } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ToastTone = "error" | "warn" | "success" | "info";

type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  push: (message: string, tone?: ToastTone) => void;
  error: (message: string) => void;
  warn: (message: string) => void;
  success: (message: string) => void;
};

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const push = useCallback((message: string, tone: ToastTone = "info") => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const error = useCallback((msg: string) => push(msg, "error"), [push]);
  const warn = useCallback((msg: string) => push(msg, "warn"), [push]);
  const success = useCallback((msg: string) => push(msg, "success"), [push]);

  // Valor estável: quem depende do toast em hooks não re-executa a cada aviso.
  const valor = useMemo(() => ({ push, error, warn, success }), [push, error, warn, success]);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={valor}>
      {children}
      {/* Portal */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── Individual Toast ─────────────────────────────────────────────────────────

const TONE_CLASSES: Record<ToastTone, string> = {
  error:   "bg-red/90 border-red text-white",
  warn:    "bg-gold/90 border-gold text-black",
  success: "bg-green-600/90 border-green-500 text-white",
  info:    "bg-card border-border text-fg",
};

const TONE_ICONS: Record<ToastTone, string> = {
  error:   "✕",
  warn:    "⚠",
  success: "✓",
  info:    "ℹ",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm backdrop-blur-sm animate-in slide-in-from-right-4 ${TONE_CLASSES[toast.tone]}`}
    >
      <span className="mt-0.5 font-bold shrink-0">{TONE_ICONS[toast.tone]}</span>
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button onClick={onDismiss} className="shrink-0 opacity-70 hover:opacity-100 leading-none text-base">×</button>
    </div>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
