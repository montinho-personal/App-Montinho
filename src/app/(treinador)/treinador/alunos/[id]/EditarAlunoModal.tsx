"use client";

// Edição dos dados cadastrais do aluno: nome, WhatsApp, status e datas.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import type { AlunoStatus } from "@/lib/supabase/types";

type Dados = { nome: string; telefone: string; status: AlunoStatus; data_nascimento: string; data_inicio: string; acesso_ate: string; objetivo: string };

const STATUS: Array<{ v: AlunoStatus; rotulo: string; ajuda: string }> = [
  { v: "ativo", rotulo: "Ativo", ajuda: "Treinando e acompanhado." },
  { v: "pendente", rotulo: "Pendente", ajuda: "Cadastro ou acesso ainda não concluído." },
  { v: "inadimplente", rotulo: "Inadimplente", ajuda: "Pagamento em aberto." },
  { v: "pausado", rotulo: "Pausado", ajuda: "Pausa combinada (férias, lesão…)." },
  { v: "arquivado", rotulo: "Arquivado", ajuda: "Não acompanha mais (histórico preservado)." },
];

const sel = "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/50";

export function EditarAlunoButton({ alunoId, inicial, className, children }: { alunoId: string; inicial: Dados; className?: string; children?: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      {className ? (
        <button type="button" onClick={() => setAberto(true)} className={className}>
          {children}
        </button>
      ) : (
        <Button variant="secondary" onClick={() => setAberto(true)}>Editar dados</Button>
      )}
      {aberto ? <EditarAlunoModal alunoId={alunoId} inicial={inicial} onClose={() => setAberto(false)} /> : null}
    </>
  );
}

function EditarAlunoModal({ alunoId, inicial, onClose }: { alunoId: string; inicial: Dados; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState<Dados>(inicial);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const set = (k: keyof Dados, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    const res = await fetch(`/api/alunos/${alunoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: form.nome.trim(), telefone: form.telefone.trim(), status: form.status, data_nascimento: form.data_nascimento, data_inicio: form.data_inicio, acesso_ate: form.acesso_ate, objetivo: form.objetivo.trim() }),
    }).catch(() => null);
    setSalvando(false);
    if (!res?.ok) {
      const d = await res?.json().catch(() => ({}));
      setErro(d?.error ?? "Não foi possível salvar.");
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="editar-aluno-titulo">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 id="editar-aluno-titulo" className="text-xl font-bold">Editar dados</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="alvo text-fg-muted hover:text-fg text-2xl leading-none">✕</button>
        </div>
        <form onSubmit={(e) => void salvar(e)} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="e-nome">Nome completo</Label>
              <Input id="e-nome" value={form.nome} onChange={(e) => set("nome", e.target.value)} required minLength={2} />
            </div>
            <div>
              <Label htmlFor="e-tel">Telefone / WhatsApp</Label>
              <Input id="e-tel" type="tel" inputMode="tel" value={form.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="+55 11 9xxxx-xxxx" />
            </div>
            <div>
              <Label htmlFor="e-status">Status</Label>
              <select id="e-status" value={form.status} onChange={(e) => set("status", e.target.value)} className={sel}>
                {STATUS.map((s) => <option key={s.v} value={s.v}>{s.rotulo}</option>)}
              </select>
              <p className="text-[11px] text-fg-subtle mt-1">{STATUS.find((s) => s.v === form.status)?.ajuda}</p>
            </div>
            <div>
              <Label htmlFor="e-nasc">Data de nascimento</Label>
              <Input id="e-nasc" type="date" value={form.data_nascimento} onChange={(e) => set("data_nascimento", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="e-inicio">Início</Label>
              <Input id="e-inicio" type="date" value={form.data_inicio} onChange={(e) => set("data_inicio", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="e-acesso">Acesso até</Label>
              <Input id="e-acesso" type="date" value={form.acesso_ate} onChange={(e) => set("acesso_ate", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="e-obj">Objetivo</Label>
              <Input id="e-obj" value={form.objetivo} onChange={(e) => set("objetivo", e.target.value)} />
            </div>
          </div>
          {erro ? <p className="text-sm text-red rounded-xl bg-red/10 px-4 py-2" role="alert">{erro}</p> : null}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={salvando || form.nome.trim().length < 2}>{salvando ? "Salvando…" : "Salvar"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
