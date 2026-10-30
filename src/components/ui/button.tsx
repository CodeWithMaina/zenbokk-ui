import type { ComponentProps } from 'react'
import { ChevronLeft } from 'lucide-react'
import { cn } from '../../lib/cn'

export type ButtonVariant =
  | 'default'
  | 'primary'
  | 'accent'
  | 'ghost'
  | 'danger'
  | 'dangerSolid'

export type ButtonSize = 'sm' | 'md' | 'xl' | 'icon'

const variantClass: Record<ButtonVariant, string> = {
  default: '',
  primary: 'btn-primary',
  accent: 'btn-accent',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  dangerSolid: 'btn-danger-solid',
}

const sizeClass: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  xl: 'btn-xl',
  icon: 'btn-icon',
}

export type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

/** Primary action button. Built on the shared `.btn` recipe. */
export function Button({
  variant = 'default',
  size = 'md',
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn('btn', variantClass[variant], sizeClass[size], className)}
      {...props}
    />
  )
}

export type LinkButtonProps = ComponentProps<'button'>

/** Inline text action, e.g. "Select all" or "Clear". */
export function LinkButton({ type = 'button', className, ...props }: LinkButtonProps) {
  return <button type={type} className={cn('link', className)} {...props} />
}

export type TextLinkProps = ComponentProps<'a'>

/** Inline text navigation with the same look as `LinkButton`. */
export function TextLink({ className, ...props }: TextLinkProps) {
  return <a className={cn('link', className)} {...props} />
}

export type BackLinkProps = ComponentProps<'a'>

/** Back navigation used above detail pages. */
export function BackLink({ className, children, ...props }: BackLinkProps) {
  return (
    <a
      className={cn(
        'mb-[0.4rem] inline-flex min-h-[2.4rem] items-center gap-[0.3rem] font-medium text-muted transition-colors hover:text-fg',
        className,
      )}
      {...props}
    >
      <ChevronLeft className="size-4" aria-hidden="true" />
      {children}
    </a>
  )
}
