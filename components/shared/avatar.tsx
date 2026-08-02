export function Avatar({ name, size = "md" }: Readonly<{ name: string; size?: "sm" | "md" }>) {
  const initials = name.split(" ").slice(0, 2).map((part) => part[0]).join("");
  return <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono font-medium text-primary ${size === "sm" ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs"}`}>{initials}</span>;
}
