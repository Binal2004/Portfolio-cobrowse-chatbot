import { askGemini, GeminiError } from "@/lib/gemini";
import type { ChatRequestBody } from "@/lib/cobrowse/types";

export const maxDuration = 60;

const MAX_BODY_CHARS = 400_000;
const MAX_SNAPSHOT_CHARS = 30_000;
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;

// Best-effort per-IP throttle (per server instance) to protect the free-tier key.
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_REQUESTS_PER_WINDOW;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  if (rateLimited(ip)) {
    return Response.json({ error: "You're sending requests too quickly. Please wait a moment." }, { status: 429 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_CHARS) return Response.json({ error: "Conversation too long." }, { status: 413 });

  let body: ChatRequestBody;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!Array.isArray(body.contents) || body.contents.length === 0 || typeof body.snapshot !== "string") {
    return Response.json({ error: "Expected { contents, snapshot }." }, { status: 400 });
  }

  try {
    const content = await askGemini(body.contents, body.snapshot.slice(0, MAX_SNAPSHOT_CHARS));
    return Response.json({ content });
  } catch (err) {
    if (err instanceof GeminiError) {
      const friendly =
        err.status === 429
          ? "Gemini's free-tier rate limit was hit. Wait a few seconds and try again."
          : err.status === 400 || err.status === 403
            ? `Gemini rejected the request: ${err.message}`
            : err.message;
      return Response.json({ error: friendly }, { status: err.status === 500 ? 500 : 502 });
    }
    return Response.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
