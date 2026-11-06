# AI Co-Browsing Assistant

An AI chat assistant for a portfolio website that reads the page it is embedded in and acts on it: navigating, scrolling, highlighting, focusing sections, clicking links and filling in forms from natural-language requests.

Built with Next.js, React, TypeScript and the Gemini API (free tier, function calling).

| | |
| --- | --- |
| **Demo video** | `https://drive.google.com/file/d/1iX4ceTwwRQUlUC9hboM931HFQ77_fLcA/view?usp=sharing` |
| **Live video** | 'https://portfolio-cobrowse-chatbot.vercel.app' |
| **Documentation** | [docs/GUIDE.md](docs/GUIDE.md) |

## Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Getting started](#getting-started)
4. [Configuration](#configuration)
5. [Architecture](#architecture)
6. [Tools](#tools)
7. [Security](#security)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Reusing the assistant](#reusing-the-assistant)
11. [Project structure](#project-structure)
12. [Limitations](#limitations)

## Overview

Most website chatbots can only answer questions. This assistant understands the page the visitor is looking at and can perform actions on it. A visitor can ask "Take me to the contact form and put my name as Sam" and the assistant scrolls to the form and types the value in, with visible on-screen feedback.

The assistant is site-agnostic. It never receives the site's source data; it works from a text outline of the rendered page, so it adapts when the content or structure changes.

## Features

- Answers questions using the content currently rendered on the page.
- Maintains conversational context across turns, including follow-up questions.
- Navigates between internal pages and sections.
- Scrolls, highlights elements and spotlights sections with visual overlays.
- Clicks buttons and links, and fills form fields with a typing animation.
- Keeps the API key on the server and enforces safety rules in code.
- Includes an offline mock of the Gemini API for development without a key.

### Example prompts

| Prompt | Behaviour |
| --- | --- |
| "What projects are showcased here?" | Answers from the rendered page |
| "Which one is the most recent?" | Resolves the follow-up from conversation history |
| "Go to the projects section and highlight the most recent one." | Navigates, compares dates, highlights the element |
| "Focus on the Lumen Design System card." | Spotlights the card and dims the rest |
| "Take me to the contact form and put my name as Sam." | Scrolls to the form and fills the field |
| "Open the blog and tell me the newest post." | Navigates to another page and reads it |

## Getting started

### Prerequisites

- Node.js 20 or later
- A free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### Installation

```bash
git clone <repository-url>
cd portfolio-cobrowse-chatbot
npm install
cp .env.example .env.local
```

On Windows, use `copy .env.example .env.local`.

Open `.env.local` and set your key:

```
GEMINI_API_KEY=your-key
```

### Run locally

```bash
npm run dev
```

The app is available at http://localhost:3000.

## Configuration

| Variable | Required | Default | Description |
| --- | :---: | --- | --- |
| `GEMINI_API_KEY` | Yes | None | Gemini API key. Used server-side only. |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Any function-calling model available on your tier. Falls back to `gemini-2.5-flash-lite` if the model is unavailable or rate-limited. |
| `GEMINI_API_BASE` | No | Google's endpoint | Overrides the API base URL. Intended for the local mock only. Do not set in production. |

## Architecture

Each user message starts an agent loop between the browser and the model:

1. **Snapshot.** `snapshot.ts` converts the rendered DOM into a text outline with stable element ids.
2. **Request.** `agent.ts` sends the conversation history and the snapshot to `/api/chat`.
3. **Model call.** The server calls Gemini with the system prompt and tool declarations.
4. **Execution.** If Gemini returns tool calls, `executor.ts` validates and performs them on the page.
5. **Iteration.** A fresh snapshot and the tool results are sent back, and the loop repeats until Gemini replies with text.

```
Browser                                        Server                    Google
-------                                        ------                    ------
ChatWidget -> agent.ts -> snapshot.ts
                 |  { contents, snapshot }  -> /api/chat -> gemini.ts -> Gemini
                 |                          <- text | functionCall(s) <-
                 |
          executor.ts -> DOM actions + overlay effects
                 |
                 +-> functionResponse + fresh snapshot -> next round
```

### Design decisions

| Decision | Rationale |
| --- | --- |
| Snapshot the rendered DOM instead of passing site data | No hard-coded content; the assistant works with any page |
| Model returns tool calls only; one executor performs them | Single, auditable place that touches the DOM; easy to validate |
| History kept client-side, snapshots injected per request | Context is preserved without storing stale page state |
| API key only in the server route | The key is never exposed to the browser |

## Tools

| Tool | Description |
| --- | --- |
| `navigate` | Go to an internal page or `#section` using client-side routing |
| `scroll_page` | Scroll up or down one screen, or to the top or bottom |
| `scroll_to_element` | Smooth-scroll an element into view |
| `highlight_element` | Draw a pulsing ring with an optional label |
| `focus_section` | Spotlight a section and dim the rest of the page |
| `click_element` | Click buttons and links; external links are not opened and the URL is returned instead |
| `fill_input` | Type into inputs, textareas and selects; password and file fields are refused |
| `read_element` | Return the full text of an element when the snapshot was truncated |
| `clear_effects` | Remove highlights and spotlight (also available with the Esc key) |

## Security

- **Untrusted page content.** Page text is delimited as untrusted data in the prompt, and the model is instructed never to follow instructions found in it.
- **Enforced in code.** Password inputs and external navigation are blocked by the executor regardless of model output.
- **No unsolicited actions.** The model is instructed not to submit forms or invent personal details.
- **API protection.** `/api/chat` limits request and snapshot size and applies a per-IP rate limit to protect the free-tier key.
- **Secret handling.** `.env.local` is git-ignored; the API key is set as an environment variable on the host.

## Testing

### Offline mock

A rule-based stand-in for Gemini allows the full UI, API and tool path to be exercised without an API key:

```bash
npm run mock:gemini &
GEMINI_API_BASE=http://localhost:4010/v1beta GEMINI_API_KEY=mock npm run dev
```

The mock handles a small set of scripted requests and is not a language model. Use a real key to evaluate response quality.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Run the production build |
| `npm run lint` | Run ESLint |
| `npm run mock:gemini` | Start the offline Gemini mock on port 4010 |

See [docs/GUIDE.md](docs/GUIDE.md) for the full testing checklist.

## Deployment

The project is deployed on Vercel.

1. Push the repository to GitHub.
2. In Vercel, select **Add New > Project** and import the repository. Next.js is detected automatically.
3. Under **Environment Variables**, add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`). Do not set `GEMINI_API_BASE`.
4. Deploy.

## Reusing the assistant

The agent is not tied to this site. To use it elsewhere, mount `<ChatWidget />` in any Next.js or React application. The widget is marked `data-cobrowse-ignore`, so it never reads or controls itself. Semantic markup (`section`, `article`, headings, labelled form fields, descriptive link text) produces a better outline for the model.

## Project structure

```
app/
  layout.tsx              Header, footer and ChatWidget (persists across navigation)
  page.tsx, blog/         Sample portfolio pages
  api/chat/route.ts       Input validation, rate limiting, Gemini call
components/
  portfolio/              Semantic site components
  cobrowse/               ChatWidget, AgentOverlay, MessageText, styles
lib/
  gemini.ts, prompt.ts    Gemini REST client with model fallback; system prompt
  cobrowse/
    snapshot.ts           DOM to outline conversion
    toolDeclarations.ts   Tool schemas sent to Gemini
    executor.ts           Validates and performs all page actions
    agent.ts              Client-side model and tool loop
    overlay-store.ts      State for highlight, focus and pointer effects
data/portfolio.ts         Sample site content (not sent to the model directly)
scripts/mock-gemini.mjs   Offline Gemini stand-in
docs/GUIDE.md             Extended documentation
```

## Limitations

- The model can misjudge details such as dates or pick the wrong element.
- All visitors share one free-tier API key, so heavy traffic will hit rate limits.
- Rate limiting is in-memory and resets on server cold starts.
- The assistant sees only the current page until it navigates elsewhere.
- External links are reported, not opened.
- The contact form is a demonstration and does not deliver messages.
- Conversation history is held in the browser tab and resets on refresh.
- Page text is sent to Google with each request; do not deploy this on pages containing private data.

## Author

**Binal Doshi** — [GitHub](https://github.com/Binal2004) · [LinkedIn](https://linkedin.com/in/binal-doshi-2005abc) · binaldoshi04@gmail.com
