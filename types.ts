// Gemini REST "Content" shapes (only the fields this app touches).
export interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown>; id?: string };
  functionResponse?: { name: string; id?: string; response: Record<string, unknown> };
  // Opaque fields (e.g. thoughtSignature) must be echoed back untouched.
  [key: string]: unknown;
}

export interface GeminiContent {
  role: "user" | "model";
  parts: GeminiPart[];
}

export interface ToolResult {
  ok: boolean;
  /** Text handed back to the model. */
  message: string;
  /** Short human-readable line shown in the chat UI. */
  summary: string;
}

/** Events the agent loop emits so the UI can render progress. */
export type AgentEvent =
  | { type: "text"; text: string }
  | { type: "tool"; id: string; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; id: string; result: ToolResult };

export interface ChatRequestBody {
  contents: GeminiContent[];
  snapshot: string;
}
