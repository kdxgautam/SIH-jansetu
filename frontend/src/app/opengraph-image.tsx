import { ImageResponse } from "next/og";

export const alt = "JanSetu · Jharkhand Innovation Portal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "linear-gradient(135deg, #14532d 0%, #166534 55%, #047857 100%)", color: "#f0fdf4", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 6, opacity: 0.85 }}>JHARKHAND INNOVATION PORTAL</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 116, fontWeight: 700, lineHeight: 1.05 }}>JanSetu</div>
          <div style={{ fontSize: 40, marginTop: 22, maxWidth: 900, lineHeight: 1.3, opacity: 0.92 }}>Community challenges, university expertise and industry support, working on the same problem.</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, opacity: 0.75 }}>Citizens · Government · Universities · Industry</div>
      </div>
    ),
    size,
  );
}
