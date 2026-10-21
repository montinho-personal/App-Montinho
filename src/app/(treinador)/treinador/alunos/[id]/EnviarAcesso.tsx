"use client";

// “Enviar acesso”: mensagem pronta (WhatsApp ou copiar) com o endereço do app
// e o e-mail cadastrado. O aluno pede o link de entrada no próprio celular.
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { linkWhatsApp, mensagemAcesso } from "@/lib/acesso/mensagem";

export function EnviarAcessoButton({ nome, email, telefone, className }: { nome: string; email: string | null; telefone: string | null; className?: string }) {
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const texto = email ? mensagemAcesso({ nome, email, urlApp: typeof window !== "undefined" ? window.location.origin : "https://app-montinho.vercel.app" }) : "";

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Mensagem copiada. É só colar no WhatsApp do aluno.");
    } catch {
      toast.error("Não consegui copiar. Selecione o texto e copie manualmente.");
    }
  }

  return (
    <>
      <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} className={className}>
        <span aria-hidden className="text-lg">🔑</span>
        Enviar acesso
      </button>
      {aberto ? (
        <div className="col-span-full space-y-2 rounded-xl border border-accent/50 bg-accent/5 p-3 text-sm">
          {email ? (
            <>
              <p className="font-semibold">Mensagem de acesso para {nome.split(" ")[0]}</p>
              <pre className="whitespace-pre-wrap rounded-lg border border-border bg-bg p-2.5 font-sans text-xs leading-relaxed">{texto}</pre>
              <div className="grid grid-cols-2 gap-2">
                <a href={linkWhatsApp(telefone, texto)} target="_blank" rel="noopener noreferrer" className="touch rounded-lg bg-[#25D366] px-3 py-2.5 text-center font-bold text-black">
                  Abrir no WhatsApp
                </a>
                <button type="button" onClick={() => void copiar()} className="touch rounded-lg border border-border px-3 py-2.5 font-semibold">
                  Copiar mensagem
                </button>
              </div>
              <p className="text-[11px] text-fg-subtle">{telefone ? "Abre a conversa com o número cadastrado do aluno." : "Sem telefone cadastrado: o WhatsApp vai pedir para escolher o contato (dá para cadastrar o telefone em Editar)."} O e-mail precisa ser o mesmo do cadastro.</p>
            </>
          ) : (
            <p className="text-fg-muted">Este aluno ainda não tem e-mail cadastrado. Sem e-mail, ele não consegue entrar no app.</p>
          )}
        </div>
      ) : null}
    </>
  );
}
