// The only module that is allowed to act on the page. The model asks for a tool
// by name; this file validates the request and performs the DOM work.

import { getFullText, isChatUi, labelOf, resolveElement } from "./snapshot";
import { overlayStore } from "./overlay-store";
import type { ToolResult } from "./types";

export interface ExecContext {
  /** Client-side route change (next/navigation router.push). */
  push: (path: string) => void;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const ok = (message: string, summary = message): ToolResult => ({ ok: true, message, summary });
const fail = (message: string): ToolResult => ({ ok: false, message, summary: message });

async function waitForScrollEnd() {
  let last = -1;
  let stable = 0;
  for (let i = 0; i < 40 && stable < 3; i++) {
    await sleep(50);
    if (window.scrollY === last) stable++;
    else {
      stable = 0;
      last = window.scrollY;
    }
  }
}

async function bringIntoView(el: Element) {
  const tall = el.getBoundingClientRect().height > window.innerHeight * 0.8;
  el.scrollIntoView({ behavior: "smooth", block: tall ? "start" : "center" });
  await waitForScrollEnd();
}

async function pointAt(el: Element, click = false) {
  const r = el.getBoundingClientRect();
  overlayStore.moveCursor(r.left + Math.min(r.width / 2, 120), r.top + Math.min(r.height / 2, 40));
  await sleep(550);
  if (click) {
    overlayStore.moveCursor(r.left + Math.min(r.width / 2, 120), r.top + Math.min(r.height / 2, 40), true);
    await sleep(250);
  }
}

function getTarget(args: Record<string, unknown>): { el: Element } | { error: ToolResult } {
  const id = String(args.element_id ?? "");
  const el = resolveElement(id);
  if (!el) return { error: fail(`Element "${id}" is not on the page any more. Use ids from the latest snapshot.`) };
  if (isChatUi(el)) return { error: fail("That element belongs to the chat assistant itself and cannot be controlled.") };
  return { el };
}

async function navigate(url: string, ctx: ExecContext): Promise<ToolResult> {
  let target: URL;
  try {
    target = new URL(url, location.href);
  } catch {
    return fail(`"${url}" is not a valid URL.`);
  }
  if (target.origin !== location.origin) {
    return fail(`"${url}" is outside this website; external navigation is not allowed. Tell the user the link instead.`);
  }

  const samePage = target.pathname === location.pathname;
  if (!samePage) {
    ctx.push(`${target.pathname}${target.search}`);
    for (let i = 0; i < 60 && location.pathname !== target.pathname; i++) await sleep(50);
    if (location.pathname !== target.pathname) return fail(`Navigation to ${target.pathname} did not complete.`);
    await sleep(400); // let the new page render
  }

  if (target.hash) {
    const section = document.getElementById(decodeURIComponent(target.hash.slice(1)));
    if (!section) return fail(`Went to ${target.pathname} but there is no section "${target.hash}" on it.`);
    history.replaceState(null, "", `${target.pathname}${target.search}${target.hash}`);
    await bringIntoView(section);
  } else if (samePage) {
    window.scrollTo({ top: 0, behavior: "smooth" });
    await waitForScrollEnd();
  } else {
    window.scrollTo({ top: 0 });
  }
  const where = `${target.pathname}${target.hash}`;
  return ok(`Now at ${where}. Page title: "${document.title}".`, `Navigated to ${where}`);
}

async function scrollPage(direction: string): Promise<ToolResult> {
  const step = window.innerHeight * 0.8;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const targets: Record<string, number> = {
    up: window.scrollY - step,
    down: window.scrollY + step,
    top: 0,
    bottom: max,
  };
  if (!(direction in targets)) return fail(`Unknown direction "${direction}".`);
  window.scrollTo({ top: Math.max(0, Math.min(max, targets[direction])), behavior: "smooth" });
  await waitForScrollEnd();
  const pct = Math.round((window.scrollY / Math.max(1, max)) * 100);
  return ok(`Scrolled ${direction}; now ${pct}% down the page.`, `Scrolled ${direction}`);
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
  setter?.call(el, value);
  // Dispatching a real input event keeps React-controlled inputs in sync.
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

async function fillInput(el: Element, value: string): Promise<ToolResult> {
  if (el instanceof HTMLInputElement && ["password", "file", "hidden"].includes(el.type)) {
    return fail(`Inputs of type "${el.type}" cannot be filled by the assistant.`);
  }
  if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
    return fail("Use click_element for checkboxes and radio buttons.");
  }
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) {
    return fail("That element is not a form field.");
  }
  if (el.disabled) return fail("That field is disabled.");

