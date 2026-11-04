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
        crm: {
          blue: "#2563eb",
          "blue-dark": "#1d4ed8",
          green: "#138a62",
          "ink-muted": "#657084",
          line: "#d7dee9",
          surface: "#ffffff",
          "surface-soft": "#f7f9fc"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      }
    },
  },
  plugins: [],
};

export default config;

