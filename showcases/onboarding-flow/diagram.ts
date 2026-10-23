import type { PrototypeHandle, TourStep } from "../../src/lib/tour/types";

/**
 * Explanatory animation built on the same tour mechanism as the prototypes.
 * Colors use the site tokens (custom properties inherit into the shadow root), so the diagram
 * follows the light and dark theme.
 */

const NODES = [
  { id: "start", label: "Start", note: "Overview of all steps" },
  { id: "details", label: "Details", note: "Required fields only" },
  { id: "id", label: "ID check", note: "Specific recovery hints" },
  { id: "funding", label: "Deposit", note: "Benefits first" },
  { id: "ready", label: "Ready", note: "Card on its way" },
] as const;

const CSS = `
:host { all: initial; }
svg { width: 100%; height: 100%; display: block; font-family: Inter, system-ui, sans-serif; }
.bg { fill: var(--bg, #17161d); }
.edge { fill: none; stroke: var(--border-strong, #3a3943); stroke-width: 2; }
.edge-on { fill: none; stroke: var(--accent, #3fc77c); stroke-width: 2; stroke-dasharray: var(--len); stroke-dashoffset: var(--len); transition: stroke-dashoffset .7s cubic-bezier(.2,.8,.2,1); }
.edge-on.on { stroke-dashoffset: 0; }
.loop { fill: none; stroke: var(--draft, #f59e0b); stroke-width: 2; stroke-dasharray: 5 6; opacity: 0; transition: opacity .4s; }
.loop.on { opacity: 1; animation: dash 1s linear infinite; }
@keyframes dash { to { stroke-dashoffset: -22; } }
.node rect { fill: var(--surface, #25252d); stroke: var(--border-strong, #3a3943); stroke-width: 1.5; transition: fill .4s, stroke .4s; }
.node text { fill: var(--text, #ececf1); font-size: 15px; font-weight: 600; }
.node .note { fill: var(--text-muted, #93939c); font-size: 12px; font-weight: 400; }
.node.done rect { stroke: var(--accent, #3fc77c); }
.node.active rect { fill: var(--accent-surface, #173527); stroke: var(--accent, #3fc77c); }
.node[data-highlight] rect { animation: pulse .9s ease-out; }
@keyframes pulse { 40% { stroke-width: 5; } }
.loop-label { fill: var(--draft, #f59e0b); font-size: 12px; opacity: 0; transition: opacity .4s; }
.loop-label.on { opacity: 1; }
`;

