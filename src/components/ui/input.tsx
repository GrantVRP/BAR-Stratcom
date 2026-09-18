import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-none border-2 border-black bg-[#0b0d14] px-3 py-1.5 text-base font-pixel-body text-zinc-100 placeholder:text-zinc-500 transition-none outline-none focus-visible:border-[#449bed] focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 pixel-box-inset",
        className
      )}
      {...props}
    />
  )
}

export { Input }
