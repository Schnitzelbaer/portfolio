import type { PrototypeHandle } from "../../src/lib/tour/types";

/**
 * Dummy prototype: account opening flow of the fictional Brightvale Bank.
 * Placeholder until the real prototype replaces this folder.
 */

type Screen = "overview" | "details" | "id" | "funding" | "done";
interface State {
  screen: Screen;
  id: "idle" | "scanning" | "glare" | "ok";
  amount: number | null;
}

const STEPS = [
  ["Personal details", "2 min"],
  ["ID check", "2 min"],
  ["Address", "1 min"],
  ["Tax residency", "1 min"],
  ["Terms", "1 min"],
  ["First deposit", "1 min"],
] as const;

const CSS = `
:host { all: initial; }
* { box-sizing: border-box; margin: 0; }
.app { width: 100%; height: 100%; font: 15px/1.45 Inter, system-ui, sans-serif; color: #15171c; background: #f4f5f2; display: flex; overflow: hidden; }
.sidebar { width: 300px; flex: none; background: #0f2a1f; color: #e8f1ec; padding: 40px 28px; display: flex; flex-direction: column; gap: 28px; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 17px; }
.brand i { width: 26px; height: 26px; border-radius: 8px; background: linear-gradient(135deg, #3fd18a, #1f8a5b); }
.side-steps { list-style: none; padding: 0; display: grid; gap: 6px; }
.side-steps li { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; color: #9fb8ab; font-size: 14px; }
.side-steps li b { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; background: #1d3d2f; color: #cfe3d8; }
.side-steps li.on { background: #1d3d2f; color: #fff; }
.side-steps li.done b { background: #3fd18a; color: #0f2a1f; }
.main { flex: 1; display: flex; justify-content: center; overflow: hidden; }
.screen { width: 100%; max-width: 460px; padding: 56px 24px 28px; display: flex; flex-direction: column; gap: 18px; animation: in .35s cubic-bezier(.2,.8,.2,1); }
.desktop .screen { padding-top: 90px; }
@keyframes in { from { opacity: 0; transform: translateX(14px); } }
.top { display: flex; justify-content: space-between; align-items: center; color: #5d6470; font-size: 13px; }
.bar { height: 4px; border-radius: 2px; background: #dfe3dc; overflow: hidden; }
.bar span { display: block; height: 100%; background: #1f8a5b; transition: width .4s; }
h1 { font-size: 26px; line-height: 1.2; letter-spacing: -0.02em; }
.sub { color: #5d6470; }
.list { list-style: none; padding: 0; background: #fff; border-radius: 16px; border: 1px solid #e3e6e0; }
.list li { display: flex; align-items: center; gap: 12px; padding: 13px 16px; }
.list li + li { border-top: 1px solid #eef0ec; }
.list b { width: 26px; height: 26px; border-radius: 50%; background: #e7f4ec; color: #1f8a5b; display: grid; place-items: center; font-size: 13px; }
.list span { flex: 1; }
.list em { font-style: normal; color: #7a818c; font-size: 13px; }
label { display: grid; gap: 6px; font-size: 13px; color: #5d6470; }
input { font: inherit; padding: 13px 14px; border-radius: 12px; border: 1px solid #d6dad3; background: #fff; color: #15171c; outline: none; }
input[data-focused] { border-color: #1f8a5b; box-shadow: 0 0 0 3px #1f8a5b26; }
.btn { margin-top: auto; font: inherit; font-weight: 600; padding: 15px; border-radius: 14px; border: 0; background: #1f8a5b; color: #fff; cursor: pointer; transition: transform .12s; }
.btn:active { transform: scale(.98); }
.btn.secondary { background: #e7f4ec; color: #1f8a5b; }
.card { aspect-ratio: 1.58; border-radius: 16px; border: 2px dashed #b9c2b6; display: grid; place-items: center; color: #7a818c; background: #fff; position: relative; overflow: hidden; }
.card.scanning::after { content: ""; position: absolute; inset: 0 0 auto; height: 30%; background: linear-gradient(#1f8a5b00, #1f8a5b55); animation: scan 1.1s ease-in-out infinite alternate; }
@keyframes scan { to { transform: translateY(240%); } }
.card.ok { border-style: solid; border-color: #1f8a5b; background: #e7f4ec; color: #1f8a5b; }
.hint { padding: 12px 14px; border-radius: 12px; font-size: 14px; background: #fff6e0; color: #7a5200; }
.hint.ok { background: #e7f4ec; color: #17603f; }
.chips { display: flex; gap: 10px; }
.chip { flex: 1; font: inherit; padding: 14px 0; border-radius: 12px; border: 1px solid #d6dad3; background: #fff; cursor: pointer; }
.chip.on { border-color: #1f8a5b; background: #e7f4ec; color: #17603f; font-weight: 600; }
.benefits { list-style: none; padding: 0; display: grid; gap: 8px; color: #3d434c; font-size: 14px; }
.benefits li::before { content: "✓"; color: #1f8a5b; margin-right: 8px; font-weight: 700; }
.done { text-align: center; align-items: center; justify-content: center; }
.account { width: 100%; aspect-ratio: 1.6; border-radius: 20px; padding: 22px; color: #fff; text-align: left; display: flex; flex-direction: column; justify-content: space-between; background: radial-gradient(120% 120% at 0% 0%, #3fd18a, #0f2a1f 70%); box-shadow: 0 20px 40px #0f2a1f40; }
.account small { opacity: .8; }
.account strong { font-size: 28px; letter-spacing: -0.02em; }
`;

