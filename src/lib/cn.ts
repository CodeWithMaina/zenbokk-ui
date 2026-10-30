import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge conditional class names, letting later Tailwind utilities win.
 *
 * Recipe classes from `index.css` (`.btn`, `.card`, `.chip`, ...) are passed
 * through untouched, so utilities can still override them deliberately.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
