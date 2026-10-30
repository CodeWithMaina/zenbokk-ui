import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type PageHeaderProps = {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
  children?: ReactNode
}

/** List-level heading with optional description and right-aligned actions. */
export function PageHeader({
  title,
  description,
  actions,
  className,
  children,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'mb-4 flex flex-wrap items-end justify-between gap-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-title font-bold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-[0.2rem] text-meta text-muted">{description}</p>
        ) : null}
        {children}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center justify-end gap-[0.6rem]">
          {actions}
        </div>
      ) : null}
    </header>
  )
}

export type EntityHeaderProps = {
  avatar?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  className?: string
  titleClassName?: string
  titleAs?: 'h1' | 'h2'
}

/**
 * Profile / entity hero used above a detail page or settings panel:
 * avatar, name, supporting meta and actions that wrap on phones.
 */
export function EntityHeader({
  avatar,
  title,
  subtitle,
  meta,
  actions,
  className,
  titleClassName,
  titleAs: Title = 'h1',
}: EntityHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-wrap items-center justify-between gap-4 pb-[1.1rem] pt-[0.3rem]',
        className,
      )}
    >
      <div className="flex min-w-0 flex-[1_1_20rem] items-center gap-4">
        {avatar}
        <div className="min-w-0">
          <Title
            className={cn(
              'text-title font-bold tracking-tight',
              titleClassName,
            )}
          >
            {title}
          </Title>
          {(subtitle || meta) && (
            <div className="mt-[0.3rem] flex flex-wrap items-center gap-x-[0.9rem] gap-y-[0.3rem] text-meta text-muted">
              {subtitle}
              {meta}
            </div>
          )}
        </div>
      </div>
      {actions ? (
        <div className="flex items-center gap-[0.6rem] max-md:w-full max-md:[&>*]:flex-1">
          {actions}
        </div>
      ) : null}
    </header>
  )
}
