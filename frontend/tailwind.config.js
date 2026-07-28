/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
    theme: {
        extend: {
            fontFamily: {
                sans: [
                    "IBM Plex Sans",
                    "ui-sans-serif",
                    "system-ui",
                    "sans-serif",
                ],
                serif: [
                    "Instrument Serif",
                    "ui-serif",
                    "Georgia",
                    "serif",
                ],
                mono: [
                    "IBM Plex Mono",
                    "ui-monospace",
                    "monospace",
                ],
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            colors: {
                bg: "hsl(var(--bg))",
                "bg-alt": "hsl(var(--bg-alt))",
                "bg-elev": "hsl(var(--bg-elev))",
                "bg-hover": "hsl(var(--bg-hover))",
                ink: {
                    DEFAULT: "hsl(var(--ink))",
                    muted: "hsl(var(--ink-muted))",
                    dim: "hsl(var(--ink-dim))",
                },
                line: {
                    DEFAULT: "hsl(var(--line))",
                    strong: "hsl(var(--line-strong))",
                },
                warm: "hsl(var(--warm))",
                danger: "hsl(var(--danger))",
                info: "hsl(var(--info))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                chart: {
                    1: "hsl(var(--chart-1))",
                    2: "hsl(var(--chart-2))",
                    3: "hsl(var(--chart-3))",
                    4: "hsl(var(--chart-4))",
                    5: "hsl(var(--chart-5))",
                },
            },
            keyframes: {
                "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
                "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
                "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
                "slide-up": { from: { transform: "translateY(8px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "fade-in": "fade-in 0.4s ease-out",
                "slide-up": "slide-up 0.5s ease-out",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
