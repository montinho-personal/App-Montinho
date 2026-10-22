"use client";

// “Enviar acesso”: mensagem pronta (WhatsApp ou copiar) com o endereço do app
// e o e-mail cadastrado. O aluno pede o link de entrada no próprio celular.
// Se o e-mail não chegar (limite de envios) ou o link abrir no navegador
// errado, o personal gera aqui o LINK DE CRIAR SENHA e manda pelo WhatsApp.
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { linkWhatsApp, mensagemAcesso, mensagemLinkSenha } from "@/lib/acesso/mensagem";

const URL_APP = () => (typeof window !== "undefined" ? window.location.origin : "https://app-montinho.vercel.app");

export function EnviarAcessoButton({ alunoId, nome, email, telefone, className }: { alunoId: string; nome: string; email: string | null; telefone: string | null; className?: string }) {
  const toast = useToast();
  const [aberto, setAberto] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [textoLink, setTextoLink] = useState<string | null>(null);
  const texto = email ? mensagemAcesso({ nome, email, urlApp: URL_APP() }) : "";

  async function gerarLink() {
    setGerando(true);
    try {
      const r = await fetch(`/api/alunos/${alunoId}/link-acesso`, { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as { link?: string; email?: string; error?: string };
      if (!r.ok || !j.link) throw new Error(j.error ?? "Não foi possível gerar o link agora.");
      setTextoLink(mensagemLinkSenha({ nome, email: j.email ?? email ?? "", link: j.link, urlApp: URL_APP() }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar o link agora.");
    } finally {
      setGerando(false);
    }
  }

  async function copiar(t: string = texto) {
    try {
      await navigator.clipboard.writeText(t);
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

              <div className="space-y-2 border-t border-accent/30 pt-3">
                <p className="font-semibold">O e-mail não chegou ou o link não abriu?</p>
                <p className="text-xs text-fg-muted">Gere aqui o link para {nome.split(" ")[0]} criar a senha e mande pelo WhatsApp. Não depende de e-mail e funciona em qualquer navegador. Vale por 1 hora e uma vez só.</p>
                {textoLink ? (
                  <>
                    <pre className="whitespace-pre-wrap break-all rounded-lg border border-border bg-bg p-2.5 font-sans text-xs leading-relaxed">{textoLink}</pre>
                    <div className="grid grid-cols-2 gap-2">
                      <a href={linkWhatsApp(telefone, textoLink)} target="_blank" rel="noopener noreferrer" className="touch rounded-lg bg-[#25D366] px-3 py-2.5 text-center font-bold text-black">
                        Mandar link no WhatsApp
                      </a>
                      <button type="button" onClick={() => void copiar(textoLink)} className="touch rounded-lg border border-border px-3 py-2.5 font-semibold">
                        Copiar link
                      </button>
                    </div>
                    <button type="button" onClick={() => void gerarLink()} disabled={gerando} className="text-[11px] font-semibold text-fg-subtle underline-offset-2 hover:underline disabled:opacity-50">
                      Gerar outro link (o anterior deixa de valer)
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => void gerarLink()} disabled={gerando} className="touch w-full rounded-lg bg-accent px-3 py-2.5 font-bold text-bg disabled:opacity-60">
                    {gerando ? "Gerando…" : "🔗 Gerar link para criar a senha"}
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="text-fg-muted">Este aluno ainda não tem e-mail cadastrado. Sem e-mail, ele não consegue entrar no app.</p>
          )}
        </div>
      ) : null}
    </>
  );
}
