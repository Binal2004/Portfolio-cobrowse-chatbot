import { profile } from "@/data/portfolio";

export default function About() {
  return (
    <section id="about" className="block">
      <h2>About me</h2>
      {profile.about.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <p className="muted">Based in {profile.location}.</p>
    </section>
  );
}
