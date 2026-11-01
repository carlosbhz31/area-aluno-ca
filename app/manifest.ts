import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Área do Aluno CA",
    short_name: "Aluno CA",
    description: "Consultoria Premium Carlos Alberto",
    start_url: "/",
    display: "standalone",
    background_color: "#090909",
    theme_color: "#090909",
    lang: "pt-BR",
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
