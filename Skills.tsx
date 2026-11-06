import { skills } from "@/data/portfolio";

export default function Skills() {
  return (
    <section id="skills" className="block">
      <h2>Skills</h2>
      <div className="grid three">
        {skills.map((g) => (
          <article key={g.group} className="card">
            <h3>{g.group}</h3>
            <ul className="chips">
              {g.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
