"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { PerfilVisitante } from "@/lib/supabase/types";

type Opcao<T extends string | number> = { valor: T; rotulo: string };

const OBJETIVOS: Opcao<string>[] = [
  { valor: "hipertrofia", rotulo: "Ganhar massa muscular" },
  { valor: "emagrecimento", rotulo: "Emagrecer" },
  { valor: "condicionamento", rotulo: "Condicionamento" },
  { valor: "forca", rotulo: "Ficar mais forte" },
  { valor: "saude", rotulo: "Saúde e bem-estar" },
  { valor: "outro", rotulo: "Outro" },
];
const EXPERIENCIAS: Opcao<string>[] = [
  { valor: "iniciante", rotulo: "Estou começando" },
  { valor: "intermediario", rotulo: "Já treino há um tempo" },
  { valor: "avancado", rotulo: "Treino há anos" },
];
const LOCAIS: Opcao<string>[] = [
  { valor: "academia", rotulo: "Academia" },
  { valor: "condominio", rotulo: "Academia do prédio" },
  { valor: "casa", rotulo: "Em casa" },
  { valor: "outro", rotulo: "Outro lugar" },
];
const MINUTOS: Opcao<number>[] = [30, 45, 60, 75, 90].map((m) => ({ valor: m, rotulo: `${m} min` }));
const DIAS: Opcao<number>[] = [1, 2, 3, 4, 5, 6, 7].map((d) => ({ valor: d, rotulo: `${d}×` }));
const DIFICULDADES: Opcao<string>[] = [
  { valor: "constancia", rotulo: "Manter a constância" },
  { valor: "tempo", rotulo: "Falta de tempo" },
  { valor: "motivacao", rotulo: "Motivação" },
  { valor: "nao_sei_montar", rotulo: "Não sei montar o treino" },
  { valor: "nao_sei_executar", rotulo: "Dúvida na execução" },
  { valor: "sem_resultado", rotulo: "Não vejo resultado" },
];

function Chips<T extends string | number>({ opcoes, valor, onChange, multiplo }: { opcoes: Opcao<T>[]; valor: T | T[] | null; onChange: (v: T) => void; multiplo?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2" role={multiplo ? "group" : "radiogroup"}>
      {opcoes.map((o) => {
        const ativo = Array.isArray(valor) ? valor.includes(o.valor) : valor === o.valor;
        return (
          <button
            key={String(o.valor)}
            type="button"
            role={multiplo ? "checkbox" : "radio"}
            aria-checked={ativo}
            onClick={() => onChange(o.valor)}
            className={`min-h-11 rounded-full border px-4 text-sm transition-colors ${ativo ? "border-accent bg-accent-soft text-fg" : "border-border text-fg-muted hover:border-white/40"}`}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}

export function BoasVindasClient({ primeiroNome, inicial }: { primeiroNome: string; inicial: PerfilVisitante | null }) {
  const [objetivo, setObjetivo] = useState<string | null>(inicial?.objetivo ?? null);
  const [experiencia, setExperiencia] = useState<string | null>(inicial?.experiencia ?? null);
  const [dias, setDias] = useState<number | null>(inicial?.frequencia_semanal ?? 3);
  const [local, setLocal] = useState<string | null>(inicial?.local_treino ?? null);
  const [minutos, setMinutos] = useState<number | null>(inicial?.minutos_por_treino ?? 60);
  const [dificuldades, setDificuldades] = useState<string[]>(inicial?.dificuldades ?? []);
  const [desafios, setDesafios] = useState<boolean | null>(inicial?.interesse_desafios ?? null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const completo = objetivo && experiencia && dias && local && minutos && desafios !== null;

  async function salvar() {
    if (!completo) return setErro("Responda as perguntas para continuar.");
    setEnviando(true);
    setErro(null);
    const r = await fetch("/api/visitante/perfil", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objetivo, experiencia, frequencia_semanal: dias, local_treino: local, minutos_por_treino: minutos, dificuldades, interesse_desafios: desafios }),
    }).catch(() => null);
    if (!r?.ok) {
      setEnviando(false);
      return setErro("Não foi possível salvar agora. Tente de novo.");
    }
    window.location.href = "/aluno";
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Boas-vindas</p>
        <h1 className="text-2xl font-bold mt-1">{primeiroNome ? `Que bom ter você aqui, ${primeiroNome}!` : "Que bom ter você aqui!"}</h1>
        <p className="text-sm text-fg-muted mt-1">Seis perguntas rápidas para o app se ajustar a você. Leva menos de um minuto.</p>
      </header>
      <section className="space-y-2">
        <h2 className="font-semibold">Qual é o seu objetivo principal?</h2>
        <Chips opcoes={OBJETIVOS} valor={objetivo} onChange={setObjetivo} />
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">Como está a sua experiência com musculação?</h2>
        <Chips opcoes={EXPERIENCIAS} valor={experiencia} onChange={setExperiencia} />
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">Quantas vezes por semana você consegue treinar?</h2>
        <Chips opcoes={DIAS} valor={dias} onChange={setDias} />
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">Onde você treina?</h2>
        <Chips opcoes={LOCAIS} valor={local} onChange={setLocal} />
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">Quanto tempo você tem por treino?</h2>
        <Chips opcoes={MINUTOS} valor={minutos} onChange={setMinutos} />
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">O que mais atrapalha hoje? <span className="text-fg-subtle font-normal">(pode marcar mais de um)</span></h2>
        <Chips opcoes={DIFICULDADES} valor={dificuldades} multiplo onChange={(v) => setDificuldades((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v]))} />
      </section>
      <section className="space-y-2">
        <h2 className="font-semibold">Quer participar dos desafios do Montinho?</h2>
        <Chips<"sim" | "nao"> opcoes={[{ valor: "sim", rotulo: "Quero!" }, { valor: "nao", rotulo: "Agora não" }]} valor={desafios === null ? null : desafios ? "sim" : "nao"} onChange={(v) => setDesafios(v === "sim")} />
      </section>
      {erro ? <p className="text-sm text-danger" role="alert">{erro}</p> : null}
      <Button type="button" className="w-full" disabled={enviando} onClick={() => void salvar()}>
        {enviando ? "Salvando…" : "Começar"}
      </Button>
    </div>
  );
}
