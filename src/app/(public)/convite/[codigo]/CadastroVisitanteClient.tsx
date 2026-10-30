"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FieldHint, Input, Label } from "@/components/ui/Input";
import { InputSenha } from "@/components/ui/InputSenha";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { eventoGa } from "@/components/analytics/ga";
import { MSG_WHATSAPP, whatsappBR } from "@/lib/visitante/whatsapp";

export function CadastroVisitanteClient({ codigo, depois = null }: { codigo: string; depois?: string | null }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cidade, setCidade] = useState("");
  const [perto, setPerto] = useState<"sim" | "nao" | "nao_sei" | "">("");
  const [senha, setSenha] = useState("");
  const [aceite, setAceite] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (nome.trim().length < 2) return setErro("Digite seu nome.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErro("Digite um e-mail válido.");
    if (!whatsappBR(whatsapp)) return setErro(MSG_WHATSAPP);
    if (cidade.trim().length < 2) return setErro("Digite a sua cidade.");
    if (senha.length < 8) return setErro("A senha precisa de pelo menos 8 caracteres.");
    if (!aceite) return setErro("Para continuar, aceite a política de privacidade.");
    setEnviando(true);
    try {
      const r = await fetch("/api/public/convite/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, nome: nome.trim(), email: email.trim(), whatsapp: whatsapp.trim(), cidade: cidade.trim(), ...(perto ? { perto_alphaville: perto } : {}), senha, aceite_privacidade: true }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; entrarPeloEmail?: boolean };
      if (!r.ok) throw new Error(j.error ?? "Não foi possível criar a conta agora.");
      eventoGa("sign_up", { method: "convite" });
      // O e-mail já tinha login (sem cadastro): a senha nova não vale; cria a senha pelo e-mail.
      if (j.entrarPeloEmail) {
        window.location.href = `/login?conta=existente&email=${encodeURIComponent(email.trim().toLowerCase())}&next=${encodeURIComponent(depois ?? "/aluno/boas-vindas")}`;
        return;
      }
      const { error } = await createSupabaseBrowserClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
      if (error) {
        window.location.href = `/login?next=${encodeURIComponent(depois ?? "/aluno/boas-vindas")}`;
        return;
      }
      window.location.href = depois ?? "/aluno/boas-vindas";
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível criar a conta agora.");
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="nome">Seu nome</Label>
        <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" required autoFocus />
      </div>
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" required />
      </div>
      <div>
        <Label htmlFor="whatsapp">WhatsApp com DDD (fora do Brasil: + código do país)</Label>
        <Input id="whatsapp" type="tel" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 98765-4321" autoComplete="tel" required />
        <FieldHint>Para o Montinho falar com você sobre o seu acesso e os desafios.</FieldHint>
      </div>
      <div>
        <Label htmlFor="cidade">Sua cidade</Label>
        <Input id="cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Ex.: Barueri, São Paulo, Curitiba" autoComplete="address-level2" required />
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Você conseguiria ir a Alphaville (Barueri/SP) para uma aula presencial?</legend>
        <div className="grid grid-cols-3 gap-2">
          {([["sim", "Sim"], ["nao", "Não"], ["nao_sei", "Não sei"]] as const).map(([v, r]) => (
            <button key={v} type="button" onClick={() => setPerto(v)} aria-pressed={perto === v} className={`touch rounded-lg border px-3 py-2 text-sm font-semibold ${perto === v ? "border-accent bg-accent/15 text-accent" : "border-border text-fg-muted"}`}>
              {r}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <Label htmlFor="senha">Crie uma senha</Label>
        <InputSenha id="senha" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Pelo menos 8 caracteres" autoComplete="new-password" required />
        <FieldHint>Você vai usar o e-mail e esta senha para entrar no app.</FieldHint>
      </div>
      <label className="flex items-start gap-3 text-sm text-fg-muted">
        <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--color-accent)]" />
        <span>
          Li e aceito a{" "}
          <Link href="/privacidade" target="_blank" className="alvo text-accent underline-offset-2 hover:underline">
            política de privacidade
          </Link>
          .
        </span>
      </label>
      {erro ? (
        <p className="text-sm text-danger" role="alert">
          {erro}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={enviando}>
        {enviando ? "Criando sua conta…" : "Criar minha conta"}
      </Button>
      <p className="text-center text-sm text-fg-muted">
        Já tenho conta: <Link href="/login" className="alvo text-accent underline-offset-2 hover:underline">entrar</Link>
      </p>
    </form>
  );
}
