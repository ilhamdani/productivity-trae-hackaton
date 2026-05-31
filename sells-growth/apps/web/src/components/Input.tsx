import { type InputHTMLAttributes } from "react";

export default function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-none border border-slate-200/80 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm",
        "focus:border-leaf-300 focus:outline-none focus:ring-2 focus:ring-leaf-200/70",
        className,
      ].join(" ")}
    />
  );
}
