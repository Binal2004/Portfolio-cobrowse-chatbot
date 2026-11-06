import { projects } from "@/data/portfolio";

export default function Projects() {
  return (
    <section id="projects" className="block">
      <h2>Projects</h2>
      <p className="muted">A selection of products I have designed and built.</p>
      <div className="grid two">
        {projects.map((p) => (
          <article key={p.slug} id={`project-${p.slug}`} className="card">
            <h3>{p.title}</h3>
            <p className="meta">Completed: {p.date}</p>
            <p>{p.summary}</p>
            <ul className="chips">
              {p.stack.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
            <a href={p.link} target="_blank" rel="noreferrer" className="btn small">
              View project
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
