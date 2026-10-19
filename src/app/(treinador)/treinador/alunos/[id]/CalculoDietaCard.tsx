"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

type Resultado = {
  proteina_g: number;
  gordura_g: number;
  carbo_g: number;
  calorias_alvo: number;
};

export function CalculoDietaCard({
  alunoId,
  pesoInicial,
}: {
  alunoId: string;
  pesoInicial?: number | null;
}) {
  const toast = useToast();
  const [peso, setPeso] = useState(pesoInicial ? String(pesoInicial) : "");
  const [calorias, setCalorias] = useState("");
  const [proteina, setProteina] = useState("2.2");
  const [gordura, setGordura] = useState("0.5");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [loading, setLoading] = useState(false);

  async function calcular() {
    setLoading(true);
    try {
      const res = await fetch("/api/dieta/calculo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aluno_id: alunoId,
          peso_kg: Number(peso.replace(",", ".")),
          calorias_alvo: calorias ? Number(calorias) : undefined,
          proteina_g_por_kg: Number(proteina.replace(",", ".")),
          gordura_g_por_kg: Number(gordura.replace(",", ".")),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Erro ao calcular dieta");
      setResultado(data.resultado);
      toast.success("Meta de macros calculada e registrada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao calcular dieta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-accent/20">
      <CardHeader>
        <CardTitle>Calculadora do método Pedro</CardTitle>
        <p className="text-xs text-fg-muted">
          Base editável: proteína 2,2 g/kg e gordura 0,5 g/kg. Carboidrato fecha as calorias.
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <Label>Peso atual (kg)</Label>
            <Input value={peso} onChange={(e) => setPeso(e.target.value)} inputMode="decimal" />
          </div>
          <div>
            <Label>Calorias alvo</Label>
            <Input value={calorias} onChange={(e) => setCalorias(e.target.value)} inputMode="numeric" placeholder="auto" />
          </div>
          <div>
            <Label>Proteína g/kg</Label>
            <Input value={proteina} onChange={(e) => setProteina(e.target.value)} inputMode="decimal" />
          </div>
          <div>
            <Label>Gordura g/kg</Label>
            <Input value={gordura} onChange={(e) => setGordura(e.target.value)} inputMode="decimal" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="primary" onClick={calcular} loading={loading}>
            Calcular macros
          </Button>
        </div>
        {resultado ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Macro label="Proteína" value={`${resultado.proteina_g}g`} />
            <Macro label="Gordura" value={`${resultado.gordura_g}g`} />
            <Macro label="Carboidrato" value={`${resultado.carbo_g}g`} />
            <Macro label="Calorias" value={`${resultado.calorias_alvo} kcal`} />
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function Macro({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg px-3 py-3">
      <div className="text-[10px] uppercase tracking-wider text-fg-subtle">{label}</div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
}
