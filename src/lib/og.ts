import { readFile } from "node:fs/promises";
import { join } from "node:path";
import satori from "satori";
import sharp from "sharp";

/**
 * Open Graph images (1200×630), rendered at build time with Satori and rasterized with sharp.
 * Only public metadata goes in here: title, lead, client. Never body content.
 */
export interface OgInput {
  eyebrow: string;
  title: string;
  subtitle?: string | undefined;
  footer: string;
  locked?: boolean;
}

const fontDir = join(process.cwd(), "src", "assets", "og-fonts");
let fonts: Promise<Parameters<typeof satori>[1]["fonts"]> | undefined;

function loadFonts() {
  fonts ??= Promise.all([
    readFile(join(fontDir, "inter-latin-400-normal.woff")),
    readFile(join(fontDir, "inter-latin-600-normal.woff")),
    readFile(join(fontDir, "geist-mono-latin-500-normal.woff")),
  ]).then(([regular, semibold, mono]) => [
    { name: "Inter", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: semibold, weight: 600 as const, style: "normal" as const },
    { name: "Geist Mono", data: mono, weight: 500 as const, style: "normal" as const },
  ]);
  return fonts;
}

type Node = { type: string; props: Record<string, unknown> & { children?: unknown } };
const h = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, children },
});

export async function renderOg(input: OgInput): Promise<Buffer> {
  const lock = h(
    "div",
    { display: "flex", alignItems: "center", gap: 10, color: "#ececf1", fontSize: 22 },
    [
      h("div", { width: 14, height: 14, borderRadius: 3, background: "#ececf1" }),
      "Password protected",
    ],
  );
  const tree = h(
    "div",
    {
      width: 1200,
      height: 630,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "72px 80px",
      background: "#17161d",
      backgroundImage: "radial-gradient(circle at 85% 0%, #23402f 0%, #17161d 55%)",
      fontFamily: "Inter",
    },
    [
      h(
        "div",
        {
          display: "flex",
          alignItems: "center",
          gap: 14,
          fontFamily: "Geist Mono",
          fontSize: 22,
          letterSpacing: 2,
          color: "#93939c",
          textTransform: "uppercase",
        },
        [
          h("div", { width: 12, height: 12, borderRadius: 6, background: "#3fc77c" }),
          input.eyebrow,
        ],
      ),
      h("div", { display: "flex", flexDirection: "column", gap: 22 }, [
        h(
          "div",
          {
            fontSize: input.title.length > 48 ? 58 : 68,
            fontWeight: 600,
            color: "#f4f4f7",
            lineHeight: 1.1,
            letterSpacing: -1.5,
          },
          input.title,
        ),
        input.subtitle
          ? h(
              "div",
              { fontSize: 28, color: "#a6a6af", lineHeight: 1.4, maxWidth: 960 },
              input.subtitle,
            )
          : h("div", {}),
      ]),
      h(
        "div",
        {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "Geist Mono",
          fontSize: 20,
          letterSpacing: 2,
          color: "#8f8f98",
          textTransform: "uppercase",
        },
        [input.footer, input.locked ? lock : h("div", {})],
      ),
    ],
  );
  const svg = await satori(tree as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: await loadFonts(),
  });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

export function pngResponse(png: Buffer): Response {
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
}
