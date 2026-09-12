import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "JanSetu · Jharkhand Innovation Portal",
    short_name: "JanSetu",
    description: "Report a community challenge and follow how universities and industry partners take it forward.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#15803d",
    lang: "en",
    categories: ["government", "education", "social"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Submit a challenge", url: "/workspace/new" },
      { name: "Explore challenges", url: "/challenges" },
    ],
  };
}
