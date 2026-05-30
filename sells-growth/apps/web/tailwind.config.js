/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Fraunces", "serif"],
        sans: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui"],
      },
      colors: {
        ink: {
          950: "#120B07",
          900: "#1A100A",
          800: "#2A1A10",
        },
        caramel: {
          50: "#FFF7ED",
          100: "#FFE9C7",
          200: "#FFD48D",
          300: "#FFB84F",
          400: "#FF9A1A",
          500: "#F37D00",
          600: "#C85F00",
          700: "#9B4500",
          800: "#733300",
          900: "#4A1F00",
        },
        mint: {
          50: "#E9FFF9",
          100: "#C6FFEF",
          200: "#8AF9DA",
          300: "#51E9C2",
          400: "#20CFA3",
          500: "#13A881",
          600: "#0F8667",
          700: "#0D6752",
          800: "#0A4B3C",
          900: "#073227",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,154,26,0.35), 0 14px 60px rgba(243,125,0,0.16)",
        card: "0 0 0 1px rgba(255,255,255,0.08), 0 20px 70px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};

