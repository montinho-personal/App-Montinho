"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import { ImportarEstrategia, salvarEstrategiaNoAluno, type Lida } from "@/components/estrategia/ImportarEstrategia";

type FormState = {
  nome: string;
  email: string;
  telefone: string;
  data_nascimento: string;
  sexo: "" | "M" | "F";
  objetivo: string;
  observacoes: string;
  data_inicio: string;
  acesso_ate: string;
};

const initial: FormState = {
  nome: "",
  email: "",
  telefone: "",
  data_nascimento: "",
  sexo: "",
  objetivo: "",
  observacoes: "",
  data_inicio: new Date().toISOString().slice(0, 10),
  acesso_ate: "",
};

export function NovoAlunoButton() {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setAberto(true)}>+ Novo aluno</Button>
      {aberto ? <NovoAlunoModal onClose={() => setAberto(false)} /> : null}
    </>
  );
}

function NovoAlunoModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [lida, setLida] = useState<Lida | null>(null);

  function aoLer(l: Lida | null) {
    setLida(l);
    const e = l?.estrategia;
    if (!e) return;
    setForm((f) => ({ ...f, nome: f.nome || e.aluno || "", objetivo: f.objetivo || e.objetivo || "" }));
  }

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim() || !form.email.trim()) return;
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/alunos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome.trim(),
          email: form.email.trim(),
          telefone: form.telefone.trim() || null,
          data_nascimento: form.data_nascimento || null,
          sexo: form.sexo || null,
          objetivo: form.objetivo.trim() || null,
          observacoes: form.observacoes.trim() || null,
          data_inicio: form.data_inicio || null,
          acesso_ate: form.acesso_ate || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErro(data.error ?? "Erro ao criar aluno");
        return;
      }
      const criado = await res.json().catch(() => null);
      if (lida && criado?.id) {
        const r = await salvarEstrategiaNoAluno(criado.id, lida);
        if (!r.ok) {
          setErro(`Aluno criado, mas a estratégia não foi salva: ${r.error} Importe de novo no perfil do aluno.`);
          router.refresh();
          return;
        }
        router.push(`/treinador/alunos/${criado.id}`);
        onClose();
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setErro("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold">Novo aluno</h2>
          <button onClick={onClose} className="alvo text-fg-muted hover:text-fg text-2xl leading-none">✕</button>
        </div>
        <form onSubmit={(e) => { void handleSubmit(e); }} className="p-6 space-y-4">
          <ImportarEstrategia lida={lida} onLida={aoLer} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="a-nome">Nome completo *</Label>
              <Input id="a-nome" value={form.nome} onChange={(e) => set("nome", e.target.value)} required autoFocus />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="a-email">E-mail *</Label>
              <Input id="a-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
              <p className="text-[11px] text-fg-subtle mt-1">O aluno receberá convite por e-mail para acessar o app.</p>
            </div>
            <div>
              <Label htmlFor="a-tel">Telefone / WhatsApp</Label>
              <Input id="a-tel" value={form.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="(xx) 9xxxx-xxxx" />
            </div>
            <div>
              <Label htmlFor="a-nasc">Data de nascimento</Label>
              <Input id="a-nasc" type="date" value={form.data_nascimento} onChange={(e) => set("data_nascimento", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="a-sexo">Sexo</Label>
              <select
                id="a-sexo"
                value={form.sexo}
                onChange={(e) => set("sexo", e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                <option value="">Não informado</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
            <div>
              <Label htmlFor="a-inicio">Início</Label>
              <Input id="a-inicio" type="date" value={form.data_inicio} onChange={(e) => set("data_inicio", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="a-acesso">Acesso até</Label>
              <Input id="a-acesso" type="date" value={form.acesso_ate} onChange={(e) => set("acesso_ate", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="a-objetivo">Objetivo</Label>
              <Input id="a-objetivo" value={form.objetivo} onChange={(e) => set("objetivo", e.target.value)} placeholder="Ex: emagrecimento, hipertrofia, resistência..." />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="a-obs">Observações</Label>
              <textarea
                id="a-obs"
                value={form.observacoes}
                onChange={(e) => set("observacoes", e.target.value)}
                rows={3}
                placeholder="Lesões, histórico, restrições..."
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
              />
            </div>
          </div>

          {erro ? <p className="text-sm text-red rounded-xl bg-red/10 px-4 py-2">{erro}</p> : null}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={loading || !form.nome.trim() || !form.email.trim()}>
              {loading ? "Criando..." : "Criar aluno"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
