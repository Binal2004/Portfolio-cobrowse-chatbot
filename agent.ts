// Client-side agent loop: send the conversation + a fresh page snapshot to the
// server, execute any tool calls the model requests, feed the results back, and
// repeat until the model answers with plain text.

import { executeTool, type ExecContext } from "./executor";
import { takeSnapshot } from "./snapshot";
import type { AgentEvent, ChatRequestBody, GeminiContent, GeminiPart } from "./types";

const MAX_STEPS = 8;

export class AgentError extends Error {}

async function callModel(body: ChatRequestBody, signal: AbortSignal): Promise<GeminiContent> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AgentError(data.error ?? `Request failed (${res.status})`);
  return data.content as GeminiContent;
}

/**
 * Runs one user turn. `history` is mutated in place (user message, model turns,
 * tool responses) so the next turn keeps full conversational context.
 */
export async function runAgentTurn(opts: {
  history: GeminiContent[];
  userText: string;
  ctx: ExecContext;
  signal: AbortSignal;
  onEvent: (e: AgentEvent) => void;
}): Promise<void> {
  const { history, userText, ctx, signal, onEvent } = opts;
  history.push({ role: "user", parts: [{ text: userText }] });

  for (let step = 0; step < MAX_STEPS; step++) {
    // Fresh snapshot every round: earlier tool calls changed scroll/page state.
    const content = await callModel({ contents: history, snapshot: takeSnapshot() }, signal);
    const parts = content?.parts ?? [];
    history.push({ role: "model", parts: parts.length ? parts : [{ text: "" }] });

    for (const p of parts) {
      if (p.text && !p.thought) onEvent({ type: "text", text: p.text });
    }

    const calls = parts.filter((p) => p.functionCall);
    if (calls.length === 0) return;

    const responses: GeminiPart[] = [];
    for (const [i, part] of calls.entries()) {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      const { name, args = {}, id } = part.functionCall!;
      const callId = `${step}-${i}`;
      onEvent({ type: "tool", id: callId, name, args });
      const result = await executeTool(name, args, ctx);
      onEvent({ type: "tool_result", id: callId, result });
      responses.push({
        functionResponse: {
          name,
          ...(id ? { id } : {}),
          response: { ok: result.ok, result: result.message },
        },
      });
    }
    history.push({ role: "user", parts: responses });
  }

  const text = "I've taken several actions in a row — tell me if you'd like me to continue.";
  history.push({ role: "model", parts: [{ text }] }); // keep user/model roles alternating
  onEvent({ type: "text", text });
}
