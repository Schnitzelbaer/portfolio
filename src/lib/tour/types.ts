/**
 * Contract between the tour player and showcase prototypes in `showcases/<id>/`.
 * A showcase folder can be replaced as a whole as long as it keeps this contract.
 */

/** Declarative tour steps. Durations are in milliseconds. */
export type TourStep =
  /** Marks the start of a chapter on the timeline. */
  | { type: "chapter"; label: string }
  /** Shows a caption (pass an empty string to clear it). */
  | { type: "caption"; text: string }
  | { type: "wait"; ms: number }
  /** Moves the cursor to the center of the element matching `to` (plus optional offset). */
  | { type: "move"; to: string; ms?: number; offset?: [number, number] }
  /** Press animation at the cursor, then a synthetic click on `target` (or the element under the cursor). */
  | { type: "click"; target?: string; ms?: number }
  /** Types text into an input, character by character. */
  | { type: "type"; target: string; text: string; cps?: number }
  /** Scrolls a container to a pixel offset or to an element inside it. */
  | { type: "scroll"; target: string; to: number | string; ms?: number }
  /** Calls `handle.setState(name, value)` on the prototype. */
  | { type: "state"; name: string; value?: unknown }
  /** Emphasizes an element for a moment (diagrams). */
  | { type: "highlight"; target: string; ms?: number };

export interface PrototypeHandle {
  /** Restores the initial screen before a replay. Defaults to remounting. */
  reset?(): void;
  setState?(name: string, value: unknown): void;
  destroy?(): void;
}

export interface ShowcaseVariant {
  /** Builds the prototype UI inside `root` (a shadow root, so styles stay isolated). */
  mount(root: ShadowRoot): PrototypeHandle;
  tour: TourStep[];
}

export interface ShowcaseVariantConfig {
  /** Must match a file `variants/<name>.ts`. */
  name: string;
  /** Media query that selects this variant. The first matching variant wins. Omit for "always". */
  media?: string;
  /** Logical design size of the prototype in CSS pixels; it is scaled to fit the frame. */
  size: [width: number, height: number];
}

export interface ShowcaseConfig {
  title: string;
  /** Text alternative for screen readers: what the tour shows. */
  description: string;
  kind?: "prototype" | "diagram";
  /** Show the animated cursor. Diagrams usually turn it off. */
  cursor?: boolean;
  /** Restart automatically after the tour ends. */
  loop?: boolean;
  variants: ShowcaseVariantConfig[];
  /** Static first frames per variant name, shown before the tour loads and for reduced motion. */
  fallbacks?: Record<string, ImageMetadata>;
}

type ImageMetadata = import("astro").ImageMetadata;

export function defineShowcase(config: ShowcaseConfig): ShowcaseConfig {
  return config;
}

export function defineVariant(variant: ShowcaseVariant): ShowcaseVariant {
  return variant;
}
