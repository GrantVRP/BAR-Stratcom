import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-none border border-black px-2 py-0.5 font-pixel-heading text-[8px] uppercase tracking-wider whitespace-nowrap transition-none select-none shadow-[1px_1px_0px_#000] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-2.5!",
  {
    variants: {
      variant: {
        default: "bg-black/80 text-zinc-100 border-zinc-700",
        secondary:
          "bg-[#0a1c32] text-[#449bed] border-[#449bed]",
        destructive:
          "bg-[#380b12] text-[#ff2244] border-[#ff2244]",
        outline:
          "border-zinc-700 text-zinc-300 bg-black/60",
        ghost:
          "bg-transparent border-transparent text-zinc-400",
        link: "text-[#449bed] underline-offset-4 hover:underline border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
