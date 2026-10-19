// Banner permanente do modo demonstração: deixa explícito que os dados são
// fictícios e ficam só em memória (somem ao reiniciar o servidor).
export function DemoBanner() {
  return (
    <div role="status" className="w-full bg-accent-soft border-b border-accent/30 text-[12px] text-fg-muted px-4 py-1.5 text-center">
      <span className="font-bold text-accent uppercase tracking-wider mr-2">Modo demonstração</span>
      Dados fictícios, guardados só em memória. Nada aqui é real.
    </div>
  );
}
