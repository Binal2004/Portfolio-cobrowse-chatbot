import { experience } from "@/data/portfolio";

export default function Experience() {
  return (
    <section id="experience" className="block">
      <h2>Experience</h2>
      <div className="timeline">
        {experience.map((e) => (
          <article key={e.company} className="card">
            <h3>
              {e.role} · {e.company}
            </h3>
            <p className="meta">{e.period}</p>
            <p>{e.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
