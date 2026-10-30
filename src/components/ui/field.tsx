import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type FieldProps = {
  label?: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: ReactNode
  optional?: boolean
  className?: string
  children: ReactNode
}

/** Label + control + hint/error wrapper. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('min-w-0', className)}>
      {label ? (
        <label className="label" htmlFor={htmlFor}>
          {label}
          {optional ? (
            <span className="ml-[0.35rem] font-normal text-muted">optional</span>
          ) : null}
        </label>
      ) : null}
      {children}
      {error ? <FieldError>{error}</FieldError> : null}
      {!error && hint ? <FieldHint>{hint}</FieldHint> : null}
    </div>
  )
}

export type InputProps = ComponentProps<'input'> & {
  invalid?: boolean
}

export function Input({ invalid, className, ...props }: InputProps) {
  return (
    <input
      className={cn('input', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}

export type TextareaProps = ComponentProps<'textarea'> & {
  invalid?: boolean
}

export function Textarea({ invalid, className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn('textarea', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}

export type SelectProps = ComponentProps<'select'> & {
  invalid?: boolean
}

export function Select({ invalid, className, ...props }: SelectProps) {
  return (
    <select
      className={cn('select', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}

export type FieldHintProps = {
  children: ReactNode
  className?: string
}

export function FieldHint({ children, className }: FieldHintProps) {
  return (
    <p className={cn('mt-[0.4rem] text-[0.82rem] text-muted', className)}>
      {children}
    </p>
  )
}

export type FieldErrorProps = {
  children: ReactNode
  className?: string
}

export function FieldError({ children, className }: FieldErrorProps) {
  return (
    <p className={cn('field-error', className)} role="alert">
      {children}
    </p>
  )
}

export type InputWithPrefixProps = InputProps & {
  prefix: ReactNode
}

/** Input with a fixed prefix block, e.g. a currency or an `@` handle. */
export function InputWithPrefix({
  prefix,
  className,
  ...props
}: InputWithPrefixProps) {
  return (
    <div className="flex">
      <span className="flex items-center rounded-l-md border border-r-0 border-line bg-hover px-[0.8rem] text-meta whitespace-nowrap text-muted">
        {prefix}
      </span>
      <Input className={cn('rounded-l-none', className)} {...props} />
    </div>
  )
}

export type FormGridProps = {
  children: ReactNode
  className?: string
}

/** Two-column form grid that becomes one column on narrow screens. */
export function FormGrid({ children, className }: FormGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-x-[0.8rem] gap-y-[1.1rem] max-sm:grid-cols-1',
        className,
      )}
    >
      {children}
    </div>
  )
}

export type FormGridFullProps = {
  children: ReactNode
  className?: string
}

/** Occupies both columns of a `FormGrid`. */
export function FormGridFull({ children, className }: FormGridFullProps) {
  return <div className={cn('col-span-full', className)}>{children}</div>
}
