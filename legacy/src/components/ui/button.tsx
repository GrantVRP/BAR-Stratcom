import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border-2 border-black font-pixel-heading text-xs uppercase tracking-wider whitespace-nowrap transition-none outline-none select-none active:translate-y-0.5 active:shadow-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-[#1a1c28] text-white border-[#3b425b] hover:border-zinc-400 shadow-[2px_2px_0px_#000]",
        outline:
          "border-zinc-700 bg-[#0b0d14] text-zinc-300 hover:border-zinc-500 shadow-[2px_2px_0px_#000]",
        secondary:
          "bg-[#0a1c32] text-[#449bed] border-[#449bed] hover:bg-[#449bed] hover:text-[#0c0c14] shadow-[2px_2px_0px_#000]",
        ghost:
          "border-transparent bg-transparent text-zinc-400 hover:text-white shadow-none",
        destructive:
          "bg-[#380b12] text-[#ff2244] border-[#ff2244] hover:bg-[#ff2244] hover:text-[#0c0c14] shadow-[2px_2px_0px_#000]",
        link: "text-[#449bed] underline-offset-4 hover:underline border-transparent shadow-none",
      },
      size: {
        default:
          "h-8 gap-1.5 px-3 py-1 text-[10px]",
        xs: "h-6 gap-1 px-2 text-[8px]",
        sm: "h-7 gap-1 px-2.5 text-[9px]",
        lg: "h-10 gap-2 px-4 text-xs",
        icon: "size-8",
        "icon-xs": "size-6",
        "icon-sm": "size-7",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
