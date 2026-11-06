// Sample portfolio content. The chatbot never imports this file: it learns
// about the site only by reading what is rendered in the DOM.

export const profile = {
  name: "Alex Rivera",
  role: "Full-stack developer & product engineer",
  tagline:
    "I build fast, accessible web products — from data-heavy dashboards to playful developer tools.",
  location: "Lisbon, Portugal",
  email: "hello@alexrivera.dev",
  about: [
    "I'm a full-stack developer with seven years of experience shipping products for startups and scale-ups. I care about clean interfaces, solid architecture and measurable user impact.",
    "Lately I focus on TypeScript, React and Next.js, with a growing interest in AI-assisted interfaces. Outside of work I mentor junior developers and contribute to open-source tooling.",
  ],
};

export const skills = [
  { group: "Frontend", items: ["React", "Next.js", "TypeScript", "CSS / Design systems", "Accessibility"] },
  { group: "Backend", items: ["Node.js", "PostgreSQL", "GraphQL", "Redis", "REST APIs"] },
  { group: "Tooling", items: ["Vercel", "Docker", "GitHub Actions", "Playwright", "Figma"] },
];

// Intentionally not sorted by date.
export const projects = [
  {
    slug: "orbit-crm",
    title: "Orbit CRM",
    date: "March 2023",
    summary:
      "A lightweight CRM for freelancers with pipeline boards, invoice reminders and email sync. Used by 1,200 freelancers.",
    stack: ["Next.js", "PostgreSQL", "tRPC"],
    link: "https://example.com/orbit-crm",
  },
  {
    slug: "pulse-analytics",
    title: "Pulse Analytics",
    date: "August 2025",
    summary:
      "A privacy-first product analytics dashboard with real-time funnels, cohort retention and a natural-language query bar.",
    stack: ["React", "ClickHouse", "TypeScript"],
    link: "https://example.com/pulse-analytics",
  },
  {
    slug: "trailmap",
    title: "TrailMap",
    date: "June 2024",
    summary:
      "An offline-first hiking companion app that records GPS tracks, elevation profiles and sharable route cards.",
    stack: ["React Native", "SQLite", "Mapbox"],
    link: "https://example.com/trailmap",
  },
  {
    slug: "snippetbox",
    title: "SnippetBox",
    date: "November 2022",
    summary:
      "A CLI and web app for saving, tagging and searching code snippets, with a VS Code extension and 4,000+ GitHub stars.",
    stack: ["Node.js", "Svelte", "SQLite"],
    link: "https://example.com/snippetbox",
  },
  {
    slug: "lumen-design-system",
    title: "Lumen Design System",
    date: "February 2025",
    summary:
      "An accessible, themeable React component library with 60+ components, adopted across four product teams.",
    stack: ["React", "Storybook", "CSS variables"],
    link: "https://example.com/lumen",
  },
];

export const experience = [
  {
    company: "Northwind Labs",
    role: "Senior Full-stack Engineer",
    period: "2023 – Present",
    summary: "Lead the web platform team; cut page load times by 45% and introduced an AI support assistant.",
  },
  {
    company: "Brightside Studio",
    role: "Frontend Engineer",
    period: "2020 – 2023",
    summary: "Built client dashboards and a shared component library used across eight projects.",
  },
  {
    company: "Kite Apps",
    role: "Junior Developer",
    period: "2018 – 2020",
    summary: "Shipped mobile-first web apps and learned the craft of testing and code review.",
  },
];

export const posts = [
  {
    slug: "designing-ai-copilots",
    title: "Designing AI copilots that actually act",
    date: "September 2025",
    excerpt: "Why tool-calling beats chat-only assistants, and how to keep the model away from your DOM.",
  },
  {
    slug: "shipping-design-systems",
    title: "Shipping a design system without a rewrite",
    date: "March 2025",
    excerpt: "Lessons from rolling out Lumen across four teams one component at a time.",
  },
  {
    slug: "offline-first-maps",
    title: "Offline-first maps in React Native",
    date: "July 2024",
    excerpt: "Tile caching, conflict-free track syncing and battery-friendly GPS sampling.",
  },
];