export function createApp(root: ShadowRoot, layout: "mobile" | "desktop"): PrototypeHandle {
  const initial: State = { screen: "overview", id: "idle", amount: null };
  let state: State = { ...initial };
  const values = { name: "", dob: "" };

  const style = document.createElement("style");
  style.textContent = CSS;
  const app = document.createElement("div");
  app.className = `app ${layout}`;
  root.replaceChildren(style, app);

  const stepIndex: Record<Screen, number> = {
    overview: -1,
    details: 0,
    id: 1,
    funding: 5,
    done: 6,
  };

  const sidebar = () =>
    layout === "desktop"
      ? `<aside class="sidebar"><div class="brand"><i></i>Brightvale</div><ol class="side-steps">${STEPS.map(
          ([label], i) =>
            `<li class="${i === stepIndex[state.screen] ? "on" : i < stepIndex[state.screen] ? "done" : ""}"><b>${i < stepIndex[state.screen] ? "✓" : i + 1}</b>${label}</li>`,
        ).join("")}</ol></aside>`
      : "";

  const top = (step: number) =>
    `<div class="top"><span>Step ${step} of 6</span><span>Brightvale</span></div><div class="bar"><span style="width:${(step / 6) * 100}%"></span></div>`;

  const screens: Record<Screen, () => string> = {
    overview: () => `
      <h1>Open your account in about 8 minutes</h1>
      <p class="sub">Here is everything we will ask for. You can pause at any step.</p>
      <ol class="list">${STEPS.map(([label, time], i) => `<li><b>${i + 1}</b><span>${label}</span><em>${time}</em></li>`).join("")}</ol>
      <button class="btn" data-tour="start" data-action="start">Get started</button>`,
    details: () => `
      ${top(1)}
      <h1>Tell us about you</h1>
      <p class="sub">We need this by law to open an account.</p>
      <label>Full name<input data-tour="name" data-field="name" value="${values.name}" /></label>
      <label>Date of birth<input data-tour="dob" data-field="dob" placeholder="DD.MM.YYYY" value="${values.dob}" /></label>
      <button class="btn" data-tour="continue" data-action="to-id">Continue</button>`,
    id: () => `
      ${top(2)}
      <h1>Scan your ID</h1>
      <p class="sub">Place your ID card on a dark surface, in good light.</p>
      <div class="card ${state.id === "scanning" ? "scanning" : state.id === "ok" ? "ok" : ""}">${state.id === "ok" ? "✓ ID verified" : "ID card"}</div>
      ${state.id === "glare" ? `<p class="hint">Too much glare on the card. Tilt it slightly away from the light.</p>` : ""}
      ${state.id === "ok" ? `<p class="hint ok">Thanks, Anna. Your ID is verified.</p>` : ""}
      ${
        state.id === "ok"
          ? `<button class="btn" data-tour="continue" data-action="to-funding">Continue</button>`
          : `<button class="btn" data-tour="scan" data-action="scan">${state.id === "glare" ? "Scan again" : "Scan ID"}</button>`
      }`,
    funding: () => `
      ${top(6)}
      <h1>Make your first deposit</h1>
      <ul class="benefits"><li>Free account, no monthly fees</li><li>Instant payments in CHF and EUR</li><li>Your card arrives in 3 days</li></ul>
      <div class="chips">${[50, 100, 250].map((a) => `<button class="chip ${state.amount === a ? "on" : ""}" data-tour="amount-${a}" data-action="amount" data-amount="${a}">CHF ${a}</button>`).join("")}</div>
      <button class="btn" data-tour="deposit" data-action="deposit">${state.amount ? `Deposit CHF ${state.amount}` : "Choose an amount"}</button>`,
    done: () => `
      <div class="account"><small>Brightvale Private</small><div><small>Balance</small><br/><strong>CHF ${state.amount ?? 0}.00</strong></div></div>
      <h1>Your account is ready</h1>
      <p class="sub">Your card is on its way. You can start paying right away.</p>`,
  };

  const render = () => {
    app.innerHTML = `${sidebar()}<main class="main"><section class="screen ${state.screen === "done" ? "done" : ""}">${screens[state.screen]()}</section></main>`;
  };

  const set = (patch: Partial<State>) => {
    state = { ...state, ...patch };
    render();
  };

  app.addEventListener("input", (event) => {
    const input = event.target as HTMLInputElement;
    const field = input.dataset.field as keyof typeof values | undefined;
    if (field) values[field] = input.value;
  });
  app.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLElement>("[data-action]");
    switch (button?.dataset.action) {
      case "start":
        return set({ screen: "details" });
      case "to-id":
        return set({ screen: "id" });
      case "scan":
        return set({ id: "scanning" });
      case "to-funding":
        return set({ screen: "funding" });
      case "amount":
        return set({ amount: Number(button.dataset.amount) });
      case "deposit":
        return state.amount ? set({ screen: "done" }) : undefined;
    }
  });

  render();
  return {
    reset() {
      state = { ...initial };
      values.name = "";
      values.dob = "";
      render();
    },
    setState(name, value) {
      if (name === "id") set({ id: value as State["id"] });
    },
  };
}
