// Offline stand-in for the Gemini generateContent endpoint, used to exercise the
// full tool-calling loop (UI -> /api/chat -> tools -> DOM) without an API key.
// It is a tiny rule-based script, NOT a language model.
//
//   node scripts/mock-gemini.mjs            # listens on :4010
//   GEMINI_API_BASE=http://localhost:4010/v1beta GEMINI_API_KEY=mock npm run dev

import http from "node:http";

const PORT = Number(process.env.MOCK_PORT ?? 4010);
const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

const textOf = (c) => (c.parts ?? []).map((p) => p.text ?? "").join("");
const call = (name, args) => ({ role: "model", parts: [{ functionCall: { name, args } }] });
const say = (text) => ({ role: "model", parts: [{ text }] });

function snapshotOf(contents) {
  const last = contents.at(-1);
  for (const p of last.parts) {
    if (p.functionResponse?.response?.page_snapshot) return p.functionResponse.response.page_snapshot;
    if (p.text?.startsWith("PAGE SNAPSHOT")) return p.text;
  }
  return "";
}

function articles(snapshot) {
  const lines = snapshot.split("\n");
  const found = [];
  lines.forEach((line, i) => {
    const m = line.match(/\[(e\d+)\] <article[^>]*> "([^"]+)"/);
    if (!m) return;
    const date = lines.slice(i + 1, i + 6).join(" ").match(/(?:Completed|Published): (\w+) (\d{4})/);
    found.push({ id: m[1], title: m[2], when: date ? Number(date[2]) * 12 + MONTHS.indexOf(date[1].toLowerCase()) : -1 });
  });
  return found;
}

function reply(contents) {
  const lastUserIdx = contents.findLastIndex((c) => c.role === "user" && c.parts.some((p) => p.text && !p.functionResponse));
  const userText = textOf(contents[lastUserIdx]).split("PAGE SNAPSHOT")[0].toLowerCase();
  const step = contents.slice(lastUserIdx).filter((c) => c.role === "model").length;
  const snap = snapshotOf(contents);
  const arts = articles(snap);

  if (/highlight/.test(userText) && /(recent|latest|newest)/.test(userText)) {
    if (step === 0) return call("navigate", { url: "/#projects" });
    if (step === 1) {
      const best = arts.filter((a) => a.when > 0).sort((a, b) => b.when - a.when)[0];
      return best ? call("highlight_element", { element_id: best.id, label: "Most recent" }) : say("I couldn't find any dated projects.");
    }
    return say("I took you to the **Projects** section and highlighted the most recent project, with the newest completion date.");
  }
  if (/(contact|name)/.test(userText) && /(put|fill|type|enter)/.test(userText)) {
    const name = userText.match(/name (?:as|is) (\w+)/)?.[1] ?? "Sam";
    const value = name[0].toUpperCase() + name.slice(1);
    if (step === 0) return call("navigate", { url: "/#contact" });
    if (step === 1) {
      const field = snap.match(/\[(e\d+)\] input type=text label="Name"/);
      return field ? call("fill_input", { element_id: field[1], value }) : say("I can't find a Name field.");
    }
    return say(`I scrolled to the contact form and typed **${value}** into the Name field. What should the message say?`);
  }
  if (/scroll down/.test(userText)) return step === 0 ? call("scroll_page", { direction: "down" }) : say("Scrolled down one screen.");
  if (/focus|zoom/.test(userText)) {
    const target = arts[0];
    return step === 0 && target ? call("focus_section", { element_id: target.id }) : say("Focused on the first card.");
  }
  if (/blog/.test(userText)) return step === 0 ? call("navigate", { url: "/blog" }) : say("Here is the blog page.");
  if (/project/.test(userText)) {
    const titles = arts.filter((a) => a.when >= 0).map((a) => a.title);
    return say(titles.length ? `The projects on this page are:\n${titles.map((t) => `- **${t}**`).join("\n")}` : "I can't see a projects section on this page yet. Want me to navigate to it?");
  }
  return say("(mock Gemini) I understood your message but this offline mock only knows a few scripted requests.");
}

http
  .createServer((req, res) => {
    if (req.method !== "POST" || !/:generateContent$/.test(req.url ?? "")) {
      res.writeHead(404).end();
      return;
    }
    if (!req.headers["x-goog-api-key"]) {
      res.writeHead(403, { "Content-Type": "application/json" }).end(JSON.stringify({ error: { message: "missing key" } }));
      return;
    }
    let raw = "";
    req.on("data", (d) => (raw += d));
    req.on("end", () => {
      const body = JSON.parse(raw);
      const content = reply(body.contents);
      console.log(`[mock] ${content.parts[0].functionCall ? "functionCall " + content.parts[0].functionCall.name : "text"}`);
      setTimeout(() => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ candidates: [{ content, finishReason: "STOP" }] }));
      }, 350);
    });
  })
  .listen(PORT, () => console.log(`mock Gemini on http://localhost:${PORT}`));
