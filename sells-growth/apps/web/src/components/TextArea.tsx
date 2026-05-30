import { type TextareaHTMLAttributes } from "react";

export default function TextArea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "w-full resize-none rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35",
        "focus:border-caramel-300/50 focus:outline-none focus:ring-2 focus:ring-caramel-300/25",
        className,
      ].join(" ")}
    />
  );
}

