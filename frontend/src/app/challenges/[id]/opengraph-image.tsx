import { ImageResponse } from "next/og";
import { publicApi } from "@/lib/server";
import type { Challenge } from "@/lib/types";

export const alt = "A community challenge on JanSetu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const challenge = await publicApi<Challenge>(`/public/challenges/${id}`);
  const title = challenge?.public_title_en || "Community challenge";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "linear-gradient(135deg, #14532d 0%, #166534 55%, #047857 100%)", color: "#f0fdf4", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, opacity: 0.85 }}>JANSETU · JHARKHAND</div>
        <div style={{ display: "flex", fontSize: title.length > 70 ? 56 : 68, fontWeight: 700, lineHeight: 1.15, maxWidth: 1000 }}>{title}</div>
        <div style={{ display: "flex", gap: 20, fontSize: 28, opacity: 0.85 }}>
          {[challenge?.district, challenge?.domain, challenge?.status].filter(Boolean).map(part => (
            <div key={String(part)} style={{ display: "flex", padding: "10px 24px", borderRadius: 999, background: "rgba(240,253,244,0.16)", textTransform: "capitalize" }}>{String(part).replace(/_/g, " ")}</div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
