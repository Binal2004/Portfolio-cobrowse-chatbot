import Link from "next/link";
import { profile } from "@/data/portfolio";

export default function Hero() {
  return (
    <section id="hero" className="hero" aria-label="Introduction">
      <p className="eyebrow">{profile.role}</p>
      <h1>Hi, I&apos;m {profile.name}.</h1>
      <p className="lead">{profile.tagline}</p>
      <div className="actions">
        <Link href="/#projects" className="btn primary">
          See my work
        </Link>
        <Link href="/#contact" className="btn">
          Get in touch
        </Link>
      </div>
    </section>
  );
}
