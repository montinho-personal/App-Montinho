"use client";

// Campo de senha com o botão do olho: toca para exibir ou esconder o que foi digitado.
import { useState, type InputHTMLAttributes } from "react";
import { Icon } from "./Icon";
import { Input } from "./Input";

export function InputSenha({ className = "", ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [ver, setVer] = useState(false);
  return (
    <div className="relative">
      <Input {...rest} type={ver ? "text" : "password"} className={`pr-12 ${className}`} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        aria-label={ver ? "Esconder senha" : "Mostrar senha"}
        aria-pressed={ver}
        title={ver ? "Esconder senha" : "Mostrar senha"}
        className="alvo absolute inset-y-0 right-0 grid w-12 place-items-center text-fg-muted hover:text-fg"
      >
        <Icon name={ver ? "eye-off" : "eye"} size={20} />
      </button>
    </div>
  );
}
