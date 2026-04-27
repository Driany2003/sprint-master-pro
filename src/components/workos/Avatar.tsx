import { cn } from "@/lib/utils";

interface Props {
  initials: string;
  color?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  title?: string;
}

const sizeMap = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
};

export function MemberAvatar({ initials, color = "#6366f1", size = "sm", className, title }: Props) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-background shadow-soft",
        sizeMap[size],
        className
      )}
      style={{ backgroundColor: color }}
    >
      {initials}
    </span>
  );
}

export function AvatarStack({
  members,
  max = 4,
  size = "sm",
}: {
  members: { initials: string; color?: string; name?: string }[];
  max?: number;
  size?: "xs" | "sm" | "md";
}) {
  const visible = members.slice(0, max);
  const extra = members.length - visible.length;
  return (
    <div className="flex -space-x-1.5">
      {visible.map((m, i) => (
        <MemberAvatar key={i} initials={m.initials} color={m.color} size={size} title={m.name} />
      ))}
      {extra > 0 && (
        <span className={cn(
          "inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground font-semibold ring-2 ring-background",
          size === "xs" ? "h-5 w-5 text-[9px]" : size === "md" ? "h-8 w-8 text-xs" : "h-6 w-6 text-[10px]",
        )}>+{extra}</span>
      )}
    </div>
  );
}
