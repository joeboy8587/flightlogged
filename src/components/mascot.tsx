import mascotAsset from "@/assets/watcher-mascot.asset.json";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: "h-8 w-8",
  sm: "h-10 w-10",
  md: "h-24 w-24",
  lg: "h-40 w-40",
  xl: "h-60 w-60",
} as const;

type MascotProps = {
  size?: keyof typeof SIZES;
  animated?: boolean;
  className?: string;
  alt?: string;
};

export function Mascot({ size = "md", animated = true, className, alt }: MascotProps) {
  return (
    <img
      src={mascotAsset.url}
      alt={alt ?? "The Watcher — Architecture of Never mascot"}
      className={cn(
        SIZES[size],
        "object-contain select-none pointer-events-none",
        animated && "mascot-float mascot-glow",
        className,
      )}
      draggable={false}
    />
  );
}