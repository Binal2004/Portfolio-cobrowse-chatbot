// Turns the live DOM into a compact text outline for the model.
// Nothing here knows what the site is about: it only understands HTML structure
// (landmarks, headings, text, links, form controls).

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "svg", "SVG", "TEMPLATE", "IFRAME", "CANVAS", "LINK", "META"]);
const CONTAINER_TAGS = new Set(["SECTION", "ARTICLE", "NAV", "HEADER", "FOOTER", "FORM", "ASIDE"]);
const CONTAINER_SELECTOR = "section,article,nav,header,footer,form,aside";
const INTERACTIVE_SELECTOR = 'a[href],button,input,textarea,select,summary,[role="button"],[role="link"]';
const IGNORE_SELECTOR = "[data-cobrowse-ignore]";

const MAX_LINE = 500;
const MAX_TOTAL = 20000;

const idByElement = new WeakMap<Element, string>();
const elementById = new Map<string, WeakRef<Element>>();
let counter = 0;

/** Stable id for an element for as long as it stays in the document. */
function idFor(el: Element): string {
  let id = idByElement.get(el);
  if (!id) {
    id = `e${++counter}`;
    idByElement.set(el, id);
    elementById.set(id, new WeakRef(el));
  }
  return id;
}

export function resolveElement(id: string): Element | null {
  const el = elementById.get(id)?.deref();
  return el && el.isConnected ? el : null;
}

export function isChatUi(el: Element): boolean {
  return !!el.closest(IGNORE_SELECTOR);
}

const clean = (s: string | null | undefined, max = MAX_LINE) => {
  const t = (s ?? "").replace(/\s*\n+\s*/g, " | ").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
};

function isVisible(el: Element): boolean {
  if (el.getAttribute("aria-hidden") === "true" || (el as HTMLElement).hidden) return false;
  if (typeof el.checkVisibility === "function") {
    return el.checkVisibility({ checkVisibilityCSS: true } as CheckVisibilityOptions);
  }
  return (el as HTMLElement).offsetParent !== null;
}

function inViewport(el: Element): boolean {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
  return visible > Math.min(r.height, vh) * 0.4;
}

/** Best-effort human label for any element. */
export function labelOf(el: Element): string {
  const aria = el.getAttribute("aria-label");
  if (aria) return clean(aria, 80);
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    const l = el.labels?.[0];
    if (l) return clean(l.textContent, 80);
    return clean((el as HTMLInputElement).placeholder || el.name, 80);
  }
  const heading = el.querySelector("h1,h2,h3,h4");
  if (CONTAINER_TAGS.has(el.tagName) && heading) return clean(heading.textContent, 80);
  const text = clean((el as HTMLElement).innerText ?? el.textContent, 80);
  return text || el.id || el.tagName.toLowerCase();
}

function describeInteractive(el: Element): string {
  const id = idFor(el);
  if (el instanceof HTMLAnchorElement) {
    const url = new URL(el.href, location.href);
    const internal = url.origin === location.origin;
    const href = internal ? `${url.pathname}${url.search}${url.hash}` : url.href;
    return `[${id}] link "${labelOf(el)}" -> ${href}${internal ? "" : " (external)"}`;
  }
  if (el instanceof HTMLInputElement) {
    if (el.type === "hidden") return "";
    const bits = [`[${id}] input type=${el.type} label="${labelOf(el)}"`];
    if (el.type === "checkbox" || el.type === "radio") bits.push(`checked=${el.checked}`);
    else if (el.type !== "password") bits.push(`value="${clean(el.value, 120)}"`);
    if (el.required) bits.push("required");
    if (el.disabled) bits.push("disabled");
    return bits.join(" ");
  }
  if (el instanceof HTMLTextAreaElement) {
    return `[${id}] textarea label="${labelOf(el)}" value="${clean(el.value, 120)}"${el.required ? " required" : ""}`;
  }
  if (el instanceof HTMLSelectElement) {
    const opts = Array.from(el.options).map((o) => clean(o.text, 40)).join(" / ");
    return `[${id}] select label="${labelOf(el)}" value="${clean(el.value, 60)}" options: ${opts}`;
  }
  const disabled = (el as HTMLButtonElement).disabled ? " disabled" : "";
  const tag = el.tagName === "SUMMARY" ? "summary" : "button";
  return `[${id}] ${tag} "${labelOf(el)}"${disabled}`;
}

export function getFullText(el: Element, max = 6000): string {
  return clean((el as HTMLElement).innerText ?? el.textContent, max);
}

export function takeSnapshot(): string {
  const out: string[] = [];
  let total = 0;
  let truncated = false;

  const push = (depth: number, line: string) => {
    if (!line || truncated) return;
    const text = `${"  ".repeat(depth)}${line}`;
    total += text.length + 1;
    if (total > MAX_TOTAL) {
      truncated = true;
      out.push("…[snapshot truncated — use read_element or scroll to see more]");
      return;
    }
    out.push(text);
  };

  const walk = (parent: Element, depth: number) => {
    let pendingText = "";
    const flush = () => {
      if (pendingText.trim()) push(depth, clean(pendingText));
      pendingText = "";
    };

    for (const node of Array.from(parent.childNodes)) {
      if (truncated) return;
      if (node.nodeType === Node.TEXT_NODE) {
        pendingText += ` ${node.textContent ?? ""}`;
        continue;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      const el = node as Element;
      if (SKIP_TAGS.has(el.tagName) || el.matches(IGNORE_SELECTOR) || !isVisible(el)) continue;

      flush();
      if (CONTAINER_TAGS.has(el.tagName)) {
        const tag = el.tagName.toLowerCase();
        const domId = el.id ? `#${el.id}` : "";
        push(depth, `[${idFor(el)}] <${tag}${domId}> "${labelOf(el)}"${inViewport(el) ? " (in view)" : ""}`);
        walk(el, depth + 1);
      } else if (el.matches(INTERACTIVE_SELECTOR)) {
        push(depth, describeInteractive(el));
      } else if (/^H[1-6]$/.test(el.tagName)) {
        push(depth, `${el.tagName}: ${clean(el.textContent)}`);
      } else if (el.querySelector(INTERACTIVE_SELECTOR) || el.querySelector(CONTAINER_SELECTOR)) {
        walk(el, depth);
      } else {
        push(depth, clean((el as HTMLElement).innerText));
      }
    }
    flush();
  };

  const root = document.querySelector("body");
  if (root) walk(root, 0);

  const doc = document.documentElement;
  const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
  const pct = Math.round((window.scrollY / maxScroll) * 100);
  const header = [
    `PAGE: title="${document.title}" path="${location.pathname}${location.hash}"`,
    `VIEWPORT: scrolled ${pct}% of page, ${window.innerWidth}x${window.innerHeight}px`,
    "OUTLINE (ids in [brackets] can be passed to tools):",
  ];
  return [...header, ...out].join("\n");
}
