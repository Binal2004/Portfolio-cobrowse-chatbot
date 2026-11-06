import type { Metadata } from "next";
import { posts } from "@/data/portfolio";

export const metadata: Metadata = { title: "Blog · Alex Rivera" };

export default function Blog() {
  return (
    <section id="blog" className="block">
      <h1>Blog</h1>
      <p className="muted">Notes on building products for the web.</p>
      <div className="grid">
        {posts.map((p) => (
          <article key={p.slug} className="card">
            <h2 className="h3">{p.title}</h2>
            <p className="meta">Published: {p.date}</p>
            <p>{p.excerpt}</p>
            <button type="button" className="btn small" disabled>
              Read post (coming soon)
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
