"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AgentError, runAgentTurn } from "@/lib/cobrowse/agent";
import type { AgentEvent, GeminiContent } from "@/lib/cobrowse/types";
import AgentOverlay from "./AgentOverlay";
import MessageText from "./MessageText";
import "./cobrowse.css";

type ChatItem =
  | { id: string; kind: "user" | "assistant" | "error"; text: string }
  | { id: string; kind: "tool"; name: string; status: "running" | "ok" | "failed"; summary: string };

const SUGGESTIONS = [
  "What projects are showcased here?",
  "Go to the projects section and highlight the most recent one",
  "Take me to the contact form and put my name as Sam",
  "Summarize the work experience",
];

const GREETING =
  "Hi! I'm your co-browsing guide. Ask me about this portfolio, or tell me what to do — I can scroll, navigate, highlight things and fill in forms for you.";

let uid = 0;
const nextId = () => `m${++uid}`;

export default function ChatWidget() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const history = useRef<GeminiContent[]>([]);
  const abort = useRef<AbortController | null>(null);
  const listEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items, busy, open]);

  const add = (item: ChatItem) => setItems((prev) => [...prev, item]);

  function onEvent(e: AgentEvent) {
    if (e.type === "text") {
      add({ id: nextId(), kind: "assistant", text: e.text });
    } else if (e.type === "tool") {
      add({ id: nextId(), kind: "tool", name: e.name, status: "running", summary: describeCall(e.args) });
    } else {
      setItems((prev) => {
        const idx = prev.findLastIndex((i) => i.kind === "tool" && i.status === "running");
        if (idx < 0) return prev;
        const copy = [...prev];
        const old = copy[idx] as Extract<ChatItem, { kind: "tool" }>;
        copy[idx] = { ...old, status: e.result.ok ? "ok" : "failed", summary: e.result.summary };
        return copy;
      });
    }
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setInput("");
    setBusy(true);
    add({ id: nextId(), kind: "user", text: trimmed });
    const controller = new AbortController();
    abort.current = controller;
    const historyLength = history.current.length;
    try {
      await runAgentTurn({
        history: history.current,
        userText: trimmed,
        ctx: { push: (path) => router.push(path) },
        signal: controller.signal,
        onEvent,
      });
    } catch (err) {
      // Roll back the unfinished turn so the next message starts from a valid history.
      history.current.length = historyLength;
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        const message = err instanceof AgentError ? err.message : "Something went wrong talking to the assistant.";
        add({ id: nextId(), kind: "error", text: message });
      }
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <div className="cb-root" data-cobrowse-ignore>
      <AgentOverlay />
      {open ? (
        <section className="cb-panel" aria-label="AI co-browsing assistant">
          <header className="cb-head">
            <div>
              <strong>Co-browsing assistant</strong>
              <span>Powered by Gemini</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant">
              ×
            </button>
          </header>

          <div className="cb-list" role="log" aria-live="polite">
            <div className="cb-msg assistant">
              <MessageText text={GREETING} />
            </div>
            {items.length === 0 && (
              <div className="cb-suggest">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => void send(s)} disabled={busy}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {items.map((item) =>
              item.kind === "tool" ? (
                <div key={item.id} className={`cb-tool ${item.status}`}>
                  <span className="cb-tool-icon">{item.status === "running" ? "⟳" : item.status === "ok" ? "✓" : "!"}</span>
                  <code>{item.name}</code>
                  <span>{item.summary}</span>
                </div>
              ) : (
                <div key={item.id} className={`cb-msg ${item.kind}`}>
                  <MessageText text={item.text} />
                </div>
              ),
            )}
            {busy && <div className="cb-typing" aria-label="Assistant is working"><i /><i /><i /></div>}
            <div ref={listEnd} />
          </div>

          <form className="cb-form" onSubmit={onSubmit}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask or tell me what to do…"
              aria-label="Message the assistant"
              disabled={busy}
              autoComplete="off"
            />
            {busy ? (
              <button type="button" onClick={() => abort.current?.abort()}>
                Stop
              </button>
            ) : (
              <button type="submit" disabled={!input.trim()}>
                Send
              </button>
            )}
          </form>
        </section>
      ) : (
        <button type="button" className="cb-fab" onClick={() => setOpen(true)} aria-label="Open AI assistant">
          <span aria-hidden="true">✨</span> Ask AI
        </button>
      )}
    </div>
  );
}

function describeCall(args: Record<string, unknown>): string {
  const arg = args.url ?? args.direction ?? args.value ?? args.element_id ?? "";
  return String(arg);
}
