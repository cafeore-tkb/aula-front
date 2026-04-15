import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"

import { cn } from "~/lib/utils"
import styles from "./toggle.module.scss"

type ToggleVariant = 'default' | 'outline'
type ToggleSize = 'default' | 'sm' | 'lg'

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    {
      variant?: ToggleVariant
      size?: ToggleSize
    }
>(({ className, variant = 'default', size = 'default', ...props }, ref) => {
  const variantClassMap: Record<ToggleVariant, string> = {
    default: styles.variantDefault,
    outline: styles.variantOutline,
  }

  const sizeClassMap: Record<ToggleSize, string> = {
    default: styles.sizeDefault,
    sm: styles.sizeSm,
    lg: styles.sizeLg,
  }

  return (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(styles.toggle, variantClassMap[variant], sizeClassMap[size], className)}
    {...props}
  />
)
})

Toggle.displayName = TogglePrimitive.Root.displayName

export { Toggle }
