import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./domains/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg) / <alpha-value>)",
        "bg-alt": "hsl(var(--bg-alt) / <alpha-value>)",
        "bg-elev": "hsl(var(--bg-elev) / <alpha-value>)",
        "bg-hover": "hsl(var(--bg-hover) / <alpha-value>)",
        ink: { DEFAULT: "hsl(var(--ink) / <alpha-value>)", muted: "hsl(var(--ink-muted) / <alpha-value>)", dim: "hsl(var(--ink-dim) / <alpha-value>)" },
        line: { DEFAULT: "hsl(var(--line) / <alpha-value>)", strong: "hsl(var(--line-strong) / <alpha-value>)" },
        primary: { DEFAULT: "hsl(var(--accent) / <alpha-value>)", foreground: "hsl(var(--bg) / <alpha-value>)" },
        warm: "hsl(var(--warm) / <alpha-value>)",
        danger: "hsl(var(--danger) / <alpha-value>)",
        info: "hsl(var(--info) / <alpha-value>)",
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      boxShadow: { subtle: "var(--shadow-subtle)" },
      spacing: { page: "var(--space-page)" },
      fontFamily: {
        sans: ["var(--font-sans)", "IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "IBM Plex Mono", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "Instrument Serif", "ui-serif", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
