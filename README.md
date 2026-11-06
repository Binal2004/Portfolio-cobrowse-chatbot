<div align="center">

# 🧭 AI Co-Browsing Assistant

**A chat assistant that doesn't just answer questions about a portfolio site. It works the page *with* you.**

Ask it to scroll, open a page, highlight a project, spotlight a card, or fill in the contact form, and watch it happen.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-free%20tier-4285F4?logo=googlegemini&logoColor=white)

[**Live demo**](#) · [**Demo video**](#) · [**Full guide**](docs/GUIDE.md)

<!-- Replace the (#) links above, then add a GIF: ![Demo](docs/demo.gif) -->

</div>

---

## ✨ Try it

| Say this | Watch it |
| --- | --- |
| *"What projects are showcased here?"* | Answers from what is actually on screen |
| *"Which one is the most recent?"* | Remembers the conversation |
| *"Go to the projects section and highlight the most recent one."* | Navigates, compares dates, highlights |
| *"Focus on the Lumen Design System card."* | Spotlights it and dims the rest |
| *"Take me to the contact form and put my name as Sam."* | Scrolls there and types it in |
| *"Open the blog and tell me the newest post."* | Changes page and reads it |

## 🚀 Quick start

Needs **Node 20+** and a free [Gemini API key](https://aistudio.google.com/apikey).

```bash
npm install
cp .env.example .env.local     # Windows: copy .env.example .env.local
# add GEMINI_API_KEY=your-key to .env.local
npm run dev                    # http://localhost:3000
```

| Variable | Required | Default | Notes |
| --- | :---: | --- | --- |
| `GEMINI_API_KEY` | ✅ | none | Server-side only, never sent to the browser |
| `GEMINI_MODEL` | | `gemini-2.5-flash` | Falls back to `gemini-2.5-flash-lite` if unavailable or rate-limited |
| `GEMINI_API_BASE` | | Google's endpoint | For the offline mock only. **Don't set on Vercel.** |

> **No key?** Run the offline mock: `npm run mock:gemini &` then
> `GEMINI_API_BASE=http://localhost:4010/v1beta GEMINI_API_KEY=mock npm run dev`.
> It handles a few scripted prompts and is not a real language model.

## 🧠 How it works

1. **Snapshot.** The browser turns the *rendered* page into a text outline with stable element ids.
2. **Ask.** The outline and chat history go to `/api/chat`, which calls Gemini with a set of tools.
3. **Act.** If Gemini returns tool calls, `executor.ts` validates and performs them on the page.
4. **Repeat.** A fresh snapshot is taken and sent back until Gemini replies in plain text.

```
ChatWidget → agent.ts → snapshot.ts ─┐
                                     ├─▶ /api/chat → Gemini ─▶ text | functionCall
executor.ts ◀── functionCall ◀───────┘
    └─▶ DOM actions + overlay effects ─▶ fresh snapshot ─▶ next round
```

### Why it's built this way

- **Works on any content.** The model never sees `data/portfolio.ts`, only the rendered DOM. Change the site and the assistant adapts.
- **The AI never touches the DOM.** It only returns tool calls. One module, `executor.ts`, validates and runs them.
- **Context without bloat.** Full history is kept client-side. Snapshots are injected per request and never stored.
- **Key stays private.** The Gemini key lives only in the server route.

### Tools

| Tool | Does |
| --- | --- |
| `navigate` | Go to an internal page or `#section` |
| `scroll_page` / `scroll_to_element` | Scroll by screen, to top or bottom, or to an element |
| `highlight_element` | Pulsing ring with an optional label |
| `focus_section` | Spotlight a section, dim the rest |
| `click_element` | Click buttons and links (external links return the URL instead) |
| `fill_input` | Type into fields with an animation (password and file fields refused) |
| `read_element` | Fetch full text when the snapshot was truncated |
| `clear_effects` | Remove highlights and spotlight (or press <kbd>Esc</kbd>) |

## 🔒 Safety

- Page text is passed as **untrusted data**, and the model is told never to follow instructions found in it.
- Password inputs and external navigation are **blocked in code**, whatever the model asks.
- The model is told not to submit forms or invent personal details.
- `/api/chat` caps request size and applies a per-IP rate limit to protect the free-tier key.

## ☁️ Deploy to Vercel

1. Push the repo to GitHub.
2. In Vercel, **Add New → Project → Import** the repo.
3. Add `GEMINI_API_KEY` under **Environment Variables**.
4. Deploy.

## 🔌 Use it on another site

Mount `<ChatWidget />` in any Next.js or React app. It is marked `data-cobrowse-ignore`, so it never reads or controls itself. Semantic HTML (`section`, `article`, headings, labelled fields) gives the model a better outline.

<details>
<summary><b>📁 Project structure</b></summary>

```
app/
  layout.tsx            Header, Footer and ChatWidget (persists across navigation)
  page.tsx, blog/       Sample portfolio pages
  api/chat/route.ts     Validates input, throttles per IP, calls Gemini
components/
  portfolio/            Plain semantic components
  cobrowse/             ChatWidget, AgentOverlay, MessageText, cobrowse.css
lib/
  gemini.ts, prompt.ts  Gemini REST client (with fallback) and system prompt
  cobrowse/
    snapshot.ts         DOM → outline with stable ids
    toolDeclarations.ts Tool schemas sent to Gemini
    executor.ts         The only code that acts on the page
    agent.ts            Client loop: model ⇄ tools
    overlay-store.ts    Highlight / focus / pointer effect state
data/portfolio.ts       Sample content (never sent to the model directly)
scripts/mock-gemini.mjs Offline Gemini stand-in
docs/GUIDE.md           Full documentation
```

</details>

<details>
<summary><b>⚠️ Known limits</b></summary>

- The AI can be wrong. It may misjudge a date or pick the wrong element.
- All visitors share one free-tier key, so heavy traffic will hit rate limits.
- Rate limiting is in-memory and resets on cold starts.
- Only the current page's rendered content is visible until it navigates elsewhere.
- External links are reported, never opened.
- The contact form is a demo and doesn't deliver messages.
- Chat history lives in the browser tab and resets on refresh.
- Page text is sent to Google with each request, so don't use this on private pages.

</details>

<details>
<summary><b>🛠 Scripts</b></summary>

`npm run dev` · `npm run build` · `npm start` · `npm run lint` · `npm run mock:gemini`

</details>

---

<div align="center"><sub>Built with Next.js, React, TypeScript and the Gemini API · See <a href="docs/GUIDE.md">docs/GUIDE.md</a> for troubleshooting and how to extend it</sub></div>
