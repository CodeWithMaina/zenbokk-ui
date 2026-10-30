import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

export type PortalProps = {
  children: ReactNode
}

/** Renders overlays at the end of `<body>` so page overflow can't clip them. */
export function Portal({ children }: PortalProps) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}
