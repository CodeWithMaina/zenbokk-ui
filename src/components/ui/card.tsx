import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type CardProps = ComponentProps<'div'>

/** Standard bordered surface. */
export function Card({ className, ...props }: CardProps) {
  return <div className={cn('card', className)} {...props} />
}

export type SectionHeadingProps = {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

/** Heading + optional description + trailing action. */
export function SectionHeading({
  title,
  description,
  action,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-heading font-bold tracking-snug">{title}</h2>
        {description ? (
          <p className="mt-[0.15rem] text-meta text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export type SectionCardProps = Omit<ComponentProps<'section'>, 'title'> & {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  contentClassName?: string
}

/** Settings-style card with a heading, description and free-form body. */
export function SectionCard({
  title,
  description,
  action,
  className,
  contentClassName,
  children,
  ...props
}: SectionCardProps) {
  const hasHeader = Boolean(title || description || action)

  return (
    <section className={cn('card p-[1.1rem]', className)} {...props}>
      {hasHeader ? (
        <SectionHeading
          title={title ?? ''}
          description={description}
          action={action}
        />
      ) : null}
      <div className={cn(hasHeader && 'mt-[1rem]', contentClassName)}>{children}</div>
    </section>
  )
}
