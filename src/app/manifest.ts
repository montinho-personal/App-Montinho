import type { MetadataRoute } from "next";
import { BRAND } from "@/config/brand";

// Permite "Adicionar à Tela de Início" (no iPhone, necessário para receber notificações).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} Personal Trainer`,
    short_name: BRAND.name,
    description: "Treinos, registro e evolução com o Montinho.",
    start_url: "/aluno",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "pt-BR",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
