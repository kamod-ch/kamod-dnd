import type { ComponentChildren, JSX } from "preact";

type DemoButtonProps = {
  children: ComponentChildren;
  onClick?: () => void;
  variant?: "ghost" | "outline";
  class?: string;
};

export function DemoButton({
  children,
  onClick,
  variant = "ghost",
  class: className = "",
}: DemoButtonProps): JSX.Element {
  const base =
    "inline-flex min-h-8 items-center rounded-md px-2.5 text-xs font-medium transition-colors";
  const styles =
    variant === "outline"
      ? "border border-border bg-background hover:bg-muted"
      : "border border-transparent hover:bg-muted";
  return (
    <button type="button" class={`${base} ${styles} ${className}`} onClick={onClick}>
      {children}
    </button>
  );
}
