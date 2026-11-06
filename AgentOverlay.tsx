"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { overlayStore } from "@/lib/cobrowse/overlay-store";

/** Draws highlights, the focus spotlight and the agent's pointer. Purely visual. */
export default function AgentOverlay() {
  const { effects, cursor } = useSyncExternalStore(
    overlayStore.subscribe,
    overlayStore.getState,
    overlayStore.getServerState,
  );
  const [, setFrame] = useState(0);

  // Keep rectangles glued to their elements while the page scrolls or resizes.
  useEffect(() => {
    if (effects.length === 0) return;
    let raf = requestAnimationFrame(function loop() {
      setFrame((n) => n + 1);
      raf = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(raf);
  }, [effects.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && overlayStore.clearEffects();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="cb-overlay" data-cobrowse-ignore aria-hidden="true">
      {effects.map((fx) => {
        if (!fx.element.isConnected) return null;
        const r = fx.element.getBoundingClientRect();
        const pad = fx.kind === "focus" ? 14 : 6;
        const style = {
          top: r.top - pad,
          left: r.left - pad,
          width: r.width + pad * 2,
          height: r.height + pad * 2,
        };
        return (
          <div key={fx.key} className={`cb-fx cb-${fx.kind}`} style={style}>
            {fx.label && <span className="cb-fx-label">{fx.label}</span>}
          </div>
        );
      })}
      {cursor && (
        <div className="cb-cursor" style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}>
          <svg width="26" height="26" viewBox="0 0 24 24">
            <path d="M3 2l7 18 2.6-7.4L20 10 3 2z" fill="#4f46e5" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          {cursor.clickedAt > 0 && <span key={cursor.clickedAt} className="cb-ripple" />}
        </div>
      )}
    </div>
  );
}
