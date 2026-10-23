import { defineVariant } from "../../../../src/lib/tour/types";

/** Dummy prototype: weekly roster of the fictional Kindred Care Co. */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const CARERS = ["L. Brunner", "M. Rossi", "S. Okafor", "T. Weber", "A. Huber"];
const CANDIDATES = [
  ["T. Weber", "12 min away", "Knows client"],
  ["A. Huber", "18 min away", "New to client"],
  ["S. Okafor", "25 min away", "Knows client"],
];

const CSS = `
:host { all: initial; }
* { box-sizing: border-box; margin: 0; }
.app { width: 100%; height: 100%; display: grid; grid-template-columns: 1fr 320px; font: 14px/1.4 Inter, system-ui, sans-serif; color: #1c1a17; background: #faf7f2; }
.main { padding: 32px; display: flex; flex-direction: column; gap: 18px; }
h1 { font-size: 22px; letter-spacing: -0.02em; }
.alert { padding: 12px 16px; border-radius: 12px; background: #fdecea; color: #8a1c12; display: flex; justify-content: space-between; align-items: center; opacity: 0; transform: translateY(-6px); transition: .35s; }
.alert.on { opacity: 1; transform: none; }
.grid { display: grid; grid-template-columns: 120px repeat(5, 1fr); gap: 6px; }
.grid div { padding: 10px; border-radius: 8px; background: #fff; border: 1px solid #ece6dc; min-height: 52px; font-size: 12px; }
.grid .h { background: none; border: 0; min-height: 0; color: #7d746a; font-weight: 600; }
.grid .shift { background: #fbeee0; border-color: #f0d9bf; }
.grid .gap { background: repeating-linear-gradient(135deg, #fff 0 8px, #fdecea 8px 10px); border: 1px dashed #d9534f; color: #b52b22; }
.grid .filled { background: #e3f3e8; border-color: #9fd3b0; color: #1d6b3b; }
.side { border-left: 1px solid #ece6dc; background: #fff; padding: 32px 22px; display: flex; flex-direction: column; gap: 12px; }
.side h2 { font-size: 15px; }
.side p { color: #7d746a; }
.cand { padding: 12px 14px; border-radius: 12px; border: 1px solid #ece6dc; display: grid; gap: 2px; cursor: pointer; transition: .25s; }
.cand b { font-size: 14px; }
.cand span { color: #7d746a; font-size: 12px; }
.cand.on { border-color: #1d6b3b; background: #e3f3e8; }
.btn { margin-top: auto; padding: 13px; border-radius: 12px; border: 0; font: inherit; font-weight: 600; background: #1c1a17; color: #fff; cursor: pointer; }
.btn:disabled { opacity: .4; }
`;

export default defineVariant({
  mount(root) {
    const style = document.createElement("style");
    style.textContent = CSS;
    const app = document.createElement("div");
    app.className = "app";
    root.replaceChildren(style, app);
    let gap = false;
    let chosen: number | null = null;
    let filled = false;

    const render = () => {
      const cells = CARERS.flatMap((carer, r) => [
        `<div class="h">${carer}</div>`,
        ...DAYS.map((_, d) => {
          const isGap = r === 1 && d === 2;
          if (isGap && filled)
            return `<div class="filled">Mrs. Graf · 08:00<br/>${CANDIDATES[chosen ?? 0]?.[0]}</div>`;
          if (isGap && gap)
            return `<div class="gap" data-tour="gap">Mrs. Graf · 08:00<br/>Unassigned</div>`;
          return (r + d) % 3 === 0
            ? `<div></div>`
            : `<div class="shift">Visit · ${8 + ((r + d) % 4)}:00</div>`;
        }),
      ]);
      app.innerHTML = `
        <section class="main">
          <h1>Week 47 · Team North</h1>
          <div class="alert ${gap && !filled ? "on" : ""}">M. Rossi called in sick for Wednesday. 1 visit needs cover.</div>
          <div class="grid"><div class="h"></div>${DAYS.map((d) => `<div class="h">${d}</div>`).join("")}${cells.join("")}</div>
        </section>
        <aside class="side">
          <h2>Suggested replacements</h2>
          <p>${gap ? "Ranked by travel time and continuity of care." : "No open visits this week."}</p>
          ${gap ? CANDIDATES.map(([name, travel, note], i) => `<div class="cand ${chosen === i ? "on" : ""}" data-tour="cand-${i}" data-cand="${i}"><b>${name}</b><span>${travel} · ${note}</span></div>`).join("") : ""}
          <button class="btn" data-tour="confirm" ${chosen === null || filled ? "disabled" : ""}>${filled ? "Assigned" : "Confirm"}</button>
        </aside>`;
    };

    app.addEventListener("click", (event) => {
      const target = event.target as Element;
      const cand = target.closest<HTMLElement>("[data-cand]");
      if (cand) {
        chosen = Number(cand.dataset.cand);
        render();
      } else if (target.closest("[data-tour=confirm]") && chosen !== null) {
        filled = true;
        render();
      }
    });
    render();
    return {
      reset() {
        gap = false;
        chosen = null;
        filled = false;
        render();
      },
      setState(name) {
        if (name === "sick") {
          gap = true;
          render();
        }
      },
    };
  },
  tour: [
    { type: "chapter", label: "Roster" },
    { type: "caption", text: "A normal week, planned in advance." },
    { type: "wait", ms: 1600 },
    { type: "chapter", label: "Sick call" },
    { type: "state", name: "sick" },
    { type: "caption", text: "A sick call opens a gap." },
    { type: "move", to: "[data-tour=gap]" },
    { type: "wait", ms: 900 },
    { type: "chapter", label: "Replace" },
    { type: "caption", text: "Suggestions are ranked; the coordinator decides." },
    { type: "move", to: "[data-tour=cand-0]" },
    { type: "click", target: "[data-tour=cand-0]" },
    { type: "move", to: "[data-tour=confirm]" },
    { type: "click", target: "[data-tour=confirm]" },
    { type: "caption", text: "Covered in under a minute." },
    { type: "wait", ms: 2200 },
  ],
});
