"use client";

import { useState } from "react";
import { CampoNumero } from "@/components/ui/CampoNumero";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import type { TemplateTreino } from "@/lib/supabase/types-extended";
import {
  gerarPrescricao,
  type DadosPrescricao,
  type Objetivo,
  type NivelExperiencia,
  type ResultadoPrescricao,
  type Sexo,
} from "@/lib/prescricao";

// ---------------------------------------------------------------------------
// Opções
// ---------------------------------------------------------------------------
const OBJETIVOS: { valor: Objetivo; label: string; emoji: string }[] = [
  { valor: "hipertrofia",    label: "Hipertrofia",       emoji: "💪" },
  { valor: "emagrecimento",  label: "Emagrecimento",     emoji: "🔥" },
  { valor: "forca",          label: "Força",             emoji: "🏋️" },
  { valor: "condicionamento",label: "Condicionamento",   emoji: "🏃" },
  { valor: "manutencao",     label: "Manutenção",        emoji: "⚖️" },
  { valor: "reabilitacao",   label: "Reabilitação",      emoji: "🩺" },
];

const NIVEIS: { valor: NivelExperiencia; label: string; desc: string }[] = [
  { valor: "iniciante",     label: "Iniciante",     desc: "0 – 12 meses de treino" },
  { valor: "intermediario", label: "Intermediário",  desc: "1 – 3 anos de treino" },
  { valor: "avancado",      label: "Avançado",       desc: "3+ anos de treino consistente" },
];

const VOLUME_LABELS = {
  MEV: { label: "MEV — Mínimo Efetivo de Volume", color: "text-green-400" },
  MAV: { label: "MAV — Volume Adaptativo Máximo", color: "text-accent" },
  MRV: { label: "MRV — Volume Máximo Recuperável", color: "text-red-400" },
};

// ---------------------------------------------------------------------------
// Formulário
// ---------------------------------------------------------------------------
const FORM_INICIAL: DadosPrescricao = {
  peso_kg: 70,
  altura_cm: 170,
  idade_anos: 30,
  sexo: "masculino",
  objetivo: "hipertrofia",
  dias_semana: 4,
  nivel: "iniciante",
  lesoes: "",
  equipamentos_disponiveis: "",
};

type Props = { templates: TemplateTreino[] };

