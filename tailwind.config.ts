import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Japandi / Scandi Minimal Design System
        japandi: {
          background: {
            primary: "#F7F2EA",    // Warm off-white
            card: "#F9F5F0",        // Slightly darker off-white for cards
          },
          accent: {
            primary: "#D3A676",    // Warm wood / camel
            hover: "#C49666",       // Slightly darker for hover states
          },
          text: {
            primary: "#222222",     // Near-black
            secondary: "#6B5D4F",   // Warm gray-brown
            muted: "#9B8E7F",       // Muted warm gray
          },
          border: {
            light: "#E8E0D5",       // Very light warm gray
          },
        },
      },
      fontFamily: {
        sans: ["Inter", "SF Pro Display", "Nunito", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "20px",               // 16-24px range, using 20px as default
      },
      boxShadow: {
        soft: "0 2px 8px rgba(0, 0, 0, 0.04)",  // Subtle shadow for cards
        button: "0 2px 4px rgba(211, 166, 118, 0.2)",  // Soft shadow for buttons
      },
    },
  },
  plugins: [],
};
export default config;