  await bringIntoView(el);
  await pointAt(el, true);
  el.focus({ preventScroll: true });

  if (el instanceof HTMLSelectElement) {
    const match = Array.from(el.options).find(
      (o) => o.value === value || o.text.trim().toLowerCase() === value.trim().toLowerCase(),
    );
    if (!match) return fail(`No option "${value}". Options: ${Array.from(el.options).map((o) => o.text).join(", ")}`);
    setNativeValue(el, match.value);
    el.dispatchEvent(new Event("change", { bubbles: true }));
  } else {
    setNativeValue(el, "");
    const delay = Math.min(30, 1200 / Math.max(1, value.length));
    for (let i = 1; i <= value.length; i++) {
      setNativeValue(el, value.slice(0, i));
      await sleep(delay);
    }
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }
  return ok(`Entered the value into "${labelOf(el)}".`, `Filled "${labelOf(el)}"`);
}

async function clickElement(el: Element, ctx: ExecContext): Promise<ToolResult> {
  if ((el as HTMLButtonElement).disabled) return fail("That control is disabled.");
  const name = labelOf(el);
  await bringIntoView(el);
  await pointAt(el, true);

  if (el instanceof HTMLAnchorElement) {
    const url = new URL(el.href, location.href);
    if (url.origin !== location.origin) {
      return ok(
        `"${name}" is an external link (${url.href}); it was not opened. Share the URL with the user instead.`,
        `Found external link "${name}"`,
      );
    }
    return navigate(`${url.pathname}${url.search}${url.hash}`, ctx);
  }
  (el as HTMLElement).click();
  await sleep(500); // let the UI react (e.g. form submitted, panel opened)
  return ok(`Clicked "${name}".`, `Clicked "${name}"`);
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ExecContext,
): Promise<ToolResult> {
  try {
    switch (name) {
      case "navigate":
        return await navigate(String(args.url ?? ""), ctx);
      case "scroll_page":
        return await scrollPage(String(args.direction ?? ""));
      case "clear_effects":
        overlayStore.clearEffects();
        overlayStore.hideCursor();
        return ok("Cleared all highlights.", "Cleared highlights");
    }

    const target = getTarget(args);
    if ("error" in target) return target.error;
    const { el } = target;

    switch (name) {
      case "scroll_to_element":
        await bringIntoView(el);
        return ok(`Scrolled to "${labelOf(el)}".`, `Scrolled to "${labelOf(el)}"`);
      case "highlight_element": {
        await bringIntoView(el);
        await pointAt(el);
        const label = typeof args.label === "string" ? args.label : undefined;
        overlayStore.addEffect({ element: el, kind: "highlight", label });
        return ok(`Highlighted "${labelOf(el)}".`, `Highlighted "${labelOf(el)}"`);
      }
      case "focus_section":
        await bringIntoView(el);
        overlayStore.addEffect({ element: el, kind: "focus" }, 12000);
        return ok(`Focused on "${labelOf(el)}"; the rest of the page is dimmed.`, `Focused on "${labelOf(el)}"`);
      case "click_element":
        return await clickElement(el, ctx);
      case "fill_input":
        return await fillInput(el, String(args.value ?? ""));
      case "read_element":
        return ok(getFullText(el), `Read "${labelOf(el)}"`);
      default:
        return fail(`Unknown tool "${name}".`);
    }
  } catch (err) {
    return fail(`Tool "${name}" failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    if (name !== "highlight_element") window.setTimeout(() => overlayStore.hideCursor(), 900);
  }
}
