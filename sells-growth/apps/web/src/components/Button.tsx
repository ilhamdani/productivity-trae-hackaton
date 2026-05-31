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
    "inline-flex items-center justify-center gap-2 rounded-none font-medium transition focus:outline-none focus:ring-2 focus:ring-leaf-300/45 disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm";
  const variants =
    variant === "primary"
      ? "bg-gradient-to-b from-leaf-500 to-leaf-700 text-white shadow-glow hover:brightness-105"
      : variant === "danger"
        ? "bg-gradient-to-b from-red-500 to-red-700 text-white shadow-glow hover:brightness-105"
        : "border border-slate-200/80 bg-white text-slate-700 shadow-sm hover:bg-slate-50";

  return <button {...props} className={[base, sizes, variants, className].join(" ")} />;
}
