import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost" | "danger";
type Size = "md" | "sm";

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition focus:outline-none focus:ring-2 focus:ring-caramel-300/40 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = size === "sm" ? "px-3 py-2 text-sm" : "px-4 py-3 text-sm";
  const variants =
    variant === "primary"
      ? "bg-gradient-to-b from-caramel-400 to-caramel-600 text-ink-950 shadow-glow hover:brightness-110"
      : variant === "danger"
        ? "bg-gradient-to-b from-red-400 to-red-600 text-white shadow-glow hover:brightness-110"
        : "border border-white/12 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white";

  return <button {...props} className={[base, sizes, variants, className].join(" ")} />;
}

