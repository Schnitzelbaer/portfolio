/**
 * Generates neutral placeholder images for the dummy content.
 * Usage: npx tsx scripts/make-placeholders.ts
 * Real images replace these later; the script is kept so dummy content can be regenerated.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";

type Kind = "cover" | "mobile" | "desktop" | "diagram";

interface Spec {
  file: string;
  label: string;
  kind: Kind;
  hue: number;
  width?: number;
  height?: number;
}

const projects: Record<string, Spec[]> = {
  "swissgeol-assets": [{ file: "cover.jpg", label: "swissgeol assets", kind: "desktop", hue: 30 }],
  "ledger-onboarding": [
    { file: "cover.jpg", label: "Brightvale onboarding", kind: "cover", hue: 152 },
    { file: "images/flow-before.jpg", label: "Onboarding v1 · 14 steps", kind: "mobile", hue: 10 },
    { file: "images/flow-after.jpg", label: "Onboarding v2 · 6 steps", kind: "mobile", hue: 152 },
    { file: "images/id-check.jpg", label: "ID check", kind: "mobile", hue: 200 },
    { file: "images/funding.jpg", label: "First deposit", kind: "mobile", hue: 170 },
    {
      file: "images/journey-map.jpg",
      label: "Journey map",
      kind: "diagram",
      hue: 220,
      width: 2200,
      height: 1100,
    },
    { file: "images/variant-a.jpg", label: "Variant A · progress bar", kind: "mobile", hue: 260 },
    { file: "images/variant-b.jpg", label: "Variant B · checklist", kind: "mobile", hue: 290 },
    { file: "images/dashboard.jpg", label: "Account home", kind: "desktop", hue: 152 },
    { file: "images/risk-model.jpg", label: "Risk scoring model", kind: "diagram", hue: 0 },
  ],
  "transit-planner": [
    { file: "cover.jpg", label: "Lakeline journey planner", kind: "cover", hue: 205 },
    { file: "images/planner.jpg", label: "Trip planner", kind: "desktop", hue: 205 },
  ],
  "care-scheduling": [
    { file: "cover.jpg", label: "Kindred shift planning", kind: "cover", hue: 28 },
    { file: "images/roster.jpg", label: "Weekly roster", kind: "desktop", hue: 28 },
    { file: "images/handover.jpg", label: "Shift handover", kind: "mobile", hue: 40 },
  ],
  "energy-dashboard": [
    { file: "cover.jpg", label: "Voltaro energy insights", kind: "cover", hue: 48 },
    { file: "images/overview.jpg", label: "Portfolio overview", kind: "desktop", hue: 48 },
  ],
  "design-system": [
    { file: "cover.jpg", label: "Orbis design system", kind: "cover", hue: 275 },
    { file: "images/tokens.jpg", label: "Token architecture", kind: "diagram", hue: 275 },
  ],
};

const xmlEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

function svg({ label, kind, hue, width, height }: Spec, w: number, h: number): string {
  const bg = `hsl(${hue} 22% 16%)`;
  const glow = `hsl(${hue} 45% 38%)`;
  const surface = `hsl(${hue} 18% 94%)`;
  const ink = `hsl(${hue} 20% 30%)`;
  const accent = `hsl(${hue} 55% 46%)`;
  const rows = Array.from({ length: 6 }, (_, i) => i);
  let device = "";
  if (kind === "mobile" || kind === "cover") {
    const pw = Math.round(Math.min(w * 0.36, h * 0.42));
    const ph = Math.round(pw * 2.05);
    const x = Math.round(w / 2 - pw / 2);
    const y = Math.round(h * 0.5 - ph / 2 + (kind === "cover" ? h * 0.08 : 0));
    device = `
      <rect x="${x}" y="${y}" width="${pw}" height="${ph}" rx="${pw * 0.12}" fill="${surface}"/>
      <rect x="${x + pw * 0.3}" y="${y + pw * 0.05}" width="${pw * 0.4}" height="${pw * 0.09}" rx="${pw * 0.045}" fill="#111"/>
      <rect x="${x + pw * 0.1}" y="${y + pw * 0.3}" width="${pw * 0.8}" height="${pw * 0.42}" rx="${pw * 0.05}" fill="${accent}"/>
      ${rows
        .map(
          (i) =>
            `<rect x="${x + pw * 0.1}" y="${y + pw * (0.86 + i * 0.17)}" width="${pw * (0.8 - (i % 3) * 0.15)}" height="${pw * 0.07}" rx="${pw * 0.035}" fill="${ink}" opacity="${0.35 - i * 0.03}"/>`,
        )
        .join("")}`;
  } else if (kind === "desktop") {
    const dw = Math.round(w * 0.78);
    const dh = Math.round(dw * 0.6);
    const x = Math.round((w - dw) / 2);
    const y = Math.round((h - dh) / 2);
    device = `
      <rect x="${x}" y="${y}" width="${dw}" height="${dh}" rx="${dw * 0.012}" fill="${surface}"/>
      <rect x="${x}" y="${y}" width="${dw * 0.2}" height="${dh}" rx="${dw * 0.012}" fill="${ink}" opacity="0.12"/>
      <rect x="${x + dw * 0.25}" y="${y + dh * 0.08}" width="${dw * 0.3}" height="${dh * 0.06}" rx="6" fill="${ink}" opacity="0.5"/>
      ${[0, 1, 2]
        .map(
          (i) =>
            `<rect x="${x + dw * (0.25 + i * 0.245)}" y="${y + dh * 0.2}" width="${dw * 0.22}" height="${dh * 0.22}" rx="10" fill="${i === 0 ? accent : ink}" opacity="${i === 0 ? 0.9 : 0.15}"/>`,
        )
        .join("")}
      <rect x="${x + dw * 0.25}" y="${y + dh * 0.48}" width="${dw * 0.69}" height="${dh * 0.42}" rx="10" fill="${ink}" opacity="0.1"/>`;
  } else {
    const nodes = [0.15, 0.38, 0.62, 0.85];
    device = nodes
      .map((nx, i) => {
        const cx = w * nx;
        const cy = h * (i % 2 ? 0.42 : 0.58);
        const next = nodes[i + 1];
        const line = next
          ? `<line x1="${cx}" y1="${cy}" x2="${w * next}" y2="${h * (i % 2 ? 0.58 : 0.42)}" stroke="${surface}" stroke-opacity="0.5" stroke-width="${w * 0.003}"/>`
          : "";
        return `${line}<circle cx="${cx}" cy="${cy}" r="${h * 0.08}" fill="${i === 1 ? accent : surface}" opacity="0.9"/>`;
      })
      .join("");
  }
  void width;
  void height;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs><radialGradient id="g" cx="30%" cy="20%" r="90%"><stop offset="0" stop-color="${glow}"/><stop offset="1" stop-color="${bg}"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    ${device}
    <text x="${w * 0.05}" y="${h * 0.09}" font-family="DejaVu Sans Mono, monospace" font-size="${Math.round(h * 0.035)}" fill="${surface}" fill-opacity="0.75" letter-spacing="2">${xmlEscape(label.toUpperCase())}</text>
  </svg>`;
}

for (const [slug, specs] of Object.entries(projects)) {
  for (const spec of specs) {
    const [w, h] =
      spec.width && spec.height
        ? [spec.width, spec.height]
        : spec.kind === "mobile"
          ? [1200, 1500]
          : spec.kind === "cover"
            ? [1600, 1200]
            : [2000, 1250];
    const out = join("content", "work", slug, spec.file);
    mkdirSync(dirname(out), { recursive: true });
    await sharp(Buffer.from(svg(spec, w, h)))
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(out);
    console.log(out);
  }
}
