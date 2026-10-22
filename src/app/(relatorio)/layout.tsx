// Relatório premium: documento sem menu do app (vira PDF pelo “Baixar PDF”).
export default function RelatorioLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 bg-[#e9e6df] print:bg-white">{children}</div>;
}
