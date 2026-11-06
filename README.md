# AI Co-Browsing Assistant for a Portfolio Website

A Next.js portfolio with a chat assistant that **reads the page it lives on** and **acts on it** — scrolling,
navigating, clicking, highlighting, focusing and filling forms — driven purely by what the visitor says.
The AI engine is the **Gemini API (free tier)**.

> Try prompts like: *"What projects are showcased here?"*, *"Go to the projects section and highlight the most recent one"*,
> *"Take me to the contact form and put my name as Sam"*, *"Open the blog and focus on the newest post"*.

> 📘 **Full documentation:** [docs/GUIDE.md](docs/GUIDE.md) — env variables, do/don't, how it works, testing, deployment, extending, troubleshooting.

## Key ideas

| Requirement | How it is done |
| --- | --- |
| No hard-coded content | The model never sees `data/portfolio.ts`. Before every model call the browser serialises the **rendered DOM** into a text outline (`lib/cobrowse/snapshot.ts`). Swap the site's content or even the whole site and the assistant adapts. |
| Tool calling | Gemini function calling. Tool schemas live in `lib/cobrowse/toolDeclarations.ts`. |
| AI never touches the DOM | The model only returns `functionCall`s. `lib/cobrowse/executor.ts` is the single module that validates and performs them. Visual effects go through an overlay store, not the site's markup. |
| Conversational context | The full Gemini `contents` history (including tool calls/results) is kept client-side and re-sent each turn. Snapshots are injected per request and never stored, so history stays small. |
| Key safety | The Gemini key lives only on the server (`/api/chat`), never in the browser. |

## Architecture

```
 Browser                                           Server (Next.js route)            Google
 ───────                                           ──────────────────────            ──────
 ChatWidget ──user text──▶ agent.ts (loop)
                              │  takeSnapshot()  ← snapshot.ts (DOM → outline w/ element ids)
                              ├──{contents, snapshot}──▶ /api/chat ──▶ gemini.ts ──▶ Gemini generateContent
                              │                                   ◀── text | functionCall(s) ◀──
                              ◀── model content ─────────┘
                              │  functionCall?  ──▶ executor.ts ──▶ DOM (scroll / click / fill …)
                              │                       └─▶ overlay-store ─▶ AgentOverlay (cursor, highlight, spotlight)
                              └─ functionResponse + fresh snapshot ─▶ next round … until the model replies with text
```

```
app/
  layout.tsx            Header, Footer and the ChatWidget (persists across page navigations)
  page.tsx, blog/       The sample portfolio pages
  api/chat/route.ts     Validates input, throttles per IP, calls Gemini
components/
  portfolio/            Plain semantic components (section / article / nav / form)
  cobrowse/             ChatWidget, AgentOverlay, MessageText, cobrowse.css
lib/
  gemini.ts, prompt.ts  REST client (model fallback), system prompt
  cobrowse/
    snapshot.ts         DOM → outline; stable element ids
    toolDeclarations.ts Tool schemas sent to Gemini
    executor.ts         The only code that acts on the page
    agent.ts            Client loop: model ⇄ tools
    overlay-store.ts    State for highlight / focus / pointer effects
scripts/mock-gemini.mjs Offline rule-based stand-in for Gemini (dev/testing only)
```

### Tools

| Tool | What it does |
| --- | --- |
| `navigate` | Go to an internal page or `#section` (client-side routing, then scroll) |
| `scroll_page` | Up / down one screen, or top / bottom |
| `scroll_to_element` | Smooth-scroll an element into view |
| `highlight_element` | Pulsing ring + optional label; several can be active |
| `focus_section` | Zoom-style spotlight: centre a section and dim the rest |
| `click_element` | Click buttons/links (internal links navigate; external links are *not* opened — the URL is returned) |
| `fill_input` | Types into inputs/textareas/selects with a typing animation (password/file fields refused) |
| `read_element` | Returns the full text of an element when the snapshot was truncated |
| `clear_effects` | Removes highlights / spotlight (also: press <kbd>Esc</kbd>) |

### Safety choices

- Page text is passed to the model as clearly delimited, **untrusted data**; the system prompt tells it never to follow instructions found there.
- The model is told not to submit forms or invent personal details; password inputs and external navigation are blocked in the executor regardless of what the model asks.
- `/api/chat` caps body/snapshot size and applies a best-effort per-IP rate limit to protect the free-tier key.

## Setup

Requires Node 20+.

```bash
npm install
cp .env.example .env.local   # then put your key in .env.local
npm run dev                  # http://localhost:3000
```

### Gemini API configuration

1. Create a free key in [Google AI Studio](https://aistudio.google.com/apikey).
2. Put it in `.env.local`:
   ```
   GEMINI_API_KEY=your-key
   # optional
   GEMINI_MODEL=gemini-2.5-flash
   ```
3. `GEMINI_MODEL` defaults to `gemini-2.5-flash`. If a model is missing, overloaded or rate-limited for your key, the server automatically
   falls back to `gemini-2.5-flash-lite`. Set `GEMINI_MODEL` to any function-calling-capable model that your free tier offers.

The free tier is rate-limited; if you hit it the chat shows a friendly "try again in a few seconds" message.

### Testing without an API key

`npm run mock:gemini` starts a tiny rule-based stand-in for Gemini on port 4010 that understands a few scripted requests
(highlight most recent project, fill the contact name, open the blog, focus a card, scroll). It exercises the whole
UI → API → tools → DOM path offline:

```bash
npm run mock:gemini &
GEMINI_API_BASE=http://localhost:4010/v1beta GEMINI_API_KEY=mock npm run dev
```

It is **not** a language model — use a real key to evaluate conversational quality.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project → Import** the repo (framework is auto-detected as Next.js).
3. Under **Environment Variables** add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`). Do **not** set `GEMINI_API_BASE`.
4. Deploy. The chat and all co-browsing actions work on the public URL.

## Using it with a different website

The agent is site-agnostic. To reuse it, mount `<ChatWidget />` (it is marked `data-cobrowse-ignore` so it never reads or controls itself) in any
Next.js/React app. Better semantics (`section`, `article`, headings, labelled form fields, descriptive link text) give the model a better outline.

## Demo script (2–5 min video)

1. *"What projects are showcased here?"* — Q&A from page content.
2. *"Which one is the most recent?"* — follow-up using conversational context.
3. *"Go to the projects section and highlight the most recent one."* — navigate + reasoning over dates + highlight.
4. *"Focus on the Lumen Design System card."* — spotlight.
5. *"Take me to the contact form and put my name as Sam, email sam@example.com."* — form filling (watch it type).
6. *"Open the blog and tell me what's the newest post."* — page navigation + read.
7. Point at the tool chips in the chat (`navigate`, `highlight_element`, …) to show the tool-based design.

## Scripts

`npm run dev` · `npm run build` · `npm start` · `npm run lint` · `npm run mock:gemini`
