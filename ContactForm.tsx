"use client";

import { useState, type FormEvent } from "react";
import { profile } from "@/data/portfolio";

// Demo form: nothing is sent anywhere, the submission is only acknowledged on screen.
export default function ContactForm() {
  const [sent, setSent] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setSent(String(data.get("name") || "there"));
    e.currentTarget.reset();
  }

  return (
    <section id="contact" className="block">
      <h2>Contact</h2>
      <p className="muted">
        Have a project in mind? Send a message or write to {profile.email}.
      </p>
      {sent ? (
        <p role="status" className="success">
          Thanks, {sent}! Your message was received (demo form — nothing is actually sent).
        </p>
      ) : (
        <form onSubmit={onSubmit} aria-label="Contact form" className="form">
          <label>
            Name
            <input name="name" type="text" placeholder="Your name" required />
          </label>
          <label>
            Email
            <input name="email" type="email" placeholder="you@example.com" required />
          </label>
          <label>
            Message
            <textarea name="message" rows={4} placeholder="How can I help?" required />
          </label>
          <button type="submit" className="btn primary">
            Send message
          </button>
        </form>
      )}
    </section>
  );
}
