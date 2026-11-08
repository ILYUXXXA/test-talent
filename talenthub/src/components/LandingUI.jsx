import { forwardRef, useRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

// Keep the reference's control API while using the host app's plain CSS.
export const Button = forwardRef(function Button({ asChild = false, variant = 'default', size = 'default', className = '', ...props }, ref) {
  const Component = asChild ? Slot : 'button'
  return <Component ref={ref} {...(!asChild ? { type: 'button' } : {})} className={`kt-button kt-button-${variant} kt-button-${size} ${className}`} {...props} />
})

export const Dialog = DialogPrimitive.Root
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description

export function DialogContent({ children, className = '', ...props }) {
  const opener = useRef(null)
  return <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="kt-dialog-overlay" />
    <DialogPrimitive.Content className={className} {...props} onOpenAutoFocus={() => { opener.current = document.activeElement }} onCloseAutoFocus={event => {
      // CTA buttons use controlled state, so restore focus to the opening control.
      event.preventDefault()
      opener.current?.focus()
    }}>
      {children}
      <DialogPrimitive.Close className="kt-button kt-dialog-close" aria-label="Закрыть"><X aria-hidden="true" /></DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
}