export function PrescricaoClient({ templates }: Props) {
  const [form, setForm] = useState<DadosPrescricao>(FORM_INICIAL);
  const [resultado, setResultado] = useState<ResultadoPrescricao | null>(null);
  const [mostrarRefs, setMostrarRefs] = useState(false);

  function gerar() {
    const res = gerarPrescricao(form, templates);
    setResultado(res);
  }

  function resetar() {
    setResultado(null);
    setMostrarRefs(false);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-fg">Prescrição Automática</h1>
        <p className="text-sm text-fg-muted mt-0.5">
          Insira os dados do aluno e o sistema recomenda o template mais adequado com base em evidências científicas.
        </p>
      </div>

      {!resultado ? (
        /* ── Formulário ── */
        <Card>
          <CardHeader>
            <CardTitle>Dados do Aluno</CardTitle>
          </CardHeader>
          <CardBody className="space-y-5">
            {/* Biometria */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label htmlFor="peso">Peso (kg)</Label>
                <CampoNumero id="peso" decimal min={20} max={300} valor={form.peso_kg}
                  onChange={(v) => setForm({ ...form, peso_kg: v })} className="h-11 w-full rounded-lg bg-bg border border-border px-4 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors" />
              </div>
              <div>
                <Label htmlFor="altura">Altura (cm)</Label>
                <CampoNumero id="altura" min={100} max={230} valor={form.altura_cm}
                  onChange={(v) => setForm({ ...form, altura_cm: v })} className="h-11 w-full rounded-lg bg-bg border border-border px-4 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors" />
              </div>
              <div>
                <Label htmlFor="idade">Idade</Label>
                <CampoNumero id="idade" min={10} max={100} valor={form.idade_anos}
                  onChange={(v) => setForm({ ...form, idade_anos: v })} className="h-11 w-full rounded-lg bg-bg border border-border px-4 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-colors" />
              </div>
              <div>
                <Label htmlFor="sexo">Sexo biológico</Label>
                <select id="sexo" value={form.sexo}
                  onChange={(e) => setForm({ ...form, sexo: e.target.value as Sexo })}
                  className="h-11 w-full rounded-lg bg-bg border border-border px-3 text-sm text-fg focus:outline-none focus:border-accent">
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                </select>
              </div>
            </div>

            {/* Objetivo */}
            <div>
              <Label>Objetivo principal</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                {OBJETIVOS.map((o) => (
                  <button key={o.valor} onClick={() => setForm({ ...form, objetivo: o.valor })}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      form.objetivo === o.valor
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-card text-fg-muted hover:text-fg hover:border-fg-subtle"
                    }`}>
                    <span>{o.emoji}</span> {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dias e Nível */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dias">Dias disponíveis por semana: <span className="text-accent font-bold">{form.dias_semana}x</span></Label>
                <input id="dias" type="range" min={2} max={6} value={form.dias_semana}
                  onChange={(e) => setForm({ ...form, dias_semana: Number(e.target.value) })}
                  className="w-full accent-accent mt-2" />
                <div className="flex justify-between text-xs text-fg-subtle mt-1">
                  <span>2x</span><span>3x</span><span>4x</span><span>5x</span><span>6x</span>
                </div>
              </div>

              <div>
                <Label>Nível de experiência</Label>
                <div className="space-y-1.5 mt-1">
                  {NIVEIS.map((n) => (
                    <button key={n.valor} onClick={() => setForm({ ...form, nivel: n.valor })}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
                        form.nivel === n.valor
                          ? "border-accent bg-accent/10"
                          : "border-border bg-card hover:border-fg-subtle"
                      }`}>
                      <span className={`font-medium ${form.nivel === n.valor ? "text-accent" : "text-fg"}`}>{n.label}</span>
                      <span className="text-xs text-fg-subtle">{n.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Lesões */}
            <div>
              <Label htmlFor="lesoes">Lesões ou restrições <span className="text-fg-subtle text-xs">(opcional)</span></Label>
              <Input id="lesoes" value={form.lesoes ?? ""} placeholder="Ex: dor no joelho direito, hérnia L4-L5..."
                onChange={(e) => setForm({ ...form, lesoes: e.target.value })} />
            </div>

            <Button onClick={gerar} size="lg" className="w-full">
              Gerar Prescrição
            </Button>
          </CardBody>
        </Card>
      ) : (
        /* ── Resultado ── */
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-bold text-fg">Resultado da Prescrição</h2>
            <Button variant="ghost" onClick={resetar}>← Nova Prescrição</Button>
          </div>

          {/* Template sugerido */}
          <Card className="border-accent/40 bg-accent/5">
            <CardBody className="p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-accent mb-1">
                Template Recomendado
              </div>
              <div className="text-xl font-black text-fg">{resultado.template_sugerido_nome}</div>
              <div className={`text-sm font-semibold mt-1 ${VOLUME_LABELS[resultado.nivel_volume_sugerido].color}`}>
                {VOLUME_LABELS[resultado.nivel_volume_sugerido].label}
              </div>
            </CardBody>
          </Card>

          {/* Calorias e Proteína */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardBody className="p-4 text-center">
                <div className="text-[10px] text-fg-subtle uppercase tracking-wider">Manutenção</div>
                <div className="text-2xl font-black font-mono text-fg mt-1">{resultado.caloria_manutencao}</div>
                <div className="text-xs text-fg-subtle">kcal/dia</div>
              </CardBody>
            </Card>
            <Card className="border-accent/30">
              <CardBody className="p-4 text-center">
                <div className="text-[10px] text-accent uppercase tracking-wider font-bold">Meta Calórica</div>
                <div className="text-2xl font-black font-mono text-accent mt-1">{resultado.caloria_alvo}</div>
                <div className="text-xs text-fg-subtle">kcal/dia</div>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="p-4 text-center">
                <div className="text-[10px] text-fg-subtle uppercase tracking-wider">Proteína</div>
                <div className="text-2xl font-black font-mono text-fg mt-1">{resultado.proteina_g_dia}g</div>
                <div className="text-xs text-fg-subtle">por dia</div>
              </CardBody>
            </Card>
          </div>

          {/* Justificativa */}
          <Card>
            <CardHeader>
              <CardTitle>Justificativa Científica</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {resultado.justificativa.map((j, i) => (
                <div key={i} className="flex gap-3 text-sm text-fg-muted leading-relaxed">
                  <span className="text-accent flex-shrink-0 font-bold">{i + 1}.</span>
                  <p>{j}</p>
                </div>
              ))}
            </CardBody>
          </Card>

          {/* Alerta lesão */}
          {resultado.observacoes_lesao && (
            <Card className="border-yellow-500/40 bg-yellow-500/5">
              <CardBody className="p-4">
                <p className="text-sm text-yellow-300 leading-relaxed">{resultado.observacoes_lesao}</p>
              </CardBody>
            </Card>
          )}

          {/* Referências */}
          <div>
            <button onClick={() => setMostrarRefs(!mostrarRefs)}
              className="alvo text-sm text-fg-subtle hover:text-fg transition-colors">
              {mostrarRefs ? "▲" : "▼"} Referências científicas ({resultado.referencias.length})
            </button>
            {mostrarRefs && (
              <Card className="mt-2">
                <CardBody className="space-y-2">
                  {resultado.referencias.map((r, i) => (
                    <p key={i} className="text-xs text-fg-subtle font-mono leading-relaxed">{r}</p>
                  ))}
                </CardBody>
              </Card>
            )}
          </div>

          {/* Ações */}
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => {
              if (resultado.template_sugerido_id) {
                window.location.href = `/treinador/templates?highlight=${resultado.template_sugerido_id}`;
              }
            }}>
              Ver Template Completo
            </Button>
            <Button variant="ghost" className="flex-1" onClick={resetar}>
              Nova Prescrição
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
