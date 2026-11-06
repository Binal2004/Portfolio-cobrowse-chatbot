import { Fragment, type ReactNode } from "react";

// Minimal, injection-safe renderer for the subset of markdown the assistant uses:
// "- " bullets, blank-line paragraphs and **bold**.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) =>
    chunk.startsWith("**") && chunk.endsWith("**") && chunk.length > 4 ? (
      <strong key={i}>{chunk.slice(2, -2)}</strong>
    ) : (
      <Fragment key={i}>{chunk}</Fragment>
    ),
  );
}

export default function MessageText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      const items = bullets;
      blocks.push(
        <ul key={`ul-${blocks.length}`}>
          {items.map((b, i) => (
            <li key={i}>{inline(b)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*[-*•]\s+(.*)$/);
    if (m) bullets.push(m[1]);
    else {
      flush();
      if (line.trim()) blocks.push(<p key={`p-${blocks.length}`}>{inline(line)}</p>);
    }
  }
  flush();
  return <>{blocks}</>;
}
