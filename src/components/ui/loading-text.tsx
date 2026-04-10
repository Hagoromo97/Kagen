import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type LoadingVariant = "pulse" | "dots" | "typewriter"

interface LoadingTextProps {
  text?: string
  size?: "sm" | "md" | "lg"
  /** Visual animation variant.
   * - `pulse`      — gentle opacity fade (default)
   * - `dots`       — three bouncing dots beside the label
   * - `typewriter` — blinking cursor appended to text
   */
  variant?: LoadingVariant
  showSpinner?: boolean
  className?: string
  shellClassName?: string
}

const sizeMap = {
  sm: { text: "text-sm",    icon: "size-4" },
  md: { text: "text-base",  icon: "size-5" },
  lg: { text: "text-lg",    icon: "size-6" },
}

export function LoadingText({
  text = "Loading…",
  size = "sm",
  variant = "pulse",
  showSpinner = true,
  className,
  shellClassName,
}: LoadingTextProps) {
  const { text: textSize, icon: iconSize } = sizeMap[size]

  return (
    <div
      className={cn(
        "loading-shell flex items-center gap-2.5 text-muted-foreground",
        shellClassName,
      )}
    >
      {showSpinner && variant !== "dots" && (
        <Loader2 className={cn("loading-spinner animate-spin shrink-0", iconSize)} />
      )}

      {variant === "pulse" && (
        <span className={cn("loading-text", textSize, className)}>{text}</span>
      )}

      {variant === "typewriter" && (
        <span className={cn("loading-text-typewriter", textSize, className)}>{text}</span>
      )}

      {variant === "dots" && (
        <span className={cn("flex items-center gap-1.5", textSize, className)}>
          <span className={cn("loading-text", textSize)}>{text}</span>
          <span className="loading-dots" aria-hidden>
            <span /><span /><span />
          </span>
        </span>
      )}
    </div>
  )
}

/** Full-page / full-panel centered wrapper */
export function LoadingScreen({
  text,
  size,
  variant,
  className,
}: Pick<LoadingTextProps, "text" | "size" | "variant" | "className">) {
  return (
    <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
      <LoadingText text={text} size={size} variant={variant} className={className} />
    </div>
  )
}
