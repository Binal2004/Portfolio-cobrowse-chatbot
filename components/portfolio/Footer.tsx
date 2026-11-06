import { profile } from "@/data/portfolio";

export default function Footer() {
  return (
    <footer className="site-footer">
      <p>
        © {new Date().getFullYear()} {profile.name}. Sample portfolio built for a co-browsing AI demo.
      </p>
    </footer>
  );
}
