// Capa do app para prévias de link (WhatsApp, Instagram, iMessage...).
// Leva o logo oficial completo (public/brand/logo.svg), bem visível.
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Montinho Personal Trainer — app de treino";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const svg = await readFile(join(process.cwd(), "public/brand/logo.svg"));
  const logo = `data:image/svg+xml;base64,${svg.toString("base64")}`;
  const ouro = "#BA9E50";
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 38%, #2a2416 0%, #111111 46%, #070707 100%)",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", inset: 28, border: `2px solid ${ouro}55`, borderRadius: 28, display: "flex" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={520} height={356} alt="" style={{ marginTop: -10 }} />
        <div style={{ marginTop: 26, fontSize: 40, fontWeight: 800, color: ouro, letterSpacing: 1, display: "flex" }}>Seu treino, do jeito do Montinho</div>
        <div style={{ marginTop: 14, fontSize: 27, fontStyle: "italic", color: "#bdbdbd", display: "flex" }}>“Não é só sobre começar. É sobre conseguir continuar.”</div>
      </div>
    ),
    { ...size },
  );
}
