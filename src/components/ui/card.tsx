import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { toneSoftClass } from './badge'
import type { Tone } from './badge'

export type CardProps = ComponentProps<'div'>

/** Standard bordered surface. */
export function Card({ className, ...props }: CardProps) {
  return <div className={cn('card', className)} {...props} />
}

export type SectionHeadingProps = {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  /**
   * Optional tinted icon badge in front of the title — the dashboard's panel
   * headers. Consumers that pass nothing keep the plain heading they had.
   */
  icon?: ReactNode
  iconTone?: Tone
  /** Typeface override for the title (the dashboard prints it in the display face). */
  titleClassName?: string
  className?: string
}

/** Heading + optional description + trailing action. */
export function SectionHeading({
  title,
  description,
  action,
  icon,
  iconTone = 'neutral',
  titleClassName,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-center gap-[0.55rem]">
        {icon ? (
          <span
            aria-hidden="true"
            className={cn(
              'grid size-[1.9rem] shrink-0 place-items-center rounded-[0.55rem] [&>svg]:size-[1.05rem]',
              toneSoftClass[iconTone],
            )}
          >
            {icon}
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className={cn('text-heading font-bold tracking-snug', titleClassName)}>{title}</h2>
          {description ? (
            <p className="mt-[0.15rem] text-meta text-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export type SectionCardProps = Omit<ComponentProps<'section'>, 'title'> & {
  title?: ReactNode
  description?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  iconTone?: Tone
  titleClassName?: string
  contentClassName?: string
}

/** Settings-style card with a heading, description and free-form body. */
export function SectionCard({
  title,
  description,
  action,
  icon,
  iconTone,
  titleClassName,
  className,
  contentClassName,
  children,
  ...props
}: SectionCardProps) {
  const hasHeader = Boolean(title || description || action || icon)

  return (
    <section className={cn('card p-[1.1rem]', className)} {...props}>
      {hasHeader ? (
        <SectionHeading
          title={title ?? ''}
          description={description}
          action={action}
          icon={icon}
          iconTone={iconTone}
          titleClassName={titleClassName}
        />
      ) : null}
      <div className={cn(hasHeader && 'mt-[1rem]', contentClassName)}>{children}</div>
    </section>
  )
}
