import type { AlunoStatus, PagamentoStatus } from "@/lib/supabase/types";
import { Badge } from "./Badge";

const ALUNO_LABEL: Record<AlunoStatus, string> = {
  ativo: "Ativo",
  pendente: "Pendente",
  inadimplente: "Inadimplente",
  pausado: "Pausado",
  arquivado: "Arquivado",
};

const ALUNO_TONE: Record<AlunoStatus, React.ComponentProps<typeof Badge>["tone"]> = {
  ativo: "success",
  pendente: "gold",
  inadimplente: "red",
  pausado: "neutral",
  arquivado: "neutral",
};

export function AlunoStatusPill({ status }: { status: AlunoStatus }) {
  return <Badge tone={ALUNO_TONE[status]}>{ALUNO_LABEL[status]}</Badge>;
}

const PAG_LABEL: Record<PagamentoStatus, string> = {
  pago: "Pago",
  pendente: "Pendente",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
  falhou: "Falhou",
};

const PAG_TONE: Record<PagamentoStatus, React.ComponentProps<typeof Badge>["tone"]> = {
  pago: "success",
  pendente: "gold",
  atrasado: "red",
  cancelado: "neutral",
  falhou: "red",
};

export function PagamentoStatusPill({ status }: { status: PagamentoStatus }) {
  return <Badge tone={PAG_TONE[status]}>{PAG_LABEL[status]}</Badge>;
}
