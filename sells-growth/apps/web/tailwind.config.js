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
        leaf: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          200: "#BBF7D0",
          300: "#86EFAC",
          400: "#4ADE80",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
          800: "#166534",
          900: "#14532D",
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
        glow: "0 0 0 1px rgba(34,197,94,0.25), 0 18px 50px rgba(34,197,94,0.18)",
        card: "0 1px 0 rgba(15, 23, 42, 0.04), 0 10px 30px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};
