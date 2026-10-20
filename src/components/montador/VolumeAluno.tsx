"use client";

// Volume semanal do plano ativo no perfil do aluno: mesma tabela e mesmas
// regras do montador (técnicas, deltoides separados, ponderado), só leitura.

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { TabelaVolumeConteudo } from "@/components/montador/TabelaVolume";
import { usePreferenciasVolume } from "@/components/montador/usePreferenciasVolume";
import { calcularVolumeSemanal, type DiaVolume, type Frequencia, type MetaVolume } from "@/lib/volume/calcular";
import type { GrupoMuscular } from "@/lib/supabase/types-extended";

type Props = {
  dias: DiaVolume[];
  frequencia: Frequencia;
  metas: Partial<Record<GrupoMuscular, MetaVolume>>;
  prioridades: string[];
  nivel: string | null;
  editarHref: string;
};

export function VolumeAluno({ dias, frequencia, metas, prioridades, nivel, editarHref }: Props) {
  const { regraTecnicas, setRegraTecnicas, ajustarPorRir, setAjustarPorRir } = usePreferenciasVolume();
  const [incluirSecundario, setIncluirSecundario] = useState(false);
  const resultado = useMemo(
    () => calcularVolumeSemanal(dias, { frequencia, metas, incluirSecundario, agruparOmbros: false, regraTecnicas, ajustarPorRir }),
    [dias, frequencia, metas, incluirSecundario, regraTecnicas, ajustarPorRir]
  );

  return (
    <Card>
      <CardHeader className="flex items-center justify-between gap-2">
        <CardTitle className="text-base">Volume semanal programado</CardTitle>
        <Link href={editarHref} className="text-xs font-semibold text-accent hover:underline">
          Editar no montador
        </Link>
      </CardHeader>
      <CardBody className="p-0">
        <TabelaVolumeConteudo
          resultado={resultado}
          metas={metas}
          prioridades={prioridades}
          nivel={nivel}
          incluirSecundario={incluirSecundario}
          onSecundario={setIncluirSecundario}
          regraTecnicas={regraTecnicas}
          onRegraTecnicas={setRegraTecnicas}
          ajustarPorRir={ajustarPorRir}
          onAjustarPorRir={setAjustarPorRir}
          semTitulo
        />
      </CardBody>
    </Card>
  );
}
