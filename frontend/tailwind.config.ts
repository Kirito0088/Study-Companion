import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Indigo Slate dark theme
        background: "#0f1117",
        surface: {
          DEFAULT: "#1a1d2e",
          elevated: "#1e2235",
          high: "#252840",
          border: "#2a2d45",
        },
        primary: {
          DEFAULT: "#6366f1",
          hover: "#818cf8",
          dim: "#4f52c9",
          glow: "rgba(99,102,241,0.25)",
        },
        tertiary: {
          DEFAULT: "#7c3aed",
          hover: "#8b5cf6",
          glow: "rgba(124,58,237,0.25)",
        },
        text: {
          primary: "#e2e8f0",
          secondary: "#94a3b8",
          muted: "#64748b",
        },
        status: {
          success: "#22c55e",
          warning: "#f59e0b",
          error: "#ef4444",
          info: "#3b82f6",
        },
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "xl": "12px",
        "2xl": "16px",
        "3xl": "20px",
        "4xl": "24px",
      },
      boxShadow: {
        glow: "0 0 20px rgba(99,102,241,0.25)",
        "glow-sm": "0 0 12px rgba(99,102,241,0.15)",
        "glow-tertiary": "0 0 20px rgba(124,58,237,0.25)",
        card: "0 4px 24px rgba(0,0,0,0.4)",
        "card-hover": "0 8px 32px rgba(0,0,0,0.5)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.05)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)",
        "gradient-dark": "linear-gradient(135deg, #1a1d2e 0%, #1e2235 100%)",
        "gradient-card": "linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(124,58,237,0.05) 100%)",
        "gradient-hero": "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(124,58,237,0.08) 50%, transparent 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "typing": "typing 1.2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 12px rgba(99,102,241,0.2)" },
          "50%": { boxShadow: "0 0 24px rgba(99,102,241,0.4)" },
        },
        typing: {
          "0%, 60%, 100%": { opacity: "0.3", transform: "scale(1)" },
          "30%": { opacity: "1", transform: "scale(1.2)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
