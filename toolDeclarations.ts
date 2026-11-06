// Tool schemas advertised to Gemini. The model only ever *requests* these;
// lib/cobrowse/executor.ts is the single place that touches the page.

const elementId = {
  type: "STRING",
  description: 'Element id from the page snapshot, e.g. "e12".',
};

export const toolDeclarations = [
  {
    name: "navigate",
    description:
      'Go to another page or section of this website. Pass an internal link exactly as listed in the snapshot (e.g. "/blog", "/#projects", "/").',
    parameters: {
      type: "OBJECT",
      properties: { url: { type: "STRING", description: 'Internal path, optionally with a #hash.' } },
      required: ["url"],
    },
  },
  {
    name: "scroll_page",
    description: "Scroll the current page up or down by roughly one screen, or jump to the top or bottom.",
    parameters: {
      type: "OBJECT",
      properties: {
        direction: { type: "STRING", enum: ["up", "down", "top", "bottom"], description: "Where to scroll." },
      },
      required: ["direction"],
    },
  },
  {
    name: "scroll_to_element",
    description: "Smoothly scroll so that a specific element or section is visible.",
    parameters: { type: "OBJECT", properties: { element_id: elementId }, required: ["element_id"] },
  },
  {
    name: "highlight_element",
    description:
      "Draw a visible highlight ring (with an optional short label) around an element and scroll it into view. Use for pointing things out to the user. Can be called several times to highlight several elements.",
    parameters: {
      type: "OBJECT",
      properties: {
        element_id: elementId,
        label: { type: "STRING", description: 'Optional short caption shown next to the highlight, e.g. "Most recent".' },
      },
      required: ["element_id"],
    },
  },
  {
    name: "focus_section",
    description:
      "Zoom-style focus: scroll a section into the centre of the screen and dim everything else so the user concentrates on it.",
    parameters: { type: "OBJECT", properties: { element_id: elementId }, required: ["element_id"] },
  },
  {
    name: "click_element",
    description:
      "Click a button or link. Internal links navigate; external links are not opened (their URL is returned so you can share it). Do not click a form's submit button unless the user asked to send it.",
    parameters: { type: "OBJECT", properties: { element_id: elementId }, required: ["element_id"] },
  },
  {
    name: "fill_input",
    description:
      "Type a value into a text input, textarea or select. Only use values the user provided or clearly asked for; never invent personal details. Password fields are refused.",
    parameters: {
      type: "OBJECT",
      properties: {
        element_id: elementId,
        value: { type: "STRING", description: "Text to enter (or option label/value for a select)." },
      },
      required: ["element_id", "value"],
    },
  },
  {
    name: "read_element",
    description:
      "Return the full, untruncated visible text of an element. Use when the snapshot text looks cut off or you need more detail.",
    parameters: { type: "OBJECT", properties: { element_id: elementId }, required: ["element_id"] },
  },
  {
    name: "clear_effects",
    // No `parameters`: Gemini rejects an OBJECT schema with empty properties.
    description: "Remove all highlights and focus overlays from the page.",
  },
] as const;

export type ToolName = (typeof toolDeclarations)[number]["name"];
