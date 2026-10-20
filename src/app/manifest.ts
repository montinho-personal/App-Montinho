import type { MetadataRoute } from "next";
import { BRAND } from "@/config/brand";

// Permite "Adicionar à Tela de Início" (no iPhone, necessário para receber notificações).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} Personal Trainer`,
    // Nome embaixo do ícone na tela inicial.
    short_name: `${BRAND.name} Personal`,
    description: "Treinos, registro e evolução com o Montinho.",
    start_url: "/aluno",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "pt-BR",
    // Ícone do app instalado: logo oficial (public/brand/logo.svg), tudo dentro da área segura
    // (80% central), então serve também como “maskable” (Android recorta em círculo/squircle).
    icons: [
      { src: "/icons/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icone-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
