"use client";

import { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FieldHint, Input, Label } from "@/components/ui/Input";
import { whatsappBR } from "@/lib/visitante/whatsapp";

/** Aviso no início para o visitante que entrou antes do WhatsApp obrigatório. Some depois de salvar. */
export function PedirWhatsapp() {
  const [numero, setNumero] = useState("");
  const [estado, setEstado] = useState<"editando" | "enviando" | "salvo">("editando");
  const [erro, setErro] = useState<string | null>(null);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!whatsappBR(numero)) return setErro("Digite seu WhatsApp com DDD, ex.: (11) 98765-4321.");
    setEstado("enviando");
    const r = await fetch("/api/visitante/whatsapp", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ whatsapp: numero.trim() }) }).catch(() => null);
    if (!r?.ok) {
      const j = (await r?.json().catch(() => ({}))) as { error?: string } | undefined;
      setErro(j?.error ?? "Não foi possível salvar agora. Tente de novo.");
      return setEstado("editando");
    }
    setEstado("salvo");
  }

  if (estado === "salvo")
    return (
      <Card className="border-accent/40">
        <CardBody>
          <p className="text-sm font-semibold">Pronto, WhatsApp salvo! ✅</p>
        </CardBody>
      </Card>
    );

  return (
    <Card className="border-accent/50">
      <CardBody>
        <form onSubmit={salvar} className="space-y-3" noValidate>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-accent">Falta só uma coisa</p>
            <h2 className="mt-1 font-bold leading-tight">Qual é o seu WhatsApp?</h2>
          </div>
          <div>
            <Label htmlFor="whatsapp-visitante">WhatsApp com DDD</Label>
            <Input id="whatsapp-visitante" type="tel" inputMode="tel" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="(11) 98765-4321" autoComplete="tel-national" required />
            <FieldHint>Para o Montinho falar com você sobre o seu acesso e os desafios.</FieldHint>
          </div>
          {erro ? (
            <p className="text-sm text-danger" role="alert">
              {erro}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={estado === "enviando"}>
            {estado === "enviando" ? "Salvando…" : "Salvar meu WhatsApp"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