export function createDiagram(
  root: ShadowRoot,
  orientation: "horizontal" | "vertical",
): PrototypeHandle {
  const horizontal = orientation === "horizontal";
  const [w, h] = horizontal ? [1000, 340] : [390, 620];
  const node = { w: horizontal ? 150 : 230, h: 64 };
  const positions = NODES.map((_, i) =>
    horizontal
      ? { x: 40 + i * ((w - 80 - node.w) / (NODES.length - 1)), y: h / 2 - node.h / 2 + 30 }
      : { x: w / 2 - node.w / 2, y: 30 + i * ((h - 60 - node.h) / (NODES.length - 1)) },
  );
  const edgePath = (i: number) => {
    const a = positions[i];
    const b = positions[i + 1];
    if (!a || !b) return "";
    return horizontal
      ? `M${a.x + node.w} ${a.y + node.h / 2} L${b.x} ${b.y + node.h / 2}`
      : `M${a.x + node.w / 2} ${a.y + node.h} L${b.x + node.w / 2} ${b.y}`;
  };
  const idPos = positions[2] ?? { x: 0, y: 0 };
  const loop = horizontal
    ? `M${idPos.x + node.w * 0.3} ${idPos.y} C ${idPos.x + node.w * 0.3} ${idPos.y - 90}, ${idPos.x + node.w * 0.7} ${idPos.y - 90}, ${idPos.x + node.w * 0.7} ${idPos.y}`
    : `M${idPos.x + node.w} ${idPos.y + node.h * 0.3} C ${idPos.x + node.w + 60} ${idPos.y + node.h * 0.3}, ${idPos.x + node.w + 60} ${idPos.y + node.h * 0.7}, ${idPos.x + node.w} ${idPos.y + node.h * 0.7}`;
  const loopLabel = horizontal
    ? { x: idPos.x + node.w / 2, y: idPos.y - 76, anchor: "middle" }
    : { x: idPos.x + node.w + 12, y: idPos.y - 6, anchor: "end" };

  const svg = `
    <svg viewBox="0 0 ${w} ${h}" role="presentation">
      <rect class="bg" width="${w}" height="${h}"/>
      ${NODES.slice(0, -1)
        .map(
          (_, i) =>
            `<path class="edge" d="${edgePath(i)}"/><path class="edge-on" data-edge="${i}" d="${edgePath(i)}"/>`,
        )
        .join("")}
      <path class="loop" data-loop d="${loop}"/>
      <text class="loop-label" data-loop-label x="${loopLabel.x}" y="${loopLabel.y}" text-anchor="${loopLabel.anchor}">Retry with a hint</text>
      ${NODES.map((n, i) => {
        const p = positions[i] ?? { x: 0, y: 0 };
        return `<g class="node" data-node="${n.id}"><rect x="${p.x}" y="${p.y}" width="${node.w}" height="${node.h}" rx="14"/><text x="${p.x + 16}" y="${p.y + 27}">${n.label}</text><text class="note" x="${p.x + 16}" y="${p.y + 47}">${n.note}</text></g>`;
      }).join("")}
    </svg>`;

  const style = document.createElement("style");
  style.textContent = CSS;
  const wrap = document.createElement("div");
  wrap.style.cssText = "width:100%;height:100%";
  wrap.innerHTML = svg;
  root.replaceChildren(style, wrap);
  for (const edge of wrap.querySelectorAll<SVGPathElement>(".edge-on")) {
    edge.style.setProperty("--len", String(edge.getTotalLength?.() || 400));
  }

  const apply = (step: number, loopOn: boolean) => {
    NODES.forEach((n, i) => {
      const el = wrap.querySelector(`[data-node="${n.id}"]`);
      el?.classList.toggle("done", i < step);
      el?.classList.toggle("active", i === step);
    });
    wrap.querySelectorAll("[data-edge]").forEach((edge, i) => {
      edge.classList.toggle("on", i < step);
    });
    wrap.querySelector("[data-loop]")?.classList.toggle("on", loopOn);
    wrap.querySelector("[data-loop-label]")?.classList.toggle("on", loopOn);
  };
  let current = 0;
  apply(0, false);

  return {
    reset: () => {
      current = 0;
      apply(0, false);
    },
    setState(name, value) {
      if (name === "step") current = Number(value);
      apply(current, name === "loop" ? Boolean(value) : false);
    },
  };
}

export const tour: TourStep[] = [
  { type: "chapter", label: "Overview" },
  { type: "caption", text: "Everyone starts with the full picture." },
  { type: "highlight", target: "[data-node=start]" },
  { type: "chapter", label: "Details" },
  { type: "state", name: "step", value: 1 },
  { type: "caption", text: "Only the data the law requires." },
  { type: "highlight", target: "[data-node=details]" },
  { type: "chapter", label: "ID check" },
  { type: "state", name: "step", value: 2 },
  { type: "caption", text: "Failed scans loop back with a specific hint." },
  { type: "state", name: "loop", value: true },
  { type: "wait", ms: 2200 },
  { type: "state", name: "loop", value: false },
  { type: "chapter", label: "Deposit" },
  { type: "state", name: "step", value: 3 },
  { type: "caption", text: "The deposit comes after the benefits." },
  { type: "highlight", target: "[data-node=funding]" },
  { type: "state", name: "step", value: 4 },
  { type: "caption", text: "Ready in about 8 minutes." },
  { type: "wait", ms: 2400 },
];
